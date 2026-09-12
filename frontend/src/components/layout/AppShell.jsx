import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { AccessBar } from "./AccessBar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/AuthContext";

const TITLES = { "/items": "Items", "/transactions": "Transactions", "/settings": "Settings" };

export const AppShell = () => {
  const { pathname } = useLocation();
  const { team } = useAuth();
  const isHome = pathname === "/";
  return (
    <div className="app-frame">
      <TopBar title={isHome ? team?.name || "Inventory" : TITLES[pathname] || "Inventory"} brand={isHome} />
      <AccessBar />
      <main className="pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
