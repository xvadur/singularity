import { NextResponse } from "next/server";

const DEFAULT_BASE_URL = "http://127.0.0.1:3031";

export async function forwardJson(pathname: string, init?: RequestInit): Promise<NextResponse> {
  const baseUrl = (process.env.ALFRED_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const target = `${baseUrl}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

  try {
    const upstream = await fetch(target, {
      ...init,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const payload = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "UPSTREAM_UNAVAILABLE",
        detail: error instanceof Error ? error.message : "Unknown upstream error",
      },
      { status: 502 },
    );
  }
}
