"use client";

import { useMemo, useState } from "react";
import { formatDuration } from "@/lib/posture";
import { SessionSummary } from "@/lib/types";

type Props = {
  summary: SessionSummary;
};

export function SessionSummaryCard({ summary }: Props) {
  const [copied, setCopied] = useState(false);

  const worstMomentLabel = summary.worstMoment
    ? `${formatDuration(summary.worstMoment.atMs)} (${summary.worstMoment.score}%, ${summary.worstMoment.state})`
    : "No bad frames captured";

  const copyText = useMemo(
    () => [
      "PostureGuard Session Summary",
      `Duration: ${formatDuration(summary.durationMs)}`,
      `Average posture score: ${summary.averageScore}%`,
      `Consistency score: ${summary.score}%`,
      `Time GOOD: ${formatDuration(summary.goodMs)}`,
      `Time WARN: ${formatDuration(summary.warnMs)}`,
      `Time BAD: ${formatDuration(summary.badMs)}`,
      `Worst posture moment: ${worstMomentLabel}`,
      `Feedback: ${summary.feedback}`
    ].join("\n"),
    [summary.averageScore, summary.badMs, summary.durationMs, summary.feedback, summary.goodMs, summary.score, summary.warnMs, worstMomentLabel]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-600/60 bg-slate-950/95 p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">Session Summary Report</h3>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-cyan-100"
        >
          {copied ? "Copied" : "Copy Summary"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Session Duration" value={formatDuration(summary.durationMs)} />
        <SummaryCard label="Average Posture Score" value={`${summary.averageScore}%`} />
        <SummaryCard label="Consistency Score" value={`${summary.score}%`} />
        <SummaryCard label="Time in GOOD" value={formatDuration(summary.goodMs)} />
        <SummaryCard label="Time in WARN" value={formatDuration(summary.warnMs)} />
        <SummaryCard label="Time in BAD" value={formatDuration(summary.badMs)} />
      </div>

      <div className="mt-4 rounded-2xl border border-amber/35 bg-amber/10 p-3 text-sm text-amber-50">
        <p className="text-xs uppercase tracking-[0.16em] text-amber-200/90">Worst Posture Moment</p>
        <p className="mt-1 font-[var(--font-jetbrains)]">{worstMomentLabel}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm text-cyan-100">
        {summary.feedback}
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
