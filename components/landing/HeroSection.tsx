"use client";

import { motion } from "framer-motion";
import type { LandingActions } from "@/components/landing/types";

export function HeroSection({ onTryDemo }: LandingActions) {
  return (
    <section className="landing-surface relative overflow-hidden rounded-[2rem] border border-cyan-200/15 px-6 pb-14 pt-6 sm:px-10 sm:pb-16 sm:pt-8">
      <div className="landing-blob landing-blob-a" />
      <div className="landing-blob landing-blob-b" />
      <div className="relative z-10">
        <div className="mb-14 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium tracking-[0.2em] text-cyan-100/80">POSTUREGUARD</p>
          <a
            href="#demo"
            className="rounded-full border border-cyan-100/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:bg-cyan-200/10"
          >
            Jump to Demo
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl space-y-5"
        >
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-6xl">
            PostureGuard
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
              AI-powered posture coaching in real time
            </span>
          </h1>
          <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
            Real-time webcam posture detection, instant coaching cues, and personalized analytics that help users sit
            better while studying and working.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <button
            onClick={onTryDemo}
            className="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Try Demo
          </button>
          <a
            href="#auth-panel"
            className="rounded-2xl border border-cyan-100/30 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Log In / Sign Up
          </a>
        </motion.div>
      </div>
    </section>
  );
}
