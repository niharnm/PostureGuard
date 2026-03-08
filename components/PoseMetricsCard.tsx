"use client";

import { formatDuration } from "@/lib/posture";
import { PostureSnapshot } from "@/lib/types";

type Props = {
  alertBanner: string | null;
  badPostureMs: number;
  goodStreakMs: number;
  soundAlertEnabled: boolean;
  onSoundToggle: (enabled: boolean) => void;
  voiceCoachEnabled: boolean;
  onVoiceCoachToggle: (enabled: boolean) => void;
  voiceCoachAvailable: boolean;
  voiceCoachConfigured: boolean;
  currentSnapshot: PostureSnapshot | null;
};

export function PoseMetricsCard({
  alertBanner,
  badPostureMs,
  goodStreakMs,
  soundAlertEnabled,
  onSoundToggle,
  voiceCoachEnabled,
  onVoiceCoachToggle,
  voiceCoachAvailable,
  voiceCoachConfigured,
  currentSnapshot
}: Props) {
  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Pose Metrics & Alerts</h2>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={soundAlertEnabled}
              onChange={(event) => onSoundToggle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800"
            />
            Sound alerts
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={voiceCoachEnabled}
              onChange={(event) => onVoiceCoachToggle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800"
            />
            Voice Coach
          </label>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Spoken posture reminders during monitoring.
        {!voiceCoachConfigured
          ? " Configure NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID to enable Vapi voice."
          : !voiceCoachAvailable
            ? " Voice is temporarily unavailable."
            : ""}
      </p>

      {alertBanner ? (
        <div className="mb-4 rounded-xl border border-danger/35 bg-danger/15 px-3 py-2 text-sm text-red-100">
          {alertBanner}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-mint/35 bg-mint/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-mint/80">Good Posture Streak</p>
          <p className="mt-1 font-[var(--font-jetbrains)] text-xl text-white">{formatDuration(goodStreakMs)}</p>
        </div>
        <div className="rounded-xl border border-danger/35 bg-danger/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-danger/80">Current Bad Duration</p>
          <p className="mt-1 font-[var(--font-jetbrains)] text-xl text-white">{formatDuration(badPostureMs)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Head Tilt</p>
          <p className="mt-1 font-[var(--font-jetbrains)] text-xl text-white">
            {currentSnapshot ? `${currentSnapshot.metrics.headAlignmentDeg.toFixed(1)}°` : "--"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/45 bg-slate-900/35 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Shoulder Imbalance</p>
          <p className="mt-1 font-[var(--font-jetbrains)] text-xl text-white">
            {currentSnapshot ? `${currentSnapshot.metrics.shoulderBalanceDeg.toFixed(1)}°` : "--"}
          </p>
        </div>
      </div>
    </section>
  );
}
