# Short-selling provision (disabled)

The system can already identify aligned bearish conditions (broad market and mapped sector both down). This is a design provision only; the current paper release remains long-only.

Before enabling short paper trading, implement and verify:

- a versioned short strategy signal (`side: short`) with separate stop/target semantics;
- borrow/locate and shortable-asset checks from the broker;
- deterministic margin, buying-power, concentration, and overnight gap limits;
- buy-to-cover execution and idempotent reconciliation;
- short-specific bracket/stop handling and kill-switch tests;
- operator approval of a new risk-policy version and a paper evidence window.

Until all gates pass, bearish market/sector data can filter or explain research only; it cannot submit an order.
