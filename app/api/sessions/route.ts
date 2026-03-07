import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const sessions = await prisma.postureSession.findMany({
    where: {
      userId,
      endTime: { not: null }
    },
    orderBy: { startTime: "desc" },
    take: 25
  });

  return NextResponse.json({ sessions });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const session = await prisma.postureSession.create({
    data: {
      userId,
      startTime: new Date()
    }
  });

  return NextResponse.json({ session });
}
