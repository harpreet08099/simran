import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Avatar } from "./Transactions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Members() {
  const [params] = useSearchParams();
  const teamId = params.get("team_id");
  const { user } = useAuth();
  const [members, setMembers] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const q = teamId ? { team_id: teamId } : {};

  const load = () => api.get("/team/members", { params: q }).then((r) => setMembers(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/team/members", form, { params: q });
      toast.success("Member added");
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const toggle = async (m) => {
    try { await api.put(`/team/members/${m.id}`, { is_active: !m.is_active }, { params: q }); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name}? They will no longer be able to log in.`)) return;
    try { await api.delete(`/team/members/${m.id}`, { params: q }); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="app-frame min-h-screen" data-testid="members-page">
      <TopBar title="Members" back={teamId ? "/settings/sub-admins" : "/settings"} right={
        <button data-testid="members-add-button" onClick={() => setOpen(true)} className="rounded-full p-2 active:bg-white/20" aria-label="Add member"><Plus /></button>
      } />
      <p className="px-5 pt-4 text-sm text-gray-400">{members?.length ?? 0} / 20 members · Members log in with the email & password you set.</p>
      <div className="mt-3 divide-y divide-gray-100 bg-white" data-testid="members-list">
        {members?.length === 0 && <p className="p-10 text-center text-gray-400" data-testid="members-empty">No members yet. Tap + to add one.</p>}
        {members?.map((m) => (
          <div key={m.id} className="flex items-center gap-4 px-5 py-4" data-testid={`member-row-${m.id}`}>
            <Avatar name={m.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-medium">{m.name}</p>
              <p className="truncate text-sm text-gray-400">{m.email}</p>
            </div>
            <span data-testid={`member-status-${m.id}`} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.is_active ? "bg-[#E4F7F1] text-[#1f9f7d]" : "bg-[#FDE8EA] text-[#F0616A]"}`}>
              {m.is_active ? "Active" : "Revoked"}
            </span>
            <button data-testid={`member-toggle-${m.id}`} onClick={() => toggle(m)} className="text-gray-400" aria-label="Toggle access">{m.is_active ? <UserX size={20} /> : <UserCheck size={20} />}</button>
            <button data-testid={`member-delete-${m.id}`} onClick={() => remove(m)} className="text-gray-400" aria-label="Delete"><Trash2 size={20} /></button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add member</DialogTitle><DialogDescription>They will log in with this email and password.</DialogDescription></DialogHeader>
          <form onSubmit={add} className="space-y-3" data-testid="member-form">
            <input data-testid="member-name-input" className="field" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input data-testid="member-email-input" className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input data-testid="member-password-input" className="field" type="text" placeholder="Password (min 6)" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button data-testid="member-submit-button" disabled={busy} className="btn-primary w-full">{busy ? "Adding…" : "Add Member"}</button>
          </form>
        </DialogContent>
      </Dialog>
      {user?.role === "main_admin" && teamId && <p className="px-5 pt-3 text-xs text-gray-400">Managing members of a sub admin's team.</p>}
    </div>
  );
}
