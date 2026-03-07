import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { CalibrationState, PostureDebugData, PostureMetrics, PostureState } from "@/lib/types";
import { useState } from "react";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: PostureState;
  score: number;
  metrics: PostureMetrics;
  tips: string[];
  cameraReady: boolean;
  modelStatus: string;
  error: string | null;
  isCalibrating: boolean;
  calibrationProgress: number;
  calibrationStatus: CalibrationState;
  calibrationMessage: string | null;
  trackingStable: boolean;
  trackingConfidence: number;
  debugData: PostureDebugData;
  onCalibrate: () => void;
  canCalibrate: boolean;
};

function metricValue(value: number) {
  return (value * 100).toFixed(1);
}

function scoreColor(score: number) {
  if (score >= 75) return "#55f5b5";
  if (score >= 50) return "#f2c14f";
  return "#ff5d7d";
}

export function LiveDashboard({
  videoRef,
  canvasRef,
  state,
  score,
  metrics,
  tips,
  cameraReady,
  modelStatus,
  error,
  isCalibrating,
  calibrationProgress,
  calibrationStatus,
  calibrationMessage,
  trackingStable,
  trackingConfidence,
  debugData,
  onCalibrate,
  canCalibrate
}: Props) {
  const [showDebug, setShowDebug] = useState(false);
  const statusText = error
    ? error
    : !cameraReady
      ? "Camera idle"
      : state === "NO_PERSON"
        ? "No person in frame"
        : trackingStable
          ? "Tracking active"
          : "Tracking unstable";

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * score) / 100;

  return (
    <section id="dashboard" className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="panel relative overflow-hidden rounded-3xl p-4 shadow-glow sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Live Posture Detection</h2>
          <div className="flex items-center gap-2">
            <StatusBadge state={state} />
            <button
              onClick={onCalibrate}
              disabled={!cameraReady || isCalibrating}
              className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCalibrating ? "Calibrating..." : "Calibrate Posture"}
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-600/35 bg-black/45">
          <video ref={videoRef} autoPlay muted playsInline className="h-auto w-full scale-x-[-1]" />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]" />
          <div className="absolute left-3 top-3 rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-200">
            {statusText}
          </div>
          {isCalibrating ? (
            <div className="absolute inset-x-3 bottom-3 rounded-lg border border-cyan-200/30 bg-slate-900/80 p-2 text-xs text-cyan-100">
              <p>Sit in your ideal upright posture and hold still... {calibrationProgress}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-700">
                <div className="h-full bg-cyan-300 transition-all" style={{ width: `${calibrationProgress}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Model: {modelStatus} | Tracking Confidence: {(trackingConfidence * 100).toFixed(0)}% | Calibration Status:{" "}
          {calibrationStatus === "CALIBRATED"
            ? "Calibrated successfully"
            : calibrationStatus === "CALIBRATING"
              ? "Calibrating"
              : "Not calibrated"}
        </p>
        {calibrationMessage ? <p className="mt-1 text-xs text-cyan-200">{calibrationMessage}</p> : null}
        {!canCalibrate ? (
          <p className="mt-1 text-xs text-slate-400">
            You can calibrate in demo mode. Sign in to save calibration for your account.
          </p>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="space-y-6"
      >
        <div className="panel rounded-3xl p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Live Score</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r={radius} strokeWidth="8" fill="none" className="stroke-slate-800" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  stroke={scoreColor(score)}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-2xl font-bold text-white">{score}</div>
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Posture Score</p>
              <p className="text-sm text-slate-300">Deviation-from-baseline scoring with smoothing and hysteresis.</p>
            </div>
          </div>
        </div>

        <div className="panel rounded-3xl p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Smart Coaching</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {tips.slice(0, 2).map((tip) => (
              <li key={tip} className="rounded-xl border border-slate-600/35 bg-slate-900/35 px-3 py-2">
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel rounded-3xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Developer Metrics</h3>
            <button
              onClick={() => setShowDebug((prev) => !prev)}
              className="rounded-md border border-slate-600/50 px-2 py-1 text-xs text-slate-200"
            >
              {showDebug ? "Hide" : "Show"}
            </button>
          </div>
          {showDebug ? (
            <div className="space-y-3 text-xs text-slate-200">
              <p>State: {debugData.state}</p>
              <p>Smoothed Score: {debugData.smoothedScore} | Raw Score: {debugData.rawScore}</p>
              <p>
                Tracking: {debugData.trackingStable ? "Stable" : "Unstable"} ({(debugData.trackingConfidence * 100).toFixed(1)}%)
              </p>
              <p>Dominant Issue: {debugData.dominantIssue ?? "None"}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Baseline</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {debugData.baseline
                      ? `${metricValue(debugData.baseline.forwardHeadOffset)} / ${metricValue(debugData.baseline.shoulderImbalance)} / ${metricValue(debugData.baseline.headTilt)} / ${metricValue(debugData.baseline.torsoLean)}`
                      : "Not calibrated"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Live Metrics</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.rawMetrics.forwardHeadOffset)} / {metricValue(debugData.rawMetrics.shoulderImbalance)} /{" "}
                    {metricValue(debugData.rawMetrics.headTilt)} / {metricValue(debugData.rawMetrics.torsoLean)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Deviation</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.deviation.forwardHeadOffset)} / {metricValue(debugData.deviation.shoulderImbalance)} /{" "}
                    {metricValue(debugData.deviation.headTilt)} / {metricValue(debugData.deviation.torsoLean)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Penalty Weights</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {debugData.penalties.forwardHeadOffset.toFixed(1)} / {debugData.penalties.shoulderImbalance.toFixed(1)} /{" "}
                    {debugData.penalties.headTilt.toFixed(1)} / {debugData.penalties.torsoLean.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Hidden by default. Use for tuning posture accuracy.</p>
          )}
        </div>

        <div className="panel rounded-3xl p-6">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Posture Metrics</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
              <p className="text-slate-400">Forward Head</p>
              <p className="font-[var(--font-jetbrains)] text-base text-white">{metricValue(metrics.forwardHeadOffset)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
              <p className="text-slate-400">Shoulder Imbalance</p>
              <p className="font-[var(--font-jetbrains)] text-base text-white">{metricValue(metrics.shoulderImbalance)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
              <p className="text-slate-400">Head Tilt</p>
              <p className="font-[var(--font-jetbrains)] text-base text-white">{metricValue(metrics.headTilt)}</p>
            </div>
            <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
              <p className="text-slate-400">Torso Lean</p>
              <p className="font-[var(--font-jetbrains)] text-base text-white">{metricValue(metrics.torsoLean)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
