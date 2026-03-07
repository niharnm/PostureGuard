"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArduinoConnection,
  connectArduino,
  disconnectArduino,
  isSerialSupported,
  sendPostureToArduino
} from "@/lib/serial";
import { PostureState } from "@/lib/types";

type ArduinoStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "UNSUPPORTED";

export function useArduinoSerial() {
  const [status, setStatus] = useState<ArduinoStatus>(
    isSerialSupported() ? "DISCONNECTED" : "UNSUPPORTED"
  );
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<PostureState | null>(null);
  const connectionRef = useRef<ArduinoConnection | null>(null);

  const connect = useCallback(async () => {
    if (!isSerialSupported()) {
      setStatus("UNSUPPORTED");
      return;
    }

    setStatus("CONNECTING");
    setError(null);

    try {
      connectionRef.current = await connectArduino(9600);
      setStatus("CONNECTED");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Arduino.";
      setError(message);
      setStatus("DISCONNECTED");
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!connectionRef.current) return;
    try {
      await disconnectArduino(connectionRef.current);
    } finally {
      connectionRef.current = null;
      setStatus("DISCONNECTED");
      setLastSent(null);
    }
  }, []);

  const sendState = useCallback(
    async (state: PostureState) => {
      if (status !== "CONNECTED" || !connectionRef.current) return;
      if (state === lastSent || state === "NO_PERSON") return;

      try {
        await sendPostureToArduino(connectionRef.current, state);
        setLastSent(state);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to write serial data.";
        setError(message);
        setStatus("DISCONNECTED");
        connectionRef.current = null;
      }
    },
    [lastSent, status]
  );

  return {
    status,
    error,
    lastSent,
    connect,
    disconnect,
    sendState,
    supported: status !== "UNSUPPORTED"
  };
}
