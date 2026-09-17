import type { ResearchPreparationJob } from "./research-scheduler.js";

export function getNewYorkSessionTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isStockSessionAllowed(session: NonNullable<ResearchPreparationJob["session"]>, now: Date, day: { readonly date: string; readonly open: string; readonly close: string } | undefined): boolean {
  const local = getNewYorkSessionTime(now);
  if (!day || day.date !== local.date) return false;
  const minute = (value: string) => { const [hour, min] = value.split(":").map(Number); return (hour ?? -1) * 60 + (min ?? -1); };
  const open = minute(day.open), close = minute(day.close);
  if (open < 0 || close <= open || close > 24 * 60) throw new Error("Invalid market calendar session.");
  // Expired/retried preparation jobs cannot become an out-of-session scan.
  if (session === "pre_market") return local.minutes >= open - 60 && local.minutes < open;
  if (session === "after_close") return local.minutes >= 17 * 60 && local.minutes < 18 * 60 && local.minutes >= close;
  return local.minutes >= open && local.minutes < close;
}
