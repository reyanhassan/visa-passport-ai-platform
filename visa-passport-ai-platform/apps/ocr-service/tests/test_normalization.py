from app.services.normalization import (
    normalize_date,
    normalize_nationality,
    normalize_passport_number,
    normalize_sex,
    normalize_text,
)


def test_field_normalization() -> None:
    assert normalize_text("  reyan   hassan  ") == "REYAN HASSAN"
    assert normalize_passport_number(" ab-123 4567 ") == "AB1234567"
    assert normalize_nationality("Pakistan") == "PAK"
    assert normalize_nationality("PK") == "PAK"
    assert normalize_sex("Female") == "F"
    assert normalize_date("01/02/2020").isoformat() == "2020-02-01"
