export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 px-4 py-8 text-center text-sm text-slate-400 sm:px-6">
      <p className="font-medium text-slate-300">PostureGaurd</p>
      <p className="mt-1">AI-powered posture coaching with real-time detection, analytics, and Victor insights.</p>
      <p className="mt-2 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/5 px-3 py-1.5 text-xs text-slate-400">
        <span className="font-[var(--font-jetbrains)] uppercase tracking-[0.22em] text-cyan-200/80">Brand Note</span>
        <span>
          PostureGaurd is spelled like that on purpose.
        </span>
      </p>
      <p className="mt-3 text-xs text-slate-500">Built for hackathon demos by the PostureGaurd team.</p>
    </footer>
  );
}
