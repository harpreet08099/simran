import { NavLink } from "react-router-dom";
import { Home, Package, ArrowLeftRight, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: Home, id: "home" },
  { to: "/items", label: "Items", Icon: Package, id: "items" },
  { to: "/transactions", label: "Transactions", Icon: ArrowLeftRight, id: "transactions" },
  { to: "/settings", label: "Settings", Icon: Settings, id: "settings" },
];

export const BottomNav = () => (
  <nav className="bottom-nav" data-testid="bottom-nav">
    {tabs.map(({ to, label, Icon, id }) => (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        data-testid={`nav-${id}`}
        className={({ isActive }) => `nav-tab ${isActive ? "nav-tab-active" : ""}`}
      >
        <Icon size={24} strokeWidth={1.8} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);
