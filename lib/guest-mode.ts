import { CalibrationQuality, PersistedSession, PostureMetrics } from "@/lib/types";

const GUEST_MODE_KEY = "postureguard.guest-mode";
const GUEST_CALIBRATION_KEY = "postureguard.guest-calibration";
const GUEST_HISTORY_KEY = "postureguard.guest-history";

type GuestCalibration = {
  posture: PostureMetrics;
  quality: CalibrationQuality;
  calibratedAt: number;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in guest mode.
  }
}

export function hasGuestModeSession() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GUEST_MODE_KEY) === "true";
}

export function enableGuestMode() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_MODE_KEY, "true");
}

export function clearGuestMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_MODE_KEY);
  window.localStorage.removeItem(GUEST_CALIBRATION_KEY);
  window.localStorage.removeItem(GUEST_HISTORY_KEY);
}

export function loadGuestCalibration() {
  return readJson<GuestCalibration>(GUEST_CALIBRATION_KEY);
}

export function saveGuestCalibration(calibration: GuestCalibration) {
  writeJson(GUEST_CALIBRATION_KEY, calibration);
}

export function loadGuestHistory() {
  return readJson<PersistedSession[]>(GUEST_HISTORY_KEY) ?? [];
}

export function saveGuestHistory(history: PersistedSession[]) {
  writeJson(GUEST_HISTORY_KEY, history);
}
