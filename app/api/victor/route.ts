import type { VictorContextPayload } from "@/lib/types";
import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function asFinite(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeContext(context: Partial<VictorContextPayload> | null): VictorContextPayload {
  const sessionStats = context?.sessionStats;
  const history = Array.isArray(context?.sessionHistory) ? context.sessionHistory : [];

  return {
    state: context?.state ?? "NO_PERSON",
    score: clamp(asFinite(context?.score, 0), 0, 100),
    calibrationStatus: context?.calibrationStatus ?? "NOT_CALIBRATED",
    calibrationMessage: context?.calibrationMessage ?? null,
    trackingStable: Boolean(context?.trackingStable),
    trackingConfidence: clamp(asFinite(context?.trackingConfidence, 0), 0, 1),
    dominantIssue: context?.dominantIssue ?? null,
    latestSession: context?.latestSession ?? null,
    liveTips: Array.isArray(context?.liveTips) ? context.liveTips.slice(0, 3).map(String) : [],
    sessionStats: {
      goodMs: Math.max(0, Math.round(asFinite(sessionStats?.goodMs, 0))),
      warnMs: Math.max(0, Math.round(asFinite(sessionStats?.warnMs, 0))),
      badMs: Math.max(0, Math.round(asFinite(sessionStats?.badMs, 0))),
      sessionScore: clamp(asFinite(sessionStats?.sessionScore, 0), 0, 100)
    },
    sessionHistory: history.slice(0, 8).map((entry) => ({
      startTime: String(entry.startTime ?? ""),
      score: clamp(asFinite(entry.score, 0), 0, 100),
      goodRatio: clamp(asFinite(entry.goodRatio, 0), 0, 1),
      warnRatio: clamp(asFinite(entry.warnRatio, 0), 0, 1),
      badRatio: clamp(asFinite(entry.badRatio, 0), 0, 1),
      durationMs: Math.max(0, Math.round(asFinite(entry.durationMs, 0)))
    }))
  };
}

function isInScope(question: string) {
  const lower = question.toLowerCase();
  return [
    "posture",
    "score",
    "session",
    "calibrat",
    "good",
    "warn",
    "bad",
    "tracking",
    "improve",
    "tip",
    "coach",
    "victor"
  ].some((token) => lower.includes(token));
}

const OUT_OF_SCOPE =
  "I can help with your posture scores, sessions, calibration, and improvement tips.";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const question = String(payload?.question ?? "").trim().slice(0, 500);

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    if (!isInScope(question)) {
      return NextResponse.json({ answer: OUT_OF_SCOPE });
    }

    const context = sanitizeContext(payload?.context ?? null);
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        answer:
          "Victor is not configured yet. Add OPENROUTER_API_KEY to your environment, then ask again."
      });
    }

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const systemPrompt = [
      "You are Victor, an in-app posture coach for PostureGuard.",
      "Scope is strictly limited to the provided posture/session/calibration context.",
      "Do not answer unrelated questions. Redirect with: \"I can help with your posture scores, sessions, calibration, and improvement tips.\"",
      "Do not provide medical diagnosis or treatment claims.",
      "Do not claim to see camera frames directly.",
      "Give concise, practical coaching with 1-3 actions max."
    ].join(" ");

    const userPrompt = JSON.stringify({ question, context });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Victor API request failed.", details: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer = String(data?.choices?.[0]?.message?.content ?? "").trim() || OUT_OF_SCOPE;
    return NextResponse.json({ answer: answer.slice(0, 1000) });
  } catch {
    return NextResponse.json({ error: "Unable to generate Victor response." }, { status: 500 });
  }
}
