import { AdsterraBanner } from "./AdsterraBanner";

export function AdSlot({ type }: { type: "leaderboard" | "rail" | "action" }) {
  if (type === "action") return <AdsterraBanner />;
  const sizes = {
    leaderboard: "h-[50px] w-[320px] sm:h-[90px] sm:w-[728px] max-w-full",
    rail: "h-[600px] w-[300px]",
    action: "h-[250px] w-[300px] max-w-full",
  };
  return (
    <aside
      aria-label="Advertisement space"
      className={`${sizes[type]} mx-auto flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900`}
    >
      <span className="text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">
        Advertisement
      </span>
      <span className="text-[10px] text-slate-400">
        {type === "leaderboard" ? "728 × 90 · 320 × 50" : "300 × 600"}
      </span>
    </aside>
  );
}
