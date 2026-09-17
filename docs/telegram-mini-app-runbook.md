# Telegram Mini App activation runbook

This enables a read-only Portfolio and Alerts Mini App. It does not grant order, risk, or configuration authority.

## 1. Get the operator user ID

Send `/myid` to the already authorized Telegram assistant and keep the numeric value private. It is an identifier, not a credential.

## 2. Configure Railway API variables

In the **API** service (not only the Worker), add:

```text
TELEGRAM_BOT_TOKEN=<the existing bot token, entered through Railway secret storage>
TELEGRAM_MINI_APP_ENABLED=true
TELEGRAM_MINI_APP_USER_ID=<numeric value returned by /myid>
TELEGRAM_MINI_APP_ORIGIN=https://papertrader-web.vercel.app
```

Do not paste the bot token into chat, GitHub, a shell command, or a browser variable. The Worker already needs its own server-side copy of the bot token.

On the **Worker** service, confirm:

```text
TELEGRAM_MINI_APP_URL=https://papertrader-web.vercel.app/telegram
```

## 3. Verify configuration without exposing secrets

The API health response should show:

```json
"telegramMiniApp": { "enabled": true, "configured": true }
```

Before configuration, `GET /v1/telegram-mini-app` must return `telegram_mini_app_disabled`. After configuration, it must still reject requests without a valid Telegram Web App `initData` signature.

## 4. Open the app

Send `/dashboard` in the authorized chat and tap **Open portfolio & alerts**. The Portfolio tab shows reconciled paper equity, cash, buying power, and positions. The Alerts tab shows recent persisted Telegram alerts. The view refreshes automatically every 60 seconds and has a manual Refresh action.

If the app reports an unavailable session, open it from the Telegram button rather than a normal browser tab; the signed Telegram Web App session is required.

## Overnight reports

Open **Overnight** to read the latest saved report and select previous dates. Reports are generated server-side at approximately 09:05 Asia/Hong_Kong, covering the previous 18:00 through 09:00; the five-minute delay allows reconciliation to settle. The original September 16–17 report keeps its original 08:37 cutoff. The latest 31 reports are returned by the signed API; older artifacts remain retained in PostgreSQL.

Reports separate recorded work, decisions, broker orders/fills, historical account snapshots and operational concerns. Missing evidence is labelled explicitly. A report never submits an order. To verify, use the existing signed API verifier and check `overnightReports`, `overnightReportsUnavailable`, the report IDs and cutoff dates without printing session signatures or server secrets.

Stock scans run at 08:30 and 17:00 America/New_York, plus 09:30–15:30 every 30 minutes on trading days. The paper broker calendar excludes holidays and early-closed sessions. The Worker must have `RESEARCH_INTRADAY_STOCK_ENABLED=true`, `RESEARCH_AFTER_CLOSE_ENABLED=true`, `RESEARCH_PREPARATION_CRON=30 8 * * 1-5`, and `RESEARCH_PREPARATION_TIMEZONE=America/New_York`. Its `RESEARCH_STOCK_SYMBOLS` must match `watchlist-2026-09-16` (36 stocks). These scans retain the existing strategy timeframe and all deterministic execution gates.
