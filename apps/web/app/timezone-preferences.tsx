"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_DISPLAY_TIMEZONE, normalizeDisplayTimezone, type DisplayTimezone } from "./dashboard/dashboard-state";

const COOKIE_NAME = "display_timezone";

function readTimezone(): DisplayTimezone {
  if (typeof document === "undefined") return DEFAULT_DISPLAY_TIMEZONE;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  return normalizeDisplayTimezone(value);
}

const TimezoneContext = createContext<{ readonly timezone: DisplayTimezone; readonly setTimezone: (timezone: DisplayTimezone) => void }>({ timezone: DEFAULT_DISPLAY_TIMEZONE, setTimezone: () => {} });

export function TimezoneProvider({ children }: { readonly children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<DisplayTimezone>(readTimezone);
  const setTimezone = (next: DisplayTimezone) => {
    setTimezoneState(next);
    document.cookie = `${COOKIE_NAME}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  };
  return <TimezoneContext.Provider value={{ timezone, setTimezone }}>{children}</TimezoneContext.Provider>;
}

export function useDisplayTimezone() {
  return useContext(TimezoneContext);
}

export function TimezoneToggle() {
  const { timezone, setTimezone } = useDisplayTimezone();
  const usEastern = timezone === "America/New_York";
  return <button className="timezone-toggle" type="button" onClick={() => setTimezone(usEastern ? "Asia/Hong_Kong" : "America/New_York")} aria-label={`Switch display timezone to ${usEastern ? "Hong Kong" : "US Eastern"}`} aria-pressed={usEastern}>Time: {usEastern ? "US/Eastern" : "HKT"}</button>;
}
