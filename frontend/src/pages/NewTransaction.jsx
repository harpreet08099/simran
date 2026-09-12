import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { TX_META, fmtNum } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
      <SheetContent side="bottom" className="mx-auto h-[80vh] max-w-md rounded-t-3xl">
        <SheetHeader><SheetTitle>Select item</SheetTitle></SheetHeader>
        <div className="mt-3 flex items-center rounded-xl bg-gray-100 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input data-testid="picker-search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="ml-2 min-w-0 flex-1 bg-transparent outline-none" />
        </div>
        <div className="mt-2 h-[calc(80vh-140px)] divide-y overflow-y-auto">
          {items.filter((i) => !exclude.includes(i.id)).map((i) => (
            <button key={i.id} data-testid={`picker-item-${i.id}`} onClick={() => onPick(i)} className="flex w-full items-center justify-between py-3 text-left">
              <div><p className="text-[17px]">{i.name}</p><p className="text-sm text-gray-400">{i.sku}</p></div>
              <span className="font-semibold text-[#2F7CF6]">{fmtNum(i.quantity)}</span>
            </button>
          ))}
          {items.length === 0 && <p className="py-8 text-center text-gray-400">No items found</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default function NewTransaction() {
  const { type } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { team } = useAuth();
  const m = TX_META[type];
  const locations = team?.locations || [];
  const [location, setLocation] = useState(locations[0] || "");
  const [toLocation, setToLocation] = useState(locations[1] || "");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const pre = params.get("item");
    if (pre) api.get(`/items/${pre}`).then((r) => setLines([{ item: r.data, qty: "" }]));
  }, [params]);

  if (!m) return null;
  const isAdjust = type === "adjust";
  const stockAt = (item) => item.stock?.[location] ?? 0;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/transactions", {
        type, location, to_location: type === "move" ? toLocation : null, memo,
        items: lines.map((l) => ({ item_id: l.item.id, qty: Number(l.qty || 0) })),
      });
      toast.success(`${m.label} saved`);
      navigate(`/transactions/${data.id}`, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const Select = ({ value, onChange, testId, exclude }) => (
    <select data-testid={testId} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {locations.filter((l) => l !== exclude).map((l) => <option key={l}>{l}</option>)}
    </select>
  );

  return (
    <div className="app-frame min-h-screen">
      <TopBar title={m.label} back />
      <form onSubmit={submit} className="space-y-4 p-4 pb-32" data-testid="new-tx-form">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
          <label className="block"><span className="text-sm font-medium text-gray-500">{type === "move" ? "From location" : "Location"}</span>
            <div className="mt-1"><Select value={location} onChange={setLocation} testId="tx-location-select" exclude={type === "move" ? toLocation : null} /></div></label>
          {type === "move" && (
            <label className="block"><span className="text-sm font-medium text-gray-500">To location</span>
              <div className="mt-1">{locations.length < 2 ? <p className="text-sm text-red-500">Add a second location in Settings → Locations first.</p> : <Select value={toLocation} onChange={setToLocation} testId="tx-to-location-select" exclude={location} />}</div></label>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-semibold">Items ({lines.length})</h3>
            <button type="button" data-testid="tx-add-item-button" onClick={() => setPicker(true)} className="flex items-center gap-1 rounded-lg bg-[#EAF1FF] px-3 py-1.5 text-sm font-semibold text-[#2F7CF6]"><Plus size={16} /> Add item</button>
          </div>
          <div className="mt-3 divide-y">
            {lines.length === 0 && <p className="py-6 text-center text-gray-400">No items added</p>}
            {lines.map((l, idx) => (
              <div key={l.item.id} className="flex items-center gap-3 py-3" data-testid={`tx-line-${l.item.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px]">{l.item.name}</p>
                  <p className="text-sm text-gray-400">At {location}: {fmtNum(stockAt(l.item))}</p>
                </div>
                <input data-testid={`tx-qty-input-${l.item.id}`} type="number" min="0" required value={l.qty} placeholder={isAdjust ? "New qty" : "Qty"}
                  onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                  className="w-24 shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-right text-[17px] outline-none focus:border-[#2F7CF6]" />
                <button type="button" data-testid={`tx-remove-line-${l.item.id}`} onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-gray-400"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <label className="block"><span className="text-sm font-medium text-gray-500">Memo{isAdjust ? " / reason *" : ""}</span>
            <input data-testid="tx-memo-input" required={isAdjust} value={memo} onChange={(e) => setMemo(e.target.value)} className="field mt-1" placeholder={isAdjust ? "e.g. Physical count correction" : "Optional note"} /></label>
        </div>

        <div className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button data-testid="tx-submit-button" disabled={busy || lines.length === 0} className="btn-primary w-full" style={{ backgroundColor: m.color }}>
            {busy ? "Saving…" : `Save ${m.label}`}
          </button>
        </div>
      </form>
      <ItemPicker open={picker} onClose={() => setPicker(false)} exclude={lines.map((l) => l.item.id)}
        onPick={(item) => { setLines([...lines, { item, qty: "" }]); setPicker(false); }} />
    </div>
  );
}
