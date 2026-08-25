import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  const { isAuthenticated, getToken } = await auth();
  if (!isAuthenticated) return new Response("Unauthorized", { status: 401 });
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = await getToken();
  if (!apiBaseUrl || !token) return new Response("Export unavailable", { status: 503 });
  const query = new URL(request.url).search;
  const upstream = await fetch(`${apiBaseUrl}/v1/operator-overview.csv${query}`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-disposition": upstream.headers.get("content-disposition") ?? "attachment; filename=momentum-autopilot-audit.csv",
      "content-type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
    },
  });
}
