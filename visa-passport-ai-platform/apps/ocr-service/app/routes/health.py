from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["ocr-service"] = "ocr-service"


@router.get("/health", response_model=HealthResponse, summary="Check service health")
async def get_health() -> HealthResponse:
    return HealthResponse()
