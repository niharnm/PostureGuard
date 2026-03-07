import { PostureState } from "@/lib/types";

export type ArduinoSignal = "GOOD" | "WARN" | "BAD" | "BREAK";

export type ArduinoConnection = {
  port: SerialPort;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

const encoder = new TextEncoder();

export const isSerialSupported = () =>
  typeof navigator !== "undefined" && "serial" in navigator;

export async function connectArduino(baudRate = 9600): Promise<ArduinoConnection> {
  const serial = (navigator as Navigator & { serial: Serial }).serial;
  const port = await serial.requestPort();
  await port.open({ baudRate });
  if (!port.writable) {
    throw new Error("Connected device is not writable.");
  }

  const writer = port.writable.getWriter();
  return { port, writer };
}

export async function disconnectArduino(connection: ArduinoConnection) {
  try {
    connection.writer.releaseLock();
  } catch (error) {
    console.debug("Arduino disconnect: writer lock release failed.", error);
  }

  try {
    await connection.port.close();
  } catch (error) {
    console.debug("Arduino disconnect: port close failed (possibly already disconnected).", error);
  }
}

export function mapPostureToArduinoSignal(state: PostureState): ArduinoSignal | null {
  if (state === "NO_PERSON") return null;
  return state;
}

export async function sendArduinoCommand(connection: ArduinoConnection, signal: ArduinoSignal) {
  if (!connection.port.writable) {
    throw new Error("Serial port is not writable.");
  }

  const command = signal.trim().toUpperCase();
  console.log("Arduino → sending:", command);
  const payload = encoder.encode(`${command}\n`);
  await connection.writer.write(payload);
}

export async function sendPostureToArduino(
  connection: ArduinoConnection,
  state: PostureState
) {
  const signal = mapPostureToArduinoSignal(state);
  if (!signal) return;
  await sendArduinoCommand(connection, signal);
}

export async function sendBreakToArduino(connection: ArduinoConnection) {
  await sendArduinoCommand(connection, "BREAK");
}
