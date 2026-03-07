import { PostureState } from "@/lib/types";

const palette: Record<PostureState, string> = {
  GOOD: "bg-mint/15 text-mint border-mint/40",
  WARN: "bg-amber/15 text-amber border-amber/40",
  BAD: "bg-danger/15 text-danger border-danger/40",
  NO_PERSON: "bg-slate-600/20 text-slate-300 border-slate-500/40"
};

type Props = {
  state: PostureState;
};

export function StatusBadge({ state }: Props) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.2em] ${palette[state]}`}>
      {state.replace("_", " ")}
    </span>
  );
}
