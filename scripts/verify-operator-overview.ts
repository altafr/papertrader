import { fileURLToPath } from "node:url";

import { validateAuditCsvHeader, validateOperatorOverviewContract } from "./operator-overview-contract.js";

const baseUrl = (process.env.OPERATOR_API_BASE_URL ?? "https://api-production-e0a6.up.railway.app").replace(/\/$/, "");
const token = process.env.OPERATOR_AUTH_TOKEN;

export async function verifyOperatorOverview(fetcher: typeof fetch, targetBaseUrl: string, bearerToken: string): Promise<{ readonly csvStatus: number; readonly overviewStatus: number }> {
  const normalizedBaseUrl = targetBaseUrl.replace(/\/$/, "");
  const request = (path: string) => fetcher(`${normalizedBaseUrl}${path}`, { headers: { authorization: `Bearer ${bearerToken}` } });
  const overviewResponse = await request("/v1/operator-overview?limit=1&page=1");
  if (!overviewResponse.ok) throw new Error(`overview_http_${overviewResponse.status}`);
  const overviewResult = validateOperatorOverviewContract(await overviewResponse.json());
  if (!overviewResult.valid) throw new Error(`overview_contract_${overviewResult.reason}`);

  const csvResponse = await request("/v1/operator-overview.csv?limit=1&page=1");
  if (!csvResponse.ok) throw new Error(`csv_http_${csvResponse.status}`);
  const csvResult = validateAuditCsvHeader(await csvResponse.text());
  if (!csvResult.valid) throw new Error(`csv_contract_${csvResult.reason}`);
  return { csvStatus: csvResponse.status, overviewStatus: overviewResponse.status };
}

async function main() {
  if (!token) {
    console.error("OPERATOR_AUTH_TOKEN is required; it is read only from the environment and is never printed.");
    process.exitCode = 2;
    return;
  }
  const result = await verifyOperatorOverview(fetch, baseUrl, token);

  console.log(`Operator overview contract verified at ${baseUrl} (overview ${result.overviewStatus}, CSV ${result.csvStatus}).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "operator_overview_verification_failed");
    process.exitCode = 1;
  });
}
