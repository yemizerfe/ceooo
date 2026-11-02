import { NextRequest, NextResponse } from "next/server";

// Account creation is proxied through this app's origin for the same reason as
// login: no browser CORS negotiation, so it works from any host the app is
// served on (loopback, LAN, preview, production domain).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("x-forwarded-for")
          ? { "x-forwarded-for": req.headers.get("x-forwarded-for") as string }
          : {}),
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        ...(body.name ? { name: body.name } : {}),
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Authentication service returned an invalid response." },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not reach the authentication service. Please try again." },
      { status: 502 }
    );
  }
}
