export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "request_error") {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string; code?: string })
    | null;
  if (!response.ok) {
    throw new ApiRequestError(
      data?.error || `La requête a échoué (${response.status}).`,
      response.status,
      data?.code || "request_error",
    );
  }
  return data as T;
}
