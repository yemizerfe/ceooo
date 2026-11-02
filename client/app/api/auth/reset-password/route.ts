import { NextRequest, NextResponse } from "next/server";

// Forward to the backend API. The API only accepts a signed reset token (mailed
// as a link) plus the new password - never an email address on its own.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Open the reset link from your email to continue." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Failed to reset password" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "Password has been reset successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not reach the authentication service. Please try again." },
      { status: 502 }
    );
  }
}
