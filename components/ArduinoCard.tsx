type Props = {
  supported: boolean;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "UNSUPPORTED";
  connectionLabel: string;
  error: string | null;
  lastSent: string | null;
  hardwareState: string | null;
  lastWriteStatus: "IDLE" | "SUCCESS" | "ERROR";
  lastWriteMessage: string | null;
  lastWriteAt: number | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onManualSend: (signal: "GOOD" | "WARN" | "BAD" | "BREAK") => void;
};

export function ArduinoCard({
  supported,
  status,
  connectionLabel,
  error,
  lastSent,
  hardwareState,
  lastWriteStatus,
  lastWriteMessage,
  lastWriteAt,
  onConnect,
  onDisconnect,
  onManualSend
}: Props) {
  const connected = status === "CONNECTED";

  return (
    <section id="arduino" className="panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Arduino Hardware Control</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Serial commands are newline-terminated at 9600 baud: <span className="font-[var(--font-jetbrains)]">GOOD\\n WARN\\n BAD\\n BREAK\\n</span>.
          </p>
          <p className="mt-1 text-xs text-slate-400">BREAK sets purple breathing mode and is used during break/end-session state.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConnect}
            disabled={!supported || status === "CONNECTING" || status === "CONNECTED"}
            className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "CONNECTING" ? "Connecting..." : "Connect Arduino"}
          </button>
          <button
            onClick={onDisconnect}
            disabled={status !== "CONNECTED"}
            className="rounded-xl border border-slate-500/30 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Connection</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{connectionLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hardware State</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{hardwareState ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last Command</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{lastSent ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Write Status</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{lastWriteStatus}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-700/45 bg-slate-900/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Manual Command Test</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <button
            onClick={() => onManualSend("GOOD")}
            disabled={!connected}
            className="rounded-xl border border-emerald-300/35 bg-emerald-400/15 px-3 py-2 text-sm font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send GOOD
          </button>
          <button
            onClick={() => onManualSend("WARN")}
            disabled={!connected}
            className="rounded-xl border border-amber-300/35 bg-amber-400/15 px-3 py-2 text-sm font-semibold text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send WARN
          </button>
          <button
            onClick={() => onManualSend("BAD")}
            disabled={!connected}
            className="rounded-xl border border-rose-300/35 bg-rose-400/15 px-3 py-2 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send BAD
          </button>
          <button
            onClick={() => onManualSend("BREAK")}
            disabled={!connected}
            className="rounded-xl border border-violet-300/35 bg-violet-400/15 px-3 py-2 text-sm font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send BREAK
          </button>
        </div>
      </div>

      {lastWriteMessage ? (
        <p className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/35 px-4 py-3 text-sm text-slate-200">
          {lastWriteMessage}
          {lastWriteAt ? ` (${new Date(lastWriteAt).toLocaleTimeString()})` : ""}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {!supported ? (
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          Web Serial is not available in this browser. Use desktop Chrome/Edge for Arduino mode.
        </p>
      ) : null}

      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        <li>GOOD - green RGB, LCD good posture</li>
        <li>WARN - yellow RGB, LCD warning</li>
        <li>BAD - red RGB + buzzer, LCD bad posture</li>
        <li>BREAK - purple breathing + LCD stand and stretch</li>
      </ul>
    </section>
  );
}
