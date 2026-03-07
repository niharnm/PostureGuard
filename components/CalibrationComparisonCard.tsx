"use client";

import { PostureSnapshot } from "@/lib/types";

type Props = {
  calibration: PostureSnapshot | null;
  current: PostureSnapshot | null;
};

function metricRow(label: string, value: number | null) {
  return (
    <div className="rounded-xl border border-slate-700/45 bg-slate-900/45 px-3 py-2 text-xs text-slate-200">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-[var(--font-jetbrains)] text-sm text-white">{value !== null ? `${value.toFixed(1)}°` : "--"}</p>
    </div>
  );
}

export function CalibrationComparisonCard({ calibration, current }: Props) {
  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Calibration vs Current</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Before / After</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Calibration Posture</p>
          {calibration ? (
            <img
              src={calibration.imageDataUrl}
              alt="Calibration posture"
              className="h-44 w-full rounded-2xl border border-slate-700/50 object-cover"
            />
          ) : (
            <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-slate-700/65 bg-slate-900/35 text-sm text-slate-400">
              Run calibration to capture reference posture.
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Current Posture</p>
          {current ? (
            <img
              src={current.imageDataUrl}
              alt="Current posture"
              className="h-44 w-full rounded-2xl border border-slate-700/50 object-cover"
            />
          ) : (
            <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-slate-700/65 bg-slate-900/35 text-sm text-slate-400">
              Live frame will appear after monitoring starts.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricRow("Calibration Head Alignment", calibration?.metrics.headAlignmentDeg ?? null)}
        {metricRow("Current Head Alignment", current?.metrics.headAlignmentDeg ?? null)}
        {metricRow("Calibration Shoulder Balance", calibration?.metrics.shoulderBalanceDeg ?? null)}
        {metricRow("Current Shoulder Balance", current?.metrics.shoulderBalanceDeg ?? null)}
      </div>
    </section>
  );
}
