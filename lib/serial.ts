import { PostureState } from "@/lib/types";

export type ArduinoConnection = {
  port: SerialPort;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

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
  connection.writer.releaseLock();
  await connection.port.close();
}

export async function sendPostureToArduino(
  connection: ArduinoConnection,
  state: PostureState
) {
  if (state === "NO_PERSON") return;

  const encoder = new TextEncoder();
  const payload = encoder.encode(`${state}\n`);
  await connection.writer.write(payload);
}
