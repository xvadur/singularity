import { NextResponse } from "next/server";
import { toAlfredUrl } from "@/lib/alfred-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(toAlfredUrl("/api/status"), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "upstream_status_unreachable",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 }
    );
  }
}

