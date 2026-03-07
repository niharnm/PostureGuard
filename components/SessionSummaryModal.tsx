"use client";

import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { SessionSummary } from "@/lib/types";

type Props = {
  summary: SessionSummary | null;
  onClose: () => void;
};

export function SessionSummaryModal({ summary, onClose }: Props) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Session Summary</h3>
          <button onClick={onClose} className="rounded-lg border border-slate-600/60 px-3 py-1 text-sm text-slate-300">
            Close
          </button>
        </div>
        <SessionSummaryCard summary={summary} />
      </div>
    </div>
  );
}
