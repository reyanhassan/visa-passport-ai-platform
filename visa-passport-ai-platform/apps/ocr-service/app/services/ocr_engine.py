from dataclasses import dataclass
from typing import Protocol

from app.config import OCRProvider, get_settings
from app.schemas.passport import PassportExtractedData, PassportOCRRequest, PassportOCRResponse
from app.services.image_preprocessing import ImagePreprocessor
from app.services.mrz_parser import MRZParser


@dataclass(frozen=True, slots=True)
class RawPassportExtraction:
    extracted_data: PassportExtractedData
    mrz_raw: str
    confidence: float
    warnings: list[str]


class OCREngine(Protocol):
    async def extract_passport(
        self,
        *,
        image_reference: str,
        country_hint: str | None,
    ) -> RawPassportExtraction: ...


class MockOCREngine:
    """Deterministic engine used while provider adapters are under development."""

    async def extract_passport(
        self,
        *,
        image_reference: str,
        country_hint: str | None,
    ) -> RawPassportExtraction:
        del image_reference, country_hint

        # TODO: Replace static confidence with field-level provider confidence scoring.
        return RawPassportExtraction(
            confidence=0.92,
            extracted_data=PassportExtractedData(
                passport_number="AB1234567",
                surname="HASSAN",
                given_names="REYAN",
                nationality="PAK",
                date_of_birth="2001-01-01",
                sex="M",
                date_of_issue="2022-01-01",
                date_of_expiry="2032-01-01",
                place_of_birth="LAHORE",
            ),
            mrz_raw="P<PAKHASSAN<<REYAN<<<<<<<<<<<<<<<<<<<<<<",
            warnings=[],
        )


def build_ocr_engine(provider: OCRProvider) -> OCREngine:
    if provider == "mock":
        return MockOCREngine()

    # TODO: Add an Azure Document Intelligence adapter for provider == "azure".
    # TODO: Add an AWS Textract adapter for provider == "aws".
    # TODO: Add a self-hosted Tesseract fallback for provider == "tesseract".
    # TODO: Add a self-hosted PaddleOCR fallback for provider == "paddleocr".
    raise RuntimeError(f"OCR provider '{provider}' is not implemented")


class PassportOCRService:
    def __init__(
        self,
        engine: OCREngine,
        image_preprocessor: ImagePreprocessor,
        mrz_parser: MRZParser,
    ) -> None:
        self._engine = engine
        self._image_preprocessor = image_preprocessor
        self._mrz_parser = mrz_parser

    async def process(self, request: PassportOCRRequest) -> PassportOCRResponse:
        image_reference = await self._image_preprocessor.prepare_reference(str(request.image_url))
        raw_result = await self._engine.extract_passport(
            image_reference=image_reference,
            country_hint=request.country_hint,
        )
        mrz_result = self._mrz_parser.parse(raw_result.mrz_raw)

        return PassportOCRResponse(
            job_id=request.job_id,
            confidence=raw_result.confidence,
            extracted_data=raw_result.extracted_data,
            mrz=mrz_result,
            warnings=raw_result.warnings,
        )


def get_passport_ocr_service() -> PassportOCRService:
    settings = get_settings()
    return PassportOCRService(
        engine=build_ocr_engine(settings.ocr_provider),
        image_preprocessor=ImagePreprocessor(),
        mrz_parser=MRZParser(),
    )
