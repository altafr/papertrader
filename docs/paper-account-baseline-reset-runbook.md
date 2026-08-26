# Paper account baseline reset runbook

The application policy requires a verified USD 100,000 Alpaca paper-equity baseline before any order can be submitted. The production diagnostic currently reports both the initial and current snapshots as `outside_tolerance` and the live account as `below_baseline`.

Alpaca's current paper-trading workflow resets an account by creating a new paper account in the Alpaca dashboard; it is not an application-side balance update. Creating a new account also requires new paper API credentials.

## Operator steps

1. In the Alpaca dashboard, switch to the paper account and open the paper-account selector.
2. Choose **Open New Paper Account**. Use the default USD 100,000 starting balance.
3. Generate a fresh paper API key pair for the new account.
4. Replace `ALPACA_API_KEY` and `ALPACA_SECRET_KEY` in Railway production Worker variables. Do not paste either value into source, tickets, chat, or browser code.
5. Redeploy/restart the Worker and run the read-only baseline check:

   ```text
   PAPER_BASELINE_READINESS=true pnpm --filter @momentum/worker paper-baseline-readiness
   ```

6. Continue only when the result is:

   ```json
   {"currentBaseline":"within_tolerance","initialBaseline":"within_tolerance","status":"ready"}
   ```

7. Run the guarded one-share paper-order command. If the baseline check is not `ready`, stop; do not override the risk gate.

## Evidence required

- The baseline-readiness JSON result is retained in the deployment evidence record.
- The first order attempt records its approval reference, deterministic risk decision, broker order ID, and post-order reconciliation.
- The dashboard shows the resulting order and position only after reconciliation confirms broker state.

Reference: [Alpaca paper trading documentation](https://docs.alpaca.markets/us/v1.4.2/docs/paper-trading).
