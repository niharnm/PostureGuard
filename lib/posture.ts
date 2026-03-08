import { CalibrationExtraMetrics, PostureMetrics, PostureState } from "@/lib/types";

type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type MetricSeverity = "low" | "moderate" | "high";

export type PostureIssue = {
  id: keyof PostureMetrics;
  severity: MetricSeverity;
  deviation: number;
  label: string;
};

export type DeviationScore = {
  rawScore: number;
  penalties: Record<keyof PostureMetrics, number>;
  issues: PostureIssue[];
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizePenalty = (value: number, low: number, high: number) =>
  clamp((value - low) / Math.max(0.0001, high - low), 0, 1);

const ISSUE_LABELS: Record<keyof PostureMetrics, string> = {
  forwardHeadOffset: "Forward Head",
  shoulderImbalance: "Shoulder imbalance",
  headTilt: "Head tilt",
  torsoLean: "Torso Lean"
};

const METRIC_WEIGHTS: Record<keyof PostureMetrics, number> = {
  forwardHeadOffset: 0.42,
  shoulderImbalance: 0.16,
  headTilt: 0.12,
  torsoLean: 0.3
};

const DEVIATION_BANDS: Record<keyof PostureMetrics, { low: number; moderate: number; high: number }> = {
  forwardHeadOffset: { low: 0.024, moderate: 0.06, high: 0.115 },
  shoulderImbalance: { low: 0.016, moderate: 0.044, high: 0.085 },
  headTilt: { low: 0.016, moderate: 0.04, high: 0.078 },
  torsoLean: { low: 0.02, moderate: 0.052, high: 0.105 }
};

const safeZ = (point?: Landmark) => (point && typeof point.z === "number" && Number.isFinite(point.z) ? point.z : 0);

function severityFromDeviation(
  metric: keyof PostureMetrics,
  deviation: number
): { penalty: number; severity: MetricSeverity } {
  const { low, moderate, high } = DEVIATION_BANDS[metric];
  if (deviation <= low) {
    return {
      penalty: normalizePenalty(deviation, 0, low) * 0.28,
      severity: "low"
    };
  }

  if (deviation <= moderate) {
    return {
      penalty: 0.28 + normalizePenalty(deviation, low, moderate) * 0.44,
      severity: "moderate"
    };
  }

  return {
    penalty: 0.72 + normalizePenalty(deviation, moderate, high) * 0.28,
    severity: "high"
  };
}

export function computeMetrics(landmarks: Landmark[]): PostureMetrics {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const hipMidX = leftHip && rightHip ? (leftHip.x + rightHip.x) / 2 : shoulderMidX;
  const shoulderWidth = Math.max(
    Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y),
    0.001
  );
  const shoulderMidZ = (safeZ(leftShoulder) + safeZ(rightShoulder)) / 2;
  const earMidZ = (safeZ(leftEar) + safeZ(rightEar)) / 2;
  const noseZ = safeZ(nose);
  const hipMidZ = leftHip && rightHip ? (safeZ(leftHip) + safeZ(rightHip)) / 2 : shoulderMidZ;
  // For BlazePose-style z, smaller values are closer to camera. Clamp to reduce jitter sensitivity.
  const headDepthDelta = clamp(shoulderMidZ - earMidZ, 0, 0.08);
  const noseDepthDelta = clamp(shoulderMidZ - noseZ, 0, 0.09);
  const torsoDepthDelta = clamp(hipMidZ - shoulderMidZ, 0, 0.1);

  return {
    // Normalize by shoulder width so scoring is more camera-distance independent.
    forwardHeadOffset:
      (Math.abs(earMidX - shoulderMidX) * 0.45 +
        Math.abs(nose.x - shoulderMidX) * 0.3 +
        headDepthDelta * 0.75 +
        noseDepthDelta * 0.95) /
      shoulderWidth,
    shoulderImbalance: Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth,
    headTilt: Math.abs(leftEar.y - rightEar.y) / shoulderWidth,
    torsoLean:
      (Math.abs(shoulderMidX - hipMidX) +
        Math.abs(nose.x - shoulderMidX) * 0.35 +
        Math.abs(nose.y - shoulderMidY) * 0.1 +
        torsoDepthDelta * 0.85 +
        noseDepthDelta * 0.3) /
      shoulderWidth
  };
}

export function computeCalibrationExtras(landmarks: Landmark[]): CalibrationExtraMetrics {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return {
      noseShoulderOffset: 0,
      upperBodySymmetry: 0,
      visibility: 0
    };
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const shoulderMidZ = (safeZ(leftShoulder) + safeZ(rightShoulder)) / 2;
  const noseZ = safeZ(nose);
  const shoulderWidth = Math.max(
    Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y),
    0.001
  );

  const noseDepthDelta = clamp(shoulderMidZ - noseZ, 0, 0.09);
  const noseShoulderOffset = (Math.abs(nose.x - shoulderMidX) + noseDepthDelta * 0.9) / shoulderWidth;
  const earShoulderCenterGap = Math.abs(earMidX - shoulderMidX) / shoulderWidth;
  const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y) / shoulderWidth;
  const earHeightDiff = Math.abs(leftEar.y - rightEar.y) / shoulderWidth;
  const faceCenterOffsetY = Math.abs(nose.y - shoulderMidY) / shoulderWidth;

  const asymmetry = shoulderHeightDiff * 0.35 + earHeightDiff * 0.25 + earShoulderCenterGap * 0.25 + faceCenterOffsetY * 0.15;
  const upperBodySymmetry = clamp(1 - asymmetry * 1.7, 0, 1);
  const visibility = computeTrackingConfidence(landmarks, [0, 7, 8, 11, 12]);

  return {
    noseShoulderOffset,
    upperBodySymmetry,
    visibility
  };
}

export function computeTrackingConfidence(landmarks: Landmark[], points: number[]) {
  if (!points.length) return 0;
  const score = points.reduce((sum, index) => sum + (landmarks[index]?.visibility ?? 0), 0) / points.length;
  return clamp(score, 0, 1);
}

export function metricDelta(raw: PostureMetrics, baseline: PostureMetrics): PostureMetrics {
  return {
    forwardHeadOffset: Math.abs(raw.forwardHeadOffset - baseline.forwardHeadOffset),
    shoulderImbalance: Math.abs(raw.shoulderImbalance - baseline.shoulderImbalance),
    headTilt: Math.abs(raw.headTilt - baseline.headTilt),
    torsoLean: Math.abs(raw.torsoLean - baseline.torsoLean)
  };
}

export function scoreFromDeviation(deviation: PostureMetrics): DeviationScore {
  const metrics = Object.keys(deviation) as Array<keyof PostureMetrics>;
  const penalties = {
    forwardHeadOffset: 0,
    shoulderImbalance: 0,
    headTilt: 0,
    torsoLean: 0
  };

  const issues: PostureIssue[] = [];
  let totalPenalty = 0;

  metrics.forEach((metric) => {
    const value = deviation[metric];
    const { penalty, severity } = severityFromDeviation(metric, value);
    const weightedPenalty = penalty * METRIC_WEIGHTS[metric] * 100;
    penalties[metric] = weightedPenalty;
    totalPenalty += weightedPenalty;
    issues.push({
      id: metric,
      deviation: value,
      severity,
      label: ISSUE_LABELS[metric]
    });
  });

  const rawScore = clamp(Math.round(100 - totalPenalty), 0, 100);
  issues.sort((a, b) => b.deviation - a.deviation);
  return { rawScore, penalties, issues };
}

export function classifyPosture(score: number): PostureState {
  if (score >= 80) return "GOOD";
  if (score >= 60) return "WARN";
  return "BAD";
}

export function tipsFromIssues(issues: PostureIssue[], state: PostureState, trackingStable: boolean): string[] {
  if (!trackingStable) {
    return ["Tracking unstable. Keep shoulders in frame and improve lighting."];
  }

  if (state === "GOOD" || !issues.length || issues[0].deviation < 0.025) {
    return [
      "Great alignment. Keep your shoulders relaxed and neck neutral.",
      "Take a micro-break every 20-30 minutes to avoid fatigue."
    ];
  }

  const tips: string[] = [];
  const topIssues = issues.slice(0, 2);

  topIssues.forEach((issue) => {
    if (issue.id === "forwardHeadOffset") tips.push("Pull your head back slightly so ears stack over shoulders.");
    if (issue.id === "shoulderImbalance") tips.push("Level your shoulders and avoid leaning into one side.");
    if (issue.id === "headTilt") tips.push("Reduce head tilt and keep your chin level.");
    if (issue.id === "torsoLean") tips.push("Sit more upright and center your torso over your hips.");
  });

  if (!tips.length) {
    tips.push("Reset your seated posture and align your screen at eye level.");
  }

  return tips.slice(0, 2);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function feedbackFromSession(score: number, badRatio: number, headTiltAvg: number): string {
  if (score >= 80 && badRatio < 0.1) return "Great posture consistency!";
  if (headTiltAvg > 0.08) return "Try improving your head alignment during longer sessions.";
  if (badRatio > 0.35) return "Take more micro-breaks and reset your posture every 20 minutes.";
  if (score >= 60) return "Solid progress. Keep your shoulders level and neck neutral.";
  return "Posture drift was frequent. Recalibrate and keep your torso centered.";
}
