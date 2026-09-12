import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import api from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { fmtNum } from "@/lib/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function StockByDate() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/stock-by-date", { params: { date } })
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [] }))
      .finally(() => setLoading(false));
  }, [date]);

  const total = (data?.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="app-frame min-h-screen pb-10" data-testid="stock-by-date-page">
      <TopBar title="Stock by Date" back />

      <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-card">
        <label className="flex items-center gap-3">
          <Calendar size={20} className="text-[#2F7CF6]" />
          <span className="flex-1 text-[14px] text-gray-500">Show stock as of</span>
          <input
            data-testid="stock-date-input"
            type="date"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[14px] outline-none focus:border-[#2F7CF6]"
          />
        </label>
      </div>

      <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl bg-[#EAF1FF] px-4 py-3">
        <span className="text-[13px] font-medium text-[#2F7CF6]">Total units on {date}</span>
        <span className="text-[18px] font-bold text-[#2F7CF6]" data-testid="stock-date-total">{fmtNum(total)}</span>
      </div>

      <div className="mt-3 divide-y divide-gray-100 bg-white" data-testid="stock-date-list">
        {loading && <p className="p-8 text-center text-gray-400">Loading…</p>}
        {!loading && data?.items?.length === 0 && <p className="p-10 text-center text-gray-400">No items</p>}
        {!loading && data?.items?.map((it) => (
          <div key={it.id} className="flex items-center justify-between px-4 py-3" data-testid={`stock-date-row-${it.id}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-[#111827]">{it.name}</p>
              <p className="truncate text-[12px] text-gray-400">{[it.category, it.brand, it.sku].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="text-[16px] font-semibold text-[#2F7CF6]">{fmtNum(it.quantity)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
