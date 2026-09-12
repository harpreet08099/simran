import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const AccessBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = user?.access;
  if (!access || access.access_type !== "limited") return null;
  const days = access.days_left ?? 0;
  return (
    <button
      data-testid="access-bar"
      onClick={() => navigate("/settings/subscription")}
      className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl bg-[#2E3441] px-6 py-4 text-left text-white shadow-sm"
    >
      <span className="text-[15px]">
        Your access ends in {days} {days === 1 ? "day" : "days"}.
      </span>
      <span className="flex items-center gap-1 text-[15px] font-semibold">
        Details <ChevronRight size={18} />
      </span>
    </button>
  );
};
