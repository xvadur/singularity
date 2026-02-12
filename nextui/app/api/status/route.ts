import { forwardJson } from "../../../lib/forward";

export async function GET() {
  return forwardJson("/api/status", { method: "GET" });
}
