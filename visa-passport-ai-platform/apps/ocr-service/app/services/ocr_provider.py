from __future__ import annotations

from typing import Protocol

from app.config import OCRProvider as OCRProviderName
from app.config import Settings
from app.schemas.passport import PassportOCRRequest, PassportOCRResponse


class OCRProviderError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class OCRProvider(Protocol):
    async def extract_passport(self, request: PassportOCRRequest) -> PassportOCRResponse:
        ...


def build_ocr_provider(provider: OCRProviderName, settings: Settings) -> OCRProvider:
    if provider == "mock":
        from app.services.providers.mock_provider import MockOCRProvider

        return MockOCRProvider()
    if provider == "azure":
        from app.services.providers.azure_document_intelligence import (
            AzureDocumentIntelligenceProvider,
        )

        return AzureDocumentIntelligenceProvider(settings)
    if provider == "aws":
        from app.services.providers.aws_textract import AWSTextractProvider

        return AWSTextractProvider()

    raise OCRProviderError(
        "OCR_PROVIDER_NOT_SUPPORTED",
        f"OCR provider '{provider}' is not supported",
        500,
    )
