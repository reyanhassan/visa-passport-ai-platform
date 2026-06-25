from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from app.services.normalization import normalize_mrz, normalize_mrz_lines


@dataclass(frozen=True, slots=True)
class MRZParsedFields:
    passport_number: str | None = None
    nationality: str | None = None
    date_of_birth: date | None = None
    sex: str | None = None
    date_of_expiry: date | None = None
    surname: str | None = None
    given_names: str | None = None


@dataclass(frozen=True, slots=True)
class ParsedMRZResult:
    raw: str
    valid: bool
    fields: MRZParsedFields = field(default_factory=MRZParsedFields)
    warnings: list[str] = field(default_factory=list)


def _char_value(character: str) -> int:
    if character.isdigit():
        return int(character)
    if "A" <= character <= "Z":
        return ord(character) - 55
    if character == "<":
        return 0
    raise ValueError(f"Unsupported MRZ character: {character!r}")


def calculate_check_digit(value: str) -> str:
    weights = (7, 3, 1)
    total = sum(
        _char_value(character) * weights[index % 3]
        for index, character in enumerate(value)
    )
    return str(total % 10)


def _check_digit_matches(value: str, check_digit: str) -> bool:
    return check_digit.isdigit() and calculate_check_digit(value) == check_digit


def _parse_mrz_date(value: str, *, future_date: bool) -> date | None:
    if len(value) != 6 or not value.isdigit():
        return None

    year = int(value[:2])
    month = int(value[2:4])
    day = int(value[4:6])
    current_year = date.today().year % 100
    century = 2000 if future_date or year <= current_year else 1900

    try:
        return date(century + year, month, day)
    except ValueError:
        return None


def _clean_field(value: str) -> str | None:
    cleaned = value.replace("<", "").strip().upper()
    return cleaned or None


def _parse_names(line_1: str) -> tuple[str | None, str | None]:
    name_segment = line_1[5:44]
    surname_part, _, given_part = name_segment.partition("<<")
    surname = " ".join(part for part in surname_part.split("<") if part)
    given_names = " ".join(part for part in given_part.split("<") if part)
    return surname or None, given_names or None


class MRZParser:
    def parse(self, raw_mrz: str | None) -> ParsedMRZResult:
        if not raw_mrz:
            return ParsedMRZResult(raw="", valid=False, warnings=["MRZ is missing"])

        lines = normalize_mrz_lines(raw_mrz)
        normalized_mrz = normalize_mrz(raw_mrz)
        warnings: list[str] = []

        if len(lines) < 2:
            return ParsedMRZResult(
                raw=normalized_mrz,
                valid=False,
                warnings=["MRZ must contain two TD3 lines"],
            )

        line_1, line_2 = lines[0], lines[1]
        if len(line_1) != 44 or len(line_2) != 44:
            return ParsedMRZResult(
                raw=normalized_mrz,
                valid=False,
                warnings=["MRZ TD3 lines must each contain 44 characters"],
            )

        if not line_1.startswith("P<"):
            warnings.append("MRZ document type is not a passport TD3 record")

        passport_number_raw = line_2[0:9]
        passport_number = _clean_field(passport_number_raw)
        passport_check = line_2[9]
        nationality = _clean_field(line_2[10:13])
        dob_raw = line_2[13:19]
        dob_check = line_2[19]
        sex = _clean_field(line_2[20])
        expiry_raw = line_2[21:27]
        expiry_check = line_2[27]
        optional_data = line_2[28:42]
        optional_check = line_2[42]
        composite_check = line_2[43]
        surname, given_names = _parse_names(line_1)

        checks = [
            ("passport number", _check_digit_matches(passport_number_raw, passport_check)),
            ("date of birth", _check_digit_matches(dob_raw, dob_check)),
            ("expiry date", _check_digit_matches(expiry_raw, expiry_check)),
        ]

        if optional_check.isdigit():
            checks.append(("optional data", _check_digit_matches(optional_data, optional_check)))

        composite_value = line_2[0:10] + line_2[13:20] + line_2[21:43]
        checks.append(("composite", _check_digit_matches(composite_value, composite_check)))

        for label, passed in checks:
            if not passed:
                warnings.append(f"MRZ {label} check digit failed")

        date_of_birth = _parse_mrz_date(dob_raw, future_date=False)
        date_of_expiry = _parse_mrz_date(expiry_raw, future_date=True)
        if date_of_birth is None:
            warnings.append("MRZ date of birth is invalid")
        if date_of_expiry is None:
            warnings.append("MRZ expiry date is invalid")

        fields = MRZParsedFields(
            passport_number=passport_number,
            nationality=nationality,
            date_of_birth=date_of_birth,
            sex=sex if sex in {"M", "F", "X"} else None,
            date_of_expiry=date_of_expiry,
            surname=surname,
            given_names=given_names,
        )

        return ParsedMRZResult(
            raw=normalized_mrz,
            valid=len(warnings) == 0,
            fields=fields,
            warnings=warnings,
        )
