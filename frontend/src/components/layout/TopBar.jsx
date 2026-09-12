import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TopBar = ({ title, back, right, brand = false }) => {
  const navigate = useNavigate();
  return (
    <header className="topbar" data-testid="top-bar">
      <div className="relative flex h-16 items-center justify-center px-3">
        {back && (
          <button
            data-testid="top-bar-back-button"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full text-white active:bg-white/20"
            aria-label="Back"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <h1 data-testid="top-bar-title" className={brand ? "brand-title" : "text-[19px] font-semibold text-white"}>
          {title}
        </h1>
        {right && <div className="absolute right-3 flex items-center text-white">{right}</div>}
      </div>
    </header>
  );
};
