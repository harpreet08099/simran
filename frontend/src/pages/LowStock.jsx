import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { ItemRow } from "./Items";

export default function LowStock() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/items", { params: { low_stock: true } }).then((r) => setItems(r.data)); }, []);
  return (
    <div className="app-frame min-h-screen" data-testid="low-stock-page">
      <TopBar title="Low Stock" back="/" />
      <div className="mt-4 divide-y divide-gray-100 bg-white">
        {items === null && <p className="p-8 text-center text-gray-400">Loading…</p>}
        {items?.length === 0 && <p className="p-12 text-center text-gray-400" data-testid="low-stock-empty">No shortages. Items with a safety stock set will appear here when they run low.</p>}
        {items?.map((it) => <ItemRow key={it.id} item={it} testId={`low-stock-row-${it.id}`} onClick={() => navigate(`/items/${it.id}`)} />)}
      </div>
    </div>
  );
}
