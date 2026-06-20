import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { z } from "zod";

const passportFieldSchema = z.enum([
  "passport_number",
  "surname",
  "given_names",
  "nationality",
  "date_of_birth",
  "sex",
  "date_of_issue",
  "date_of_expiry",
  "place_of_birth",
]);

const countryRulesSchema = z
  .object({
    country_code: z.string().regex(/^[A-Z]{2}$/),
    country_name: z.string().min(1),
    passport_rules: z
      .object({
        passport_number_regex: z.string().min(1).max(256),
        required_fields: z.array(passportFieldSchema).min(1),
        date_format: z.literal("YYYY-MM-DD"),
        min_expiry_months_for_visa: z.number().int().min(0).max(60),
      })
      .strict(),
    visa_rules: z
      .object({
        supported_visa_types: z.array(z.string().min(1)).min(1),
        required_documents: z.array(z.string().min(1)).min(1),
      })
      .strict(),
  })
  .strict();

const countryRuleFiles = {
  PK: "pakistan.json",
  AE: "uae.json",
  SA: "saudi-arabia.json",
  GB: "uk.json",
  CA: "canada.json",
} as const;

export type PassportField = z.infer<typeof passportFieldSchema>;
export type CountryRules = z.infer<typeof countryRulesSchema>;
export type SupportedCountryCode = keyof typeof countryRuleFiles;

export interface ExtractedPassportData {
  passport_number?: string | null;
  surname?: string | null;
  given_names?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  date_of_issue?: string | null;
  date_of_expiry?: string | null;
  place_of_birth?: string | null;
}

export interface PassportValidationOptions {
  visaType?: string;
  referenceDate?: Date;
}

export interface PassportValidationResult {
  countryCode: SupportedCountryCode;
  missingFields: PassportField[];
  warnings: string[];
  passportNumberValid: boolean | null;
  expiryValidForVisa: boolean;
  isValid: boolean;
}

export class CountryRulesError extends Error {
  constructor(
    public readonly code: "UNSUPPORTED_COUNTRY" | "RULES_NOT_FOUND" | "INVALID_RULES",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CountryRulesError";
  }
}

const rulesCache = new Map<SupportedCountryCode, Promise<CountryRules>>();

function normalizeCountryCode(countryCode: string): SupportedCountryCode {
  const normalized = countryCode.trim().toUpperCase();
  if (!(normalized in countryRuleFiles)) {
    throw new CountryRulesError(
      "UNSUPPORTED_COUNTRY",
      `Country rules are not available for code '${normalized || countryCode}'`,
    );
  }
  return normalized as SupportedCountryCode;
}

function countryRulesDirectory() {
  const configuredDirectory = process.env.COUNTRY_RULES_DIR;
  if (configuredDirectory) {
    return pathToFileURL(`${resolve(configuredDirectory)}${sep}`);
  }

  return new URL("../../../shared/country-rules/", import.meta.url);
}

async function readCountryRules(countryCode: SupportedCountryCode): Promise<CountryRules> {
  const fileUrl = new URL(countryRuleFiles[countryCode], countryRulesDirectory());

  let rawRules: string;
  try {
    rawRules = await readFile(fileUrl, "utf8");
  } catch (error) {
    throw new CountryRulesError(
      "RULES_NOT_FOUND",
      `Country rules file could not be loaded for ${countryCode}`,
      { cause: error },
    );
  }

  let unknownRules: unknown;
  try {
    unknownRules = JSON.parse(rawRules) as unknown;
  } catch (error) {
    throw new CountryRulesError(
      "INVALID_RULES",
      `Country rules contain invalid JSON for ${countryCode}`,
      { cause: error },
    );
  }

  const parsed = countryRulesSchema.safeParse(unknownRules);
  if (!parsed.success || parsed.data.country_code !== countryCode) {
    throw new CountryRulesError(
      "INVALID_RULES",
      `Country rules failed validation for ${countryCode}`,
      { cause: parsed.success ? undefined : parsed.error },
    );
  }

  try {
    new RegExp(parsed.data.passport_rules.passport_number_regex);
  } catch (error) {
    throw new CountryRulesError(
      "INVALID_RULES",
      `Passport number regex is invalid for ${countryCode}`,
      { cause: error },
    );
  }

  return parsed.data;
}

export function loadCountryRules(countryCode: string): Promise<CountryRules> {
  const normalized = normalizeCountryCode(countryCode);
  const cached = rulesCache.get(normalized);
  if (cached) return cached;

  const loading = readCountryRules(normalized).catch((error: unknown) => {
    rulesCache.delete(normalized);
    throw error;
  });
  rulesCache.set(normalized, loading);
  return loading;
}

export function clearCountryRulesCache(): void {
  rulesCache.clear();
}

function isMissing(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const originalDay = date.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export async function validatePassportData(
  countryCode: string,
  passportData: ExtractedPassportData,
  options: PassportValidationOptions = {},
): Promise<PassportValidationResult> {
  const rules = await loadCountryRules(countryCode);
  const normalizedCode = rules.country_code as SupportedCountryCode;
  const missingFields = rules.passport_rules.required_fields.filter((field) =>
    isMissing(passportData[field]),
  );
  const warnings: string[] = [];

  let passportNumberValid: boolean | null = null;
  if (!isMissing(passportData.passport_number)) {
    passportNumberValid = new RegExp(
      rules.passport_rules.passport_number_regex,
    ).test(passportData.passport_number!.trim().toUpperCase());
    if (!passportNumberValid) {
      warnings.push(
        `Passport number does not match the configured format for ${rules.country_name}.`,
      );
    }
  }

  for (const field of ["date_of_birth", "date_of_issue"] as const) {
    const value = passportData[field];
    if (!isMissing(value) && !parseIsoDate(value!)) {
      warnings.push(`${field} must use ${rules.passport_rules.date_format}.`);
    }
  }

  const expiryDate = isMissing(passportData.date_of_expiry)
    ? null
    : parseIsoDate(passportData.date_of_expiry!);
  const referenceDate = options.referenceDate ?? new Date();
  const requiredExpiryDate = addUtcMonths(
    new Date(
      Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
      ),
    ),
    rules.passport_rules.min_expiry_months_for_visa,
  );
  const expiryValidForVisa = expiryDate !== null && expiryDate >= requiredExpiryDate;

  if (!isMissing(passportData.date_of_expiry) && expiryDate === null) {
    warnings.push(`date_of_expiry must use ${rules.passport_rules.date_format}.`);
  } else if (expiryDate && !expiryValidForVisa) {
    warnings.push(
      `Passport must remain valid for at least ${rules.passport_rules.min_expiry_months_for_visa} months.`,
    );
  }

  if (
    options.visaType &&
    !rules.visa_rules.supported_visa_types.includes(options.visaType)
  ) {
    warnings.push(
      `Visa type '${options.visaType}' is not configured for ${rules.country_name}.`,
    );
  }

  return {
    countryCode: normalizedCode,
    missingFields,
    warnings,
    passportNumberValid,
    expiryValidForVisa,
    isValid:
      missingFields.length === 0 &&
      passportNumberValid === true &&
      expiryValidForVisa &&
      warnings.length === 0,
  };
}
