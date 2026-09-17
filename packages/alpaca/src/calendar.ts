import { z } from "zod";
import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";
import type { AlpacaAccountReaderOptions } from "./index.js";

const daySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) });
const calendarSchema = z.array(daySchema).max(1);

/** Read-only calendar; an empty trading day means a holiday, not a provider failure. */
export function createPaperCalendarReader(options: AlpacaAccountReaderOptions) {
  if (!options.apiKey.trim() || !options.secretKey.trim()) throw new Error("Paper calendar credentials are required server-side.");
  if (options.baseUrl && options.baseUrl !== PAPER_TRADING_API_BASE_URL) throw new Error("Paper calendar endpoint required.");
  return async (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid calendar date.");
    const response = await (options.fetchImpl ?? fetch)(`${PAPER_TRADING_API_BASE_URL}/v2/calendar?start=${date}&end=${date}`, { method: "GET", headers: { "APCA-API-KEY-ID": options.apiKey, "APCA-API-SECRET-KEY": options.secretKey, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("paper_calendar_unavailable");
    const rows = calendarSchema.parse(await response.json());
    const day = rows[0];
    if (day && day.date !== date) throw new Error("paper_calendar_date_mismatch");
    return day;
  };
}
