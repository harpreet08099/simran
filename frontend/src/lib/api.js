import axios from "axios";

const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("access_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = null;
const clearSession = (message) => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new CustomEvent("auth:logout", { detail: message }));
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config || {};
    const status = error.response?.status;
    const url = orig.url || "";
    if (status === 401 && !orig._retry && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      orig._retry = true;
      const rt = localStorage.getItem("refresh_token");
      if (rt) {
        try {
          refreshing = refreshing || api.post("/auth/refresh", { refresh_token: rt }).finally(() => (refreshing = null));
          const { data } = await refreshing;
          localStorage.setItem("access_token", data.access_token);
          return api(orig);
        } catch (e) {
          clearSession(e.response?.status === 403 ? e.response?.data?.detail : undefined);
          return Promise.reject(error);
        }
      }
      clearSession();
    }
    if (status === 403 && /revoked|expired|no longer/i.test(error.response?.data?.detail || "")) {
      clearSession(error.response.data.detail);
    }
    return Promise.reject(error);
  }
);

export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d.msg || String(d);
};

export default api;
