"use client";

import { formatDuration } from "@/lib/posture";
import { SessionSummary } from "@/lib/types";

type Props = {
  summary: SessionSummary | null;
  onClose: () => void;
};

export function SessionSummaryModal({ summary, onClose }: Props) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-600/60 bg-slate-950/95 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Session Summary</h3>
          <button onClick={onClose} className="rounded-lg border border-slate-600/60 px-3 py-1 text-sm text-slate-300">
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Session Duration" value={formatDuration(summary.durationMs)} />
          <SummaryCard label="Posture Score" value={`${summary.score}%`} />
          <SummaryCard label="Time in Good Posture" value={formatDuration(summary.goodMs)} />
          <SummaryCard label="Time in Warning" value={formatDuration(summary.warnMs)} />
          <SummaryCard label="Time in Bad Posture" value={formatDuration(summary.badMs)} />
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm text-cyan-100">
          {summary.feedback}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/45 bg-slate-900/40 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 font-[var(--font-jetbrains)] text-lg text-white">{value}</p>
    </div>
  );
}
