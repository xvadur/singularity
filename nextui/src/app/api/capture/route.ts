import { NextRequest, NextResponse } from "next/server";
import { toAlfredUrl } from "@/lib/alfred-proxy";

export const dynamic = "force-dynamic";

function forwardAuthHeaders(from: Headers, to: Headers): void {
  const authorization = from.get("authorization");
  const alfredToken = from.get("x-alfred-token");

  if (authorization) {
    to.set("authorization", authorization);
  }
  if (alfredToken) {
    to.set("x-alfred-token", alfredToken);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = new Headers();
    headers.set("content-type", request.headers.get("content-type") || "application/json");
    headers.set("accept", "application/json");
    forwardAuthHeaders(request.headers, headers);

    const upstream = await fetch(toAlfredUrl("/api/capture"), {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    const payload = await upstream.text();

    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_capture_unreachable",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 }
    );
  }
}

