import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MoreHorizontal, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { fmtMoney, fmtNum, TX_META } from "@/lib/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const Row = ({ label, value, testId }) => (
  <div className="flex items-center justify-between px-5 py-4">
    <span className="text-[19px] text-gray-500">{label}</span>
    <span data-testid={testId} className="text-[19px] text-[#111827]">{value ?? "-"}</span>
  </div>
);

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [locSheet, setLocSheet] = useState(false);

  useEffect(() => {
    api.get(`/items/${id}`).then((r) => setItem(r.data)).catch(() => navigate("/items"));
  }, [id, navigate]);

  const remove = async () => {
    if (!window.confirm("Delete this item? Transaction history will be kept.")) return;
    try {
      await api.delete(`/items/${id}`);
      toast.success("Item deleted");
      navigate("/items", { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!item) return <div className="app-frame min-h-screen"><TopBar title="Item Information" back /></div>;
  const stock = Object.entries(item.stock || {});
  const [firstLoc, firstQty] = stock[0] || ["Default Location", 0];

  return (
    <div className="app-frame min-h-screen pb-32" data-testid="item-details-page">
      <TopBar title="Item Information" back="/items" right={
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="item-menu-button" className="rounded-full p-2 active:bg-white/20"><MoreHorizontal /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem data-testid="item-edit-action" onClick={() => navigate(`/items/${id}/edit`)}><Pencil size={16} className="mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem data-testid="item-delete-action" onClick={remove} className="text-red-600"><Trash2 size={16} className="mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      } />

      <div className="flex gap-6 bg-white px-5 py-6">
        <div className="h-[130px] w-[130px] flex-shrink-0 rounded-2xl bg-gray-200" />
        <h2 data-testid="item-name" className="pt-1 text-[22px] font-semibold leading-snug text-[#111827]">{item.name}</h2>
      </div>
      <div className="mt-3 bg-white">
        <Row label="SKU" value={item.sku} testId="item-sku" />
        <Row label="Barcode" value={item.barcode || ""} testId="item-barcode" />
      </div>
      <div className="mt-3 bg-white">
        <Row label="Category" value={item.category} testId="item-category" />
        <Row label="Brand" value={item.brand} testId="item-brand" />
        <Row label="Safety Stock" value={item.min_stock ?? "-"} testId="item-min-stock" />
      </div>
      <div className="mt-3 bg-white">
        <Row label="Cost" value={fmtMoney(item.cost_price)} testId="item-cost" />
        <Row label="Price" value={fmtMoney(item.selling_price)} testId="item-price" />
      </div>
      {item.description && <div className="mt-3 bg-white px-5 py-4 text-gray-600">{item.description}</div>}

      <div className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-between bg-white px-5 py-5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button data-testid="item-stock-summary" onClick={() => setLocSheet(true)} className="text-left">
          <p className="text-[15px] text-gray-500">{stock.length > 1 ? "Total" : firstLoc}</p>
          <p className="flex items-center gap-3 text-[40px] font-semibold leading-none text-[#2F7CF6]">
            {fmtNum(stock.length > 1 ? item.quantity : firstQty)} <ChevronRight size={20} className="text-gray-400" />
          </p>
        </button>
        <button data-testid="item-new-transaction-button" onClick={() => setSheet(true)} className="rounded-2xl bg-[#4F6BF6] px-8 py-4 text-[20px] font-semibold text-white active:opacity-80">
          + New
        </button>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle>New transaction for {item.name}</SheetTitle></SheetHeader>
          <div className="mt-4 divide-y">
            {Object.entries(TX_META).map(([k, m]) => (
              <button key={k} data-testid={`item-tx-${k}`} onClick={() => navigate(`/transactions/new/${k}?item=${item.id}`)} className="flex w-full items-center gap-4 py-4 text-left text-[18px]">
                <m.Icon size={24} style={{ color: m.color }} /> {m.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={locSheet} onOpenChange={setLocSheet}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle>Stock by location</SheetTitle></SheetHeader>
          <div className="mt-4 divide-y" data-testid="item-location-stock">
            {stock.length === 0 && <p className="py-4 text-gray-400">No stock yet</p>}
            {stock.map(([loc, qty]) => (
              <div key={loc} className="flex justify-between py-4 text-[18px]"><span>{loc}</span><span className="font-semibold text-[#2F7CF6]">{fmtNum(qty)}</span></div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
