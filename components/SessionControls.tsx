"use client";

type Props = {
  authenticated: boolean;
  temporaryMode?: boolean;
  active: boolean;
  monitoringActive: boolean;
  breakMode: boolean;
  elapsedLabel: string;
  calibrated: boolean;
  onStart: () => void;
  onEnd: () => void;
  onBreak: () => void;
  onResume: () => void;
};

export function SessionControls({
  authenticated,
  temporaryMode = false,
  active,
  monitoringActive,
  breakMode,
  elapsedLabel,
  calibrated,
  onStart,
  onEnd,
  onBreak,
  onResume
}: Props) {
  const canUseSessionControls = authenticated || temporaryMode;

  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Session Controls</h2>
          <p className="text-sm text-slate-400">
            {canUseSessionControls
              ? active
                ? `Session running: ${elapsedLabel}`
                : temporaryMode
                  ? "Start a guest session to track posture, score, and temporary local history."
                  : "Start a posture session to track score history."
              : "Log in to save session history and calibration."}
          </p>
          {canUseSessionControls && !calibrated ? (
            <p className="mt-1 text-xs text-amber-100">For best accuracy, calibrate posture first. You can still start now.</p>
          ) : null}
          {temporaryMode ? (
            <p className="mt-1 text-xs text-cyan-100">Guest mode: session and calibration data are temporary on this device.</p>
          ) : null}
          {breakMode ? (
            <p className="mt-1 text-xs text-violet-100">Break Mode Active - camera tracking paused.</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">End Session sends BREAK to Arduino and pauses tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onStart}
            disabled={!canUseSessionControls || active}
            className="rounded-xl bg-cyan-300/90 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Session
          </button>
          <button
            onClick={breakMode ? onResume : onBreak}
            disabled={!monitoringActive && !breakMode}
            className="rounded-xl border border-violet-300/40 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {breakMode ? "Resume Tracking" : "Break"}
          </button>
          <button
            onClick={onEnd}
            disabled={!monitoringActive && !active && !breakMode}
            className="rounded-xl border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End Session
          </button>
        </div>
      </div>
    </section>
  );
}
