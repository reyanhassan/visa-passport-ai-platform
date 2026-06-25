from app.schemas.passport import PassportOCRRequest, PassportOCRResponse
from app.services.ocr_provider import OCRProviderError


class AWSTextractProvider:
    async def extract_passport(self, request: PassportOCRRequest) -> PassportOCRResponse:
        del request
        raise OCRProviderError(
            "AWS_TEXTRACT_NOT_IMPLEMENTED",
            "AWS Textract passport OCR provider is not implemented yet",
            501,
        )
