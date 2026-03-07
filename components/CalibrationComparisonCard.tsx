"use client";

import { memo, useEffect, useRef } from "react";
import { PostureSnapshot } from "@/lib/types";

type Props = {
  calibration: PostureSnapshot | null;
  current: PostureSnapshot | null;
};

function metricRow(label: string, value: number | null, suffix = "deg") {
  return (
    <div className="rounded-xl border border-slate-700/45 bg-slate-900/45 px-3 py-2 text-xs text-slate-200">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-[var(--font-jetbrains)] text-sm text-white">
        {value !== null ? `${value.toFixed(1)} ${suffix}` : "--"}
      </p>
    </div>
  );
}

function CalibrationComparisonCardBase({ calibration, current }: Props) {
  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Calibration Comparison</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reference vs Live</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Calibration Posture</p>
          {calibration ? (
            <SnapshotPoseCanvas snapshot={calibration} label="Calibration posture" />
          ) : (
            <div className="grid h-44 place-items-center rounded-2xl border border-dashed border-slate-700/65 bg-slate-900/35 text-sm text-slate-400">
              Run calibration to capture reference posture.
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Current Posture</p>
          {current ? (
            <SnapshotPoseCanvas snapshot={current} label="Current posture" />
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
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {metricRow("Calibration Forward Head", calibration?.metrics.forwardHeadDistancePx ?? null, "px")}
        {metricRow("Current Forward Head", current?.metrics.forwardHeadDistancePx ?? null, "px")}
      </div>
    </section>
  );
}

function SnapshotPoseCanvas({ snapshot, label }: { snapshot: PostureSnapshot; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const landmarks = snapshot.landmarks;
      const nose = landmarks[0];
      const leftEar = landmarks[7];
      const rightEar = landmarks[8];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const shoulderMid =
        leftShoulder && rightShoulder
          ? {
              x: (leftShoulder.x + rightShoulder.x) / 2,
              y: (leftShoulder.y + rightShoulder.y) / 2
            }
          : null;

      if (leftShoulder && rightShoulder) {
        ctx.strokeStyle = "#55f5b5";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x * canvas.width, leftShoulder.y * canvas.height);
        ctx.lineTo(rightShoulder.x * canvas.width, rightShoulder.y * canvas.height);
        ctx.stroke();
      }

      if (shoulderMid && nose) {
        ctx.strokeStyle = "#5ef0ff";
        ctx.beginPath();
        ctx.moveTo(shoulderMid.x * canvas.width, shoulderMid.y * canvas.height);
        ctx.lineTo(nose.x * canvas.width, nose.y * canvas.height);
        ctx.stroke();
      }

      ctx.fillStyle = "#d8ebff";
      [0, 7, 8, 11, 12].forEach((index) => {
        const point = landmarks[index];
        if (!point) return;
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    image.src = snapshot.imageDataUrl;
  }, [snapshot]);

  return <canvas ref={canvasRef} aria-label={label} className="h-44 w-full rounded-2xl border border-slate-700/50 object-cover" />;
}

export const CalibrationComparisonCard = memo(CalibrationComparisonCardBase);
