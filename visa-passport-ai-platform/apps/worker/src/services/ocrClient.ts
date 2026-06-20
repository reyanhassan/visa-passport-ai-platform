import { z } from "zod";

import { workerConfig } from "../config.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ocrResponseSchema = z.object({
  status: z.literal("success"),
  job_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  extracted_data: z.object({
    passport_number: z.string().min(1),
    surname: z.string().min(1),
    given_names: z.string().min(1),
    nationality: z.string().min(2).max(3),
    date_of_birth: dateSchema,
    sex: z.string().nullable(),
    date_of_issue: dateSchema.nullable(),
    date_of_expiry: dateSchema.nullable(),
    place_of_birth: z.string().nullable(),
  }),
  mrz: z.object({
    raw: z.string(),
    valid: z.boolean(),
  }),
  warnings: z.array(z.string()),
});

export type PassportOCRResult = z.infer<typeof ocrResponseSchema>;

export interface PassportOCRRequest {
  documentType: string;
  countryHint: string | null;
  imageUrl: string;
  jobId: string;
}

export class OCRClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OCRClientError";
  }
}

export class OCRClient {
  async extractPassport(request: PassportOCRRequest): Promise<PassportOCRResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), workerConfig.ocrRequestTimeoutMs);

    try {
      const response = await fetch(`${workerConfig.ocrServiceUrl}/ocr/passport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workerConfig.internalApiKey
            ? { "X-Internal-API-Key": workerConfig.internalApiKey }
            : {}),
        },
        body: JSON.stringify({
          document_type: request.documentType,
          country_hint: request.countryHint,
          image_url: request.imageUrl,
          job_id: request.jobId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new OCRClientError(`OCR service returned HTTP ${response.status}`);
      }

      const parsed = ocrResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new OCRClientError("OCR service returned an invalid response");
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof OCRClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new OCRClientError("OCR service request timed out");
      }
      throw new OCRClientError("OCR service request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}
