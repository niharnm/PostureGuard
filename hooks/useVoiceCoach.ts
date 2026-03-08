"use client";

import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PostureState } from "@/lib/types";

type VoiceCoachInput = {
  state: PostureState;
  alertBanner: string | null;
  breakMode: boolean;
  monitoringActive: boolean;
};

type VapiLike = {
  start: (assistant: string) => Promise<unknown>;
  stop: () => Promise<void>;
  say: (message: string) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

const WARN_PHRASES = ["You're starting to slouch.", "Try sitting a little straighter."];
const BAD_PHRASES = ["Bad posture detected. Sit up straight.", "Please correct your posture."];
const RECOVERY_PHRASES = ["Nice recovery.", "Good posture restored."];
const BREAK_PHRASE = "Break mode activated. Stand and stretch.";
const BAD_PERSISTED_PHRASE = "Please correct your posture.";

const GLOBAL_COOLDOWN_MS = 18_000;
const TRANSITION_GAP_MS = 2_500;

function nextPhrase(list: string[], cursorRef: MutableRefObject<number>) {
  const phrase = list[cursorRef.current % list.length];
  cursorRef.current += 1;
  return phrase;
}

export function useVoiceCoach({ state, alertBanner, breakMode, monitoringActive }: VoiceCoachInput) {
  const [enabled, setEnabled] = useState(true);
  const [available, setAvailable] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const vapiRef = useRef<VapiLike | null>(null);
  const vapiStartedRef = useRef(false);
  const initAttemptedRef = useRef(false);
  const lastGlobalSpeechAtRef = useRef(0);
  const lastTransitionSpeechAtRef = useRef(0);
  const prevStateRef = useRef<PostureState | null>(null);
  const prevBreakModeRef = useRef(false);
  const prevAlertBannerRef = useRef<string | null>(null);
  const pendingPhraseRef = useRef<string | null>(null);

  const warnPhraseCursorRef = useRef(0);
  const badPhraseCursorRef = useRef(0);
  const recoveryPhraseCursorRef = useRef(0);

  const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  const vapiAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() ?? "";

  const configured = useMemo(() => Boolean(vapiPublicKey && vapiAssistantId), [vapiAssistantId, vapiPublicKey]);

  const ensureVapi = useCallback(async () => {
    if (!configured) {
      setAvailable(false);
      return null;
    }

    if (vapiRef.current) return vapiRef.current;
    if (initAttemptedRef.current && !vapiRef.current) return null;

    initAttemptedRef.current = true;
    try {
      const module = await import("@vapi-ai/web");
      const VapiConstructor = module.default;
      const client = new VapiConstructor(vapiPublicKey) as VapiLike;
      client.on("speech-start", () => setIsSpeaking(true));
      client.on("speech-end", () => {
        setIsSpeaking(false);
        const pending = pendingPhraseRef.current;
        pendingPhraseRef.current = null;
        if (pending) {
          try {
            client.say(pending);
            lastGlobalSpeechAtRef.current = Date.now();
          } catch {
            // Keep posture monitoring alive even if voice fails.
          }
        }
      });
      client.on("call-end", () => {
        vapiStartedRef.current = false;
        setIsSpeaking(false);
      });
      client.on("error", () => {
        // Keep posture monitoring alive even if voice fails.
      });
      vapiRef.current = client;
      setAvailable(true);
      return client;
    } catch {
      setAvailable(false);
      return null;
    }
  }, [configured, vapiPublicKey]);

  const ensureStarted = useCallback(async () => {
    const client = await ensureVapi();
    if (!client) return null;
    if (vapiStartedRef.current) return client;

    try {
      await client.start(vapiAssistantId);
      vapiStartedRef.current = true;
      return client;
    } catch {
      setAvailable(false);
      return null;
    }
  }, [ensureVapi, vapiAssistantId]);

  const speak = useCallback(
    async (phrase: string, isMajorTransition: boolean, allowWhenMonitoringStopped = false) => {
      if (!enabled || !phrase) return;
      if (!monitoringActive && !allowWhenMonitoringStopped) return;

      const now = Date.now();
      if (isMajorTransition) {
        if (now - lastTransitionSpeechAtRef.current < TRANSITION_GAP_MS) return;
      } else if (now - lastGlobalSpeechAtRef.current < GLOBAL_COOLDOWN_MS) {
        return;
      }

      const client = await ensureStarted();
      if (!client) return;

      try {
        if (isSpeaking) {
          pendingPhraseRef.current = phrase;
          return;
        }
        client.say(phrase);
        lastGlobalSpeechAtRef.current = now;
        if (isMajorTransition) {
          lastTransitionSpeechAtRef.current = now;
        }
      } catch {
        // Keep posture monitoring alive even if voice fails.
      }
    },
    [enabled, ensureStarted, isSpeaking, monitoringActive]
  );

  useEffect(() => {
    if (!enabled || !monitoringActive) return;
    void ensureStarted();
  }, [enabled, ensureStarted, monitoringActive]);

  useEffect(() => {
    if (!enabled) return;

    const previous = prevStateRef.current;
    if (previous === null) {
      prevStateRef.current = state;
      return;
    }

    if (previous !== state) {
      if (state === "WARN") {
        void speak(nextPhrase(WARN_PHRASES, warnPhraseCursorRef), true);
      } else if (state === "BAD") {
        void speak(nextPhrase(BAD_PHRASES, badPhraseCursorRef), true);
      } else if (state === "GOOD" && (previous === "WARN" || previous === "BAD")) {
        void speak(nextPhrase(RECOVERY_PHRASES, recoveryPhraseCursorRef), true);
      }
    }

    prevStateRef.current = state;
  }, [enabled, speak, state]);

  useEffect(() => {
    if (!enabled) return;
    const prevBreakMode = prevBreakModeRef.current;
    if (!prevBreakMode && breakMode) {
      void speak(BREAK_PHRASE, true, true);
    }
    prevBreakModeRef.current = breakMode;
  }, [breakMode, enabled, speak]);

  useEffect(() => {
    if (!enabled) return;
    const prevAlert = prevAlertBannerRef.current;
    if (!prevAlert && alertBanner && state === "BAD") {
      void speak(BAD_PERSISTED_PHRASE, false);
    }
    prevAlertBannerRef.current = alertBanner;
  }, [alertBanner, enabled, speak, state]);

  useEffect(() => {
    if (enabled) return;
    pendingPhraseRef.current = null;
    setIsSpeaking(false);
    if (vapiRef.current && vapiStartedRef.current) {
      void vapiRef.current.stop().catch(() => undefined);
      vapiStartedRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      const client = vapiRef.current;
      if (!client) return;
      void client.stop().catch(() => undefined);
    };
  }, []);

  const safeSetEnabled = useCallback((next: boolean) => {
    setEnabled(next);
  }, []);

  return {
    enabled,
    available,
    configured,
    isSpeaking,
    setEnabled: safeSetEnabled
  };
}
