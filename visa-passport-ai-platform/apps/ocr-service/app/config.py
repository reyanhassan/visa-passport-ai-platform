from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

OCRProvider = Literal["mock", "azure", "aws", "tesseract", "paddleocr"]


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

    # Provider credentials are intentionally absent until real adapters are implemented.
    # Secrets should be injected by the deployment platform rather than committed to files.

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ocr_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
