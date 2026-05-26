import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, register, devLogin, userId } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (userId) {
    navigate("/", { replace: true });
    return null;
  }

  const submit = async () => {
    setError("");
    if (!phone || !password) {
      setError("请输入手机号和密码");
      return;
    }
    if (phone.length !== 11 || !phone.startsWith("1")) {
      setError("请输入正确的11位手机号");
      return;
    }
    if (password.length < 6) {
      setError("密码至少6位");
      return;
    }
    setLoading(true);
    const err = isRegister
      ? await register(phone, password)
      : await login(phone, password);
    setLoading(false);
    if (err) setError(err);
    else navigate("/", { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">刷题工具</h1>
      <div className="w-full max-w-sm space-y-4">
        <input
          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-base outline-none focus:border-primary"
          type="tel"
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-base outline-none focus:border-primary"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        {error && <p className="text-sm text-wrong">{error}</p>}
        <button
          className="w-full h-12 bg-primary text-white rounded-xl font-medium text-base active:scale-[0.97] transition-transform"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "..." : isRegister ? "注册" : "登录"}
        </button>
        <button
          className="w-full text-sm text-gray-400"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
        </button>
        {import.meta.env.DEV && (
          <button
            className="w-full text-xs text-gray-300"
            onClick={async () => {
              await devLogin();
              navigate("/", { replace: true });
            }}
          >
            开发登录
          </button>
        )}
      </div>
    </div>
  );
}
