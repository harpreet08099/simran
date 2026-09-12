import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { TX_META, fmtDateLong, fmtNum, txDelta, initials } from "@/lib/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Avatar = ({ name, size = 44 }) => (
  <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#DDE8FF] font-semibold text-[#2F7CF6]" style={{ width: size, height: size, fontSize: size * 0.36 }}>
    {initials(name)}
  </span>
);

const TxRow = ({ tx, onClick }) => {
  const m = TX_META[tx.type];
  const d = txDelta(tx);
  const names = tx.items.map((i) => i.name).join(", ");
  return (
    <button data-testid={`tx-row-${tx.id}`} onClick={onClick} className="flex w-full gap-4 px-5 py-6 text-left active:bg-gray-50">
      <m.Icon size={26} style={{ color: m.color }} className="mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <p className="text-[24px] font-bold leading-tight text-[#111827]">{m.label}</p>
          <Avatar name={tx.user_name} />
        </div>
        <p className="mt-1 text-[18px] font-medium text-[#111827]">
          {tx.items.length} item{tx.items.length > 1 ? "s" : ""}{tx.type !== "adjust" ? ` / ${fmtNum(tx.total_qty)}` : ""}
        </p>
        <div className="flex items-center justify-between">
          <p className="truncate text-[17px] text-gray-500">{names}</p>
          <p className="ml-3 text-[19px] font-semibold" style={{ color: d.color }}>{d.text}</p>
        </div>
        {tx.memo && <p className="mt-2 text-[16px] text-gray-400">&gt; {tx.memo}</p>}
      </div>
    </button>
  );
};

export default function Transactions() {
  const navigate = useNavigate();
  const [txs, setTxs] = useState(null);
  const [type, setType] = useState("");
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    api.get("/transactions", { params: type ? { type } : {} }).then((r) => setTxs(r.data)).catch(() => setTxs([]));
  }, [type]);

  const groups = useMemo(() => {
    const map = new Map();
    (txs || []).forEach((t) => {
      const k = fmtDateLong(t.created_at);
      map.set(k, [...(map.get(k) || []), t]);
    });
    return [...map.entries()];
  }, [txs]);

  return (
    <div data-testid="transactions-page">
      <div className="flex items-center justify-between px-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="tx-filter-button" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[17px]">
            <Filter size={18} /> {type ? TX_META[type].label : "Filter"} <ChevronDown size={16} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem data-testid="tx-filter-all" onClick={() => setType("")}>All</DropdownMenuItem>
            {Object.entries(TX_META).map(([k, m]) => (
              <DropdownMenuItem key={k} data-testid={`tx-filter-${k}`} onClick={() => setType(k)}>{m.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button data-testid="tx-add-button" onClick={() => setSheet(true)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F7CF6] text-white" aria-label="New transaction">
          <Plus size={24} />
        </button>
      </div>

      <div className="mt-4" data-testid="tx-list">
        {txs === null && <p className="p-8 text-center text-gray-400">Loading…</p>}
        {txs?.length === 0 && <p className="p-12 text-center text-gray-400" data-testid="tx-empty">No transactions yet</p>}
        {groups.map(([date, list]) => (
          <div key={date}>
            <p className="px-5 pt-4 pb-1 text-[17px] text-gray-500">{date}</p>
            <div className="divide-y divide-gray-100 bg-white">
              {list.map((tx) => <TxRow key={tx.id} tx={tx} onClick={() => navigate(`/transactions/${tx.id}`)} />)}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle>New transaction</SheetTitle></SheetHeader>
          <div className="mt-4 divide-y">
            {Object.entries(TX_META).map(([k, m]) => (
              <button key={k} data-testid={`tx-new-${k}`} onClick={() => navigate(`/transactions/new/${k}`)} className="flex w-full items-center gap-4 py-4 text-left text-[18px]">
                <m.Icon size={24} style={{ color: m.color }} /> {m.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
