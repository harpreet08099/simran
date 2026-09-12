import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { TX_META, fmtDateTime, fmtNum } from "@/lib/format";
import { Avatar } from "./Transactions";

export default function TransactionDetails() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  useEffect(() => { api.get(`/transactions/${id}`).then((r) => setTx(r.data)); }, [id]);

  if (!tx) return <div className="app-frame min-h-screen"><TopBar title="Transaction Details" back /></div>;
  const m = TX_META[tx.type];

  return (
    <div className="app-frame min-h-screen bg-white" data-testid="tx-details-page">
      <TopBar title="Transaction Details" back="/transactions" />
      <div className="px-5 pt-10">
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: `3px solid ${m.color}` }}>
          <h2 data-testid="tx-type-title" className="text-[34px] font-bold" style={{ color: m.color }}>{m.label}</h2>
          <div className="flex items-center gap-3">
            <span className="text-[18px] text-gray-400" data-testid="tx-user-name">{tx.user_name}</span>
            <Avatar name={tx.user_name} size={52} />
          </div>
        </div>
        <div className="mt-6 space-y-3 text-[19px]">
          <div className="flex gap-10"><span className="w-20 text-gray-400">Location</span><span data-testid="tx-location">{tx.location}{tx.to_location ? ` → ${tx.to_location}` : ""}</span></div>
          <div className="flex gap-10"><span className="w-20 text-gray-400">Date</span><span data-testid="tx-date">{fmtDateTime(tx.created_at)}</span></div>
        </div>
        <p className="mt-10 text-[19px]" data-testid="tx-item-count">{tx.items.length} item{tx.items.length > 1 ? "s" : ""}</p>
        <div className="mt-4 divide-y divide-gray-100 border-b border-gray-100">
          {tx.items.map((li, i) => (
            <div key={i} className="flex items-center gap-4 py-4" data-testid={`tx-item-${li.item_id}`}>
              <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-gray-200" />
              <div className="min-w-0 flex-1">
                <p className="text-[19px] text-[#111827]">{li.name}</p>
                <p className="truncate text-[16px] text-gray-400">{[li.category, li.brand, fmtNum(li.qty)].filter(Boolean).join("  |  ")}</p>
              </div>
              <div className="text-right">
                <p className="text-[17px] text-gray-300">{fmtNum(li.before)}</p>
                <p className="text-[22px] font-semibold" style={{ color: m.color }}>→ {fmtNum(li.after)}</p>
              </div>
            </div>
          ))}
        </div>
        {tx.memo && <div className="mt-8 flex gap-10 text-[19px]"><span className="w-20 text-gray-400">Memo</span><span data-testid="tx-memo">{tx.memo}</span></div>}
      </div>
    </div>
  );
}
