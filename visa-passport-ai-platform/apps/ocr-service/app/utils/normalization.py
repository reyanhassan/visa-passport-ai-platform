import re


def normalize_country_code(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip().upper()
    if not normalized.isalpha():
        raise ValueError("country_hint must contain only letters")
    return normalized


def normalize_mrz(value: str) -> str:
    return re.sub(r"\s+", "", value).upper()
