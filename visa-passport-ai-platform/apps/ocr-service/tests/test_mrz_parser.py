from app.services.mrz_parser import MRZParser, calculate_check_digit
from app.services.providers.mock_provider import MOCK_MRZ


def test_td3_mrz_checksum_validation() -> None:
    parsed = MRZParser().parse(MOCK_MRZ)

    assert parsed.valid is True
    assert parsed.fields.passport_number == "AB1234567"
    assert parsed.fields.nationality == "PAK"
    assert parsed.fields.date_of_birth.isoformat() == "2001-01-01"
    assert parsed.fields.date_of_expiry.isoformat() == "2032-01-01"
    assert parsed.fields.sex == "M"
    assert parsed.fields.surname == "HASSAN"
    assert parsed.fields.given_names == "REYAN"


def test_td3_mrz_rejects_bad_check_digit() -> None:
    corrupted = MOCK_MRZ[:-1] + "0"

    parsed = MRZParser().parse(corrupted)

    assert parsed.valid is False
    assert "MRZ composite check digit failed" in parsed.warnings


def test_check_digit_algorithm() -> None:
    assert calculate_check_digit("AB1234567") == "1"
    assert calculate_check_digit("010101") == "1"
