from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from app.config import Settings
from app.schemas.passport import (
    MRZResult,
    PassportExtractedData,
    PassportOCRRequest,
    PassportOCRResponse,
)
from app.services.confidence import calculate_passport_confidence
from app.services.mrz_parser import MRZParser, ParsedMRZResult
from app.services.normalization import (
    normalize_date,
    normalize_nationality,
    normalize_passport_number,
    normalize_sex,
    normalize_text,
)
from app.services.ocr_provider import OCRProviderError

ALLOWED_DOWNLOAD_CONTENT_TYPES = {
    "application/pdf",
    "application/octet-stream",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

AZURE_FIELD_ALIASES = {
    "passport_number": ("DocumentNumber", "DocumentNo", "PassportNumber"),
    "surname": ("LastName", "Surname"),
    "given_names": ("FirstName", "GivenNames", "GivenName"),
    "nationality": ("Nationality", "CountryRegion"),
    "date_of_birth": ("DateOfBirth", "BirthDate"),
    "sex": ("Sex", "Gender"),
    "date_of_issue": ("DateOfIssue", "IssueDate"),
    "date_of_expiry": ("DateOfExpiration", "DateOfExpiry", "ExpirationDate"),
    "place_of_birth": ("PlaceOfBirth", "BirthPlace"),
    "mrz": ("MachineReadableZone", "MRZ"),
}


def _required(value: str | None, name: str) -> str:
    if not value:
        raise OCRProviderError(
            "AZURE_CREDENTIALS_MISSING",
            f"{name} is required when OCR_PROVIDER=azure",
            500,
        )
    return value.rstrip("/") if name.endswith("ENDPOINT") else value


def _field_by_alias(fields: dict[str, Any], aliases: tuple[str, ...]) -> dict[str, Any] | None:
    for alias in aliases:
        value = fields.get(alias)
        if isinstance(value, dict):
            return value
    lowered = {key.lower(): value for key, value in fields.items()}
    for alias in aliases:
        value = lowered.get(alias.lower())
        if isinstance(value, dict):
            return value
    return None


def _field_content(field: dict[str, Any] | None) -> Any:
    if not field:
        return None
    for key in (
        "valueString",
        "valueDate",
        "valueCountryRegion",
        "valuePhoneNumber",
        "valueNumber",
        "valueInteger",
        "valueSelectionMark",
        "content",
    ):
        if field.get(key) not in (None, ""):
            return field[key]

    value_object = field.get("valueObject")
    if isinstance(value_object, dict):
        parts = [_field_content(item) for item in value_object.values() if isinstance(item, dict)]
        return "\n".join(str(part) for part in parts if part)
    return None


def _field_confidence(field: dict[str, Any] | None) -> float | None:
    confidence = field.get("confidence") if field else None
    return float(confidence) if isinstance(confidence, int | float) else None


def _extract_mrz_from_content(content: str | None, parser: MRZParser) -> str | None:
    if not content:
        return None
    candidates = [
        "".join(character for character in line.upper() if character.isalnum() or character == "<")
        for line in content.splitlines()
    ]
    candidates = [
        candidate
        for candidate in candidates
        if len(candidate) >= 30 and "<" in candidate
    ]
    for index in range(len(candidates) - 1):
        raw = f"{candidates[index]}\n{candidates[index + 1]}"
        parsed = parser.parse(raw)
        if parsed.valid or parsed.raw:
            return raw
    return None


def _dates_equal(left: Any, right: Any) -> bool:
    left_date = normalize_date(left)
    right_date = normalize_date(right)
    return left_date is not None and right_date is not None and left_date == right_date


def _apply_mrz_preference(
    fields: dict[str, Any],
    mrz: ParsedMRZResult,
    warnings: list[str],
) -> dict[str, Any]:
    if not mrz.valid:
        return fields

    mrz_fields = {
        "passport_number": mrz.fields.passport_number,
        "nationality": mrz.fields.nationality,
        "date_of_birth": mrz.fields.date_of_birth,
        "date_of_expiry": mrz.fields.date_of_expiry,
    }

    for field_name, mrz_value in mrz_fields.items():
        if not mrz_value:
            continue
        provider_value = fields.get(field_name)
        if provider_value:
            if field_name.startswith("date_"):
                mismatch = not _dates_equal(provider_value, mrz_value)
            else:
                mismatch = str(provider_value).upper() != str(mrz_value).upper()
            if mismatch:
                warnings.append(f"{field_name} differs between Azure OCR and MRZ; MRZ value used")
        fields[field_name] = mrz_value

    fields["surname"] = fields.get("surname") or mrz.fields.surname
    fields["given_names"] = fields.get("given_names") or mrz.fields.given_names
    fields["sex"] = fields.get("sex") or mrz.fields.sex
    return fields


def map_azure_result_to_response(
    request: PassportOCRRequest,
    analyze_payload: dict[str, Any],
) -> PassportOCRResponse:
    analyze_result = analyze_payload.get("analyzeResult", analyze_payload)
    documents = analyze_result.get("documents")
    if not isinstance(documents, list) or not documents:
        raise OCRProviderError(
            "NO_PASSPORT_DETECTED",
            "Azure Document Intelligence did not detect a passport",
            422,
        )

    document = next(
        (
            item for item in documents
            if isinstance(item, dict) and "passport" in str(item.get("docType", "")).lower()
        ),
        documents[0],
    )
    fields = document.get("fields") if isinstance(document, dict) else None
    if not isinstance(fields, dict):
        raise OCRProviderError(
            "PROVIDER_RESPONSE_INVALID",
            "Azure Document Intelligence returned no ID document fields",
            502,
        )

    provider_confidences: dict[str, float] = {}
    extracted: dict[str, Any] = {}
    for target_field, aliases in AZURE_FIELD_ALIASES.items():
        field = _field_by_alias(fields, aliases)
        confidence = _field_confidence(field)
        if confidence is not None:
            provider_confidences[target_field] = confidence
        extracted[target_field] = _field_content(field)

    parser = MRZParser()
    mrz_raw = extracted.pop("mrz", None) or _extract_mrz_from_content(
        analyze_result.get("content"),
        parser,
    )
    parsed_mrz = parser.parse(str(mrz_raw or ""))
    warnings = list(parsed_mrz.warnings)

    normalized_fields: dict[str, Any] = {
        "passport_number": normalize_passport_number(extracted.get("passport_number")),
        "surname": normalize_text(extracted.get("surname")),
        "given_names": normalize_text(extracted.get("given_names")),
        "nationality": normalize_nationality(extracted.get("nationality")),
        "date_of_birth": normalize_date(extracted.get("date_of_birth")),
        "sex": normalize_sex(extracted.get("sex")),
        "date_of_issue": normalize_date(extracted.get("date_of_issue")),
        "date_of_expiry": normalize_date(extracted.get("date_of_expiry")),
        "place_of_birth": normalize_text(extracted.get("place_of_birth")),
    }
    normalized_fields = _apply_mrz_preference(normalized_fields, parsed_mrz, warnings)

    missing_required = [
        label
        for label in ("passport_number", "surname", "given_names", "nationality", "date_of_birth")
        if not normalized_fields.get(label)
    ]
    if missing_required:
        raise OCRProviderError(
            "BAD_SCAN_QUALITY",
            "Passport OCR could not extract required fields",
            422,
        )

    extracted_data = PassportExtractedData(**normalized_fields)
    confidence = calculate_passport_confidence(
        extracted_data=extracted_data,
        provider_confidences=provider_confidences,
        mrz_valid=parsed_mrz.valid,
        warnings=warnings,
    )

    return PassportOCRResponse(
        job_id=request.job_id,
        confidence=confidence,
        extracted_data=extracted_data,
        mrz=MRZResult(raw=parsed_mrz.raw, valid=parsed_mrz.valid),
        warnings=warnings,
    )


class AzureDocumentIntelligenceProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._endpoint = _required(
            settings.azure_document_intelligence_endpoint,
            "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
        )
        self._key = _required(
            settings.azure_document_intelligence_key,
            "AZURE_DOCUMENT_INTELLIGENCE_KEY",
        )
        self._model_id = settings.azure_document_intelligence_model_id
        self._api_version = settings.azure_document_intelligence_api_version

    async def extract_passport(self, request: PassportOCRRequest) -> PassportOCRResponse:
        document_bytes, content_type = await self._download_document(str(request.image_url))
        analyze_payload = await self._analyze_document(document_bytes, content_type)
        return map_azure_result_to_response(request, analyze_payload)

    async def _download_document(self, image_url: str) -> tuple[bytes, str]:
        if self._settings.environment == "production" and not image_url.startswith("https://"):
            raise OCRProviderError(
                "UNSUPPORTED_DOCUMENT_URL",
                "Passport OCR requires HTTPS document URLs in production",
                400,
            )

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=self._settings.ocr_request_timeout_seconds,
            ) as client:
                response = await client.get(image_url)
        except httpx.TimeoutException as exc:
            raise OCRProviderError(
                "DOCUMENT_DOWNLOAD_TIMEOUT",
                "Timed out downloading document",
                504,
            ) from exc
        except httpx.HTTPError as exc:
            raise OCRProviderError(
                "DOCUMENT_DOWNLOAD_FAILED",
                "Unable to download document",
                502,
            ) from exc

        if response.status_code >= 400:
            raise OCRProviderError("DOCUMENT_DOWNLOAD_FAILED", "Unable to download document", 502)

        content_type = (
            response.headers
            .get("content-type", "application/octet-stream")
            .split(";")[0]
            .lower()
        )
        if content_type not in ALLOWED_DOWNLOAD_CONTENT_TYPES:
            raise OCRProviderError(
                "UNSUPPORTED_FILE_TYPE",
                "Passport OCR supports PDF, JPG, PNG, and WebP documents",
                415,
            )

        if len(response.content) > self._settings.ocr_max_file_size_bytes:
            raise OCRProviderError(
                "DOCUMENT_TOO_LARGE",
                "Document exceeds OCR service size limit",
                413,
            )

        return response.content, content_type

    async def _analyze_document(self, document_bytes: bytes, content_type: str) -> dict[str, Any]:
        analyze_url = (
            f"{self._endpoint}/documentintelligence/documentModels/"
            f"{self._model_id}:analyze"
        )
        headers = {
            "Accept": "application/json",
            "Content-Type": content_type,
            "Ocp-Apim-Subscription-Key": self._key,
        }
        params = {
            "_overload": "analyzeDocument",
            "api-version": self._api_version,
        }

        try:
            async with httpx.AsyncClient(
                timeout=self._settings.ocr_request_timeout_seconds,
            ) as client:
                response = await client.post(
                    analyze_url,
                    params=params,
                    headers=headers,
                    content=document_bytes,
                )
                if response.status_code == 200:
                    return response.json()
                if response.status_code != 202:
                    raise OCRProviderError(
                        "AZURE_REQUEST_FAILED",
                        f"Azure Document Intelligence returned HTTP {response.status_code}",
                        502,
                    )

                operation_location = response.headers.get("operation-location")
                if not operation_location:
                    raise OCRProviderError(
                        "PROVIDER_RESPONSE_INVALID",
                        "Azure Document Intelligence did not return an operation location",
                        502,
                    )

                return await self._poll_result(client, operation_location)
        except httpx.TimeoutException as exc:
            raise OCRProviderError(
                "AZURE_TIMEOUT",
                "Azure Document Intelligence request timed out",
                504,
            ) from exc
        except httpx.HTTPError as exc:
            raise OCRProviderError(
                "AZURE_REQUEST_FAILED",
                "Azure Document Intelligence request failed",
                502,
            ) from exc

    async def _poll_result(
        self,
        client: httpx.AsyncClient,
        operation_location: str,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + self._settings.azure_analysis_timeout_seconds
        headers = {"Ocp-Apim-Subscription-Key": self._key}

        while time.monotonic() < deadline:
            response = await client.get(operation_location, headers=headers)
            if response.status_code >= 400:
                raise OCRProviderError(
                    "AZURE_REQUEST_FAILED",
                    f"Azure Document Intelligence poll returned HTTP {response.status_code}",
                    502,
                )
            payload = response.json()
            status = str(payload.get("status", "")).lower()
            if status == "succeeded":
                return payload
            if status in {"failed", "canceled", "cancelled"}:
                raise OCRProviderError(
                    "AZURE_ANALYSIS_FAILED",
                    "Azure Document Intelligence could not analyze the passport",
                    422,
                )
            await asyncio.sleep(self._settings.azure_poll_interval_seconds)

        raise OCRProviderError(
            "AZURE_TIMEOUT",
            "Azure Document Intelligence analysis timed out",
            504,
        )
