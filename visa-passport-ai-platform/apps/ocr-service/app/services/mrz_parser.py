from app.schemas.passport import MRZResult
from app.utils.normalization import normalize_mrz


class MRZParser:
    def parse(self, raw_mrz: str) -> MRZResult:
        normalized_mrz = normalize_mrz(raw_mrz)

        # TODO: Implement ICAO 9303 field parsing and MRZ checksum validation.
        # The mock response is marked valid only to exercise the success contract.
        return MRZResult(raw=normalized_mrz, valid=True)
