import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LogoMark = ({ logo }) =>
  logo ? (
    <img src={logo} alt="logo" className="h-9 w-9 rounded-xl bg-white object-contain p-0.5" data-testid="top-bar-logo" />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 text-white" data-testid="top-bar-logo">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" /></svg>
    </span>
  );

export const TopBar = ({ title, back, right, brand = false, logo }) => {
  const navigate = useNavigate();
  if (brand) {
    return (
      <header className="topbar" data-testid="top-bar">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <LogoMark logo={logo} />
          <h1 data-testid="top-bar-title" className="brand-title truncate">{title}</h1>
          {right && <div className="ml-auto flex items-center text-white">{right}</div>}
        </div>
      </header>
    );
  }
  return (
    <header className="topbar" data-testid="top-bar">
      <div className="relative flex h-14 items-center justify-center px-3">
        {back && (
          <button
            data-testid="top-bar-back-button"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full text-white active:bg-white/20"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 data-testid="top-bar-title" className="text-[17px] font-semibold text-white">{title}</h1>
        {right && <div className="absolute right-3 flex items-center text-white">{right}</div>}
      </div>
    </header>
  );
};
