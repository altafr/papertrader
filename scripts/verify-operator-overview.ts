import { validateAuditCsvHeader, validateOperatorOverviewContract } from "./operator-overview-contract.js";

const baseUrl = (process.env.OPERATOR_API_BASE_URL ?? "https://api-production-e0a6.up.railway.app").replace(/\/$/, "");
const token = process.env.OPERATOR_AUTH_TOKEN;

if (!token) {
  console.error("OPERATOR_AUTH_TOKEN is required; it is read only from the environment and is never printed.");
  process.exit(2);
}

async function request(path: string): Promise<Response> {
  return fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
}

async function main() {
  const overviewResponse = await request("/v1/operator-overview?limit=1&page=1");
  if (!overviewResponse.ok) throw new Error(`overview_http_${overviewResponse.status}`);
  const overviewResult = validateOperatorOverviewContract(await overviewResponse.json());
  if (!overviewResult.valid) throw new Error(`overview_contract_${overviewResult.reason}`);

  const csvResponse = await request("/v1/operator-overview.csv?limit=1&page=1");
  if (!csvResponse.ok) throw new Error(`csv_http_${csvResponse.status}`);
  const csvResult = validateAuditCsvHeader(await csvResponse.text());
  if (!csvResult.valid) throw new Error(`csv_contract_${csvResult.reason}`);

  console.log(`Operator overview contract verified at ${baseUrl} (overview ${overviewResponse.status}, CSV ${csvResponse.status}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "operator_overview_verification_failed");
  process.exitCode = 1;
});
