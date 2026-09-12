import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const AccessBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = user?.access;
  if (!access || access.access_type !== "limited") return null;
  const days = access.days_left ?? 0;
  return (
    <div className="flex items-center justify-between bg-[#5B6070] px-5 py-3.5 text-white" data-testid="access-bar">
      <span className="text-[13px]">
        Your access ends in {days} {days === 1 ? "day" : "days"}.
      </span>
      <button
        data-testid="access-bar-details"
        onClick={() => navigate("/settings/subscription")}
        className="text-[13px] font-semibold active:opacity-70"
      >
        Details
      </button>
    </div>
  );
};
