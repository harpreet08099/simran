const BACKEND = process.env.REACT_APP_BACKEND_URL;

export const fullLogoUrl = (path) => (path ? `${BACKEND}${path}` : null);

export async function fetchAppConfig() {
  const res = await fetch(`${BACKEND}/api/app-config`);
  if (!res.ok) throw new Error("config");
  return res.json();
}
