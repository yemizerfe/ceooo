import { NextRequest, NextResponse } from "next/server";

// Forwards to the Express API (GET/PUT/DELETE /api/team/:id).
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

async function forward(
  request: NextRequest,
  id: string,
  init: RequestInit = {}
): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");

  try {
    const response = await fetch(`${API_URL}/api/team/${encodeURIComponent(id)}`, {
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return forward(request, id);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return forward(request, id, {
    method: "PUT",
    body: await request.text(),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return forward(request, id, { method: "DELETE" });
}
