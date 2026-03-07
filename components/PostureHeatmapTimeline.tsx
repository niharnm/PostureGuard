"use client";

import { PostureState } from "@/lib/types";

type Props = {
  timeline: PostureState[];
};

function stateStyle(state: PostureState) {
  if (state === "GOOD") return "bg-emerald-400/90";
  if (state === "WARN") return "bg-amber-300/90";
  if (state === "BAD") return "bg-rose-400/90";
  return "bg-slate-600/80";
}

function legendDot(label: string, className: string) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

export function PostureHeatmapTimeline({ timeline }: Props) {
  const totalSlots = 120;
  const activeStates = timeline.slice(-totalSlots);
  const fillPercent = Math.min(100, Math.round((activeStates.length / totalSlots) * 100));

  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Posture Heatmap Timeline</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session Fill: {fillPercent}%</p>
      </div>

      <div
        className="grid gap-1 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-2"
        style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSlots }, (_, index) => {
          const entry = activeStates[index];
          return (
          <div
            key={`${entry ?? "EMPTY"}-${index}`}
            className={`h-4 min-w-0 rounded-sm transition-colors ${entry ? stateStyle(entry) : "bg-slate-800/55"}`}
            title={entry ? `${index + 1}s: ${entry}` : "Pending"}
          />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {legendDot("Good", "bg-emerald-400")}
        {legendDot("Warning", "bg-amber-300")}
        {legendDot("Bad", "bg-rose-400")}
      </div>
    </section>
  );
}
