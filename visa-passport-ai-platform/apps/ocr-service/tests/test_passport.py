import asyncio

from httpx import ASGITransport, AsyncClient, Response

from app.main import app
from app.services.providers.mock_provider import MOCK_MRZ


def test_mock_passport_ocr_endpoint() -> None:
    async def request_ocr() -> Response:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/ocr/passport",
                json={
                    "document_type": "passport",
                    "country_hint": "pk",
                    "image_url": "https://example.com/passport.jpg",
                    "job_id": "optional-job-id",
                },
            )

    response = asyncio.run(request_ocr())

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "job_id": "optional-job-id",
        "confidence": 0.92,
        "extracted_data": {
            "passport_number": "AB1234567",
            "surname": "HASSAN",
            "given_names": "REYAN",
            "nationality": "PAK",
            "date_of_birth": "2001-01-01",
            "sex": "M",
            "date_of_issue": "2022-01-01",
            "date_of_expiry": "2032-01-01",
            "place_of_birth": "LAHORE",
        },
        "mrz": {
            "raw": MOCK_MRZ,
            "valid": True,
        },
        "warnings": [],
    }


def test_passport_ocr_rejects_invalid_image_url() -> None:
    async def request_ocr() -> Response:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/ocr/passport",
                json={
                    "document_type": "passport",
                    "country_hint": "PK",
                    "image_url": "not-a-url",
                },
            )

    response = asyncio.run(request_ocr())
    assert response.status_code == 422
