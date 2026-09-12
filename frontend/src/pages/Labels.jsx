import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Search, Printer } from "lucide-react";
import api from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { fmtMoney } from "@/lib/format";

const printCss = `
@media print {
  body * { visibility: hidden !important; }
  #label-print, #label-print * { visibility: visible !important; }
  #label-print { position: fixed; left: 0; top: 0; width: 100%; padding: 24px; }
}`;

export default function Labels() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => api.get("/items", { params: q ? { q } : {} }).then((r) => setItems(r.data)).catch(() => setItems([])), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (selected && svgRef.current) {
      const value = selected.barcode || selected.sku || selected.id;
      try {
        JsBarcode(svgRef.current, value, { format: "CODE128", displayValue: true, fontSize: 14, height: 60, margin: 6 });
      } catch { /* ignore invalid */ }
    }
  }, [selected]);

  return (
    <div className="app-frame min-h-screen pb-10" data-testid="labels-page">
      <style>{printCss}</style>
      <TopBar title="Print Item Label" back right={selected ? (
        <button data-testid="label-print-button" onClick={() => window.print()} aria-label="Print" className="rounded-full p-2 active:bg-white/20"><Printer size={20} /></button>
      ) : null} />

      {selected ? (
        <div className="p-4">
          <div id="label-print" className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-card" data-testid="label-preview">
            <p className="text-[16px] font-semibold text-[#111827]">{selected.name}</p>
            {selected.selling_price != null && <p className="mt-1 text-[15px] font-bold">{fmtMoney(selected.selling_price)}</p>}
            <div className="mt-3 flex justify-center">
              <svg ref={svgRef} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button data-testid="label-back-button" onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-[15px] font-medium">Choose another</button>
            <button data-testid="label-print-main" onClick={() => window.print()} className="btn-primary flex flex-1 items-center justify-center gap-2"><Printer size={18} /> Print</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mx-4 mt-4 flex items-center rounded-2xl bg-white px-3.5 py-2.5 shadow-card">
            <Search size={18} className="shrink-0 text-gray-400" />
            <input data-testid="label-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item to print label" className="ml-2.5 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          </div>
          <div className="mt-4 divide-y divide-gray-100 bg-white" data-testid="label-item-list">
            {items.length === 0 && <p className="p-10 text-center text-gray-400">No items</p>}
            {items.map((it) => (
              <button key={it.id} data-testid={`label-item-${it.id}`} onClick={() => setSelected(it)} className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-gray-50">
                <div className="min-w-0"><p className="truncate text-[15px] font-medium">{it.name}</p><p className="truncate text-[12px] text-gray-400">{it.barcode || it.sku}</p></div>
                <Printer size={18} className="text-gray-400" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
