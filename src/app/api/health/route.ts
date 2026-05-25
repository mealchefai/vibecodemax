import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(
      { status: "healthy" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
