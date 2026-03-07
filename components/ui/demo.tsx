"use client";

import {
  Activity,
  Bot,
  Cpu,
  Gauge,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp
} from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const quickStats = [
  { icon: Activity, label: "Tracking", value: "Live" },
  { icon: Gauge, label: "Posture score", value: "92 / 100" },
  { icon: SlidersHorizontal, label: "Calibration", value: "Personalized" },
  { icon: TrendingUp, label: "Session trend", value: "+18%" }
];

export const PostureGuardShowcaseDemo = () => {
  return (
    <ContainerScroll
      titleComponent={
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Product Showcase</p>
          <h2 className="text-3xl font-semibold leading-tight text-white sm:text-5xl">
            See your posture in real time.
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-300 to-emerald-200 bg-clip-text text-transparent">
              AI coaching reacts as you move.
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-slate-300 sm:text-base">
            PostureGuard combines live detection, scoring, calibration, analytics, Victor insights, and optional
            Arduino alerts in one polished coaching interface.
          </p>
        </div>
      }
    >
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=2000&q=80"
          alt="Workspace desk with laptop representing PostureGuard live tracking"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#040912] via-[#08172a]/90 to-[#0a2338]/80" />

        <div className="relative z-10 grid h-full gap-4 p-4 md:grid-cols-[1.15fr_0.85fr] md:p-6">
          <article className="rounded-2xl border border-cyan-200/25 bg-slate-950/70 p-4 backdrop-blur-md md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Live Posture Feed</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Real-time posture detection</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                <ShieldCheck size={14} />
                Stable tracking
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickStats.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-cyan-100/15 bg-slate-900/70 px-3 py-2.5 text-slate-100"
                >
                  <div className="mb-2 flex items-center gap-2 text-cyan-200">
                    <Icon size={14} />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/75">{label}</span>
                  </div>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-100/15 bg-slate-900/60 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span>Current session quality</span>
                <span>42m 15s</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/70">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" />
              </div>
              <p className="mt-2 text-xs text-slate-300">Coaching tip: Raise screen height by 2 inches.</p>
            </div>
          </article>

          <div className="grid gap-3">
            <article className="rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">Victor AI</p>
              <p className="mt-2 text-sm font-medium text-white">
                You lean forward most in the last 10 minutes. Try a 60-second posture reset now.
              </p>
            </article>

            <article className="rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">Analytics Snapshot</p>
              <div className="mt-3 flex items-end gap-2">
                {[35, 48, 44, 62, 58, 71, 82].map((height, index) => (
                  <div
                    key={`${height}-${index}`}
                    className="w-5 rounded-t-md bg-gradient-to-t from-cyan-500/50 to-emerald-300/80"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-3 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">Arduino Alerts</p>
                <Cpu size={16} className="text-amber-200" />
              </div>
              <p className="mt-2 text-sm text-slate-100">Connected: LED and buzzer ready for posture warnings.</p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-300/20 px-2 py-1 text-emerald-200">Good</span>
                <span className="rounded-full bg-amber-300/20 px-2 py-1 text-amber-200">Warning</span>
                <span className="rounded-full bg-rose-300/20 px-2 py-1 text-rose-200">Poor</span>
              </div>
            </article>

            <article className="rounded-2xl border border-cyan-200/20 bg-slate-950/75 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-cyan-200">
                <Bot size={14} />
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/70">Coach Summary</p>
              </div>
              <p className="mt-2 text-sm text-slate-100">Posture score is improving this week with better neck angle stability.</p>
            </article>
          </div>
        </div>
      </div>
    </ContainerScroll>
  );
};

export default PostureGuardShowcaseDemo;
