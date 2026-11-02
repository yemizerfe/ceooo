// lib/adminApi.ts
// Lightweight, authenticated client for the admin backend API.
// All calls go to /api/admin/* and automatically attach the bearer token.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export interface AdminResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export class AdminError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "AdminError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Performs an authenticated request against the admin API.
 * Throws AdminError (with .status) on any non-2xx response so callers can
 * react to 401 / 403 gracefully.
 */
export async function adminRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || body?.error || response.statusText;
    throw new AdminError(response.status, message, body);
  }

  if (!body?.success && body?.success === false) {
    throw new AdminError(response.status, body.message || "Request failed", body);
  }

  return (body?.data ?? body) as T;
}

export default adminRequest;
