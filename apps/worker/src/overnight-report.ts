import { createDatabase } from "@momentum/db";
import { getOvernightWindow, isOvernightReport, type OvernightReport } from "@momentum/domain";
import * as DecimalModule from "decimal.js";

const Decimal = DecimalModule.Decimal;
const money = (value: string) => `$${new Decimal(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const time = (value: Date) => new Intl.DateTimeFormat("en-HK", { timeZone: "Asia/Hong_Kong", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value) + " HKT";
type Pool = ReturnType<typeof createDatabase>["pool"];

/** One immutable artifact per overnight window; duplicate/restart execution is harmless. */
export async function saveOvernightReport(pool: Pool, report: OvernightReport) {
  if (!isOvernightReport(report)) throw new Error("Invalid overnight report.");
  await pool.query(`INSERT INTO agent_runs (run_id,agent_type,task,status,prompt_version,input_refs,created_at,started_at,finished_at,artifact_type,artifact_schema_version,artifact_rationale,artifact_payload,artifact_evidence_refs)
    VALUES ($1,'overnight_report','Summarize recorded overnight paper activity','succeeded','overnight-report-v1',$2::jsonb,$3,$3,$3,'overnight_report','1',$4,$5::jsonb,$2::jsonb) ON CONFLICT (run_id) DO NOTHING`,
  [report.id, JSON.stringify([`period:${report.periodStart}/${report.periodEnd}`, report.source]), report.generatedAt, report.headline, JSON.stringify(report)]);
}

export async function generateOvernightReport(pool: Pool, now = new Date()): Promise<OvernightReport | undefined> {
  const window = getOvernightWindow(now);
  // Give reconciliation five minutes to settle before freezing the closed window.
  if (now.getTime() < window.end.getTime() + 5 * 60_000) return undefined;
  if ((await pool.query("SELECT run_id FROM agent_runs WHERE run_id=$1", [window.id])).rowCount) return undefined;
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const range = [window.start, window.end];
    const agents = await client.query<{ agent_type: string; status: string; count: string; rationale: string | null }>("SELECT agent_type,status,count(*)::text,max(left(artifact_rationale,500)) rationale FROM agent_runs WHERE created_at >= $1 AND created_at < $2 AND agent_type NOT IN ('overnight_report','position_management_telemetry') GROUP BY 1,2 ORDER BY 1,2 LIMIT 100", range);
    const lastResearch = await client.query<{ agent_type: string; last_run: Date }>("SELECT agent_type,max(created_at) last_run FROM agent_runs WHERE created_at < $1 AND agent_type IN ('stock_research','crypto_research','macro_advisory') GROUP BY 1", [window.end]);
    const orderCounts = await client.query<{ count: string }>("SELECT count(*)::text FROM orders WHERE submitted_at >= $1 AND submitted_at < $2", range);
    const orders = await client.query<{ symbol: string; side: string; status: string; quantity: string; submitted_at: Date }>("SELECT symbol,side,status,quantity,submitted_at FROM orders WHERE submitted_at >= $1 AND submitted_at < $2 ORDER BY submitted_at LIMIT 100", range);
    const fillCounts = await client.query<{ count: string }>("SELECT count(*)::text FROM activities WHERE activity_type='FILL' AND transaction_time >= $1 AND transaction_time < $2", range);
    const fills = await client.query<{ symbol: string; quantity: string; price: string; transaction_time: Date }>("SELECT symbol,quantity,price,transaction_time FROM activities WHERE activity_type='FILL' AND transaction_time >= $1 AND transaction_time < $2 ORDER BY transaction_time LIMIT 100", range);
    const decisions = await client.query<{ symbol: string; status: string; risk_decision: { approvalStatus?: string; reasons?: string[] } | null }>("SELECT symbol,status,risk_decision FROM paper_order_submissions WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at LIMIT 100", range);
    const schedules = await client.query<{ status: string; count: string; last_run: Date }>("SELECT status,count(*)::text,max(scheduled_at) last_run FROM durable_schedule_runs WHERE scheduled_at >= $1 AND scheduled_at < $2 GROUP BY 1", range);
    const alerts = await client.query<{ code: string; message: string; occurred_at: Date }>("SELECT code,left(message,1000) message,occurred_at FROM telegram_alert_events WHERE occurred_at >= $1 AND occurred_at < $2 AND severity IN ('warning','critical') ORDER BY occurred_at LIMIT 100", range);
    const snapshots = await client.query<{ id: string; captured_at: Date; equity: string; cash: string }>("SELECT id,captured_at,equity,cash FROM account_snapshots WHERE captured_at < $1 ORDER BY captured_at DESC LIMIT 1", [window.end]);
    const baseline = await client.query<{ captured_at: Date; equity: string }>("SELECT captured_at,equity FROM account_snapshots WHERE captured_at <= $1 ORDER BY captured_at DESC LIMIT 1", [window.start]);
    const latest = snapshots.rows[0];
    const positions = latest ? await client.query<{ symbol: string; quantity: string; market_value: string; unrealized_pl: string }>("SELECT symbol,quantity,market_value,unrealized_pl FROM positions WHERE account_snapshot_id=$1 ORDER BY symbol LIMIT 100", [latest.id]) : { rows: [] };
    const telemetry = await client.query<{ artifact_payload: { managed?: number; positions?: number; submitted?: number; decisions?: { symbol: string; shouldExit: boolean; effectiveStopPrice: string; previousStopPrice?: string; plannedTargetPrice?: string; reason?: string; submitted?: boolean }[] }; created_at: Date }>("SELECT artifact_payload,created_at FROM agent_runs WHERE agent_type='position_management_telemetry' AND created_at >= $1 AND created_at < $2 ORDER BY created_at LIMIT 1000", range);
    await client.query("COMMIT");
    const orderCount = orderCounts.rows[0]?.count ?? "0";
    const fillCount = fillCounts.rows[0]?.count ?? "0";
    const concerns = alerts.rows.map((row) => `${time(row.occurred_at)}: ${row.message}`);
    const limitations = ["Based on persisted records available when this report was generated. Later broker corrections are not included in this saved snapshot.", "Operational alerts are deduplicated; their count is not the number of underlying failures."];
    const research = agents.rows.filter((row) => ["stock_research", "crypto_research", "macro_advisory"].includes(row.agent_type));
    if (!research.length) concerns.push("No stock, crypto or macro research runs were recorded in this window. This alone does not establish a scheduler fault: market calendars, configured schedules and disabled asset classes can legitimately skip research.");
    for (const row of lastResearch.rows) if (!research.some((run) => run.agent_type === row.agent_type)) concerns.push(`Last recorded ${row.agent_type.replaceAll("_", " ")}: ${time(row.last_run)}.`);
    const processes: OvernightReport["processes"][number][] = agents.rows.map((row) => ({ name: row.agent_type.replaceAll("_", " "), activity: `${row.count} ${row.status} run(s).`, decision: row.rationale ?? "No successful decision artifact was recorded." }));
    if (!research.length) processes.push({ name: "Stock, crypto and macro research", activity: "No persisted runs overnight.", decision: "No recorded new selections or research-based trade decisions." });
    processes.push(...schedules.rows.map((row) => ({ name: "Daily reconciliation", activity: `${row.count} ${row.status} run(s); last ${time(row.last_run)}.`, decision: row.status === "completed" ? "Account records reconciled." : "Reconciliation did not complete successfully." })));
    if (!schedules.rows.length) processes.push({ name: "Daily reconciliation", activity: "No durable daily run recorded in this window.", decision: "No completion inferred." });
    const positionDecisions = telemetry.rows.flatMap((row) => (row.artifact_payload.decisions ?? []).map((decision) => ({ ...decision, at: row.created_at })));
    processes.push({ name: "Position manager", activity: telemetry.rows.length ? `${telemetry.rows.length} persisted supervision passes.` : "No persisted supervision-pass evidence available.", decision: telemetry.rows.length ? `${positionDecisions.filter((row) => !row.shouldExit).length} hold decision(s); ${positionDecisions.filter((row) => row.shouldExit).length} exit trigger(s). Broker fills are listed separately.` : "Do not infer that monitoring stopped or that a hold decision was made." });
    const ratchets = positionDecisions.filter((row) => row.previousStopPrice && row.previousStopPrice !== row.effectiveStopPrice);
    processes.push({ name: "Stop management", activity: `${ratchets.length} recorded stop adjustment(s).`, decision: ratchets.slice(-20).map((row) => `${row.symbol}: ${money(row.previousStopPrice!)} → ${money(row.effectiveStopPrice)} at ${time(row.at)}${row.plannedTargetPrice ? `; target ${money(row.plannedTargetPrice)}` : ""}`).join(". ") || "No stop change established by available telemetry." });
    processes.push(...decisions.rows.slice(0, 20).map((row) => ({ name: `Risk / execution · ${row.symbol}`, activity: `Recorded status: ${row.status}.`, decision: (row.risk_decision?.reasons ?? []).join("; ").slice(0, 3500) || `Risk outcome: ${row.risk_decision?.approvalStatus ?? "not recorded"}.` })));
    processes.push({ name: "Execution", activity: `${orderCount} new broker order(s); ${fillCount} fill activity record(s).`, decision: orderCount === "0" && fillCount === "0" ? "No entries or exits recorded." : "See the order and fill evidence below; an order submission is not a confirmed fill." });
    const snapshot = latest ? [`Snapshot: ${time(latest.captured_at)}.`, `Equity: ${money(latest.equity)}${baseline.rows[0] ? `; change ${money(new Decimal(latest.equity).minus(baseline.rows[0].equity).toString())} from ${time(baseline.rows[0].captured_at)} (equity change, not realized trading P/L)` : "; opening comparison unavailable"}.`, `Cash: ${money(latest.cash)}.`, ...positions.rows.map((row) => `${row.symbol}: ${row.quantity} units, worth ${money(row.market_value)}, unrealized P/L ${money(row.unrealized_pl)}.`), ...(positions.rows.length ? [] : ["No open positions in the snapshot."])] : ["No reconciled account snapshot is available."];
    if (!latest || window.end.getTime() - latest.captured_at.getTime() > 35 * 60_000) concerns.push("Closing account evidence is missing or more than 35 minutes older than the report cutoff. Trade and holding coverage may be incomplete.");
    if (!telemetry.rows.length) limitations.push("Supervisor pass counts, hold decisions and stop changes cannot be reconstructed from account snapshots alone.");
    if (Number(orderCount) > 100 || Number(fillCount) > 100 || telemetry.rows.length === 1000 || decisions.rows.length === 100 || alerts.rows.length === 100) limitations.push("Detail lists reached a bounded display limit; aggregate order/fill totals are shown in full.");
    const trades = [`${orderCount} new broker order(s) and ${fillCount} fill activity record(s).`, ...orders.rows.slice(0, 45).map((row) => `${time(row.submitted_at)} · ${row.symbol} ${row.side.toUpperCase()} ${row.quantity} · ${row.status} (latest reconciled status at report generation).`), ...fills.rows.slice(0, 45).map((row) => `${time(row.transaction_time)} · ${row.symbol} fill ${row.quantity} at ${money(row.price)}.`)];
    if (orders.rows.length > 45 || fills.rows.length > 45) limitations.push("The trade section shows at most 45 orders and 45 fills; counts above include all records in the window.");
    return { schemaVersion: "1", id: window.id, title: `Overnight · ${window.end.toISOString().slice(0, 10)}`, periodStart: window.start.toISOString(), periodEnd: window.end.toISOString(), generatedAt: now.toISOString(), timezone: "Asia/Hong_Kong", source: "Persisted paper account, broker orders/fills, agent artifacts, supervision telemetry and operational alerts", headline: orderCount === "0" && fillCount === "0" ? "No new orders or fills were recorded overnight." : `${orderCount} order(s) and ${fillCount} fill record(s) overnight.`, summary: `The paper system recorded ${research.reduce((sum, row) => sum + Number(row.count), 0)} research run(s) and ${telemetry.rows.length} supervision passes. Review the decisions and operational points below.`, processes: processes.slice(0, 100), snapshot, trades, concerns: concerns.slice(0, 100), limitations };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

/** Independent reporting loop: catches up after restart; cannot call a broker or change trading state. */
export function startOvernightReports(environment: NodeJS.ProcessEnv = process.env) {
  if (!environment.DATABASE_URL?.trim()) return;
  const { pool } = createDatabase(environment.DATABASE_URL);
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { const report = await generateOvernightReport(pool); if (report) { await saveOvernightReport(pool, report); console.log(JSON.stringify({ event: "overnight_report_saved", reportId: report.id })); } }
    catch { console.warn(JSON.stringify({ event: "overnight_report_failed", status: "unavailable" })); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, 60_000);
  timer.unref();
  return async () => { clearInterval(timer); await pool.end(); };
}
