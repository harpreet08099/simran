import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { AccessBar } from "./AccessBar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/AuthContext";
import { fullLogoUrl } from "@/lib/appConfig";

const TITLES = { "/items": "Items", "/transactions": "Transactions", "/settings": "Settings" };

export const AppShell = () => {
  const { pathname } = useLocation();
  const { team, appConfig } = useAuth();
  const isHome = pathname === "/";
  const logo = fullLogoUrl(appConfig?.logo_url);
  const shopName = team?.name || "Inventory";
  return (
    <div className="app-frame">
      {isHome ? (
        <TopBar title={shopName} brand logo={logo} />
      ) : (
        <TopBar title={TITLES[pathname] || shopName} />
      )}
      <AccessBar />
      <main className="pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
