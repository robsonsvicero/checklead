const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  detalhes?: string[];

  constructor(status: number, message: string, detalhes?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detalhes = detalhes;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Para enviar cookies httpOnly em qualquer requisição
  });

  if (!response.ok) {
    let errorMessage = `Erro na requisição (${response.status})`;
    let errorDetails: string[] | undefined;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
      if (errorData.detalhes) {
        errorDetails = errorData.detalhes;
      }
    } catch {
      // Se não for JSON, usa o statusText
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(response.status, errorMessage, errorDetails);
  }

  // Se a resposta for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
