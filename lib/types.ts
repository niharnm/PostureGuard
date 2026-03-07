export type PostureState = "GOOD" | "WARN" | "BAD" | "NO_PERSON";
export type CalibrationState = "NOT_CALIBRATED" | "CALIBRATING" | "CALIBRATED";
export type CalibrationPhase = "IDLE" | "INSTRUCTIONS" | "COUNTDOWN" | "SCANNING" | "COMPLETE" | "FAILED";

export type PostureMetrics = {
  forwardHeadOffset: number;
  shoulderImbalance: number;
  headTilt: number;
  torsoLean: number;
};

export type SessionStats = {
  goodMs: number;
  warnMs: number;
  badMs: number;
  sessionScore: number;
};

export type TrendPoint = {
  elapsedSec: number;
  score: number;
  label: string;
};

export type SnapshotMetrics = {
  headAlignmentDeg: number;
  shoulderBalanceDeg: number;
};

export type PosePoint = {
  x: number;
  y: number;
};

export type PostureSnapshot = {
  imageDataUrl: string;
  capturedAt: number;
  landmarks: PosePoint[];
  metrics: SnapshotMetrics;
};

export type CalibrationBaseline = {
  baselineForward: number;
  baselineShoulder: number;
  baselineHeadTilt: number;
  baselineTorsoAlign: number;
};

export type CalibrationExtraMetrics = {
  noseShoulderOffset: number;
  upperBodySymmetry: number;
  visibility: number;
};

export type CalibrationQuality = {
  totalFrames: number;
  goodFrames: number;
  avgConfidence: number;
  avgMotion: number;
  stabilityScore: number;
};

export type PersonalBaseline = {
  posture: PostureMetrics;
  extras: CalibrationExtraMetrics;
  quality: CalibrationQuality;
  calibratedAt: number;
};

export type PostureDebugData = {
  baseline: PostureMetrics | null;
  baselineExtras: CalibrationExtraMetrics | null;
  rawMetrics: PostureMetrics;
  rawExtras: CalibrationExtraMetrics;
  deviation: PostureMetrics;
  deviationExtras: CalibrationExtraMetrics;
  penalties: Record<keyof PostureMetrics, number>;
  rawScore: number;
  smoothedScore: number;
  trackingConfidence: number;
  trackingStable: boolean;
  dominantIssue: string | null;
  state: PostureState;
  calibrationQuality: CalibrationQuality | null;
};

export type VictorContextPayload = {
  state: PostureState;
  score: number;
  calibrationStatus: CalibrationState;
  calibrationMessage: string | null;
  trackingStable: boolean;
  trackingConfidence: number;
  dominantIssue: string | null;
  latestSession: SessionSummary | null;
  liveTips: string[];
  sessionStats: SessionStats;
  sessionHistory: Array<{
    startTime: string;
    score: number;
    goodRatio: number;
    warnRatio: number;
    badRatio: number;
    durationMs: number;
  }>;
};

export type PersistedSession = {
  id: string;
  startTime: string;
  endTime: string | null;
  timeGoodMs: number;
  timeWarnMs: number;
  timeBadMs: number;
  score: number;
};

export type SessionSummary = {
  durationMs: number;
  score: number;
  averageScore: number;
  goodMs: number;
  warnMs: number;
  badMs: number;
  worstMoment: {
    score: number;
    atMs: number;
    state: PostureState;
  } | null;
  feedback: string;
};

export type PostureFrame = {
  state: PostureState;
  score: number;
  metrics: PostureMetrics;
  tips: string[];
};
