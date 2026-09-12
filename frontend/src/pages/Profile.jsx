import { useState } from "react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  const saveName = async (e) => {
    e.preventDefault();
    try { await api.put("/auth/profile", { name }); await refresh(); toast.success("Name updated"); } catch (err) { toast.error(errMsg(err)); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    try { await api.put("/auth/password", pw); setPw({ current_password: "", new_password: "" }); toast.success("Password changed"); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="app-frame min-h-screen" data-testid="profile-page">
      <TopBar title="Profile" back="/settings" />
      <form onSubmit={saveName} className="mx-4 mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-card">
        <label className="block"><span className="text-sm font-medium text-gray-500">Display name</span>
          <input data-testid="profile-name-input" className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <p className="text-sm text-gray-400">{user?.email}</p>
        <button data-testid="profile-save-name-button" className="btn-primary w-full">Save Name</button>
      </form>
      <form onSubmit={savePw} className="mx-4 mt-4 space-y-3 rounded-2xl bg-white p-5 shadow-card">
        <h3 className="text-[17px] font-semibold">Change password</h3>
        <input data-testid="profile-current-password-input" type="password" className="field" placeholder="Current password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
        <input data-testid="profile-new-password-input" type="password" className="field" placeholder="New password (min 6)" required minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
        <button data-testid="profile-save-password-button" className="btn-primary w-full">Change Password</button>
      </form>
    </div>
  );
}
