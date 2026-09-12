import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fetchAppConfig } from "@/lib/appConfig";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState(null);

  const refreshAppConfig = useCallback(async () => {
    try {
      const cfg = await fetchAppConfig();
      setAppConfig(cfg);
      return cfg;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshAppConfig(); }, [refreshAppConfig]);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    setTeam(data.team);
    return data;
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      setUser(false);
      setLoading(false);
      return;
    }
    refresh().catch(() => setUser(false)).finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onLogout = (e) => {
      setUser(false);
      setTeam(null);
      if (e.detail) toast.error(e.detail);
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
    setTeam(data.team);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(false);
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{ user, team, loading, login, logout, refresh, setTeam, appConfig, refreshAppConfig }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
