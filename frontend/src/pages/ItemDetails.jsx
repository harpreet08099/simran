import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MoreHorizontal, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { errMsg } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { fmtMoney, fmtNum, TX_META } from "@/lib/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Row = ({ label, value, testId }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-[15px] text-gray-500">{label}</span>
    <span data-testid={testId} className="text-[15px] text-[#111827]">{value ?? "-"}</span>
  </div>
);

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [locSheet, setLocSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/items/${id}`).then((r) => setItem(r.data)).catch(() => navigate("/items"));
  }, [id, navigate]);

  const remove = async () => {
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
    <div className="app-frame min-h-screen pb-28" data-testid="item-details-page">
      <TopBar title="Item Information" back="/items" right={
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="item-menu-button" className="rounded-full p-2 active:bg-white/20"><MoreHorizontal size={22} /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem data-testid="item-edit-action" onClick={() => navigate(`/items/${id}/edit`)}><Pencil size={16} className="mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem data-testid="item-delete-action" onClick={() => setConfirmDelete(true)} className="text-red-600"><Trash2 size={16} className="mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      } />

      <div className="flex gap-4 bg-white px-4 py-5">
        <div className="h-[100px] w-[100px] flex-shrink-0 rounded-2xl bg-gray-200" />
        <h2 data-testid="item-name" className="min-w-0 flex-1 break-words pt-1 text-[18px] font-semibold leading-snug text-[#111827]">{item.name}</h2>
      </div>
      <div className="mt-2.5 bg-white">
        <Row label="SKU" value={item.sku} testId="item-sku" />
        <Row label="Barcode" value={item.barcode || ""} testId="item-barcode" />
      </div>
      <div className="mt-2.5 bg-white">
        <Row label="Category" value={item.category} testId="item-category" />
        <Row label="Brand" value={item.brand} testId="item-brand" />
        <Row label="Safety Stock" value={item.min_stock ?? "-"} testId="item-min-stock" />
      </div>
      <div className="mt-2.5 bg-white">
        <Row label="Cost" value={fmtMoney(item.cost_price)} testId="item-cost" />
        <Row label="Price" value={fmtMoney(item.selling_price)} testId="item-price" />
      </div>
      {item.description && <div className="mt-2.5 bg-white px-4 py-3 text-[14px] text-gray-600">{item.description}</div>}

      <div className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-between bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button data-testid="item-stock-summary" onClick={() => setLocSheet(true)} className="text-left">
          <p className="text-[13px] text-gray-500">{stock.length > 1 ? "Total" : firstLoc}</p>
          <p className="flex items-center gap-2 text-[28px] font-semibold leading-none text-[#2F7CF6]">
            {fmtNum(stock.length > 1 ? item.quantity : firstQty)} <ChevronRight size={18} className="text-gray-400" />
          </p>
        </button>
        <button data-testid="item-new-transaction-button" onClick={() => setSheet(true)} className="rounded-2xl bg-[#4F6BF6] px-6 py-3 text-[16px] font-semibold text-white active:opacity-80">
          + New
        </button>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle className="text-[16px]">New transaction for {item.name}</SheetTitle></SheetHeader>
          <div className="mt-3 divide-y">
            {Object.entries(TX_META).map(([k, m]) => (
              <button key={k} data-testid={`item-tx-${k}`} onClick={() => navigate(`/transactions/new/${k}?item=${item.id}`)} className="flex w-full items-center gap-4 py-3.5 text-left text-[15px]">
                <m.Icon size={22} style={{ color: m.color }} /> {m.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={locSheet} onOpenChange={setLocSheet}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle className="text-[16px]">Stock by location</SheetTitle></SheetHeader>
          <div className="mt-3 divide-y" data-testid="item-location-stock">
            {stock.length === 0 && <p className="py-4 text-gray-400">No stock yet</p>}
            {stock.map(([loc, qty]) => (
              <div key={loc} className="flex justify-between py-3.5 text-[15px]"><span>{loc}</span><span className="font-semibold text-[#2F7CF6]">{fmtNum(qty)}</span></div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent data-testid="item-delete-dialog" className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>Transaction history will be kept. This item will no longer appear in your inventory.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="item-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="item-delete-confirm" onClick={remove} className="bg-[#F0616A] hover:bg-[#e0505a]">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
