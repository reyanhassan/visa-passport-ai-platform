from app.schemas.passport import (
    MRZResult,
    PassportExtractedData,
    PassportOCRRequest,
    PassportOCRResponse,
)
from app.services.mrz_parser import MRZParser

MOCK_MRZ = (
    "P<PAKHASSAN<<REYAN<<<<<<<<<<<<<<<<<<<<<<<<<<\n"
    "AB12345671PAK0101011M3201015<<<<<<<<<<<<<<08"
)


class MockOCRProvider:
    async def extract_passport(self, request: PassportOCRRequest) -> PassportOCRResponse:
        del request.image_url, request.country_hint

        parsed_mrz = MRZParser().parse(MOCK_MRZ)
        return PassportOCRResponse(
            job_id=request.job_id,
            confidence=0.92,
            extracted_data=PassportExtractedData(
                passport_number="AB1234567",
                surname="HASSAN",
                given_names="REYAN",
                nationality="PAK",
                date_of_birth="2001-01-01",
                sex="M",
                date_of_issue="2022-01-01",
                date_of_expiry="2032-01-01",
                place_of_birth="LAHORE",
            ),
            mrz=MRZResult(raw=parsed_mrz.raw, valid=parsed_mrz.valid),
            warnings=parsed_mrz.warnings,
        )
