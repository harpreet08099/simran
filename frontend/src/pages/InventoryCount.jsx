import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import api, { errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { fmtNum } from "@/lib/format";

export default function InventoryCount() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const location = team?.locations?.[0] || "Default Location";
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/items").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);

  const changed = useMemo(() =>
    items.filter((it) => counts[it.id] !== undefined && counts[it.id] !== "" && Number(counts[it.id]) !== (it.quantity || 0)),
    [items, counts]);

  const submit = async () => {
    if (changed.length === 0) return toast.info("No counts changed");
    setBusy(true);
    try {
      await api.post("/transactions", {
        type: "adjust", location, memo: "Inventory Count",
        items: changed.map((it) => ({ item_id: it.id, qty: Number(counts[it.id]) })),
      });
      toast.success(`Inventory updated for ${changed.length} item${changed.length > 1 ? "s" : ""}`);
      navigate("/transactions");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="app-frame min-h-screen pb-28" data-testid="inventory-count-page">
      <TopBar title="Inventory Count" back />

      <div className="mx-4 mt-4 flex items-start gap-3 rounded-2xl bg-[#EEF2F6] px-4 py-3">
        <ClipboardList size={20} className="mt-0.5 text-[#334155]" />
        <p className="text-[13px] text-gray-600">Enter the physically counted quantity for each item. Only changed values are adjusted — location <b>{location}</b>.</p>
      </div>

      <div className="mt-3 divide-y divide-gray-100 bg-white" data-testid="inventory-count-list">
        {items.length === 0 && <p className="p-10 text-center text-gray-400">No items</p>}
        {items.map((it) => {
          const val = counts[it.id];
          const isChanged = val !== undefined && val !== "" && Number(val) !== (it.quantity || 0);
          return (
            <div key={it.id} className="flex items-center gap-3 px-4 py-3" data-testid={`inv-row-${it.id}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-[#111827]">{it.name}</p>
                <p className="text-[12px] text-gray-400">In system: {fmtNum(it.quantity)}</p>
              </div>
              <input
                data-testid={`inv-count-${it.id}`}
                type="number" min="0" inputMode="numeric"
                placeholder={String(it.quantity ?? 0)}
                value={val ?? ""}
                onChange={(e) => setCounts({ ...counts, [it.id]: e.target.value })}
                className={`w-24 rounded-lg border px-3 py-2 text-right text-[15px] outline-none focus:border-[#2F7CF6] ${isChanged ? "border-[#2F7CF6] bg-[#EAF1FF]" : "border-gray-200"}`}
              />
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white p-4">
        <button data-testid="inventory-count-save" disabled={busy} onClick={submit} className="btn-primary w-full">
          {busy ? "Saving…" : `Apply Count${changed.length ? ` (${changed.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}
