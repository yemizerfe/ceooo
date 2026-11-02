import { NextRequest, NextResponse } from "next/server";

// Sign-in is proxied through this app's own origin instead of being posted to
// the API from the browser. The API only allows a fixed CORS allow-list, so a
// visitor on 127.0.0.1, a LAN address or a preview domain would otherwise get a
// blocked request that looks like "login is broken". Same-origin here, and the
// JWT never has to leave the browser to reach the API host.
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

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Preserve the caller's address so the API's auth rate limiter still
        // counts attempts per client rather than per Next.js process.
        ...(req.headers.get("x-forwarded-for")
          ? { "x-forwarded-for": req.headers.get("x-forwarded-for") as string }
          : {}),
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
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
