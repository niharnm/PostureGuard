import { Activity, Gauge, History, SlidersHorizontal, Bot, Cpu } from "lucide-react";

const features = [
  {
    title: "Real-Time Posture Detection",
    description: "Continuously analyzes webcam landmarks to detect posture quality live during long study or desk sessions.",
    icon: Activity
  },
  {
    title: "Posture Score + Coaching Tips",
    description: "Generates a clear posture score and targeted coaching guidance instantly to help reduce neck strain and fatigue.",
    icon: Gauge
  },
  {
    title: "Session Tracking + Analytics",
    description: "Tracks session quality over time with understandable progress metrics so better posture habits can build gradually.",
    icon: History
  },
  {
    title: "Personalized Calibration",
    description: "Adapts posture baselines per user for more reliable coaching results based on how they naturally sit to study or work.",
    icon: SlidersHorizontal
  },
  {
    title: "Victor AI Data Assistant",
    description: "Explains posture trends and performance with context-aware feedback.",
    icon: Bot
  },
  {
    title: "Optional Arduino Hardware Feedback",
    description: "Connects to physical indicators for immediate posture state alerts.",
    icon: Cpu
  }
];

export function FeatureSection() {
  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Feature Highlights</p>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Healthy posture can improve comfort and concentration during long desk sessions without interrupting study flow.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <article key={title} className="landing-card rounded-3xl p-5 transition hover:-translate-y-0.5 hover:border-cyan-200/40">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
              <Icon size={18} />
            </span>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-300">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
