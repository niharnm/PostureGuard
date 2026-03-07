import { memo } from "react";
import { motion } from "framer-motion";
import { PostureState } from "@/lib/types";

type Props = {
  good: string;
  warn: string;
  bad: string;
  score: number;
  timeline: PostureState[];
};

function stateColor(state: PostureState) {
  if (state === "GOOD") return "bg-mint";
  if (state === "WARN") return "bg-amber";
  if (state === "BAD") return "bg-danger";
  return "bg-slate-600";
}

function SessionInsightsBase({ good, warn, bad, score, timeline }: Props) {
  const displayTimeline: PostureState[] = timeline.length ? timeline : ["NO_PERSON"];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="panel rounded-3xl p-6 sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Session Insights Dashboard</h2>
        <p className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
          Active Session Metrics
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-mint/30 bg-mint/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-mint/80">Good Time</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-2xl text-white">{good}</p>
        </div>
        <div className="rounded-2xl border border-amber/35 bg-amber/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-amber/80">Warn Time</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-2xl text-white">{warn}</p>
        </div>
        <div className="rounded-2xl border border-danger/35 bg-danger/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-danger/80">Bad Time</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-2xl text-white">{bad}</p>
        </div>
        <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Consistency</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-2xl text-white">{score}%</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Posture Timeline (per second)</p>
        <div className="flex h-4 w-full overflow-hidden rounded-full border border-slate-700/60 bg-slate-900/40">
          {displayTimeline.map((item, index) => (
            <div
              key={index}
              className={`${stateColor(item)} h-full transition-all`}
              style={{ width: `${100 / displayTimeline.length}%` }}
              title={item}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export const SessionInsights = memo(SessionInsightsBase);
