import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Download, Smartphone, CheckCircle2, Image as ImageIcon } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fullLogoUrl } from "@/lib/appConfig";
import { TopBar } from "@/components/layout/TopBar";
import { canInstall, promptInstall, isStandalone } from "@/lib/install";

export default function AppSettings() {
  const { appConfig, refreshAppConfig } = useAuth();
  const fileRef = useRef(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [installable, setInstallable] = useState(canInstall());
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => { setName(appConfig?.app_name || ""); }, [appConfig]);
  useEffect(() => {
    const onAvail = () => setInstallable(true);
    const onInstalled = () => { setInstalled(true); setInstallable(false); };
    window.addEventListener("pwa:available", onAvail);
    window.addEventListener("pwa:installed", onInstalled);
    return () => { window.removeEventListener("pwa:available", onAvail); window.removeEventListener("pwa:installed", onInstalled); };
  }, []);

  const logo = fullLogoUrl(appConfig?.logo_url);

  const save = async (file) => {
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("logo", file);
      if (name.trim()) fd.append("app_name", name.trim());
      await api.put("/app-config", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshAppConfig();
      toast.success("App updated. Re-install the shortcut to refresh its icon.");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file");
    save(f);
  };

  const install = async () => {
    const r = await promptInstall();
    if (r === "unavailable") {
      toast.info("Use your browser menu → 'Add to Home screen' / 'Install app'.");
    }
  };

  return (
    <div className="app-frame min-h-screen pb-10" data-testid="app-settings-page">
      <TopBar title="App Logo & Install" back />

      <div className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-bold text-[#111827]">App Logo</h2>
        <p className="mt-1 text-[13px] text-gray-400">Shown on login, the top bar and the installed app icon.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gray-100" data-testid="app-logo-preview">
            {logo ? <img src={logo} alt="logo" className="h-full w-full object-contain" /> : <ImageIcon size={28} className="text-gray-300" />}
          </div>
          <div className="flex-1">
            <input ref={fileRef} data-testid="app-logo-file" type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button data-testid="app-logo-upload-button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-[#2F7CF6] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50">
              <Upload size={16} /> {busy ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}
            </button>
            <p className="mt-2 text-[12px] text-gray-400">PNG or JPG. Square works best.</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3.5 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-bold text-[#111827]">App Name</h2>
        <div className="mt-3 flex gap-2">
          <input data-testid="app-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Simran Inventory" className="field flex-1" />
          <button data-testid="app-name-save" disabled={busy} onClick={() => save(null)} className="rounded-xl bg-[#2F7CF6] px-4 text-[14px] font-semibold text-white disabled:opacity-50">Save</button>
        </div>
      </div>

      <div className="mx-4 mt-3.5 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-[16px] font-bold text-[#111827]">Install as App</h2>
        <p className="mt-1 text-[13px] text-gray-400">Add a shortcut to your home screen. It opens full-screen like a real app — no browser bar.</p>
        {installed ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#E7F6EF] px-4 py-3 text-[14px] font-medium text-[#1E9E6A]" data-testid="app-installed-badge">
            <CheckCircle2 size={18} /> App is installed and running full-screen.
          </div>
        ) : (
          <>
            <button data-testid="app-install-button" onClick={install} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F7CF6] py-3 text-[15px] font-semibold text-white active:opacity-80">
              <Download size={18} /> Create & Install shortcut
            </button>
            {!installable && (
              <div className="mt-3 space-y-1 rounded-xl bg-gray-50 px-4 py-3 text-[12px] text-gray-500" data-testid="app-install-help">
                <p className="flex items-center gap-1.5 font-medium text-gray-600"><Smartphone size={14} /> If nothing pops up:</p>
                <p><b>Android (Chrome):</b> tap ⋮ menu → “Add to Home screen” / “Install app”.</p>
                <p><b>iPhone (Safari):</b> tap Share → “Add to Home Screen”.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
