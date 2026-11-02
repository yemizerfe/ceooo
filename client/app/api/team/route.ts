import { NextRequest, NextResponse } from "next/server";

// Team data lives in the Express API (GET/POST /api/team). This route handler
// stays as a same-origin shim and forwards to it.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

async function forward(
  request: NextRequest,
  path: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");

  try {
    const response = await fetch(`${API_URL}/api/team${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Team service is unavailable" },
      { status: 502 }
    );
  }
}

// GET - Fetch all team members
export async function GET(request: NextRequest) {
  return forward(request, "");
}

// POST - Create a new team member
export async function POST(request: NextRequest) {
  return forward(request, "", {
    method: "POST",
    body: await request.text(),
  });
}
