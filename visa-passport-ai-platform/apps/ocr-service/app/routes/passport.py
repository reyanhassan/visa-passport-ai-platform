from typing import Annotated

from fastapi import APIRouter, Depends

from app.schemas.passport import PassportOCRRequest, PassportOCRResponse
from app.services.ocr_engine import PassportOCRService, get_passport_ocr_service

router = APIRouter(prefix="/ocr", tags=["passport OCR"])


@router.post(
    "/passport",
    response_model=PassportOCRResponse,
    summary="Extract passport fields and parse the MRZ",
)
async def process_passport(
    request: PassportOCRRequest,
    service: Annotated[PassportOCRService, Depends(get_passport_ocr_service)],
) -> PassportOCRResponse:
    """Return deterministic mock data until a real OCR provider is configured."""
    return await service.process(request)
