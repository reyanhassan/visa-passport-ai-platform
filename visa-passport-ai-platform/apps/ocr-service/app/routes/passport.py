from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.schemas.passport import PassportOCRRequest, PassportOCRResponse
from app.services.ocr_engine import PassportOCRService, get_passport_ocr_service
from app.services.ocr_provider import OCRProviderError

router = APIRouter(prefix="/ocr", tags=["passport OCR"])


@router.post(
    "/passport",
    response_model=PassportOCRResponse,
    summary="Extract passport fields and parse the MRZ",
)
async def process_passport(
    request: PassportOCRRequest,
    service: Annotated[PassportOCRService, Depends(get_passport_ocr_service)],
) -> PassportOCRResponse | JSONResponse:
    try:
        return await service.process(request)
    except OCRProviderError as error:
        return JSONResponse(
            status_code=error.status_code,
            content={
                "status": "error",
                "error": {
                    "code": error.code,
                    "message": error.message,
                },
            },
        )
