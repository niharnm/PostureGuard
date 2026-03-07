import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Params) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await context.params;

  try {
    const payload = await request.json();

    const timeGoodMs = Number(payload.timeGoodMs);
    const timeWarnMs = Number(payload.timeWarnMs);
    const timeBadMs = Number(payload.timeBadMs);
    const score = Number(payload.score);

    if ([timeGoodMs, timeWarnMs, timeBadMs, score].some((value) => !Number.isFinite(value))) {
      return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
    }

    const updated = await prisma.postureSession.updateMany({
      where: { id, userId },
      data: {
        endTime: new Date(),
        timeGoodMs: Math.max(0, Math.round(timeGoodMs)),
        timeWarnMs: Math.max(0, Math.round(timeWarnMs)),
        timeBadMs: Math.max(0, Math.round(timeBadMs)),
        score: Math.max(0, Math.min(100, Math.round(score)))
      }
    });

    if (!updated.count) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const session = await prisma.postureSession.findUnique({ where: { id } });

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Unable to finalize session." }, { status: 500 });
  }
}
