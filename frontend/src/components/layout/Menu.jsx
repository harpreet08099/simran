import { ChevronRight } from "lucide-react";

export const MenuCard = ({ title, children, testId }) => (
  <section data-testid={testId} className="mx-4 mt-4 rounded-2xl bg-white px-5 py-5 shadow-card">
    {title && <h2 className="mb-2 text-[22px] font-bold text-[#111827]">{title}</h2>}
    <div>{children}</div>
  </section>
);

export const MenuRow = ({ icon, label, onClick, testId, right }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex w-full items-center gap-4 py-3.5 text-left active:opacity-70"
  >
    {icon && <span className="flex h-8 w-8 items-center justify-center">{icon}</span>}
    <span className="flex-1 text-[19px] text-[#111827]">{label}</span>
    {right}
    <ChevronRight size={20} className="text-gray-400" />
  </button>
);

export const SettingsGroup = ({ title, children, testId }) => (
  <section data-testid={testId} className="mt-3 bg-white">
    {title && <p className="px-5 pt-5 pb-2 text-[17px] font-medium text-gray-400">{title}</p>}
    <div className="divide-y divide-gray-100">{children}</div>
  </section>
);

export const SettingsRow = ({ label, value, onClick, testId, danger }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex w-full items-center justify-between px-5 py-5 text-left active:bg-gray-50"
  >
    <span className={`text-[19px] ${danger ? "text-[#F0616A]" : "text-[#1f2937]"}`}>{label}</span>
    <span className="flex items-center gap-2 text-[19px] text-[#1f2937]">
      {value}
      <ChevronRight size={20} className="text-gray-400" />
    </span>
  </button>
);
