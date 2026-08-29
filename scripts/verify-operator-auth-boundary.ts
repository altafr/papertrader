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

export const REQUIRED_ACCOUNT_CSV_COLUMNS = ["exitPlanStatus", "exitPlanMissingFields", "strategyKey", "strategyVersion", "plannedStopPrice", "plannedTargetPrice", "positionOpenedAt"] as const;

export function validateAccountCsvHeader(header: string): { readonly columns: readonly string[] } {
  const columns = header.replace(/^\uFEFF/, "").split(",").map((column) => column.trim().replace(/^"|"$/g, ""));
  const missing = REQUIRED_ACCOUNT_CSV_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) throw new Error(`account_csv_missing_columns:${missing.join(",")}`);
  return { columns };
}

export async function verifyAuthenticatedAccountCsv(fetcher: typeof fetch, targetBaseUrl: string, token: string): Promise<{ readonly status: number; readonly columns: readonly string[] }> {
  if (!token.trim()) throw new Error("operator_auth_token_required");
  const response = await fetcher(`${targetBaseUrl.replace(/\/$/, "")}/v1/read-model.csv`, { headers: { authorization: `Bearer ${token}` } });
  if (response.status !== 200) throw new Error(`csv_authenticated_status_${response.status}`);
  const firstLine = (await response.text()).split(/\r?\n/, 1)[0] ?? "";
  return { columns: validateAccountCsvHeader(firstLine).columns, status: response.status };
}

async function main() {
  const baseUrl = process.env.OPERATOR_API_BASE_URL ?? defaultBaseUrl;
  const result = await verifyOperatorAuthBoundary(fetch, baseUrl);
  console.log(`Operator authentication boundary verified at ${baseUrl} (overview ${result.overviewStatus}, CSV ${result.csvStatus}).`);
  const token = process.env.OPERATOR_AUTH_TOKEN?.trim();
  if (token) {
    const authenticated = await verifyAuthenticatedAccountCsv(fetch, baseUrl, token);
    console.log(`Authenticated account CSV contract verified (${authenticated.columns.length} columns).`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "operator_auth_boundary_verification_failed");
    process.exitCode = 1;
  });
}
