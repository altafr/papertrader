"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 60_000;

export function DashboardRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 1_000);
  };

  return <button className="refresh-control" type="button" onClick={refresh} disabled={refreshing} title="Refresh persisted paper data">{refreshing ? "Refreshing…" : "Refresh"}<small>Auto 60s</small></button>;
}
