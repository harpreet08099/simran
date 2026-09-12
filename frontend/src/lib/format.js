import { ArrowDownToLine, ArrowUpFromLine, MoveRight, ArrowUpDown, Undo2 } from "lucide-react";

export const TX_META = {
  stock_in: { label: "Stock In", color: "#3B82F6", Icon: ArrowDownToLine, path: "stock_in" },
  stock_out: { label: "Stock Out", color: "#F0616A", Icon: ArrowUpFromLine, path: "stock_out" },
  return: { label: "Return", color: "#3FBF9F", Icon: Undo2, path: "return" },
  move: { label: "Move Stock", color: "#F59E0B", Icon: MoveRight, path: "move" },
  adjust: { label: "Adjust Stock", color: "#8B5CF6", Icon: ArrowUpDown, path: "adjust" },
};

export const fmtNum = (n) => Number(n || 0).toLocaleString("en-IN");
export const fmtMoney = (n) =>
  n === null || n === undefined || n === "" ? "-" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDateLong = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
export const fmtDateTime = (iso) =>
  `${fmtDateLong(iso)} · ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
export const fmtShort = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const txDelta = (tx) => {
  if (tx.type === "adjust") return { text: `→ ${fmtNum(tx.items.reduce((s, i) => s + i.after, 0))}`, color: TX_META.adjust.color };
  if (tx.type === "stock_in") return { text: `+${fmtNum(tx.total_qty)}`, color: TX_META.stock_in.color };
  if (tx.type === "return") return { text: `+${fmtNum(tx.total_qty)}`, color: TX_META.return.color };
  if (tx.type === "stock_out") return { text: `-${fmtNum(tx.total_qty)}`, color: TX_META.stock_out.color };
  return { text: `${fmtNum(tx.total_qty)}`, color: TX_META.move.color };
};

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";
