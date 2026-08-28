import { fileURLToPath } from "node:url";

export async function verifyPublicSurface(fetcher: typeof fetch, url: string): Promise<{ status: number; url: string }> {
  const response = await fetcher(url, { headers: { accept: "text/html" } });
  if (!response.ok) throw new Error(`public_surface_check_failed:${response.status}`);
  return { status: response.status, url };
}

export async function main() {
  const url = process.env.PAPERTRADER_WEB_URL?.trim();
  if (!url) throw new Error("PAPERTRADER_WEB_URL is required.");
  const result = await verifyPublicSurface(fetch, url);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "public_surface_verification_failed"); process.exitCode = 1; });
