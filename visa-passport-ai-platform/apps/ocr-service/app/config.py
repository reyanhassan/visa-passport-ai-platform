from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

OCRProvider = Literal["mock", "azure", "aws"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Visa Platform OCR Service"
    environment: Literal["development", "test", "production"] = "development"
    ocr_provider: OCRProvider = "mock"
    ocr_allowed_origins: str = "http://localhost:3000"
    ocr_request_timeout_seconds: int = Field(default=30, ge=1, le=300)
    ocr_max_file_size_mb: int = Field(default=15, ge=1, le=500)

    azure_document_intelligence_endpoint: str | None = None
    azure_document_intelligence_key: str | None = None
    azure_document_intelligence_model_id: str = "prebuilt-idDocument"
    azure_document_intelligence_api_version: str = "2024-11-30"
    azure_analysis_timeout_seconds: int = Field(default=75, ge=5, le=300)
    azure_poll_interval_seconds: float = Field(default=1.0, ge=0.2, le=10.0)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ocr_allowed_origins.split(",") if origin.strip()]

    @property
    def ocr_max_file_size_bytes(self) -> int:
        return self.ocr_max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
