"use client";

import { useState } from "react";
import type { OvernightReport } from "@momentum/domain";

const time = (value: string) => new Intl.DateTimeFormat("en-HK", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export function OvernightReports({ reports, unavailable = false }: { readonly reports: readonly OvernightReport[]; readonly unavailable?: boolean }) {
  const [selected, setSelected] = useState("");
  const report = reports.find((item) => item.id === selected) ?? reports[0];
  if (unavailable) return <section className="mini-section"><h2>Overnight report unavailable</h2><p className="mini-error">The report archive could not be loaded. Use Refresh to try again.</p></section>;
  if (!report) return <section className="mini-section"><h2>Overnight reports</h2><p className="mini-muted">No report has been saved yet. Reports are prepared each morning at 9:05 am Hong Kong time.</p></section>;
  return <section className="mini-section mini-report" aria-label="Overnight report">
    <div className="mini-report-selector"><label htmlFor="overnight-date">Report archive</label><select id="overnight-date" value={report.id} onChange={(event) => setSelected(event.target.value)}>{reports.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    <p className="mini-foot">Saved paper report · Hong Kong time (UTC+8) · New report daily at 9:05 am</p>
    <h2>{report.headline}</h2><p>{report.summary}</p>
    <p className="mini-report-period">{time(report.periodStart)} – {time(report.periodEnd)} HKT</p>
    <h3>Agents and decisions</h3>
    <div className="mini-report-processes">{report.processes.map((row, index) => <article key={`${row.name}-${index}`}><h4>{row.name}</h4><p>{row.activity}</p><p><strong>Decision:</strong> {row.decision}</p></article>)}</div>
    <h3>Trades</h3><ul>{report.trades.map((item, index) => <li key={index}>{item}</li>)}</ul>
    <h3>Account snapshot</h3><ul>{report.snapshot.map((item, index) => <li key={index}>{item}</li>)}</ul>
    <h3>Operational points</h3>{report.concerns.length ? <ul className="mini-report-concerns">{report.concerns.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>No operational alerts were recorded in this window.</p>}
    {report.limitations.length ? <aside><h3>Evidence limits</h3><ul>{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></aside> : null}
    <p className="mini-foot">Source: {report.source}. Saved {time(report.generatedAt)} HKT. Historical values; see Portfolio for the latest snapshot.</p>
  </section>;
}
