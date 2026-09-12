import { useEffect, useRef, useState } from "react";
import { fmtNum, fmtShort } from "@/lib/format";

const Slide = ({ label, data }) => (
  <div className="w-full flex-shrink-0 snap-center px-2">
    <div className="flex items-baseline gap-3">
      <span className="text-[26px] font-bold">{label}</span>
      <span className="text-[22px] text-white/70">{data ? fmtShort(data.date) : ""}</span>
    </div>
    <div className="mt-8 flex items-end">
      <Stat value={data?.total} label="Total" wide />
      <Divider />
      <Stat value={data?.stock_in} label="Stock In" />
      <Divider />
      <Stat value={data?.stock_out} label="Stock Out" />
    </div>
  </div>
);

const Divider = () => <div className="mx-2 mb-1 h-16 w-px bg-white/40" />;
const Stat = ({ value, label, wide }) => (
  <div className={`min-w-0 ${wide ? "flex-[1.4]" : "flex-1 pl-2"}`}>
    <p className="truncate text-[34px] font-bold leading-none">{fmtNum(value)}</p>
    <p className="mt-2 whitespace-nowrap text-[15px] text-white/80">{label}</p>
  </div>
);

export const SummaryCard = ({ summary }) => {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const go = (i) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });
  return (
    <section data-testid="summary-card" className="summary-card relative mx-4 mt-4 rounded-2xl px-4 py-6 text-white">
      <div className="absolute right-5 top-5 flex gap-1.5">
        {[0, 1].map((i) => (
          <button
            key={i}
            data-testid={`summary-dot-${i}`}
            onClick={() => go(i)}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${index === i ? "bg-white" : "bg-white/40"}`}
            aria-label={i === 0 ? "Today" : "Yesterday"}
          />
        ))}
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" data-testid="summary-slider">
        <Slide label="Today" data={summary?.today} />
        <Slide label="Yesterday" data={summary?.yesterday} />
      </div>
    </section>
  );
};
