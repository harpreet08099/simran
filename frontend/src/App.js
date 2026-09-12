import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Items from "@/pages/Items";
import ItemForm from "@/pages/ItemForm";
import ItemDetails from "@/pages/ItemDetails";
import Transactions from "@/pages/Transactions";
import TransactionDetails from "@/pages/TransactionDetails";
import NewTransaction from "@/pages/NewTransaction";
import LowStock from "@/pages/LowStock";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import TeamSettings from "@/pages/TeamSettings";
import Subscription from "@/pages/Subscription";
import Members from "@/pages/Members";
import SubAdmins from "@/pages/SubAdmins";
import StockByDate from "@/pages/StockByDate";
import Labels from "@/pages/Labels";
import Bundles from "@/pages/Bundles";
import AppSettings from "@/pages/AppSettings";
import InventoryCount from "@/pages/InventoryCount";

const Protected = ({ roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

const PublicOnly = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<Protected />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/items" element={<Items />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/items/new" element={<ItemForm />} />
            <Route path="/items/:id" element={<ItemDetails />} />
            <Route path="/items/:id/edit" element={<ItemForm />} />
            <Route path="/transactions/new/:type" element={<NewTransaction />} />
            <Route path="/transactions/:id" element={<TransactionDetails />} />
            <Route path="/low-stock" element={<LowStock />} />
            <Route path="/reports/stock-by-date" element={<StockByDate />} />
            <Route path="/labels" element={<Labels />} />
            <Route path="/bundles" element={<Bundles />} />
            <Route path="/inventory-count" element={<InventoryCount />} />
            <Route path="/settings/profile" element={<Profile />} />
            <Route path="/settings/team" element={<TeamSettings mode="team" />} />
            <Route path="/settings/locations" element={<TeamSettings mode="locations" />} />
            <Route path="/settings/subscription" element={<Subscription />} />
            <Route element={<Protected roles={["main_admin", "sub_admin"]} />}>
              <Route path="/settings/members" element={<Members />} />
            </Route>
            <Route element={<Protected roles={["main_admin"]} />}>
              <Route path="/settings/sub-admins" element={<SubAdmins />} />
              <Route path="/settings/app" element={<AppSettings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
