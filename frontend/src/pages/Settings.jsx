import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { SettingsGroup, SettingsRow } from "@/components/layout/Menu";
import { Avatar } from "./Transactions";

const ROLE_LABEL = { main_admin: "Main Admin", sub_admin: "Sub Admin", member: "Member" };

export default function Settings() {
  const navigate = useNavigate();
  const { user, team, logout } = useAuth();
  const isMain = user?.role === "main_admin";
  const canManage = user?.role !== "member";
  const access = user?.access;

  return (
    <div data-testid="settings-page">
      <div className="mt-3 flex items-center gap-4 bg-white px-5 py-5">
        <Avatar name={user?.name} size={56} />
        <div className="min-w-0">
          <p className="truncate text-[19px] font-semibold" data-testid="settings-user-name">{user?.name}</p>
          <p className="truncate text-sm text-gray-400" data-testid="settings-user-role">{ROLE_LABEL[user?.role]} · {user?.email}</p>
        </div>
      </div>

      {isMain && (
        <SettingsGroup title="Main Admin" testId="settings-main-admin-group">
          <SettingsRow testId="settings-sub-admins" label="Sub Admins" onClick={() => navigate("/settings/sub-admins")} />
        </SettingsGroup>
      )}

      <SettingsGroup testId="settings-team-group">
        <SettingsRow testId="settings-team-details" label="Team Details" value={<span className="text-gray-400">{team?.name}</span>} onClick={() => canManage ? navigate("/settings/team") : toast.info("Only admins can edit team details")} />
      </SettingsGroup>

      <SettingsGroup title="Data Center" testId="settings-data-group">
        <SettingsRow testId="settings-locations" label="Locations" value={<span className="text-gray-400">{team?.locations?.length}</span>} onClick={() => navigate("/settings/locations")} />
      </SettingsGroup>

      {canManage && (
        <SettingsGroup title="Team Members" testId="settings-members-group">
          <SettingsRow testId="settings-members" label="Members" onClick={() => navigate("/settings/members")} />
        </SettingsGroup>
      )}

      {!isMain && (
        <SettingsGroup title="Billing" testId="settings-billing-group">
          <SettingsRow testId="settings-subscription" label="Subscription" value={<span>{access?.access_type === "lifetime" ? "Lifetime" : `${access?.days_left} days`}</span>} onClick={() => navigate("/settings/subscription")} />
        </SettingsGroup>
      )}

      <SettingsGroup title="Account" testId="settings-account-group">
        <SettingsRow testId="settings-profile" label="Profile & Password" onClick={() => navigate("/settings/profile")} />
        <SettingsRow testId="settings-logout" label="Log Out" danger onClick={async () => { await logout(); navigate("/login", { replace: true }); }} />
      </SettingsGroup>
    </div>
  );
}
