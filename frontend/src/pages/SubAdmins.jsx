import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Avatar } from "./Transactions";
import { fmtDateLong } from "@/lib/format";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const emptyForm = { name: "", email: "", password: "", shop_name: "", access_type: "lifetime", days: "10" };

const AccessFields = ({ form, setForm }) => (
  <>
    <div className="flex gap-2">
      {["lifetime", "limited"].map((t) => (
        <button type="button" key={t} data-testid={`subadmin-access-${t}`} onClick={() => setForm({ ...form, access_type: t })}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize ${form.access_type === t ? "border-[#2F7CF6] bg-[#EAF1FF] text-[#2F7CF6]" : "border-gray-200 text-gray-500"}`}>
          {t}
        </button>
      ))}
    </div>
    {form.access_type === "limited" && (
      <input data-testid="subadmin-days-input" className="field" type="number" min="1" placeholder="Number of days (e.g. 10)" required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
    )}
  </>
);

const AccessBadge = ({ s }) => {
  const a = s.access;
  if (!s.is_active) return <span className="rounded-full bg-[#FDE8EA] px-2.5 py-0.5 text-xs font-semibold text-[#F0616A]">Revoked</span>;
  if (!a.active) return <span className="rounded-full bg-[#FDE8EA] px-2.5 py-0.5 text-xs font-semibold text-[#F0616A]">Expired</span>;
  if (a.access_type === "lifetime") return <span className="rounded-full bg-[#E4F7F1] px-2.5 py-0.5 text-xs font-semibold text-[#1f9f7d]">Lifetime</span>;
  return <span className="rounded-full bg-[#FFF4E0] px-2.5 py-0.5 text-xs font-semibold text-[#c77d00]">{a.days_left}d left</span>;
};

export default function SubAdmins() {
  const navigate = useNavigate();
  const [subs, setSubs] = useState(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/sub-admins").then((r) => setSubs(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEdit(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s) => {
    setEdit(s);
    setForm({ name: s.name, email: s.email, password: "", shop_name: s.shop_name, access_type: s.access_type, days: s.access.days_left || "10" });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, days: form.access_type === "limited" ? Number(form.days) : null };
    if (edit && !payload.password) delete payload.password;
    try {
      if (edit) { delete payload.email; await api.put(`/admin/sub-admins/${edit.id}`, payload); toast.success("Sub admin updated"); }
      else { await api.post("/admin/sub-admins", payload); toast.success("Sub admin created"); }
      setOpen(false);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const toggle = async (s) => {
    try { await api.put(`/admin/sub-admins/${s.id}`, { is_active: !s.is_active }); toast.success(s.is_active ? "Access revoked (members blocked too)" : "Access restored"); load(); } catch (err) { toast.error(errMsg(err)); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name} and all their members and inventory data? This cannot be undone.`)) return;
    try { await api.delete(`/admin/sub-admins/${s.id}`); load(); } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div className="app-frame min-h-screen" data-testid="sub-admins-page">
      <TopBar title="Sub Admins" back="/settings" right={
        <button data-testid="subadmin-add-button" onClick={openCreate} className="rounded-full p-2 active:bg-white/20" aria-label="Add sub admin"><Plus /></button>
      } />
      <div className="mt-3 space-y-3 px-4" data-testid="sub-admins-list">
        {subs?.length === 0 && <p className="p-10 text-center text-gray-400" data-testid="sub-admins-empty">No sub admins yet. Tap + to add one.</p>}
        {subs?.map((s) => (
          <div key={s.id} className="rounded-2xl bg-white p-4 shadow-card" data-testid={`subadmin-card-${s.id}`}>
            <div className="flex items-center gap-3">
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">{s.shop_name || s.name}</p>
                <p className="truncate text-sm text-gray-400">{s.name} · {s.email}</p>
              </div>
              <AccessBadge s={s} />
            </div>
            <p className="mt-2 text-sm text-gray-400" data-testid={`subadmin-access-info-${s.id}`}>
              {s.access.access_type === "limited" ? `Access ends ${fmtDateLong(s.access.access_end)}` : "Lifetime access"} · {s.member_count} member{s.member_count === 1 ? "" : "s"}
            </p>
            <div className="mt-3 flex gap-2 text-sm">
              <button data-testid={`subadmin-members-${s.id}`} onClick={() => navigate(`/settings/members?team_id=${s.id}`)} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 font-medium"><Users size={16} /> Members</button>
              <button data-testid={`subadmin-edit-${s.id}`} onClick={() => openEdit(s)} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 font-medium"><Pencil size={16} /> Edit</button>
              <button data-testid={`subadmin-toggle-${s.id}`} onClick={() => toggle(s)} className={`flex items-center gap-1 rounded-lg px-3 py-2 font-medium ${s.is_active ? "bg-[#FDE8EA] text-[#F0616A]" : "bg-[#E4F7F1] text-[#1f9f7d]"}`}>
                {s.is_active ? <><Ban size={16} /> Revoke</> : <><CheckCircle2 size={16} /> Restore</>}
              </button>
              <button data-testid={`subadmin-delete-${s.id}`} onClick={() => remove(s)} className="ml-auto rounded-lg p-2 text-gray-400"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>{edit ? "Edit sub admin" : "Add sub admin"}</DialogTitle><DialogDescription>Set login details and how long they can use the app.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-3" data-testid="subadmin-form">
            <input data-testid="subadmin-shop-input" className="field" placeholder="Shop name" required value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
            <input data-testid="subadmin-name-input" className="field" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input data-testid="subadmin-email-input" className="field" type="email" placeholder="Email" required disabled={Boolean(edit)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input data-testid="subadmin-password-input" className="field" type="text" placeholder={edit ? "New password (leave blank to keep)" : "Password (min 6)"} required={!edit} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="pt-1 text-sm font-medium text-gray-500">Access duration{edit ? " (limited resets from today)" : ""}</p>
            <AccessFields form={form} setForm={setForm} />
            <button data-testid="subadmin-submit-button" disabled={busy} className="btn-primary w-full">{busy ? "Saving…" : edit ? "Save" : "Create Sub Admin"}</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
