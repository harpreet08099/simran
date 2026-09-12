import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, PackageOpen } from "lucide-react";
import api from "@/lib/api";
import { fmtNum } from "@/lib/format";

export const ItemRow = ({ item, onClick, testId }) => (
  <button data-testid={testId} onClick={onClick} className="flex w-full items-center gap-4 px-5 py-4 text-left active:bg-gray-50">
    <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-gray-200" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[18px] font-medium text-[#111827]">{item.name}</p>
      <p className="truncate text-[14px] text-gray-400">
        {[item.category, item.brand, item.sku].filter(Boolean).join(" | ")}
      </p>
    </div>
    <div className="text-right">
      <p className={`text-[22px] font-semibold ${item.min_stock != null && item.quantity <= item.min_stock ? "text-[#F0616A]" : "text-[#2F7CF6]"}`}>
        {fmtNum(item.quantity)}
      </p>
      {item.unit && <p className="text-xs text-gray-400">{item.unit}</p>}
    </div>
  </button>
);

export default function Items() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [items, setItems] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/items", { params: q ? { q } : {} }).then((r) => setItems(r.data)).catch(() => setItems([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div data-testid="items-page">
      <div className="mx-4 mt-4 flex items-center gap-3">
        <div className="flex flex-1 items-center rounded-2xl bg-white px-4 py-3 shadow-card">
          <Search size={20} className="shrink-0 text-gray-400" />
          <input
            data-testid="items-search-input"
            value={q}
            onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})}
            placeholder="Search by name, SKU or barcode"
            className="ml-3 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
        </div>
        <button data-testid="items-add-button" onClick={() => navigate("/items/new")} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2F7CF6] text-white shadow-card" aria-label="Add item">
          <Plus size={24} />
        </button>
      </div>

      <div className="mt-4 bg-white divide-y divide-gray-100" data-testid="items-list">
        {items === null && <p className="p-8 text-center text-gray-400">Loading…</p>}
        {items?.length === 0 && (
          <div className="flex flex-col items-center py-16 text-gray-400" data-testid="items-empty">
            <PackageOpen size={44} strokeWidth={1.2} />
            <p className="mt-3">{q ? "No items match your search" : "No items yet. Add your first item."}</p>
          </div>
        )}
        {items?.map((it) => (
          <ItemRow key={it.id} item={it} testId={`item-row-${it.id}`} onClick={() => navigate(`/items/${it.id}`)} />
        ))}
      </div>
    </div>
  );
}
