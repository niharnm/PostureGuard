const signals = [
  { label: "Good posture", detail: "Green LED", color: "bg-emerald-300" },
  { label: "Warning posture", detail: "Yellow LED", color: "bg-amber-300" },
  { label: "Poor posture", detail: "Red LED + buzzer", color: "bg-rose-300" },
  { label: "Break prompt", detail: "Breathing purple + LCD stretch cue", color: "bg-fuchsia-300" }
];

export function HardwareSection() {
  return (
    <section className="landing-card rounded-[1.75rem] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Hardware Integration</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Optional Arduino physical feedback loop.</h2>
      <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
        PostureGuard can connect to an Arduino device for immediate physical posture feedback and timed break cues.
      </p>
      <p className="mt-3 max-w-3xl text-sm text-slate-300">
        This makes it easier to stay aware of posture during long reading, coding, and study sessions before discomfort builds up.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => (
          <article key={signal.label} className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${signal.color}`} />
              <p className="text-sm font-semibold text-white">{signal.label}</p>
            </div>
            <p className="text-sm text-slate-300">{signal.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
