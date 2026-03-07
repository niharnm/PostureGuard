import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { PoseOverlayCanvas } from "@/components/PoseOverlayCanvas";
import {
  CalibrationPhase,
  CalibrationQuality,
  CalibrationState,
  PostureDebugData,
  PostureMetrics,
  PostureState,
  SnapshotMetrics
} from "@/lib/types";

type ScoreTrend = "IMPROVING" | "STABLE" | "DECLINING";

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
  calibrationPhase: CalibrationPhase;
  calibrationCountdown: number | null;
  calibrationQuality: CalibrationQuality | null;
  calibratedAt: number | null;
  calibrationMessage: string | null;
  trackingStable: boolean;
  trackingConfidence: number;
  breakMode: boolean;
  debugData: PostureDebugData;
  debugEnabled: boolean;
  scoreTrend: ScoreTrend;
  onCalibrate: () => void;
  onDebugEnabledChange: (enabled: boolean) => void;
  canCalibrate: boolean;
  warningBanner: string | null;
  overlayMetrics: SnapshotMetrics;
};

function metricValue(value: number) {
  return (value * 100).toFixed(1);
}

function scoreColor(score: number) {
  if (score >= 85) return "#55f5b5";
  if (score >= 70) return "#c5f36a";
  if (score >= 55) return "#f2c14f";
  return "#ff5d7d";
}

function scoreGrade(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function postureLabel(score: number) {
  if (score >= 85) return "Great Posture";
  if (score >= 70) return "Needs Work";
  return "Poor Posture";
}

function trendLabel(trend: ScoreTrend) {
  if (trend === "IMPROVING") return "Improving";
  if (trend === "DECLINING") return "Declining";
  return "Stable";
}

function trendTone(trend: ScoreTrend) {
  if (trend === "IMPROVING") return "text-emerald-100 border-emerald-200/35 bg-emerald-300/20";
  if (trend === "DECLINING") return "text-rose-100 border-rose-200/35 bg-rose-300/20";
  return "text-sky-100 border-sky-200/35 bg-sky-300/20";
}

function calibrationStatusLabel(status: CalibrationState) {
  if (status === "CALIBRATED") return "Calibrated";
  if (status === "CALIBRATING") return "Calibrating";
  return "Not calibrated";
}

function calibrationStatusTone(status: CalibrationState) {
  if (status === "CALIBRATED") return "text-emerald-200 border-emerald-300/35 bg-emerald-400/10";
  if (status === "CALIBRATING") return "text-cyan-100 border-cyan-300/35 bg-cyan-400/10";
  return "text-amber-100 border-amber-300/35 bg-amber-400/10";
}

function scoreCardTone(score: number) {
  if (score >= 85) return "border-emerald-300/45 bg-gradient-to-br from-emerald-500/30 via-emerald-400/10 to-slate-950";
  if (score >= 70) return "border-lime-300/45 bg-gradient-to-br from-lime-500/25 via-lime-300/10 to-slate-950";
  if (score >= 55) return "border-amber-300/45 bg-gradient-to-br from-amber-500/25 via-amber-300/10 to-slate-950";
  return "border-rose-300/45 bg-gradient-to-br from-rose-500/25 via-rose-300/10 to-slate-950";
}

function LiveDashboardBase({
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
  calibrationPhase,
  calibrationCountdown,
  calibrationQuality,
  calibratedAt,
  calibrationMessage,
  trackingStable,
  trackingConfidence,
  breakMode,
  debugData,
  debugEnabled,
  scoreTrend,
  onCalibrate,
  onDebugEnabledChange,
  canCalibrate,
  warningBanner,
  overlayMetrics
}: Props) {
  const [showDebug, setShowDebug] = useState(debugEnabled);

  useEffect(() => {
    setShowDebug(debugEnabled);
  }, [debugEnabled]);

  useEffect(() => {
    onDebugEnabledChange(showDebug);
  }, [onDebugEnabledChange, showDebug]);

  const statusText = useMemo(() => {
    if (error) return error;
    if (!cameraReady) return "Camera idle";
    if (state === "NO_PERSON") return "No person in frame";
    if (breakMode) return "Break mode active";
    return trackingStable ? "Tracking stable" : "Tracking unstable";
  }, [breakMode, cameraReady, error, state, trackingStable]);

  const scoreRing = useMemo(() => {
    const radius = 64;
    const center = 76;
    const size = 152;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (circumference * score) / 100;
    return { radius, center, size, circumference, dashOffset };
  }, [score]);

  const scoreMeta = useMemo(() => {
    return {
      color: scoreColor(score),
      grade: scoreGrade(score),
      label: postureLabel(score),
      trend: trendLabel(scoreTrend)
    };
  }, [score, scoreTrend]);

  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  return (
    <section id="dashboard" className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="panel relative overflow-hidden rounded-3xl p-4 shadow-glow sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">Skeleton Visualization</h2>
          <div className="flex items-center gap-2">
            <StatusBadge state={state} />
            <span
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${calibrationStatusTone(calibrationStatus)}`}
            >
              {calibrationStatusLabel(calibrationStatus)}
            </span>
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
          <PoseOverlayCanvas
            canvasRef={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
          />
          <div className="absolute left-3 top-3 rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-200">{statusText}</div>
          {isCalibrating ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/62 p-4">
              <div className="w-full max-w-sm rounded-2xl border border-cyan-300/35 bg-slate-950/90 p-4 text-cyan-50 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Calibration</p>
                <h3 className="mt-2 text-base font-semibold">
                  {calibrationPhase === "INSTRUCTIONS"
                    ? "Sit in your straight, ideal posture"
                    : calibrationPhase === "SCANNING"
                      ? "Scanning posture baseline..."
                      : "Finalizing baseline"}
                </h3>
                <p className="mt-1 text-xs text-cyan-100/85">
                  Keep shoulders level and head upright. Hold still for a full 10-second scan.
                </p>
                {calibrationPhase === "SCANNING" ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-cyan-100">Time remaining: {calibrationCountdown ?? 0}s</p>
                    <p className="text-xs text-cyan-100/90">Scanning posture baseline... {calibrationProgress}%</p>
                    <div className="h-2 overflow-hidden rounded bg-slate-700">
                      <div className="h-full bg-cyan-300 transition-all duration-200" style={{ width: `${calibrationProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 h-2 overflow-hidden rounded bg-slate-700">
                    <div className="h-full bg-cyan-300/80 transition-all duration-200" style={{ width: `${calibrationProgress}%` }} />
                  </div>
                )}
              </div>
            </div>
          ) : null}
          {breakMode ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 p-4">
              <div className="rounded-2xl border border-violet-300/40 bg-violet-400/15 px-5 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-violet-100">Break Mode Active</p>
                <p className="mt-1 text-sm text-violet-50">Camera tracking paused.</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/45 bg-slate-900/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Head Tilt</p>
            <p className="font-[var(--font-jetbrains)] text-base text-white">{overlayMetrics.headAlignmentDeg.toFixed(1)} deg</p>
          </div>
          <div className="rounded-lg border border-slate-700/45 bg-slate-900/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Shoulder Imbalance</p>
            <p className="font-[var(--font-jetbrains)] text-base text-white">{overlayMetrics.shoulderBalanceDeg.toFixed(1)} deg</p>
          </div>
          <div className="rounded-lg border border-slate-700/45 bg-slate-900/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Forward Head Distance</p>
            <p className="font-[var(--font-jetbrains)] text-base text-white">{Math.round(overlayMetrics.forwardHeadDistancePx)} px</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Model: {modelStatus} | Tracking Confidence: {(trackingConfidence * 100).toFixed(0)}% | Tracking: {trackingStable ? "Stable" : "Unstable"}
        </p>
        {calibratedAt ? (
          <p className="mt-1 text-xs text-emerald-200">Personal baseline saved: {new Date(calibratedAt).toLocaleString()}</p>
        ) : null}
        {calibrationQuality && calibrationStatus === "CALIBRATED" ? (
          <p className="mt-1 text-xs text-slate-300">
            Calibration quality: {Math.round(calibrationQuality.stabilityScore * 100)}% stability from {calibrationQuality.goodFrames}/
            {calibrationQuality.totalFrames} good frames.
          </p>
        ) : null}
        {warningBanner ? (
          <div className="mt-2 rounded-lg border border-danger/35 bg-danger/15 px-3 py-2 text-xs text-red-100">{warningBanner}</div>
        ) : null}
        {calibrationMessage ? <p className="mt-1 text-xs text-cyan-200">{calibrationMessage}</p> : null}
        {calibrationStatus === "NOT_CALIBRATED" && cameraReady ? (
          <p className="mt-1 text-xs text-amber-100">For best accuracy, calibrate posture before starting a session.</p>
        ) : null}
        {!canCalibrate ? (
          <p className="mt-1 text-xs text-slate-400">You can calibrate in demo mode. Sign in to save calibration for your account.</p>
        ) : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="space-y-6"
      >
        <div className={`panel rounded-3xl border p-6 text-center ${scoreCardTone(score)}`}>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-200">Live Posture Score</p>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="relative h-40 w-40 sm:h-[152px] sm:w-[152px]">
              <svg viewBox={`0 0 ${scoreRing.size} ${scoreRing.size}`} className="h-full w-full -rotate-90">
                <circle
                  cx={scoreRing.center}
                  cy={scoreRing.center}
                  r={scoreRing.radius}
                  strokeWidth="10"
                  fill="none"
                  className="stroke-slate-900/70"
                />
                <circle
                  cx={scoreRing.center}
                  cy={scoreRing.center}
                  r={scoreRing.radius}
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  stroke={scoreMeta.color}
                  strokeDasharray={scoreRing.circumference}
                  strokeDashoffset={scoreRing.dashOffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <p className="text-5xl font-bold leading-none text-white">{score}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">Grade {scoreMeta.grade}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-white">{scoreMeta.label}</p>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${trendTone(scoreTrend)}`}>
                Trend: {scoreMeta.trend}
              </span>
              <p className="text-xs text-slate-300">Judge view: larger score with grade and status for fast readability.</p>
            </div>
          </div>
        </div>

        <div className="panel rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Calibration Quick Access</h3>
            <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${calibrationStatusTone(calibrationStatus)}`}>
              {calibrationStatusLabel(calibrationStatus)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-300">Calibration stays visible here so it is not buried during demo flow.</p>
          <button
            onClick={onCalibrate}
            disabled={!cameraReady || isCalibrating}
            className="mt-3 w-full rounded-xl border border-cyan-300/35 bg-cyan-300/15 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCalibrating ? "Calibrating..." : "Run Calibration"}
          </button>
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
            <button onClick={toggleDebug} className="rounded-md border border-slate-600/50 px-2 py-1 text-xs text-slate-200">
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
                  <p className="text-slate-400">Baseline Extras</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {debugData.baselineExtras
                      ? `${metricValue(debugData.baselineExtras.noseShoulderOffset)} / ${debugData.baselineExtras.upperBodySymmetry.toFixed(2)} / ${(debugData.baselineExtras.visibility * 100).toFixed(0)}%`
                      : "Not calibrated"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Live Metrics</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.rawMetrics.forwardHeadOffset)} / {metricValue(debugData.rawMetrics.shoulderImbalance)} / {metricValue(debugData.rawMetrics.headTilt)} / {metricValue(debugData.rawMetrics.torsoLean)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Deviation</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.deviation.forwardHeadOffset)} / {metricValue(debugData.deviation.shoulderImbalance)} / {metricValue(debugData.deviation.headTilt)} / {metricValue(debugData.deviation.torsoLean)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Live Extras</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.rawExtras.noseShoulderOffset)} / {debugData.rawExtras.upperBodySymmetry.toFixed(2)} / {(debugData.rawExtras.visibility * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/45 bg-slate-900/35 p-2">
                  <p className="text-slate-400">Extra Deviation</p>
                  <p className="font-[var(--font-jetbrains)]">
                    {metricValue(debugData.deviationExtras.noseShoulderOffset)} / {debugData.deviationExtras.upperBodySymmetry.toFixed(2)} / {(debugData.deviationExtras.visibility * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Debug metrics are paused while hidden for performance.</p>
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

export const LiveDashboard = memo(LiveDashboardBase);
