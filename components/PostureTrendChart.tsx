"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendPoint } from "@/lib/types";

type Props = {
  points: TrendPoint[];
};

export function PostureTrendChart({ points }: Props) {
  const data = points.length ? points : [{ elapsedSec: 0, score: 0, label: "0s" }];

  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Posture Trend Graph</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live every 2s</p>
      </div>

      <div className="h-56 w-full rounded-2xl border border-slate-700/45 bg-slate-950/45 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 14, left: -12, bottom: 0 }}>
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} width={34} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: 12,
                color: "#e2e8f0"
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#5ef0ff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#f2c14f" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
