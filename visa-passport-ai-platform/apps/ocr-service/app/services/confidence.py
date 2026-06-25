from __future__ import annotations

from statistics import mean

from app.schemas.passport import PassportExtractedData

REQUIRED_FIELDS = (
    "passport_number",
    "surname",
    "given_names",
    "nationality",
    "date_of_birth",
    "date_of_expiry",
)


def calculate_passport_confidence(
    *,
    extracted_data: PassportExtractedData,
    provider_confidences: dict[str, float],
    mrz_valid: bool,
    warnings: list[str],
) -> float:
    covered = 0
    for field_name in REQUIRED_FIELDS:
        if getattr(extracted_data, field_name):
            covered += 1

    coverage_score = covered / len(REQUIRED_FIELDS)
    normalized_confidences = [
        min(max(value, 0.0), 1.0)
        for value in provider_confidences.values()
        if isinstance(value, int | float)
    ]
    provider_score = mean(normalized_confidences) if normalized_confidences else 0.65
    mrz_score = 1.0 if mrz_valid else 0.45
    warning_penalty = min(len(warnings) * 0.04, 0.25)

    score = (coverage_score * 0.45) + (provider_score * 0.35) + (mrz_score * 0.20)
    return round(min(max(score - warning_penalty, 0.0), 1.0), 4)
