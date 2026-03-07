export function MetricsExplanation() {
  return (
    <section className="panel rounded-3xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-white">How PostureGuard Scores Your Posture</h2>
      <div className="mt-4 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <h3 className="font-semibold text-white">Forward Head Offset</h3>
          <p className="mt-2">Measures how far your head drifts in front of your shoulders.</p>
        </article>
        <article className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <h3 className="font-semibold text-white">Shoulder Imbalance</h3>
          <p className="mt-2">Tracks left/right shoulder level mismatch while seated.</p>
        </article>
        <article className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <h3 className="font-semibold text-white">Head Tilt</h3>
          <p className="mt-2">Detects sideways neck tilt from left/right ear alignment.</p>
        </article>
        <article className="rounded-2xl border border-slate-700/45 bg-slate-900/35 p-4">
          <h3 className="font-semibold text-white">Torso Lean</h3>
          <p className="mt-2">Estimates torso centering to detect persistent leaning patterns.</p>
        </article>
      </div>
      <p className="mt-5 text-sm text-slate-400">
        Score starts at 100 and deducts penalties from each metric. Classification: GOOD (80-100), WARN
        (60-79), BAD (0-59). A temporal smoothing layer with hysteresis delays state flips to prevent
        flicker.
      </p>
    </section>
  );
}
