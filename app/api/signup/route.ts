import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

function mapSignupError(error: unknown): { status: number; message: string; details?: string } {
  const isDev = process.env.NODE_ENV !== "production";

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      message: "Invalid request payload."
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        status: 409,
        message: "An account with this email already exists.",
        details: isDev ? error.message : undefined
      };
    }

    if (["P1001", "P1002", "P1008", "P1017"].includes(error.code)) {
      return {
        status: 503,
        message: "Signup is temporarily unavailable. Please try again shortly.",
        details: isDev ? error.message : undefined
      };
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message: "Signup is temporarily unavailable. Please try again shortly.",
      details: isDev ? error.message : undefined
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: isDev ? error.message : "Unable to create account.",
      details: isDev ? error.stack : undefined
    };
  }

  return {
    status: 500,
    message: "Unable to create account."
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email is already in use." }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Signup failed:", error);

    const mapped = mapSignupError(error);
    return NextResponse.json(
      mapped.details ? { error: mapped.message, details: mapped.details } : { error: mapped.message },
      { status: mapped.status }
    );
  }
}
