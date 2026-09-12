import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  History, Barcode, ShoppingBag, Undo2, Package, Plus,
  ArrowDownToLine, ArrowUpFromLine, MoveRight, ArrowUpDown,
  Gauge, ClipboardList, UserPlus, Settings2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { MenuCard, MenuRow } from "@/components/layout/Menu";
import { SummaryCard } from "@/components/home/SummaryCard";

const Ico = ({ Icon, color, bg }) => (
  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: bg }}>
    <Icon size={18} style={{ color }} />
  </span>
);

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const canTeam = role === "main_admin" || role === "sub_admin";
  const isMain = role === "main_admin";
  const [summary, setSummary] = useState(null);

  useEffect(() => { api.get("/dashboard").then((r) => setSummary(r.data)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen pb-6" data-testid="home-page">
      <SummaryCard summary={summary} />

      <MenuCard title="Items" testId="home-items-card">
        <MenuRow testId="home-add-item" icon={<Ico Icon={Plus} color="#2F7CF6" bg="#EAF1FF" />} label="Add Item" onClick={() => navigate("/items/new")} />
      </MenuCard>

      <MenuCard title="Transactions" testId="home-transactions-card">
        <MenuRow testId="home-stock-in" icon={<Ico Icon={ArrowDownToLine} color="#3B82F6" bg="#EAF1FF" />} label="Stock In" onClick={() => navigate("/transactions/new/stock_in")} />
        <MenuRow testId="home-stock-out" icon={<Ico Icon={ArrowUpFromLine} color="#F0616A" bg="#FDECEE" />} label="Stock Out" onClick={() => navigate("/transactions/new/stock_out")} />
        <MenuRow testId="home-move-stock" icon={<Ico Icon={MoveRight} color="#F59E0B" bg="#FEF3E2" />} label="Move Stock" onClick={() => navigate("/transactions/new/move")} />
        <MenuRow testId="home-adjust-stock" icon={<Ico Icon={ArrowUpDown} color="#8B5CF6" bg="#F1ECFE" />} label="Adjust Stock" onClick={() => navigate("/transactions/new/adjust")} />
      </MenuCard>

      <MenuCard title="Low Stock Alerts" testId="home-low-stock-card">
        <MenuRow testId="home-view-shortages" icon={<Ico Icon={Gauge} color="#F0616A" bg="#FDECEE" />} label="View Shortages" onClick={() => navigate("/low-stock")} />
      </MenuCard>

      <MenuCard title="Inventory Count" testId="home-inventory-count-card">
        <MenuRow testId="home-inventory-count" icon={<Ico Icon={ClipboardList} color="#334155" bg="#EEF2F6" />} label="Start Inventory Count" onClick={() => navigate("/inventory-count")} />
      </MenuCard>

      {canTeam && (
        <MenuCard title="Team Members" testId="home-team-card">
          <MenuRow testId="home-invite-members" icon={<Ico Icon={UserPlus} color="#2F7CF6" bg="#EAF1FF" />} label={isMain ? "Manage Sub Admins" : "Invite Members"} onClick={() => navigate(isMain ? "/settings/sub-admins" : "/settings/members")} />
        </MenuCard>
      )}

      <MenuCard title="Past Quantity" testId="home-past-quantity-card">
        <MenuRow testId="home-view-stock-by-date" icon={<Ico Icon={History} color="#F59E0B" bg="#FEF3E2" />} label="View Stock by Date" onClick={() => navigate("/reports/stock-by-date")} />
      </MenuCard>

      <MenuCard title="Barcode Labels" testId="home-barcode-card">
        <MenuRow testId="home-print-label" icon={<Ico Icon={Barcode} color="#2F7CF6" bg="#EAF1FF" />} label="Print Item Label" onClick={() => navigate("/labels")} />
      </MenuCard>

      <MenuCard title="Purchases & Sales" testId="home-purchases-sales-card">
        <MenuRow testId="home-purchases" icon={<Ico Icon={ShoppingBag} color="#3B82F6" bg="#EAF1FF" />} label="Purchases" onClick={() => navigate("/transactions/new/stock_in")} />
        <MenuRow testId="home-sales" icon={<Ico Icon={ShoppingBag} color="#F0616A" bg="#FDECEE" />} label="Sales" onClick={() => navigate("/transactions/new/stock_out")} />
        <MenuRow testId="home-returns" icon={<Ico Icon={Undo2} color="#3FBF9F" bg="#E7F6EF" />} label="Returns" onClick={() => navigate("/transactions/new/return")} />
        <MenuRow testId="home-bundles" icon={<Ico Icon={Package} color="#F59E0B" bg="#FEF3E2" />} label="Bundles" onClick={() => navigate("/bundles")} />
      </MenuCard>

      {isMain && (
        <MenuCard title="App" testId="home-app-card">
          <MenuRow testId="home-app-settings" icon={<Ico Icon={Settings2} color="#334155" bg="#EEF2F6" />} label="App Logo & Install" onClick={() => navigate("/settings/app")} />
        </MenuCard>
      )}
    </div>
  );
}
