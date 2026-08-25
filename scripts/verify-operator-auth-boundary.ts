import { fileURLToPath } from "node:url";

const defaultBaseUrl = "https://api-production-e0a6.up.railway.app";

export async function verifyOperatorAuthBoundary(fetcher: typeof fetch, targetBaseUrl: string): Promise<{ readonly csvStatus: number; readonly overviewStatus: number }> {
  const baseUrl = targetBaseUrl.replace(/\/$/, "");
  const overviewResponse = await fetcher(`${baseUrl}/v1/operator-overview?limit=1&page=1`);
  const csvResponse = await fetcher(`${baseUrl}/v1/operator-overview.csv?limit=1&page=1`);
  if (overviewResponse.status !== 401) throw new Error(`overview_auth_boundary_${overviewResponse.status}`);
  if (csvResponse.status !== 401) throw new Error(`csv_auth_boundary_${csvResponse.status}`);
  return { csvStatus: csvResponse.status, overviewStatus: overviewResponse.status };
}

async function main() {
  const baseUrl = process.env.OPERATOR_API_BASE_URL ?? defaultBaseUrl;
  const result = await verifyOperatorAuthBoundary(fetch, baseUrl);
  console.log(`Operator authentication boundary verified at ${baseUrl} (overview ${result.overviewStatus}, CSV ${result.csvStatus}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "operator_auth_boundary_verification_failed");
    process.exitCode = 1;
  });
}
