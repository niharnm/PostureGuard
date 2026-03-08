import type { LandingActions } from "@/components/landing/types";

export function DemoSection({ onTryDemo }: LandingActions) {
  return (
    <section id="demo" className="landing-card relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
      <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Live Demo</p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Enter guest mode instantly. No account required.</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
          Guest Mode includes live posture tracking, posture score, coaching tips, calibration, hardware controls, and
          temporary session history on this device.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Calibration helps PostureGuard learn your normal sitting position, making subtle corrections more useful during
          long classes, homework blocks, or exam prep.
        </p>
        <button
          onClick={onTryDemo}
          className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
        >
          Enter Guest Mode
        </button>
      </div>
    </section>
  );
}
