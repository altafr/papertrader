# Telegram Alert Test Runbook

This procedure sends one bounded test message through the Worker. It does not place an order, change Paper Autopilot, or alter scheduler state.

## Preconditions

- Railway Worker has `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` configured as secrets.
- The Worker remains paper-only.
- Use a new, non-secret approval reference such as `TELEGRAM-TEST-001`.

## Railway variables

Set these only on the Railway Worker service for the duration of the test:

```text
TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE=TELEGRAM-TEST-001
TELEGRAM_ALERT_TEST=true
```

`TELEGRAM_ALERTS_ENABLED=true` must also be present for delivery. Do not copy bot tokens or chat IDs into this file, GitHub, Vercel, or chat.

## Run

From the repository root, execute the guarded Worker command through Railway using the project’s normal service context:

```text
pnpm --filter @momentum/worker telegram-alert-test
```

The command reports only a generic success or failure result. It must not print the token, chat ID, or Telegram response body.

## After the test

1. Confirm the message arrived in the intended Telegram chat.
2. Confirm the Worker `telegram_alert_events` record is `sent` with one attempt.
3. Remove `TELEGRAM_ALERT_TEST` and the approval-reference variable, or leave the reference only if retained as audit metadata.
4. Keep `TELEGRAM_ALERTS_ENABLED` according to the operator’s deliberate notification setting; provider delivery verification remains a separate readiness value.

If the test fails, inspect the persisted redacted error state and Worker logs. Never retry by changing risk, broker, scheduler, or paper-mode settings.

