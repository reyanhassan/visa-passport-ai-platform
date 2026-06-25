from app.schemas.passport import PassportExtractedData
from app.services.confidence import calculate_passport_confidence


def test_confidence_rewards_coverage_and_valid_mrz() -> None:
    extracted_data = PassportExtractedData(
        passport_number="AB1234567",
        surname="HASSAN",
        given_names="REYAN",
        nationality="PAK",
        date_of_birth="2001-01-01",
        sex="M",
        date_of_expiry="2032-01-01",
    )

    high_score = calculate_passport_confidence(
        extracted_data=extracted_data,
        provider_confidences={"passport_number": 0.95, "surname": 0.9},
        mrz_valid=True,
        warnings=[],
    )
    lower_score = calculate_passport_confidence(
        extracted_data=extracted_data,
        provider_confidences={"passport_number": 0.5, "surname": 0.5},
        mrz_valid=False,
        warnings=["MRZ is missing", "low image quality"],
    )

    assert 0 <= lower_score < high_score <= 1
