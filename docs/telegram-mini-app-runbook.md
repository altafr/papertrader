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
