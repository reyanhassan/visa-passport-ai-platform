export function CountryMark({ code }: { code: string }) {
  return <span className="country-mark" aria-label={code}>{code}</span>;
}
