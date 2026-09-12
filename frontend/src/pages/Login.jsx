import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Boxes, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { fullLogoUrl } from "@/lib/appConfig";

export default function Login() {
  const { login, appConfig } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const logo = fullLogoUrl(appConfig?.logo_url);
  const appName = appConfig?.app_name || "Inventory Manager";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-frame flex min-h-screen flex-col">
      <div className="topbar flex flex-col items-center px-6 pb-12 pt-14 text-white">
        {logo ? (
          <img src={logo} alt="logo" className="h-16 w-16 rounded-2xl bg-white object-contain p-1" data-testid="login-logo" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Boxes size={30} />
          </div>
        )}
        <h1 className="mt-4 text-[22px] font-bold" data-testid="login-app-name">{appName}</h1>
        <p className="mt-1 text-[13px] text-white/80">Sign in to your shop</p>
      </div>
      <form onSubmit={submit} className="-mt-8 mx-4 rounded-2xl bg-white p-6 shadow-card" data-testid="login-form">
        <label className="block text-sm font-medium text-gray-500">Email</label>
        <input
          data-testid="login-email-input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mt-1"
          placeholder="you@example.com"
          autoComplete="email"
        />
        <label className="mt-5 block text-sm font-medium text-gray-500">Password</label>
        <div className="relative mt-1">
          <input
            data-testid="login-password-input"
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field pr-12"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-gray-400" data-testid="login-toggle-password">
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button data-testid="login-submit-button" disabled={busy} className="btn-primary mt-7 w-full">
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-gray-400">Access is provided by your admin.</p>
    </div>
  );
}
