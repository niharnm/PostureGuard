import { AuthPanel } from "@/components/AuthPanel";

const benefits = [
  "Saved posture sessions",
  "Posture history and analytics",
  "Calibration persistence",
  "Long-term progress tracking",
  "AI insights from Victor"
];

export function AccountBenefitsSection() {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <article className="landing-card rounded-[1.75rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Account Benefits</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Create an account to unlock long-term coaching.</h2>
        <ul className="mt-5 space-y-2 text-sm text-slate-200">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-cyan-200" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </article>
      <AuthPanel />
    </section>
  );
}
