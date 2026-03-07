export type PostureState = "GOOD" | "WARN" | "BAD" | "NO_PERSON";
export type CalibrationState = "NOT_CALIBRATED" | "CALIBRATING" | "CALIBRATED";

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

export type CalibrationBaseline = {
  baselineForward: number;
  baselineShoulder: number;
  baselineHeadTilt: number;
  baselineTorsoAlign: number;
};

export type PostureDebugData = {
  baseline: PostureMetrics | null;
  rawMetrics: PostureMetrics;
  deviation: PostureMetrics;
  penalties: Record<keyof PostureMetrics, number>;
  rawScore: number;
  smoothedScore: number;
  trackingConfidence: number;
  trackingStable: boolean;
  dominantIssue: string | null;
  state: PostureState;
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
  goodMs: number;
  warnMs: number;
  badMs: number;
  feedback: string;
};

export type PostureFrame = {
  state: PostureState;
  score: number;
  metrics: PostureMetrics;
  tips: string[];
};
