"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArduinoConnection,
  ArduinoSignal,
  connectArduino,
  disconnectArduino,
  isSerialSupported,
  mapPostureToArduinoSignal,
  sendArduinoCommand
} from "@/lib/serial";
import { PostureState } from "@/lib/types";

type ArduinoStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "UNSUPPORTED";
type WriteStatus = "IDLE" | "SUCCESS" | "ERROR";
type CommandSource = "AUTO" | "MANUAL" | "SYSTEM";

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Serial command failed.";
}

export function useArduinoSerial() {
  const supported = isSerialSupported();
  const [status, setStatus] = useState<ArduinoStatus>(supported ? "DISCONNECTED" : "UNSUPPORTED");
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<ArduinoSignal | null>(null);
  const [hardwareState, setHardwareState] = useState<ArduinoSignal | null>(null);
  const [lastWriteStatus, setLastWriteStatus] = useState<WriteStatus>("IDLE");
  const [lastWriteMessage, setLastWriteMessage] = useState<string | null>(null);
  const [lastWriteAt, setLastWriteAt] = useState<number | null>(null);
  const connectionRef = useRef<ArduinoConnection | null>(null);
  const lastAutoSignalRef = useRef<ArduinoSignal | null>(null);

  const resetConnectionState = useCallback(() => {
    connectionRef.current = null;
    lastAutoSignalRef.current = null;
    setStatus("DISCONNECTED");
  }, []);

  const writeCommand = useCallback(
    async (signal: ArduinoSignal, source: CommandSource, force = false) => {
      if (status !== "CONNECTED" || !connectionRef.current) {
        setLastWriteStatus("ERROR");
        setLastWriteMessage("Arduino is not connected.");
        setLastWriteAt(Date.now());
        return false;
      }

      if (!force && source === "AUTO" && lastAutoSignalRef.current === signal) {
        return true;
      }

      try {
        await sendArduinoCommand(connectionRef.current, signal);
        setLastSent(signal);
        setHardwareState(signal);
        setLastWriteStatus("SUCCESS");
        setLastWriteMessage(`${source}: sent ${signal}\\n`);
        setLastWriteAt(Date.now());
        setError(null);
        if (source === "AUTO") {
          lastAutoSignalRef.current = signal;
        } else {
          // Allow the next auto posture transition to re-sync hardware after manual/system commands.
          lastAutoSignalRef.current = null;
        }
        return true;
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        setLastWriteStatus("ERROR");
        setLastWriteMessage(`${source}: ${message}`);
        setLastWriteAt(Date.now());
        resetConnectionState();
        return false;
      }
    },
    [resetConnectionState, status]
  );

  const connect = useCallback(async () => {
    if (!supported) {
      setStatus("UNSUPPORTED");
      return;
    }

    setStatus("CONNECTING");
    setError(null);
    setLastWriteStatus("IDLE");
    setLastWriteMessage(null);

    try {
      connectionRef.current = await connectArduino(9600);
      lastAutoSignalRef.current = null;
      setStatus("CONNECTED");
      setLastWriteStatus("SUCCESS");
      setLastWriteMessage("Connected at 9600 baud.");
      setLastWriteAt(Date.now());
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      setLastWriteStatus("ERROR");
      setLastWriteMessage(message);
      setLastWriteAt(Date.now());
      setStatus("DISCONNECTED");
      connectionRef.current = null;
    }
  }, [supported]);

  const disconnect = useCallback(async () => {
    if (!connectionRef.current) return;
    try {
      await disconnectArduino(connectionRef.current);
      setLastWriteStatus("SUCCESS");
      setLastWriteMessage("Disconnected serial port.");
      setLastWriteAt(Date.now());
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      setLastWriteStatus("ERROR");
      setLastWriteMessage(message);
      setLastWriteAt(Date.now());
    } finally {
      resetConnectionState();
      setLastSent(null);
      setHardwareState(null);
    }
  }, [resetConnectionState]);

  const sendState = useCallback(
    async (state: PostureState) => {
      const signal = mapPostureToArduinoSignal(state);
      if (!signal) return false;
      return writeCommand(signal, "AUTO", false);
    },
    [writeCommand]
  );

  const sendManual = useCallback(
    async (signal: ArduinoSignal) => {
      return writeCommand(signal, "MANUAL", true);
    },
    [writeCommand]
  );

  const triggerBreak = useCallback(async () => {
    return writeCommand("BREAK", "SYSTEM", true);
  }, [writeCommand]);

  const connectionLabel = useMemo(() => {
    if (status === "CONNECTED") return "Connected";
    if (status === "CONNECTING") return "Connecting";
    if (status === "UNSUPPORTED") return "Unsupported";
    return "Disconnected";
  }, [status]);

  return {
    status,
    error,
    supported,
    lastSent,
    hardwareState,
    lastWriteStatus,
    lastWriteMessage,
    lastWriteAt,
    connectionLabel,
    connect,
    disconnect,
    sendState,
    sendManual,
    triggerBreak
  };
}
