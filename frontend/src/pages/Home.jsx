import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ScanLine, Barcode, Gauge, UserPlus, Users } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SummaryCard } from "@/components/home/SummaryCard";
import { MenuCard, MenuRow } from "@/components/layout/Menu";
import { TX_META } from "@/lib/format";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/dashboard").then((r) => setSummary(r.data)).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/items?q=${encodeURIComponent(q)}`);
  };
  const canManage = user?.role !== "member";

  return (
    <div data-testid="home-page">
      <SummaryCard summary={summary} />

      <form onSubmit={search} className="mx-4 mt-4 flex items-center rounded-2xl bg-white px-5 py-4 shadow-card">
        <Search size={24} className="shrink-0 text-gray-400" />
        <input
          data-testid="home-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for an item"
          className="ml-4 min-w-0 flex-1 bg-transparent text-[19px] outline-none placeholder:text-gray-400"
        />
        <span className="mx-3 h-8 w-px shrink-0 bg-gray-200" />
        <button type="submit" data-testid="home-scan-button" aria-label="Search" className="shrink-0 text-gray-600">
          <ScanLine size={26} />
        </button>
      </form>

      <MenuCard title="Items" testId="home-items-card">
        <MenuRow testId="home-add-item" label="Add Item" onClick={() => navigate("/items/new")}
          icon={<Barcode size={26} className="text-[#2F7CF6]" />} />
      </MenuCard>

      <MenuCard title="Transactions" testId="home-transactions-card">
        {Object.entries(TX_META).map(([key, m]) => (
          <MenuRow key={key} testId={`home-${key}`} label={m.label} onClick={() => navigate(`/transactions/new/${key}`)}
            icon={<m.Icon size={26} style={{ color: m.color }} />} />
        ))}
      </MenuCard>

      <MenuCard title="Low Stock Alerts" testId="home-low-stock-card">
        <MenuRow testId="home-view-shortages" label="View Shortages" onClick={() => navigate("/low-stock")}
          icon={<Gauge size={26} className="text-[#F0616A]" />}
          right={summary?.low_stock_count ? (
            <span className="rounded-full bg-[#FDE8EA] px-2.5 py-0.5 text-sm font-semibold text-[#F0616A]" data-testid="home-low-stock-count">
              {summary.low_stock_count}
            </span>) : null} />
      </MenuCard>

      {canManage && (
        <MenuCard title="Team Members" testId="home-team-card">
          <MenuRow testId="home-invite-members" label="Add Members" onClick={() => navigate("/settings/members")}
            icon={<UserPlus size={26} className="text-[#2F7CF6]" />} />
          {user?.role === "main_admin" && (
            <MenuRow testId="home-sub-admins" label="Sub Admins" onClick={() => navigate("/settings/sub-admins")}
              icon={<Users size={26} className="text-[#3FBF9F]" />} />
          )}
        </MenuCard>
      )}
    </div>
  );
}
