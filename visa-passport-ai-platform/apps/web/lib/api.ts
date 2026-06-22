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

const friendlyMessages: Record<string, string> = {
  DATABASE_ERROR:
    "VisaFlow could not connect to the database. Check that PostgreSQL is running and try again.",
  QUEUE_UNAVAILABLE:
    "Passport processing is temporarily unavailable. Start Redis and the worker, then try again.",
  FALLBACK_FAILED:
    "The local passport fallback could not save its result. Check PostgreSQL and your encryption key, then try again.",
  NETWORK_ERROR:
    "VisaFlow could not reach the application server. Check that the web app is running and try again.",
  UNAUTHENTICATED: "Your session has expired. Sign in again to continue.",
};

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (friendlyMessages[error.code]) return friendlyMessages[error.code];
  if (error.status >= 500) {
    return "VisaFlow encountered a server problem. Check your local services and try again.";
  }
  return error.message;
}

export function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...init?.headers },
    });
  } catch {
    throw new ApiError(friendlyMessages.NETWORK_ERROR, 0, "NETWORK_ERROR");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorPayload = payload as {
      error?: { code?: string; message?: string };
    } | null;
    const error = new ApiError(
      errorPayload?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorPayload?.error?.code ?? "REQUEST_ERROR",
    );
    if (error.status === 401 && error.code === "UNAUTHENTICATED") {
      redirectToLogin();
    }
    throw error;
  }

  return payload as T;
}
