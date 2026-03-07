"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  classifyPosture,
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
  CalibrationState,
  PersistedSession,
  PostureDebugData,
  PostureMetrics,
  PostureState,
  SessionStats,
  SessionSummary,
  VictorContextPayload
} from "@/lib/types";

type ModelStatus = "IDLE" | "LOADING" | "READY" | "ERROR";

type HookOptions = {
  isAuthenticated: boolean;
  userId?: string;
};

type CalibrationSample = {
  metrics: PostureMetrics;
  confidence: number;
  motion: number;
};

const UPPER_BODY_CONNECTIONS: Array<[number, number]> = [
  [0, 7],
  [0, 8],
  [7, 11],
  [8, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16]
];

const FALLBACK_METRICS: PostureMetrics = {
  forwardHeadOffset: 0,
  shoulderImbalance: 0,
  headTilt: 0,
  torsoLean: 0
};

const DEFAULT_STATS: SessionStats = {
  goodMs: 0,
  warnMs: 0,
  badMs: 0,
  sessionScore: 100
};

const DEFAULT_DEBUG: PostureDebugData = {
  baseline: null,
  rawMetrics: FALLBACK_METRICS,
  deviation: FALLBACK_METRICS,
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
  state: "NO_PERSON"
};

const KEY_VISIBILITY_POINTS = [7, 8, 11, 12, 23, 24];
const SCORE_WINDOW_SIZE = 18;
const STATE_THRESHOLD = {
  goodToWarn: 78,
  warnToBad: 60,
  badHardFloor: 48,
  warnToGood: 84,
  badToWarn: 66
};
const HOLD_MS: Record<string, number> = {
  "GOOD->WARN": 900,
  "WARN->BAD": 1500,
  "GOOD->BAD": 1900,
  "WARN->GOOD": 1300,
  "BAD->WARN": 1200,
  "BAD->GOOD": 2000
};

const CALIBRATION_DURATION_MS = 3200;
const CALIBRATION_MIN_FRAMES = 70;
const CALIBRATION_MIN_CONFIDENCE = 0.62;
const CALIBRATION_MAX_AVG_MOTION = 0.028;
const TRACKING_STABLE_THRESHOLD = 0.55;
const TRACKING_UNSTABLE_THRESHOLD = 0.46;
const SMOOTH_WEIGHTS = [
  0.02, 0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.05, 0.06, 0.06, 0.07, 0.07, 0.08, 0.09, 0.1, 0.1, 0.1,
  0.09
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
  const lastFrameRef = useRef<number | null>(null);
  const activeStateRef = useRef<PostureState>("NO_PERSON");
  const statsRef = useRef<SessionStats>(DEFAULT_STATS);
  const candidateStateRef = useRef<PostureState | null>(null);
  const candidateSinceRef = useRef<number | null>(null);
  const historyLastPushRef = useRef<number | null>(null);
  const baselineRef = useRef<PostureMetrics | null>(null);
  const calibrationStartedAtRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<CalibrationSample[]>([]);
  const calibrationLastMetricsRef = useRef<PostureMetrics | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);
  const headTiltAccumulatorRef = useRef({ total: 0, count: 0 });
  const trackingStableRef = useRef(true);

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
  const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null);
  const [trackingConfidence, setTrackingConfidence] = useState(0);
  const [trackingStable, setTrackingStable] = useState(true);
  const [debugData, setDebugData] = useState<PostureDebugData>(DEFAULT_DEBUG);
  const [dominantIssue, setDominantIssue] = useState<string | null>(null);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<PersistedSession[]>([]);

  const loadPersistedData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      baselineRef.current = null;
      setCalibrationStatus("NOT_CALIBRATED");
      setCalibrationMessage("Calibration is available for this session. Log in to save it to your account.");
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
        baselineRef.current = toMetricsFromCalibration(calibrationData.calibration as CalibrationBaseline);
        setCalibrationStatus("CALIBRATED");
        setCalibrationMessage("Calibration loaded from your account.");
      } else {
        baselineRef.current = null;
        setCalibrationStatus("NOT_CALIBRATED");
        setCalibrationMessage("No saved calibration. Click 'Calibrate Posture'.");
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

  const drawOverlay = useCallback((landmarks: { x: number; y: number }[] | null, label: PostureState) => {
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
      return;
    }

    const color = label === "GOOD" ? "#55f5b5" : label === "WARN" ? "#f2c14f" : "#ff5d7d";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    UPPER_BODY_CONNECTIONS.forEach(([start, end]) => {
      const a = landmarks[start];
      const b = landmarks[end];
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    });

    ctx.fillStyle = "#d8ebff";
    [0, 7, 8, 11, 12].forEach((index) => {
      const point = landmarks[index];
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const updateSessionStats = useCallback((nextState: PostureState, now: number) => {
    const last = lastFrameRef.current;
    lastFrameRef.current = now;
    if (!last) {
      activeStateRef.current = nextState;
      historyLastPushRef.current = now;
      return;
    }

    if (!sessionActiveRef.current) {
      activeStateRef.current = nextState;
      return;
    }

    const delta = now - last;
    const next = { ...statsRef.current };

    if (activeStateRef.current === "GOOD") next.goodMs += delta;
    if (activeStateRef.current === "WARN") next.warnMs += delta;
    if (activeStateRef.current === "BAD") next.badMs += delta;

    const total = next.goodMs + next.warnMs + next.badMs;
    next.sessionScore = total ? Math.round((next.goodMs / total) * 100) : 100;

    const lastPush = historyLastPushRef.current;
    if (lastPush && now - lastPush >= 1000) {
      setTimeline((prev) => [...prev.slice(-119), nextState]);
      historyLastPushRef.current = now;
    }

    activeStateRef.current = nextState;
    statsRef.current = next;
    setStats(next);
  }, []);

  const stopMonitoring = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraReady(false);
    lastFrameRef.current = null;
  }, []);

  const beginCalibration = useCallback(() => {
    if (!cameraReady) {
      setError("Start monitoring first, then run calibration.");
      return;
    }

    calibrationStartedAtRef.current = performance.now();
    calibrationSamplesRef.current = [];
    calibrationLastMetricsRef.current = null;
    setCalibrationStatus("CALIBRATING");
    setCalibrationMessage("Sit in your ideal upright posture and hold still.");
    setCalibrationProgress(0);
    setTips(["Sit in your ideal upright posture and hold still."]);
  }, [cameraReady]);

  const finalizeCalibration = useCallback(async () => {
    const samples = calibrationSamplesRef.current;

    const validSamples = samples.filter((sample) => sample.confidence >= TRACKING_UNSTABLE_THRESHOLD);
    const stableSamples = validSamples.filter((sample) => sample.confidence >= CALIBRATION_MIN_CONFIDENCE);

    const avgConfidence =
      validSamples.length > 0
        ? validSamples.reduce((sum, sample) => sum + sample.confidence, 0) / validSamples.length
        : 0;

    const avgMotion =
      validSamples.length > 0
        ? validSamples.reduce((sum, sample) => sum + sample.motion, 0) / validSamples.length
        : Number.POSITIVE_INFINITY;

    if (
      stableSamples.length < CALIBRATION_MIN_FRAMES ||
      avgConfidence < CALIBRATION_MIN_CONFIDENCE ||
      avgMotion > CALIBRATION_MAX_AVG_MOTION
    ) {
      setCalibrationStatus("NOT_CALIBRATED");
      setCalibrationMessage("Calibration failed, please sit still and try again.");
      setCalibrationProgress(0);
      setTips([
        "Calibration failed. Sit upright, keep shoulders visible, and hold still before trying again."
      ]);
      return;
    }

    const baseline = averageMetrics(stableSamples.map((sample) => sample.metrics));
    if (!baseline) {
      setCalibrationStatus("NOT_CALIBRATED");
      setCalibrationMessage("Calibration failed, please sit still and try again.");
      return;
    }

    baselineRef.current = baseline;
    setCalibrationStatus("CALIBRATED");

    if (isAuthenticated) {
      try {
        const res = await fetch("/api/calibration", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCalibrationPayload(baseline))
        });

        if (res.ok) {
          setCalibrationMessage("Calibrated successfully and saved to your account.");
        } else {
          setCalibrationMessage("Calibrated successfully for this session. Could not save to account.");
        }
      } catch {
        setCalibrationMessage("Calibrated successfully for this session. Could not save to account.");
      }
    } else {
      setCalibrationMessage("Calibrated successfully for this demo session.");
    }

    setTips(["Calibration complete. Posture scoring now tracks deviation from your baseline."]);
  }, [isAuthenticated]);

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
      headTiltAccumulatorRef.current = { total: 0, count: 0 };
      setSessionSummary(null);
      setTips(["Session started. Keep your ears aligned over your shoulders for best score."]);
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
      goodMs: finalStats.goodMs,
      warnMs: finalStats.warnMs,
      badMs: finalStats.badMs,
      feedback
    });
  }, []);

  const dismissSessionSummary = useCallback(() => {
    setSessionSummary(null);
  }, []);

  const startMonitoring = useCallback(async () => {
    setError(null);

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
      lastFrameRef.current = null;
      activeStateRef.current = "NO_PERSON";
      candidateStateRef.current = null;
      candidateSinceRef.current = null;
      historyLastPushRef.current = null;

      const video = videoRef.current;
      if (!video) throw new Error("Video element is unavailable.");

      video.srcObject = stream;
      await video.play();
      setCameraReady(true);

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
            dominantIssue: null
          }));
          drawOverlay(null, nextState);
          updateSessionStats(nextState, now);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const confidence = computeTrackingConfidence(landmarks, KEY_VISIBILITY_POINTS);
        const currentlyStable =
          confidence >= TRACKING_STABLE_THRESHOLD ||
          (trackingStableRef.current && confidence >= TRACKING_UNSTABLE_THRESHOLD);
        trackingStableRef.current = currentlyStable;

        setTrackingConfidence(confidence);
        setTrackingStable(currentlyStable);

        const rawMetrics = computeMetrics(landmarks);

        if (calibrationStatus === "CALIBRATING") {
          const startedAt = calibrationStartedAtRef.current ?? now;
          const elapsed = now - startedAt;
          const motion = calibrationLastMetricsRef.current
            ? metricDistance(rawMetrics, calibrationLastMetricsRef.current)
            : 0;
          calibrationLastMetricsRef.current = rawMetrics;
          calibrationSamplesRef.current.push({ metrics: rawMetrics, confidence, motion });

          const progress = Math.min(100, Math.round((elapsed / CALIBRATION_DURATION_MS) * 100));
          setCalibrationProgress(progress);

          if (elapsed >= CALIBRATION_DURATION_MS) {
            calibrationStartedAtRef.current = null;
            calibrationLastMetricsRef.current = null;
            setCalibrationProgress(100);
            void finalizeCalibration();
          }

          drawOverlay(landmarks, activeStateRef.current);
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const baseline = baselineRef.current ?? FALLBACK_METRICS;
        const deviation = baselineRef.current ? metricDelta(rawMetrics, baseline) : rawMetrics;
        const scoring = scoreFromDeviation(deviation);
        const rawScore = scoring.rawScore;

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
        const smoothedScore = weightedAverage(window);

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
          baseline: baselineRef.current,
          rawMetrics,
          deviation,
          penalties: scoring.penalties,
          rawScore,
          smoothedScore,
          trackingConfidence: confidence,
          trackingStable: currentlyStable,
          dominantIssue: topIssue?.label ?? null,
          state: stableState
        });

        drawOverlay(landmarks, stableState);
        updateSessionStats(stableState, now);
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
  }, [calibrationStatus, drawOverlay, finalizeCalibration, stopMonitoring, updateSessionStats]);

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
    victorContext,
    startMonitoring,
    stopMonitoring,
    beginCalibration,
    startSession,
    endSession,
    dismissSessionSummary
  };
}
