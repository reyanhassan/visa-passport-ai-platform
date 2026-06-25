from app.config import get_settings
from app.schemas.passport import PassportOCRRequest, PassportOCRResponse
from app.services.ocr_provider import OCRProvider, build_ocr_provider


class PassportOCRService:
    def __init__(self, provider: OCRProvider) -> None:
        self._provider = provider

    async def process(self, request: PassportOCRRequest) -> PassportOCRResponse:
        return await self._provider.extract_passport(request)


def get_passport_ocr_service() -> PassportOCRService:
    settings = get_settings()
    return PassportOCRService(provider=build_ocr_provider(settings.ocr_provider, settings))
