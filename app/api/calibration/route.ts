import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const calibration = await prisma.calibration.findUnique({
    where: { userId }
  });

  if (!calibration) {
    return NextResponse.json({ calibration: null });
  }

  return NextResponse.json({
    calibration: {
      baselineForward: calibration.baselineForward,
      baselineShoulder: calibration.baselineShoulder,
      baselineHeadTilt: calibration.baselineHeadTilt,
      baselineTorsoAlign: calibration.baselineTorsoAlign,
      updatedAt: calibration.updatedAt
    }
  });
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const payload = await request.json();

    const baselineForward = Number(payload.baselineForward);
    const baselineShoulder = Number(payload.baselineShoulder);
    const baselineHeadTilt = Number(payload.baselineHeadTilt);
    const baselineTorsoAlign = Number(payload.baselineTorsoAlign);

    if (
      [baselineForward, baselineShoulder, baselineHeadTilt, baselineTorsoAlign].some(
        (value) => !Number.isFinite(value)
      )
    ) {
      return NextResponse.json({ error: "Invalid calibration payload." }, { status: 400 });
    }

    const calibration = await prisma.calibration.upsert({
      where: { userId },
      update: {
        baselineForward,
        baselineShoulder,
        baselineHeadTilt,
        baselineTorsoAlign
      },
      create: {
        userId,
        baselineForward,
        baselineShoulder,
        baselineHeadTilt,
        baselineTorsoAlign
      }
    });

    return NextResponse.json({ calibration });
  } catch {
    return NextResponse.json({ error: "Unable to save calibration." }, { status: 500 });
  }
}
