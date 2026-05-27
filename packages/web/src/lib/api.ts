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
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    return res.json();
  } catch {
    return { detail: "网络错误，请检查连接" };
  }
}

export async function apiRegister(
  phone: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    return res.json();
  } catch {
    return { detail: "网络错误，请检查连接" };
  }
}

export async function apiDevLogin(): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/dev-login`, {
      method: "POST",
    });
    return res.json();
  } catch {
    return { detail: "网络错误，开发登录不可用" };
  }
}
