import { motion } from "framer-motion";

type Props = {
  onStart: () => void;
};

export function Hero({ onStart }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-hero-grid bg-[size:22px_22px] p-8 sm:p-12 lg:p-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(54,216,255,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(85,245,181,0.14),transparent_32%)]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative max-w-3xl space-y-5"
      >
        <p className="font-[var(--font-jetbrains)] text-xs uppercase tracking-[0.3em] text-accent/80">
          Real-Time AI Ergonomics Coach
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
          PostureGuard monitors your posture live and coaches you before pain begins.
        </h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          Webcam pose detection, posture scoring, instant correction tips, session analytics, and optional
          Arduino haptic-light alerts for hackathon demos.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onStart}
            className="rounded-xl bg-gradient-to-r from-accent to-mint px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Start Monitoring
          </button>
          <a
            href="#arduino"
            className="rounded-xl border border-cyan-200/25 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-cyan-200/10"
          >
            Optional Arduino Setup
          </a>
        </div>
      </motion.div>
    </section>
  );
}
