import { PostureGuardShowcaseDemo } from "@/components/ui/demo";

export function ScrollShowcaseSection() {
  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-cyan-200/15 bg-gradient-to-b from-[#08111f]/90 to-[#050913]/95"
      aria-label="PostureGuard interactive product showcase"
    >
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative z-10">
        <PostureGuardShowcaseDemo />
      </div>
    </section>
  );
}
