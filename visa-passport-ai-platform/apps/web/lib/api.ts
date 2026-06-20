export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...init?.headers },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      errorPayload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorPayload?.error?.code ?? "REQUEST_ERROR",
    );
  }

  return payload as T;
}
