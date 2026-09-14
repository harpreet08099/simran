import { useEffect, useState } from "react";
import { Plus, Trash2, Search, Package, X } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { fmtNum } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ItemPicker = ({ open, onClose, onPick, exclude }) => {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => api.get("/items", { params: q ? { q } : {} }).then((r) => setItems(r.data)), 150);
    return () => clearTimeout(t);
  }, [q, open]);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto h-[80vh] lg:max-w-md rounded-t-3xl">
        <SheetHeader><SheetTitle className="text-[16px]">Add item to bundle</SheetTitle></SheetHeader>
        <div className="mt-3 flex items-center rounded-xl bg-gray-100 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input data-testid="bundle-picker-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="ml-2 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </div>
        <div className="mt-2 h-[calc(80vh-140px)] divide-y overflow-y-auto">
          {items.filter((i) => !exclude.includes(i.id)).map((i) => (
            <button key={i.id} data-testid={`bundle-picker-item-${i.id}`} onClick={() => onPick(i)} className="flex w-full items-center justify-between py-3 text-left">
              <div><p className="text-[15px]">{i.name}</p><p className="text-[12px] text-gray-400">{i.sku}</p></div>
              <span className="font-semibold text-[#2F7CF6]">{fmtNum(i.quantity)}</span>
            </button>
          ))}
          {items.length === 0 && <p className="py-8 text-center text-gray-400">No items found</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const CreateSheet = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [lines, setLines] = useState([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setName(""); setLines([]); };

  const submit = async () => {
    if (!name.trim()) return toast.error("Enter a bundle name");
    if (lines.length === 0) return toast.error("Add at least one item");
    setBusy(true);
    try {
      await api.post("/bundles", { name, items: lines.map((l) => ({ item_id: l.item.id, qty: Number(l.qty || 1) })) });
      toast.success("Bundle created");
      reset();
      onCreated();
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] lg:max-w-md overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle className="text-[16px]">New Bundle</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-[13px] font-medium text-gray-500">Bundle name</span>
            <input data-testid="bundle-name-input" value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="e.g. Starter Combo" />
          </label>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-500">Items ({lines.length})</span>
              <button data-testid="bundle-add-item" onClick={() => setPicker(true)} className="flex items-center gap-1 rounded-lg bg-[#EAF1FF] px-3 py-1.5 text-[13px] font-semibold text-[#2F7CF6]"><Plus size={15} /> Add item</button>
            </div>
            <div className="mt-2 divide-y">
              {lines.length === 0 && <p className="py-5 text-center text-[13px] text-gray-400">No items added</p>}
              {lines.map((l, idx) => (
                <div key={l.item.id} className="flex items-center gap-3 py-2.5" data-testid={`bundle-line-${l.item.id}`}>
                  <p className="min-w-0 flex-1 truncate text-[14px]">{l.item.name}</p>
                  <input data-testid={`bundle-qty-${l.item.id}`} type="number" min="1" value={l.qty} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, qty: e.target.value } : x))} className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-right text-[14px] outline-none focus:border-[#2F7CF6]" />
                  <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-gray-400"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
          <button data-testid="bundle-save-button" disabled={busy} onClick={submit} className="btn-primary w-full">{busy ? "Saving…" : "Create Bundle"}</button>
        </div>
        <ItemPicker open={picker} onClose={() => setPicker(false)} exclude={lines.map((l) => l.item.id)}
          onPick={(item) => { setLines([...lines, { item, qty: 1 }]); setPicker(false); }} />
      </SheetContent>
    </Sheet>
  );
};

export default function Bundles() {
  const [bundles, setBundles] = useState(null);
  const [create, setCreate] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = () => api.get("/bundles").then((r) => setBundles(r.data)).catch(() => setBundles([]));
  useEffect(() => { load(); }, []);

  const remove = async () => {
    try { await api.delete(`/bundles/${toDelete.id}`); toast.success("Bundle deleted"); setToDelete(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="app-frame min-h-screen pb-10" data-testid="bundles-page">
      <TopBar title="Bundles" back right={
        <button data-testid="bundle-new-button" onClick={() => setCreate(true)} aria-label="New bundle" className="rounded-full p-2 active:bg-white/20"><Plus size={22} /></button>
      } />

      <div className="mt-3 space-y-3 px-4" data-testid="bundles-list">
        {bundles === null && <p className="p-8 text-center text-gray-400">Loading…</p>}
        {bundles?.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-400" data-testid="bundles-empty">
            <Package size={40} strokeWidth={1.2} />
            <p className="mt-3 text-[14px]">No bundles yet. Group items into a bundle.</p>
          </div>
        )}
        {bundles?.map((b) => (
          <div key={b.id} className="rounded-2xl bg-white p-4 shadow-card" data-testid={`bundle-card-${b.id}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-[#111827]">{b.name}</p>
                <p className="text-[12px] text-gray-400">{b.items.length} item{b.items.length > 1 ? "s" : ""}</p>
              </div>
              <button data-testid={`bundle-delete-${b.id}`} onClick={() => setToDelete(b)} className="text-gray-400 active:text-red-500"><Trash2 size={18} /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {b.items.map((i) => (
                <span key={i.item_id} className="rounded-lg bg-gray-100 px-2 py-1 text-[12px] text-gray-600">{i.name} × {i.qty}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateSheet open={create} onClose={() => setCreate(false)} onCreated={load} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent data-testid="bundle-delete-dialog" className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bundle?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete?.name}” will be removed. Your items and their stock are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="bundle-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="bundle-delete-confirm" onClick={remove} className="bg-[#F0616A] hover:bg-[#e0505a]">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
