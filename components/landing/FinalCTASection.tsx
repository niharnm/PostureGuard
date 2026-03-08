import type { LandingActions } from "@/components/landing/types";

export function FinalCTASection({ onTryDemo }: LandingActions) {
  return (
    <section className="landing-surface relative overflow-hidden rounded-[1.75rem] border border-cyan-200/20 p-6 sm:p-8">
      <div className="landing-blob landing-blob-c" />
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Start improving posture now.</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Enter Guest Mode in seconds or create an account for persistent analytics and progress tracking.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onTryDemo}
            className="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950"
          >
            Continue as Guest
          </button>
          <a
            href="#auth-panel"
            className="rounded-2xl border border-cyan-100/30 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Create Account
          </a>
        </div>
      </div>
    </section>
  );
}
