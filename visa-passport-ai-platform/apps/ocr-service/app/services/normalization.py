from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

COUNTRY_NAME_TO_ISO3 = {
    "AUSTRALIA": "AUS",
    "CANADA": "CAN",
    "CHINA": "CHN",
    "FRANCE": "FRA",
    "GERMANY": "DEU",
    "INDIA": "IND",
    "ITALY": "ITA",
    "JAPAN": "JPN",
    "PAKISTAN": "PAK",
    "SAUDI ARABIA": "SAU",
    "SINGAPORE": "SGP",
    "SPAIN": "ESP",
    "TURKEY": "TUR",
    "TURKIYE": "TUR",
    "UNITED ARAB EMIRATES": "ARE",
    "UNITED KINGDOM": "GBR",
    "UNITED STATES": "USA",
    "UNITED STATES OF AMERICA": "USA",
}

ISO2_TO_ISO3 = {
    "AE": "ARE",
    "AU": "AUS",
    "CA": "CAN",
    "CN": "CHN",
    "DE": "DEU",
    "ES": "ESP",
    "FR": "FRA",
    "GB": "GBR",
    "IN": "IND",
    "IT": "ITA",
    "JP": "JPN",
    "PK": "PAK",
    "SA": "SAU",
    "SG": "SGP",
    "TR": "TUR",
    "US": "USA",
}


def normalize_country_code(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip().upper()
    if not normalized.isalpha():
        raise ValueError("country_hint must contain only letters")
    return normalized


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = re.sub(r"\s+", " ", str(value).replace("<", " ")).strip().upper()
    return normalized or None


def normalize_passport_number(value: Any) -> str | None:
    if value is None:
        return None
    normalized = re.sub(r"[^A-Z0-9]", "", str(value).upper())
    return normalized or None


def normalize_nationality(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    compact = text.replace(".", "")
    if compact in COUNTRY_NAME_TO_ISO3:
        return COUNTRY_NAME_TO_ISO3[compact]
    if len(compact) == 2 and compact in ISO2_TO_ISO3:
        return ISO2_TO_ISO3[compact]
    if len(compact) == 3 and compact.isalpha():
        return compact
    return compact[:3] if len(compact) > 3 and compact.isalpha() else None


def normalize_sex(value: Any) -> str | None:
    text = normalize_text(value)
    if not text or text in {"<", "U", "UNSPECIFIED", "UNKNOWN", "N/A"}:
        return None
    if text in {"M", "MALE"}:
        return "M"
    if text in {"F", "FEMALE"}:
        return "F"
    if text in {"X", "NONBINARY", "NON-BINARY", "OTHER"}:
        return "X"
    return None


def normalize_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()

    text = str(value).strip()
    if not text:
        return None

    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date()
        except ValueError:
            continue

    return None


def normalize_mrz(value: str) -> str:
    return "\n".join(normalize_mrz_lines(value))


def normalize_mrz_lines(value: str) -> list[str]:
    lines = [
        re.sub(r"[^A-Z0-9<]", "", line.upper())
        for line in re.split(r"[\r\n]+", value.strip())
    ]
    lines = [line for line in lines if line]
    if len(lines) >= 2:
        return lines[:2]

    compact = re.sub(r"[^A-Z0-9<]", "", value.upper())
    if len(compact) >= 88:
        return [compact[:44], compact[44:88]]
    return [compact] if compact else []
