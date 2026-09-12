import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { fmtDateLong } from "@/lib/format";
import { ShieldCheck, Clock } from "lucide-react";

export default function Subscription() {
  const { user } = useAuth();
  const a = user?.access || {};
  const limited = a.access_type === "limited";
  return (
    <div className="app-frame min-h-screen" data-testid="subscription-page">
      <TopBar title="Subscription" back="/settings" />
      <div className="mx-4 mt-4 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-center gap-4">
          {limited ? <Clock size={36} className="text-[#F59E0B]" /> : <ShieldCheck size={36} className="text-[#3FBF9F]" />}
          <div>
            <p className="text-[22px] font-bold" data-testid="subscription-type">{limited ? "Limited access" : "Lifetime access"}</p>
            {limited && <p className="text-gray-500" data-testid="subscription-days-left">{a.days_left} days left · ends {fmtDateLong(a.access_end)}</p>}
          </div>
        </div>
        <p className="mt-6 text-[15px] text-gray-500">
          {user?.role === "member"
            ? "Your access is linked to your admin's subscription. If their access ends, yours ends too."
            : "Your subscription is managed by the main admin. Contact them to extend or change your plan."}
        </p>
      </div>
    </div>
  );
}
