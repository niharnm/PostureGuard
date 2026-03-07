"use client";

import { formatDuration } from "@/lib/posture";
import { PersistedSession } from "@/lib/types";

type Props = {
  sessions: PersistedSession[];
};

export function SessionHistoryPanel({ sessions }: Props) {
  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Session History</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last {sessions.length}</p>
      </div>

      {sessions.length ? (
        <>
          <div className="mb-4 grid gap-1 rounded-2xl border border-slate-700/50 bg-slate-900/45 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Posture Score Trend</p>
            <div className="flex h-20 items-end gap-1">
              {sessions
                .slice()
                .reverse()
                .map((item) => (
                  <div
                    key={item.id}
                    className="min-w-0 flex-1 rounded-t bg-cyan-300/80"
                    style={{ height: `${Math.max(8, item.score)}%` }}
                    title={`${new Date(item.startTime).toLocaleDateString()} - ${item.score}%`}
                  />
                ))}
            </div>
          </div>

          <div className="space-y-2">
            {sessions.map((item) => {
              const durationMs =
                item.endTime && item.startTime
                  ? new Date(item.endTime).getTime() - new Date(item.startTime).getTime()
                  : 0;
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr] items-center rounded-xl border border-slate-700/45 bg-slate-900/35 px-3 py-2 text-sm"
                >
                  <span className="text-slate-200">{new Date(item.startTime).toLocaleString()}</span>
                  <span className="font-[var(--font-jetbrains)] text-slate-100">{formatDuration(durationMs)}</span>
                  <span className="font-[var(--font-jetbrains)] text-cyan-200">{item.score}%</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">No completed sessions yet.</p>
      )}
    </section>
  );
}
