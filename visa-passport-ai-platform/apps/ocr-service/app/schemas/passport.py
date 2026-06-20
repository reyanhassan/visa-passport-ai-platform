from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.utils.normalization import normalize_country_code


class PassportOCRRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "document_type": "passport",
                "country_hint": "PK",
                "image_url": "https://example.com/passport.jpg",
                "job_id": "optional-job-id",
            }
        }
    )

    document_type: Literal["passport"] = "passport"
    country_hint: str | None = Field(default=None, min_length=2, max_length=3)
    image_url: HttpUrl
    job_id: str | None = Field(default=None, min_length=1, max_length=191)

    @field_validator("country_hint")
    @classmethod
    def normalize_country_hint(cls, value: str | None) -> str | None:
        return normalize_country_code(value)


class PassportExtractedData(BaseModel):
    passport_number: str
    surname: str
    given_names: str
    nationality: str
    date_of_birth: date
    sex: str | None = None
    date_of_issue: date | None = None
    date_of_expiry: date | None = None
    place_of_birth: str | None = None


class MRZResult(BaseModel):
    raw: str
    valid: bool


class PassportOCRResponse(BaseModel):
    status: Literal["success"] = "success"
    job_id: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    extracted_data: PassportExtractedData
    mrz: MRZResult
    warnings: list[str] = Field(default_factory=list)
