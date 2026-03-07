type Props = {
  supported: boolean;
  status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "UNSUPPORTED";
  error: string | null;
  lastSent: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function ArduinoCard({
  supported,
  status,
  error,
  lastSent,
  onConnect,
  onDisconnect
}: Props) {
  return (
    <section id="arduino" className="panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Optional Arduino Hardware Feedback</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            The app works fully without hardware. If connected, PostureGuard sends GOOD / WARN / BAD via
            Web Serial so Arduino can trigger LEDs and buzzer.
          </p>
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

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Device Status</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{status}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last Signal</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">{lastSent ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Browser Support</p>
          <p className="mt-2 font-[var(--font-jetbrains)] text-lg text-white">
            {supported ? "Web Serial Supported" : "Web Serial Unsupported"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {!supported ? (
        <p className="mt-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          Web Serial is not available in this browser. Use Chrome/Edge desktop for hardware mode.
        </p>
      ) : null}

      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        <li>GOOD {"->"} Green LED</li>
        <li>WARN {"->"} Yellow LED</li>
        <li>BAD {"->"} Red LED + buzzer pulse</li>
      </ul>
    </section>
  );
}
