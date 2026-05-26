import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiLogin, apiRegister, apiDevLogin } from "./api";
import { supabase, setSupabaseToken } from "./supabase";

interface AuthState {
  userId: string | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<string | null>;
  register: (phone: string, password: string) => Promise<string | null>;
  devLogin: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem("quiz_auth");
    if (!raw) return { userId: null, token: null, loading: false };
    const { userId, token, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt * 1000) {
      localStorage.removeItem("quiz_auth");
      return { userId: null, token: null, loading: false };
    }
    setSupabaseToken(token);
    return { userId, token, loading: false };
  } catch {
    return { userId: null, token: null, loading: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    ...loadAuth(),
    loading: true,
  }));

  useEffect(() => {
    setState((s) => ({ ...s, loading: false }));
  }, []);

  const setSession = useCallback((data: any) => {
    if (!data.session) return false;
    const { access_token: token, user, expires_at } = data.session;
    const auth = { userId: user.id, token, expiresAt: expires_at };
    localStorage.setItem("quiz_auth", JSON.stringify(auth));
    setSupabaseToken(token);
    setState({ userId: user.id, token, loading: false });
    return true;
  }, []);

  const login = useCallback(
    async (phone: string, password: string): Promise<string | null> => {
      const data = await apiLogin(phone, password);
      if (data.detail) return data.detail;
      setSession(data);
      return null;
    },
    [setSession],
  );

  const register = useCallback(
    async (phone: string, password: string): Promise<string | null> => {
      const data = await apiRegister(phone, password);
      if (data.detail) return data.detail;
      setSession(data);
      return null;
    },
    [setSession],
  );

  const devLogin = useCallback(async (): Promise<boolean> => {
    const data = await apiDevLogin();
    return setSession(data);
  }, [setSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("quiz_auth");
    setState({ userId: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, devLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
