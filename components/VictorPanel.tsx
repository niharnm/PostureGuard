"use client";

import { useMemo, useState } from "react";
import { VictorContextPayload } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  context: VictorContextPayload;
};

const SUGGESTED_PROMPTS = [
  "How did I do this session?",
  "What should I improve?",
  "Explain my posture score",
  "Should I recalibrate?"
];

export function VictorPanel({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "I’m Victor, your Posture Coach. Ask me about your posture score, sessions, calibration, or improvement tips."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const disabled = isLoading || !input.trim().length;

  const shortStatus = useMemo(() => {
    if (!context.trackingStable) return "Tracking unstable";
    return `Live state: ${context.state} (${context.score}%)`;
  }, [context.score, context.state, context.trackingStable]);

  const sendPrompt = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/victor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context })
      });

      if (!res.ok) {
        throw new Error("Victor is unavailable right now.");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I can help with your posture scores, sessions, calibration, and improvement tips."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Victor</h2>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/90">Posture Coach</p>
        </div>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
          {shortStatus}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => void sendPrompt(prompt)}
            className="rounded-full border border-slate-600/55 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="h-64 space-y-3 overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-950/45 p-3">
        {messages.map((message, idx) => (
          <div
            key={`${message.role}-${idx}`}
            className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
              message.role === "assistant"
                ? "border border-cyan-300/25 bg-cyan-300/10 text-slate-100"
                : "ml-auto border border-slate-600/60 bg-slate-800/70 text-slate-100"
            }`}
          >
            {message.content}
          </div>
        ))}
        {isLoading ? (
          <div className="max-w-[88%] rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-slate-200">
            Thinking...
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendPrompt(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Victor about your posture performance..."
          className="flex-1 rounded-xl border border-slate-600/55 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-300/40 transition focus:ring"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl border border-cyan-300/40 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-100 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-400">
        Victor is a posture coach, not a medical professional. He only answers using your app data.
      </p>
    </section>
  );
}
