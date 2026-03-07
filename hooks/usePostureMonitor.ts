"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  clamp,
  classifyPosture,
  computeCalibrationExtras,
  computeMetrics,
  computeTrackingConfidence,
  feedbackFromSession,
  formatDuration,
  metricDelta,
  scoreFromDeviation,
  tipsFromIssues
} from "@/lib/posture";
import {
  CalibrationBaseline,
  CalibrationExtraMetrics,
  CalibrationPhase,
  CalibrationQuality,
  PersonalBaseline,
  CalibrationState,
  PersistedSession,
  PostureSnapshot,
  PostureDebugData,
  PostureMetrics,
  PostureState,
  SessionStats,
  SessionSummary,
  SnapshotMetrics,
  TrendPoint,
  VictorContextPayload
} from "@/lib/types";

type ModelStatus = "IDLE" | "LOADING" | "READY" | "ERROR";

type HookOptions = {
  isAuthenticated: boolean;
  userId?: string;
};

type CalibrationSample = {
  metrics: PostureMetrics;
  extras: CalibrationExtraMetrics;
  confidence: number;
  motion: number;
  landmarks: { x: number; y: number }[];
};

const FALLBACK_METRICS: PostureMetrics = {
  forwardHeadOffset: 0,
  shoulderImbalance: 0,
  headTilt: 0,
  torsoLean: 0
};
const DEFAULT_ALIGNMENT_METRICS: SnapshotMetrics = {
  headAlignmentDeg: 0,
  shoulderBalanceDeg: 0,
  forwardHeadDistancePx: 0
};

const DEFAULT_STATS: SessionStats = {
  goodMs: 0,
  warnMs: 0,
  badMs: 0,
  sessionScore: 100
};

const DEFAULT_DEBUG: PostureDebugData = {
  baseline: null,
  baselineExtras: null,
  rawMetrics: FALLBACK_METRICS,
  rawExtras: {
    noseShoulderOffset: 0,
    upperBodySymmetry: 0,
    visibility: 0
  },
  deviation: FALLBACK_METRICS,
  deviationExtras: {
    noseShoulderOffset: 0,
    upperBodySymmetry: 0,
    visibility: 0
  },
  penalties: {
    forwardHeadOffset: 0,
    shoulderImbalance: 0,
    headTilt: 0,
    torsoLean: 0
  },
  rawScore: 100,
  smoothedScore: 100,
  trackingConfidence: 0,
  trackingStable: false,
  dominantIssue: null,
  state: "NO_PERSON",
  calibrationQuality: null
};

const KEY_VISIBILITY_POINTS = [7, 8, 11, 12, 23, 24];
const SCORE_WINDOW_SIZE = 32;
const STATE_THRESHOLD = {
  goodToWarn: 74,
  warnToBad: 56,
  badHardFloor: 44,
  warnToGood: 82,
  badToWarn: 64
};
const HOLD_MS: Record<string, number> = {
  "GOOD->WARN": 2200,
  "WARN->BAD": 3400,
  "GOOD->BAD": 4200,
  "WARN->GOOD": 2100,
  "BAD->WARN": 1800,
  "BAD->GOOD": 3200
};

const CALIBRATION_INSTRUCTION_MS = 1_200;
const CALIBRATION_SCAN_MS = 10_000;
const CALIBRATION_MIN_FRAMES = 140;
const CALIBRATION_MIN_GOOD_FRAME_RATIO = 0.72;
const CALIBRATION_MIN_CONFIDENCE = 0.68;
const CALIBRATION_MAX_AVG_MOTION = 0.02;
const CALIBRATION_MAX_STABILITY_SPREAD = 0.04;
const TRACKING_STABLE_THRESHOLD = 0.58;
const TRACKING_UNSTABLE_THRESHOLD = 0.5;
const BAD_ALERT_DELAY_MS = 10_000;
const TREND_PUSH_INTERVAL_MS = 2_000;
const SNAPSHOT_INTERVAL_MS = 1_800;
const OVERLAY_METRIC_PUSH_INTERVAL_MS = 220;
const METRIC_SMOOTH_ALPHA_STABLE = 0.22;
const METRIC_SMOOTH_ALPHA_UNSTABLE = 0.08;
const SCORE_STEP_STABLE = 1.2;
const SCORE_STEP_UNSTABLE = 0.45;
const UNSTABLE_SCORE_MIX = 0.08;
const SMOOTH_WEIGHTS = [
  0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.022, 0.024, 0.026,
  0.028, 0.03, 0.032, 0.034, 0.037, 0.04, 0.043, 0.047, 0.051, 0.055, 0.06, 0.065, 0.07, 0.075, 0.082, 0.09
];

function weightedAverage(values: number[]) {
  const activeWeights = SMOOTH_WEIGHTS.slice(SMOOTH_WEIGHTS.length - values.length);
  const totalWeight = activeWeights.reduce((sum, item) => sum + item, 0);
  if (!totalWeight) return 100;
  const weightedSum = values.reduce((sum, value, idx) => sum + value * activeWeights[idx], 0);
  return Math.round(weightedSum / totalWeight);
}

function averageMetrics(metrics: PostureMetrics[]) {
  if (!metrics.length) return null;
  const totals = metrics.reduce(
    (acc, item) => ({
      forwardHeadOffset: acc.forwardHeadOffset + item.forwardHeadOffset,
      shoulderImbalance: acc.shoulderImbalance + item.shoulderImbalance,
      headTilt: acc.headTilt + item.headTilt,
      torsoLean: acc.torsoLean + item.torsoLean
    }),
    { ...FALLBACK_METRICS }
  );

  return {
    forwardHeadOffset: totals.forwardHeadOffset / metrics.length,
    shoulderImbalance: totals.shoulderImbalance / metrics.length,
    headTilt: totals.headTilt / metrics.length,
    torsoLean: totals.torsoLean / metrics.length
  };
}

function averageExtras(metrics: CalibrationExtraMetrics[]) {
  if (!metrics.length) return null;
  const totals = metrics.reduce(
    (acc, item) => ({
      noseShoulderOffset: acc.noseShoulderOffset + item.noseShoulderOffset,
      upperBodySymmetry: acc.upperBodySymmetry + item.upperBodySymmetry,
      visibility: acc.visibility + item.visibility
    }),
    { noseShoulderOffset: 0, upperBodySymmetry: 0, visibility: 0 }
  );

  return {
    noseShoulderOffset: totals.noseShoulderOffset / metrics.length,
    upperBodySymmetry: totals.upperBodySymmetry / metrics.length,
    visibility: totals.visibility / metrics.length
  } satisfies CalibrationExtraMetrics;
}

function metricSpread(samples: PostureMetrics[]) {
  if (samples.length < 2) return 0;
  const mean = averageMetrics(samples);
  if (!mean) return 0;
  const totalDistance = samples.reduce((sum, sample) => sum + metricDistance(sample, mean), 0);
  return totalDistance / samples.length;
}

function smoothMetrics(previous: PostureMetrics | null, current: PostureMetrics, alpha: number): PostureMetrics {
  if (!previous) return current;
  const nextAlpha = clamp(alpha, 0.01, 0.95);
  return {
    forwardHeadOffset: previous.forwardHeadOffset + (current.forwardHeadOffset - previous.forwardHeadOffset) * nextAlpha,
    shoulderImbalance: previous.shoulderImbalance + (current.shoulderImbalance - previous.shoulderImbalance) * nextAlpha,
    headTilt: previous.headTilt + (current.headTilt - previous.headTilt) * nextAlpha,
    torsoLean: previous.torsoLean + (current.torsoLean - previous.torsoLean) * nextAlpha
  };
}

function smoothExtras(
  previous: CalibrationExtraMetrics | null,
  current: CalibrationExtraMetrics,
  alpha: number
): CalibrationExtraMetrics {
  if (!previous) return current;
  const nextAlpha = clamp(alpha, 0.01, 0.95);
  return {
    noseShoulderOffset: previous.noseShoulderOffset + (current.noseShoulderOffset - previous.noseShoulderOffset) * nextAlpha,
    upperBodySymmetry: previous.upperBodySymmetry + (current.upperBodySymmetry - previous.upperBodySymmetry) * nextAlpha,
    visibility: previous.visibility + (current.visibility - previous.visibility) * nextAlpha
  };
}

function toCalibrationPayload(metrics: PostureMetrics): CalibrationBaseline {
  return {
    baselineForward: metrics.forwardHeadOffset,
    baselineShoulder: metrics.shoulderImbalance,
    baselineHeadTilt: metrics.headTilt,
    baselineTorsoAlign: metrics.torsoLean
  };
}

function toMetricsFromCalibration(baseline: CalibrationBaseline): PostureMetrics {
  return {
    forwardHeadOffset: baseline.baselineForward,
    shoulderImbalance: baseline.baselineShoulder,
    headTilt: baseline.baselineHeadTilt,
    torsoLean: baseline.baselineTorsoAlign
  };
}

function metricDistance(a: PostureMetrics, b: PostureMetrics) {
  return (
    Math.abs(a.forwardHeadOffset - b.forwardHeadOffset) +
    Math.abs(a.shoulderImbalance - b.shoulderImbalance) +
    Math.abs(a.headTilt - b.headTilt) +
    Math.abs(a.torsoLean - b.torsoLean)
  );
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function computeAlignmentMetrics(landmarks: { x: number; y: number }[], videoWidth = 1): SnapshotMetrics {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return DEFAULT_ALIGNMENT_METRICS;
  }

  const headAngle = Math.abs(toDegrees(Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x)));
  const shoulderAngle = Math.abs(
    toDegrees(Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x))
  );
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const forwardHeadDistancePx = Math.abs(nose.x - shoulderMidX) * videoWidth;
  return {
    headAlignmentDeg: Number(headAngle.toFixed(1)),
    shoulderBalanceDeg: Number(shoulderAngle.toFixed(1)),
    forwardHeadDistancePx: Number(forwardHeadDistancePx.toFixed(1))
  };
}

function nextStateCandidate(score: number, activeState: PostureState) {
  if (activeState === "GOOD") {
    if (score <= STATE_THRESHOLD.warnToBad && score <= STATE_THRESHOLD.badHardFloor) return "BAD" as const;
    if (score < STATE_THRESHOLD.goodToWarn) return "WARN" as const;
    return "GOOD" as const;
  }

  if (activeState === "WARN") {
    if (score < STATE_THRESHOLD.warnToBad) return "BAD" as const;
    if (score >= STATE_THRESHOLD.warnToGood) return "GOOD" as const;
    return "WARN" as const;
  }

  if (activeState === "BAD") {
    if (score >= STATE_THRESHOLD.badToWarn && score < STATE_THRESHOLD.warnToGood) return "WARN" as const;
    if (score >= STATE_THRESHOLD.warnToGood) return "GOOD" as const;
    return "BAD" as const;
  }

  return classifyPosture(score);
}

function transitionHoldMs(from: PostureState, to: PostureState) {
  if (from === to) return 0;
  return HOLD_MS[`${from}->${to}`] ?? 1000;
}

function summarizeHistory(sessions: PersistedSession[]) {
  return sessions.slice(0, 8).map((session) => {
    const durationMs = session.endTime
      ? Math.max(0, new Date(session.endTime).getTime() - new Date(session.startTime).getTime())
      : session.timeGoodMs + session.timeWarnMs + session.timeBadMs;

    const total = Math.max(1, session.timeGoodMs + session.timeWarnMs + session.timeBadMs);
    return {
      startTime: session.startTime,
      score: session.score,
      goodRatio: session.timeGoodMs / total,
      warnRatio: session.timeWarnMs / total,
      badRatio: session.timeBadMs / total,
      durationMs
    };
  });
}

export function usePostureMonitor({ isAuthenticated, userId }: HookOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const smoothScoreWindowRef = useRef<number[]>([]);
  const smoothedMetricsRef = useRef<PostureMetrics | null>(null);
  const smoothedExtrasRef = useRef<CalibrationExtraMetrics | null>(null);
  const displayedScoreRef = useRef<number>(100);
  const lastFrameRef = useRef<number | null>(null);
  const activeStateRef = useRef<PostureState>("NO_PERSON");
  const statsRef = useRef<SessionStats>(DEFAULT_STATS);
  const candidateStateRef = useRef<PostureState | null>(null);
  const candidateSinceRef = useRef<number | null>(null);
  const historyLastPushRef = useRef<number | null>(null);
  const personalBaselineRef = useRef<PersonalBaseline | null>(null);
  const calibrationPhaseRef = useRef<CalibrationPhase>("IDLE");
  const calibrationPhaseStartedAtRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<CalibrationSample[]>([]);
  const calibrationLastMetricsRef = useRef<PostureMetrics | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const monitoringStartedAtRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const headTiltAccumulatorRef = useRef({ total: 0, count: 0 });
  const trackingStableRef = useRef(true);
  const trendLastPushRef = useRef<number | null>(null);
  const badSinceRef = useRef<number | null>(null);
  const badAlertSentRef = useRef(false);
  const goodStreakStartedAtRef = useRef<number | null>(null);
  const scoreSamplesRef = useRef<number[]>([]);
  const worstMomentRef = useRef<{ score: number; atMs: number; state: PostureState } | null>(null);
  const snapshotLastCaptureRef = useRef<number | null>(null);
  const overlayMetricsLastPushRef = useRef<number | null>(null);
  const latestLandmarksRef = useRef<{ x: number; y: number }[] | null>(null);

  const [modelStatus, setModelStatus] = useState<ModelStatus>("IDLE");
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PostureState>("NO_PERSON");
  const [score, setScore] = useState(0);
  const [tips, setTips] = useState<string[]>([
    "Press Start Monitoring to begin real-time posture tracking."
  ]);
  const [metrics, setMetrics] = useState<PostureMetrics>(FALLBACK_METRICS);
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS);
  const [timeline, setTimeline] = useState<PostureState[]>([]);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationState>("NOT_CALIBRATED");
  const [calibrationPhase, setCalibrationPhase] = useState<CalibrationPhase>("IDLE");
  const [calibrationCountdown, setCalibrationCountdown] = useState<number | null>(null);
  const [calibrationQuality, setCalibrationQuality] = useState<CalibrationQuality | null>(null);
  const [calibratedAt, setCalibratedAt] = useState<number | null>(null);
  const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null);
  const [trackingConfidence, setTrackingConfidence] = useState(0);
  const [trackingStable, setTrackingStable] = useState(true);
  const [debugData, setDebugData] = useState<PostureDebugData>(DEFAULT_DEBUG);
  const [dominantIssue, setDominantIssue] = useState<string | null>(null);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<PersistedSession[]>([]);
  const [postureTrend, setPostureTrend] = useState<TrendPoint[]>([]);
  const [goodStreakMs, setGoodStreakMs] = useState(0);
  const [badPostureMs, setBadPostureMs] = useState(0);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [calibrationSnapshot, setCalibrationSnapshot] = useState<PostureSnapshot | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<PostureSnapshot | null>(null);
  const [overlayMetrics, setOverlayMetrics] = useState<SnapshotMetrics>(DEFAULT_ALIGNMENT_METRICS);

  const loadPersistedData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      personalBaselineRef.current = null;
      setCalibrationStatus("NOT_CALIBRATED");
      setCalibrationMessage("Calibration is available for this session. Log in to save it to your account.");
      setCalibratedAt(null);
      setSessionHistory([]);
      return;
    }

    const [calibrationRes, sessionsRes] = await Promise.all([
      fetch("/api/calibration", { cache: "no-store" }),
      fetch("/api/sessions", { cache: "no-store" })
    ]);

    if (calibrationRes.ok) {
      const calibrationData = await calibrationRes.json();
      if (calibrationData.calibration) {
        const posture = toMetricsFromCalibration(calibrationData.calibration as CalibrationBaseline);
        personalBaselineRef.current = {
          posture,
          extras: {
            noseShoulderOffset: posture.forwardHeadOffset,
            upperBodySymmetry: 1 - clamp(posture.shoulderImbalance * 2.8 + posture.headTilt * 2.3, 0, 1),
            visibility: 0.8
          },
          quality: {
            totalFrames: 0,
            goodFrames: 0,
            avgConfidence: 0.8,
            avgMotion: 0,
            stabilityScore: 0.75
          },
          calibratedAt: calibrationData.calibration.updatedAt
            ? new Date(calibrationData.calibration.updatedAt).getTime()
            : Date.now()
        };
        setCalibrationStatus("CALIBRATED");
        setCalibrationMessage("Calibration loaded from your account.");
        setCalibratedAt(
          calibrationData.calibration.updatedAt
            ? new Date(calibrationData.calibration.updatedAt).getTime()
            : Date.now()
        );
      } else {
        personalBaselineRef.current = null;
        setCalibrationStatus("NOT_CALIBRATED");
        setCalibrationMessage("No saved calibration. Click 'Calibrate Posture'.");
        setCalibratedAt(null);
      }
    }

    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      setSessionHistory((sessionsData.sessions ?? []) as PersistedSession[]);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    void loadPersistedData();
  }, [loadPersistedData]);

  const maybeRequestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Browsers may block if not user-initiated; ignore.
      }
    }
  }, []);

  const triggerNotification = useCallback((message: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification("PostureGuard Alert", { body: message });
    }
  }, []);

  const playAlertTone = useCallback(() => {
    if (typeof window === "undefined" || !soundAlertEnabled) return;
    const audioCtx = new window.AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
    oscillator.stop(audioCtx.currentTime + 0.24);
    oscillator.onended = () => {
      void audioCtx.close();
    };
  }, [soundAlertEnabled]);

  const captureSnapshot = useCallback((landmarks: { x: number; y: number }[] | null, timestamp: number) => {
    const video = videoRef.current;
    if (!video || !landmarks || !video.videoWidth || !video.videoHeight) return null;

    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    return {
      imageDataUrl: captureCanvas.toDataURL("image/jpeg", 0.8),
      capturedAt: timestamp,
      landmarks: landmarks.map((point) => ({ x: point.x, y: point.y })),
      metrics: computeAlignmentMetrics(landmarks, captureCanvas.width)
    } satisfies PostureSnapshot;
  }, []);

  const drawOverlay = useCallback((landmarks: { x: number; y: number }[] | null, label: PostureState, now: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!landmarks) {
      ctx.fillStyle = "rgba(7, 10, 22, 0.65)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#9eb8ff";
      ctx.font = '600 18px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("No person detected", width / 2, height / 2);
      if (
        !overlayMetricsLastPushRef.current ||
        now - overlayMetricsLastPushRef.current >= OVERLAY_METRIC_PUSH_INTERVAL_MS
      ) {
        setOverlayMetrics(DEFAULT_ALIGNMENT_METRICS);
        overlayMetricsLastPushRef.current = now;
      }
      return;
    }

    const alignment = computeAlignmentMetrics(landmarks, width);
    if (
      !overlayMetricsLastPushRef.current ||
      now - overlayMetricsLastPushRef.current >= OVERLAY_METRIC_PUSH_INTERVAL_MS
    ) {
      setOverlayMetrics(alignment);
      overlayMetricsLastPushRef.current = now;
    }

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
    const earMid =
      leftEar && rightEar
        ? {
            x: (leftEar.x + rightEar.x) / 2,
            y: (leftEar.y + rightEar.y) / 2
          }
        : null;

    const color = label === "GOOD" ? "#55f5b5" : label === "WARN" ? "#f2c14f" : "#ff5d7d";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;

    if (leftShoulder && rightShoulder) {
      ctx.beginPath();
      ctx.moveTo(leftShoulder.x * width, leftShoulder.y * height);
      ctx.lineTo(rightShoulder.x * width, rightShoulder.y * height);
      ctx.stroke();
    }

    if (shoulderMid && nose) {
      ctx.strokeStyle = "#5ef0ff";
      ctx.beginPath();
      ctx.moveTo(shoulderMid.x * width, shoulderMid.y * height);
      ctx.lineTo(nose.x * width, nose.y * height);
      ctx.stroke();
    }

    if (nose && earMid) {
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(nose.x * width, nose.y * height);
      ctx.lineTo((nose.x + (nose.x - earMid.x) * 0.7) * width, (nose.y + (nose.y - earMid.y) * 0.7) * height);
      ctx.stroke();
    }

    ctx.fillStyle = "#d8ebff";
    [0, 7, 8, 11, 12].forEach((index) => {
      const point = landmarks[index];
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(10, 16, 32, 0.78)";
    ctx.fillRect(10, height - 94, 270, 84);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`Head tilt: ${alignment.headAlignmentDeg.toFixed(1)} deg`, 18, height - 62);
    ctx.fillText(`Shoulder imbalance: ${alignment.shoulderBalanceDeg.toFixed(1)} deg`, 18, height - 40);
    ctx.fillText(`Forward head distance: ${Math.round(alignment.forwardHeadDistancePx)} px`, 18, height - 18);
  }, []);

  const updateSessionStats = useCallback((nextState: PostureState, nextScore: number, now: number) => {
    const last = lastFrameRef.current;
    lastFrameRef.current = now;
    if (!last) {
      activeStateRef.current = nextState;
      historyLastPushRef.current = now;
      trendLastPushRef.current = now;
      if (nextState === "GOOD") {
        goodStreakStartedAtRef.current = now;
      }
      if (nextState === "BAD") {
        badSinceRef.current = now;
      }
      return;
    }

    const delta = now - last;
    const next = { ...statsRef.current };

    if (sessionActiveRef.current) {
      if (activeStateRef.current === "GOOD") next.goodMs += delta;
      if (activeStateRef.current === "WARN") next.warnMs += delta;
      if (activeStateRef.current === "BAD") next.badMs += delta;

      const total = next.goodMs + next.warnMs + next.badMs;
      next.sessionScore = total ? Math.round((next.goodMs / total) * 100) : 100;
      scoreSamplesRef.current.push(nextScore);

      if (sessionStartedAtRef.current) {
        const atMs = Math.max(0, Date.now() - sessionStartedAtRef.current);
        if (!worstMomentRef.current || nextScore < worstMomentRef.current.score) {
          worstMomentRef.current = {
            score: nextScore,
            atMs,
            state: nextState
          };
        }
      }
    }

    const lastPush = historyLastPushRef.current;
    if (lastPush && now - lastPush >= 1000) {
      setTimeline((prev) => [...prev.slice(-119), nextState]);
      historyLastPushRef.current = now;
    }

    const trendLastPush = trendLastPushRef.current;
    if (!trendLastPush || now - trendLastPush >= TREND_PUSH_INTERVAL_MS) {
      const elapsedSecBase = sessionActiveRef.current && sessionStartedAtRef.current
        ? Math.max(0, (Date.now() - sessionStartedAtRef.current) / 1000)
        : Math.max(0, (Date.now() - (monitoringStartedAtRef.current ?? Date.now())) / 1000);
      setPostureTrend((prev) => [
        ...prev.slice(-89),
        {
          elapsedSec: Math.round(elapsedSecBase),
          score: nextScore,
          label: `${Math.round(elapsedSecBase)}s`
        }
      ]);
      trendLastPushRef.current = now;
    }

    if (nextState === "GOOD") {
      if (!goodStreakStartedAtRef.current) goodStreakStartedAtRef.current = now;
      setGoodStreakMs(Math.max(0, now - goodStreakStartedAtRef.current));
    } else {
      goodStreakStartedAtRef.current = null;
      setGoodStreakMs(0);
    }

    if (nextState === "BAD") {
      if (!badSinceRef.current) badSinceRef.current = now;
      const badDuration = Math.max(0, now - badSinceRef.current);
      setBadPostureMs(badDuration);
      if (badDuration >= BAD_ALERT_DELAY_MS && !badAlertSentRef.current) {
        const message = "You've broken your posture streak.";
        setAlertBanner(message);
        triggerNotification(message);
        playAlertTone();
        badAlertSentRef.current = true;
      }
    } else {
      badSinceRef.current = null;
      badAlertSentRef.current = false;
      setBadPostureMs(0);
      setAlertBanner(null);
    }

    activeStateRef.current = nextState;
    statsRef.current = next;
    if (sessionActiveRef.current) setStats(next);
  }, [playAlertTone, triggerNotification]);

  const stopMonitoring = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
    lastFrameRef.current = null;
    monitoringStartedAtRef.current = null;
    setBadPostureMs(0);
    setAlertBanner(null);
    setOverlayMetrics(DEFAULT_ALIGNMENT_METRICS);
    overlayMetricsLastPushRef.current = null;
  }, []);

  const beginCalibration = useCallback(() => {
    if (!cameraReady) {
      setError("Start monitoring first, then run calibration.");
      return;
    }

    calibrationPhaseRef.current = "INSTRUCTIONS";
    calibrationPhaseStartedAtRef.current = performance.now();
    calibrationSamplesRef.current = [];
    calibrationLastMetricsRef.current = null;
    setCalibrationStatus("CALIBRATING");
    setCalibrationPhase("INSTRUCTIONS");
    setCalibrationCountdown(10);
    setCalibrationQuality(null);
    setCalibrationMessage("Sit in your straight, ideal posture. Hold still for 10 seconds while we learn your baseline.");
    setCalibrationProgress(0);
    setTips([
      "Sit in your straight, ideal posture.",
      "Keep your shoulders level, head upright, and hold still for 10 seconds."
    ]);
  }, [cameraReady]);

  const finalizeCalibration = useCallback(async () => {
    const samples = calibrationSamplesRef.current;
    const previousBaseline = personalBaselineRef.current;

    const validSamples = samples.filter((sample) => sample.confidence >= TRACKING_UNSTABLE_THRESHOLD);
    const stableSamples = validSamples.filter((sample) => sample.confidence >= CALIBRATION_MIN_CONFIDENCE);
    const stableMetrics = stableSamples.map((sample) => sample.metrics);
    const stableExtras = stableSamples.map((sample) => sample.extras);

    const avgConfidence =
      validSamples.length > 0
        ? validSamples.reduce((sum, sample) => sum + sample.confidence, 0) / validSamples.length
        : 0;

    const avgMotion =
      validSamples.length > 0
        ? validSamples.reduce((sum, sample) => sum + sample.motion, 0) / validSamples.length
        : Number.POSITIVE_INFINITY;

    const spread = metricSpread(stableMetrics);
    const goodFrameRatio = samples.length ? stableSamples.length / samples.length : 0;
    const stabilityScore = clamp(1 - spread / Math.max(CALIBRATION_MAX_STABILITY_SPREAD, 0.0001), 0, 1);
    const quality = {
      totalFrames: samples.length,
      goodFrames: stableSamples.length,
      avgConfidence,
      avgMotion,
      stabilityScore
    } satisfies CalibrationQuality;
    setCalibrationQuality(quality);

    if (
      stableSamples.length < CALIBRATION_MIN_FRAMES ||
      goodFrameRatio < CALIBRATION_MIN_GOOD_FRAME_RATIO ||
      avgConfidence < CALIBRATION_MIN_CONFIDENCE ||
      avgMotion > CALIBRATION_MAX_AVG_MOTION ||
      spread > CALIBRATION_MAX_STABILITY_SPREAD
    ) {
      setCalibrationStatus(previousBaseline ? "CALIBRATED" : "NOT_CALIBRATED");
      setCalibrationPhase("FAILED");
      calibrationPhaseRef.current = "FAILED";
      setCalibrationCountdown(null);
      setCalibrationMessage(
        previousBaseline
          ? "Calibration failed. Kept your previous baseline. Sit still in a straight posture and try again."
          : "Calibration failed. Please sit still in a straight posture and try again."
      );
      setCalibrationProgress(0);
      setTips([
        "Calibration failed. Sit upright, keep shoulders visible, and hold still before trying again."
      ]);
      return;
    }

    const postureBaseline = averageMetrics(stableMetrics);
    const extraBaseline = averageExtras(stableExtras);
    if (!postureBaseline || !extraBaseline) {
      setCalibrationStatus(previousBaseline ? "CALIBRATED" : "NOT_CALIBRATED");
      setCalibrationPhase("FAILED");
      calibrationPhaseRef.current = "FAILED";
      setCalibrationCountdown(null);
      setCalibrationMessage(
        previousBaseline
          ? "Calibration failed. Kept your previous baseline. Sit still in a straight posture and try again."
          : "Calibration failed. Please sit still in a straight posture and try again."
      );
      return;
    }

    const nextBaseline = {
      posture: postureBaseline,
      extras: extraBaseline,
      quality,
      calibratedAt: Date.now()
    } satisfies PersonalBaseline;

    personalBaselineRef.current = nextBaseline;
    setCalibrationStatus("CALIBRATED");
    setCalibrationPhase("COMPLETE");
    calibrationPhaseRef.current = "COMPLETE";
    setCalibrationCountdown(null);
    setCalibratedAt(nextBaseline.calibratedAt);
    const representativeSample = stableSamples[Math.floor(stableSamples.length / 2)] ?? stableSamples[0];
    if (representativeSample?.landmarks?.length) {
      const snapshot = captureSnapshot(representativeSample.landmarks, Date.now());
      if (snapshot) setCalibrationSnapshot(snapshot);
    }

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/calibration", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCalibrationPayload(postureBaseline))
        });

        if (res.ok) {
          setCalibrationMessage("Calibration complete. Personal baseline saved from your current camera position.");
        } else {
          setCalibrationMessage("Calibration complete for this session. Baseline captured from current camera position.");
        }
      } catch {
        setCalibrationMessage("Calibration complete for this session. Baseline captured from current camera position.");
      }
    } else {
      setCalibrationMessage("Calibration complete for this demo session. Baseline captured from current camera position.");
    }

    setTips(["Calibration complete. Posture scoring now tracks deviation from your baseline."]);
  }, [captureSnapshot, isAuthenticated]);

  const startSession = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Log in to start tracked sessions.");
      return;
    }

    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Unable to start session.");
      const data = await res.json();

      currentSessionIdRef.current = data.session.id;
      sessionStartedAtRef.current = Date.now();
      sessionActiveRef.current = true;
      setIsSessionActive(true);
      setSessionElapsedMs(0);
      statsRef.current = { ...DEFAULT_STATS };
      setStats({ ...DEFAULT_STATS });
      setTimeline([]);
      setPostureTrend([]);
      trendLastPushRef.current = null;
      scoreSamplesRef.current = [];
      worstMomentRef.current = null;
      badSinceRef.current = null;
      badAlertSentRef.current = false;
      goodStreakStartedAtRef.current = null;
      setGoodStreakMs(0);
      setBadPostureMs(0);
      setAlertBanner(null);
      headTiltAccumulatorRef.current = { total: 0, count: 0 };
      setSessionSummary(null);
      setTips(
        personalBaselineRef.current
          ? ["Session started. Keep your ears aligned over your shoulders for best score."]
          : [
              "Session started. For best accuracy, run Calibrate Posture first.",
              "You can still continue in demo mode without calibration."
            ]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start session.");
    }
  }, [isAuthenticated]);

  const endSession = useCallback(async () => {
    const sessionId = currentSessionIdRef.current;
    const startedAt = sessionStartedAtRef.current;
    if (!sessionId || !startedAt) return;

    const endedAt = Date.now();
    const durationMs = Math.max(0, endedAt - startedAt);
    const finalStats = statsRef.current;

    const headTiltAvg =
      headTiltAccumulatorRef.current.count > 0
        ? headTiltAccumulatorRef.current.total / headTiltAccumulatorRef.current.count
        : 0;
    const badRatio = durationMs ? finalStats.badMs / durationMs : 0;
    const feedback = feedbackFromSession(finalStats.sessionScore, badRatio, headTiltAvg);

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeGoodMs: finalStats.goodMs,
          timeWarnMs: finalStats.warnMs,
          timeBadMs: finalStats.badMs,
          score: finalStats.sessionScore
        })
      });

      if (!res.ok) throw new Error("Unable to finalize session.");

      const payload = await res.json();
      const completed = payload.session as PersistedSession;
      setSessionHistory((prev) => [completed, ...prev].slice(0, 25));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save session.");
    }

    sessionActiveRef.current = false;
    setIsSessionActive(false);
    currentSessionIdRef.current = null;
    sessionStartedAtRef.current = null;
    setSessionElapsedMs(0);

    setSessionSummary({
      durationMs,
      score: finalStats.sessionScore,
      averageScore: scoreSamplesRef.current.length
        ? Math.round(scoreSamplesRef.current.reduce((sum, value) => sum + value, 0) / scoreSamplesRef.current.length)
        : finalStats.sessionScore,
      goodMs: finalStats.goodMs,
      warnMs: finalStats.warnMs,
      badMs: finalStats.badMs,
      worstMoment: worstMomentRef.current,
      feedback
    });
  }, []);

  const dismissSessionSummary = useCallback(() => {
    setSessionSummary(null);
  }, []);

  const startMonitoring = useCallback(async () => {
    setError(null);
    void maybeRequestNotificationPermission();

    if (!poseRef.current) {
      setModelStatus("LOADING");
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        poseRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setModelStatus("READY");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load MediaPipe model.");
        setModelStatus("ERROR");
        return;
      }
    }

    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });

      streamRef.current = stream;
      smoothScoreWindowRef.current = [];
      smoothedMetricsRef.current = null;
      smoothedExtrasRef.current = null;
      displayedScoreRef.current = 100;
      lastFrameRef.current = null;
      activeStateRef.current = "NO_PERSON";
      candidateStateRef.current = null;
      candidateSinceRef.current = null;
      historyLastPushRef.current = null;
      trendLastPushRef.current = null;
      monitoringStartedAtRef.current = Date.now();
      setPostureTrend([]);
      snapshotLastCaptureRef.current = null;
      setCurrentSnapshot(null);
      setOverlayMetrics(DEFAULT_ALIGNMENT_METRICS);
      overlayMetricsLastPushRef.current = null;
      if (calibrationStatus !== "CALIBRATED") {
        setCalibrationPhase("IDLE");
      }
      setCalibrationCountdown(null);
      if (calibrationStatus !== "CALIBRATING") {
        setCalibrationProgress(0);
      }

      const video = videoRef.current;
      if (!video) throw new Error("Video element is unavailable.");

      video.srcObject = stream;
      await video.play();
      setCameraReady(true);
      monitoringStartedAtRef.current = Date.now();

      const tick = () => {
        const pose = poseRef.current;
        const videoEl = videoRef.current;

        if (!pose || !videoEl || videoEl.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const now = performance.now();
        const result = pose.detectForVideo(videoEl, now);
        const landmarks = result.landmarks[0];

        if (!landmarks) {
          latestLandmarksRef.current = null;
          smoothedMetricsRef.current = null;
          smoothedExtrasRef.current = null;
          smoothScoreWindowRef.current = [];
          displayedScoreRef.current = 0;
          const nextState: PostureState = "NO_PERSON";
          setState(nextState);
          setScore(0);
          setMetrics(FALLBACK_METRICS);
          setTrackingConfidence(0);
          setTrackingStable(false);
          trackingStableRef.current = false;
          setTips(["No person detected. Sit in frame and face the camera."]);
          setDominantIssue(null);
          setDebugData((prev) => ({
            ...prev,
            state: nextState,
            smoothedScore: 0,
            rawScore: 0,
            trackingStable: false,
            trackingConfidence: 0,
            rawMetrics: FALLBACK_METRICS,
            deviation: FALLBACK_METRICS,
            rawExtras: {
              noseShoulderOffset: 0,
              upperBodySymmetry: 0,
              visibility: 0
            },
            deviationExtras: {
              noseShoulderOffset: 0,
              upperBodySymmetry: 0,
              visibility: 0
            },
            dominantIssue: null
          }));
          drawOverlay(null, nextState, now);
          updateSessionStats(nextState, 0, now);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        latestLandmarksRef.current = landmarks.map((point) => ({ x: point.x, y: point.y }));

        const confidence = computeTrackingConfidence(landmarks, KEY_VISIBILITY_POINTS);
        const currentlyStable =
          confidence >= TRACKING_STABLE_THRESHOLD ||
          (trackingStableRef.current && confidence >= TRACKING_UNSTABLE_THRESHOLD);
        trackingStableRef.current = currentlyStable;

        setTrackingConfidence(confidence);
        setTrackingStable(currentlyStable);

        const rawMetrics = computeMetrics(landmarks);
        const rawExtras = computeCalibrationExtras(landmarks);
        const metricAlpha = currentlyStable ? METRIC_SMOOTH_ALPHA_STABLE : METRIC_SMOOTH_ALPHA_UNSTABLE;
        const smoothedRawMetrics = smoothMetrics(smoothedMetricsRef.current, rawMetrics, metricAlpha);
        const smoothedRawExtras = smoothExtras(smoothedExtrasRef.current, rawExtras, metricAlpha);
        smoothedMetricsRef.current = smoothedRawMetrics;
        smoothedExtrasRef.current = smoothedRawExtras;

        if (calibrationStatus === "CALIBRATING") {
          const phase = calibrationPhaseRef.current;
          const phaseStartedAt = calibrationPhaseStartedAtRef.current ?? now;
          const elapsed = now - phaseStartedAt;

          if (phase === "INSTRUCTIONS") {
            setCalibrationProgress(0);
            if (elapsed >= CALIBRATION_INSTRUCTION_MS) {
              calibrationPhaseRef.current = "SCANNING";
              calibrationPhaseStartedAtRef.current = now;
              calibrationSamplesRef.current = [];
              calibrationLastMetricsRef.current = null;
              setCalibrationPhase("SCANNING");
              setCalibrationCountdown(10);
              setCalibrationProgress(0);
              setCalibrationMessage("Scanning posture baseline for 10 seconds. Hold still.");
            }
          } else if (phase === "SCANNING") {
            const motion = calibrationLastMetricsRef.current
              ? metricDistance(smoothedRawMetrics, calibrationLastMetricsRef.current)
              : 0;
            calibrationLastMetricsRef.current = smoothedRawMetrics;
            calibrationSamplesRef.current.push({
              metrics: smoothedRawMetrics,
              extras: smoothedRawExtras,
              confidence,
              motion,
              landmarks: landmarks.map((point) => ({ x: point.x, y: point.y }))
            });

            const progress = Math.min(100, Math.round((elapsed / CALIBRATION_SCAN_MS) * 100));
            const secondsLeft = Math.max(0, Math.ceil((CALIBRATION_SCAN_MS - elapsed) / 1000));
            setCalibrationCountdown(secondsLeft);
            setCalibrationProgress(progress);
            if (elapsed >= CALIBRATION_SCAN_MS) {
              calibrationLastMetricsRef.current = null;
              setCalibrationCountdown(0);
              setCalibrationProgress(100);
              void finalizeCalibration();
            }
          }

          drawOverlay(landmarks, activeStateRef.current, now);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const baseline = personalBaselineRef.current?.posture ?? FALLBACK_METRICS;
        const baselineExtras = personalBaselineRef.current?.extras ?? {
          noseShoulderOffset: 0,
          upperBodySymmetry: 1,
          visibility: confidence
        };
        const hasBaseline = Boolean(personalBaselineRef.current);
        const deviation = hasBaseline ? metricDelta(smoothedRawMetrics, baseline) : smoothedRawMetrics;
        const deviationExtras: CalibrationExtraMetrics = {
          noseShoulderOffset: hasBaseline
            ? Math.abs(smoothedRawExtras.noseShoulderOffset - baselineExtras.noseShoulderOffset)
            : smoothedRawExtras.noseShoulderOffset,
          upperBodySymmetry: hasBaseline
            ? Math.abs(smoothedRawExtras.upperBodySymmetry - baselineExtras.upperBodySymmetry)
            : 1 - smoothedRawExtras.upperBodySymmetry,
          visibility: Math.max(0, (baselineExtras.visibility || 0) - smoothedRawExtras.visibility)
        };
        const scoring = scoreFromDeviation(deviation);
        const symmetryPenalty = clamp(deviationExtras.upperBodySymmetry * 34, 0, 22);
        const noseOffsetPenalty = clamp(deviationExtras.noseShoulderOffset * 26, 0, 18);
        const visibilityPenalty = clamp(deviationExtras.visibility * 30, 0, 10);
        const rawScore = clamp(Math.round(scoring.rawScore - symmetryPenalty - noseOffsetPenalty - visibilityPenalty), 0, 100);

        if (sessionActiveRef.current) {
          headTiltAccumulatorRef.current.total += deviation.headTilt;
          headTiltAccumulatorRef.current.count += 1;
        }

        const window = smoothScoreWindowRef.current;
        if (currentlyStable) {
          window.push(rawScore);
        } else {
          const previous = window.length ? window[window.length - 1] : rawScore;
          window.push(Math.round(previous * 0.85 + rawScore * 0.15));
        }

        if (window.length > SCORE_WINDOW_SIZE) window.shift();
        const windowSmoothedScore = weightedAverage(window);
        const previousDisplayed = displayedScoreRef.current;
        const stepLimit = currentlyStable ? SCORE_STEP_STABLE : SCORE_STEP_UNSTABLE;
        const steppedScore = clamp(windowSmoothedScore, previousDisplayed - stepLimit, previousDisplayed + stepLimit);
        const smoothedScore = currentlyStable
          ? Math.round(steppedScore)
          : Math.round(previousDisplayed * (1 - UNSTABLE_SCORE_MIX) + steppedScore * UNSTABLE_SCORE_MIX);
        displayedScoreRef.current = smoothedScore;

        const currentStableState =
          activeStateRef.current === "NO_PERSON" ? classifyPosture(smoothedScore) : activeStateRef.current;
        const desiredState = currentlyStable
          ? nextStateCandidate(smoothedScore, currentStableState)
          : currentStableState;

        let stableState = currentStableState;
        if (desiredState === currentStableState) {
          candidateStateRef.current = null;
          candidateSinceRef.current = null;
        } else if (candidateStateRef.current !== desiredState) {
          candidateStateRef.current = desiredState;
          candidateSinceRef.current = now;
        } else if (
          candidateSinceRef.current &&
          now - candidateSinceRef.current >= transitionHoldMs(currentStableState, desiredState)
        ) {
          stableState = desiredState;
          candidateStateRef.current = null;
          candidateSinceRef.current = null;
        }

        const topIssue = scoring.issues[0] ?? null;
        setDominantIssue(topIssue?.label ?? null);

        setState(stableState);
        setScore(smoothedScore);
        setMetrics(deviation);
        setTips(tipsFromIssues(scoring.issues, stableState, currentlyStable));

        setDebugData({
          baseline: personalBaselineRef.current?.posture ?? null,
          baselineExtras: personalBaselineRef.current?.extras ?? null,
          rawMetrics: smoothedRawMetrics,
          rawExtras: smoothedRawExtras,
          deviation,
          deviationExtras,
          penalties: scoring.penalties,
          rawScore,
          smoothedScore,
          trackingConfidence: confidence,
          trackingStable: currentlyStable,
          dominantIssue: topIssue?.label ?? null,
          state: stableState,
          calibrationQuality
        });

        const lastSnapshotAt = snapshotLastCaptureRef.current;
        if (!lastSnapshotAt || now - lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
          const snapshot = captureSnapshot(latestLandmarksRef.current, Date.now());
          if (snapshot) setCurrentSnapshot(snapshot);
          snapshotLastCaptureRef.current = now;
        }

        drawOverlay(landmarks, stableState, now);
        updateSessionStats(stableState, smoothedScore, now);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to access webcam. Please allow camera permissions."
      );
      stopMonitoring();
    }
  }, [
    captureSnapshot,
    calibrationStatus,
    drawOverlay,
    finalizeCalibration,
    maybeRequestNotificationPermission,
    stopMonitoring,
    updateSessionStats
  ]);

  useEffect(() => stopMonitoring, [stopMonitoring]);

  useEffect(() => {
    if (!isSessionActive) return;
    const timer = setInterval(() => {
      if (!sessionStartedAtRef.current) return;
      setSessionElapsedMs(Date.now() - sessionStartedAtRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSessionActive]);

  const insights = useMemo(
    () => ({
      good: formatDuration(stats.goodMs),
      warn: formatDuration(stats.warnMs),
      bad: formatDuration(stats.badMs)
    }),
    [stats.badMs, stats.goodMs, stats.warnMs]
  );

  const victorContext: VictorContextPayload = useMemo(
    () => ({
      state,
      score,
      calibrationStatus,
      calibrationMessage,
      trackingStable,
      trackingConfidence,
      dominantIssue,
      latestSession: sessionSummary,
      liveTips: tips,
      sessionStats: stats,
      sessionHistory: summarizeHistory(sessionHistory)
    }),
    [
      calibrationMessage,
      calibrationStatus,
      dominantIssue,
      score,
      sessionHistory,
      sessionSummary,
      state,
      stats,
      tips,
      trackingConfidence,
      trackingStable
    ]
  );

  return {
    videoRef,
    canvasRef,
    modelStatus,
    cameraReady,
    error,
    state,
    score,
    tips,
    metrics,
    stats,
    insights,
    timeline,
    calibrationProgress,
    calibrationStatus,
    calibrationPhase,
    calibrationCountdown,
    calibrationQuality,
    calibratedAt,
    calibrationMessage,
    trackingConfidence,
    trackingStable,
    debugData,
    dominantIssue,
    isCalibrating: calibrationStatus === "CALIBRATING",
    isSessionActive,
    sessionElapsedMs,
    sessionHistory,
    sessionSummary,
    postureTrend,
    goodStreakMs,
    badPostureMs,
    alertBanner,
    soundAlertEnabled,
    calibrationSnapshot,
    currentSnapshot,
    overlayMetrics,
    victorContext,
    startMonitoring,
    stopMonitoring,
    beginCalibration,
    startSession,
    endSession,
    dismissSessionSummary,
    setSoundAlertEnabled
  };
}
