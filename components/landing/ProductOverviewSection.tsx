export function ProductOverviewSection() {
  return (
    <section className="landing-card rounded-[1.75rem] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Product Overview</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Built for students and long study sessions.</h2>
      <p className="mt-4 max-w-4xl text-base text-slate-200 sm:text-lg">
        PostureGaurd analyzes posture with computer vision and gives real-time feedback to help users sit better during
        long work and study sessions. It combines webcam posture detection, posture scoring, coaching suggestions,
        session tracking, and AI insights in one system.
      </p>
      <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
        Many students spend hours at a laptop. Small posture corrections over time can reduce fatigue and support
        better focus, neck comfort, and long-term back health.
      </p>
    </section>
  );
}
