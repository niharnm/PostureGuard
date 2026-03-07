"use client";

type Props = {
  authenticated: boolean;
  active: boolean;
  elapsedLabel: string;
  onStart: () => void;
  onEnd: () => void;
};

export function SessionControls({ authenticated, active, elapsedLabel, onStart, onEnd }: Props) {
  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Session Controls</h2>
          <p className="text-sm text-slate-400">
            {authenticated
              ? active
                ? `Session running: ${elapsedLabel}`
                : "Start a posture session to track score history."
              : "Log in to save session history and calibration."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={!authenticated || active}
            className="rounded-xl bg-cyan-300/90 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Session
          </button>
          <button
            onClick={onEnd}
            disabled={!authenticated || !active}
            className="rounded-xl border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            End Session
          </button>
        </div>
      </div>
    </section>
  );
}
