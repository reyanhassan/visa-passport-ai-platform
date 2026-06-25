import json
from pathlib import Path

from app.schemas.passport import PassportOCRRequest
from app.services.providers.azure_document_intelligence import map_azure_result_to_response


def test_azure_id_document_mapping_uses_valid_mrz_for_conflicts() -> None:
    fixture = Path(__file__).parent / "fixtures" / "azure_id_document_passport.json"
    payload = json.loads(fixture.read_text(encoding="utf-8"))
    request = PassportOCRRequest(
        document_type="passport",
        country_hint="PK",
        image_url="https://example.com/passport.jpg",
        job_id="job-123",
    )

    response = map_azure_result_to_response(request, payload)

    assert response.job_id == "job-123"
    assert response.extracted_data.passport_number == "AB1234567"
    assert response.extracted_data.surname == "HASSAN"
    assert response.extracted_data.given_names == "REYAN"
    assert response.extracted_data.nationality == "PAK"
    assert response.extracted_data.date_of_birth.isoformat() == "2001-01-01"
    assert response.extracted_data.date_of_expiry.isoformat() == "2032-01-01"
    assert response.extracted_data.sex == "M"
    assert response.mrz.valid is True
    assert response.confidence > 0.85
    assert any("passport_number differs" in warning for warning in response.warnings)
