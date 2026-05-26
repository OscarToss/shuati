const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8002";

interface AuthResponse {
  session?: {
    access_token: string;
    token_type: string;
    expires_at: number;
    user: { id: string };
  };
  detail?: string;
}

export async function apiLogin(
  phone: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return res.json();
}

export async function apiRegister(
  phone: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return res.json();
}

export async function apiDevLogin(): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/dev-login`, { method: "POST" });
  return res.json();
}
