# Momentum Autopilot — Layered Architecture

This is the engineer-facing box-and-layer view of the paper-trading system. The browser is an observer/control surface; Railway keeps the trading workflow running when the browser is closed.

```mermaid
flowchart TB
  subgraph SURFACE["1. OPERATOR SURFACE"]
    DASH["Vercel / Sites dashboard\nClerk-authenticated, read-only views"]
    TELEGRAM["Telegram\nreal-time alerts and daily summary"]
  end

  subgraph ACCESS["2. ACCESS AND API"]
    CLERK["Clerk\noperator identity and session"]
    API["Railway API\nread models, health, operator controls"]
  end

  subgraph RUNTIME["3. ALWAYS-ON RAILWAY WORKER"]
    SCHED["Durable scheduler\ndaily stock cycle, crypto cycle, reconciliation"]
    ORCH["Orchestrator\nworkflow state and agent hand-offs"]
    RESEARCH["Research agents\nstocks, crypto, macro"]
    STRATEGY["Versioned strategy agents\nmomentum, breakout, trend"]
    RISK["Deterministic risk engine\n5% invested-notional loss limit\nfreshness, exposure, duplicate, kill-switch, paper gates"]
    EXEC["Execution agent\nidempotent paper orders"]
    POS["Position management\nstops, targets, time stops"]
    RECON["Reconciliation and monitoring\nacknowledgements, fills, P/L, discrepancies"]
    ALERT["Alert dispatcher\npersist, deduplicate, deliver, retry"]
  end

  subgraph DATA["4. DURABLE SYSTEM OF RECORD"]
    POSTGRES["Railway PostgreSQL\naccount snapshots, positions, orders, fills\nsignals, risk decisions, agent runs\naudit events, Telegram alert events"]
  end

  subgraph EXTERNAL["5. EXTERNAL SERVICES"]
    ALPACA["Alpaca Paper API\naccount, market data, orders, fills"]
    MARKET["Market/news sources\nprices, volume, indicators, macro context"]
  end

  DASH --> CLERK --> API
  API --> POSTGRES
  API --> ORCH
  SCHED --> ORCH
  ORCH --> RESEARCH --> STRATEGY
  MARKET --> RESEARCH
  STRATEGY --> RISK
  POS --> RISK
  RISK -->|"approved only"| EXEC --> ALPACA
  ALPACA --> RECON --> POSTGRES
  ALPACA --> POS
  ORCH --> POSTGRES
  STRATEGY --> POSTGRES
  RISK --> POSTGRES
  POS --> POSTGRES
  ORCH --> ALERT
  RISK --> ALERT
  EXEC --> ALERT
  RECON --> ALERT
  POS --> ALERT
  SCHED -->|"end-of-session"| ALERT
  ALERT --> POSTGRES
  ALERT --> TELEGRAM
```

## Decision path

```text
Market data → Research → Strategy signal → Deterministic risk validation
→ Paper order → Alpaca acknowledgement/fill → Reconciliation → Dashboard + Telegram
```

The risk engine is the mandatory boundary. No research agent, strategy agent, dashboard action, or Telegram event can bypass it. PostgreSQL is the durable source of truth; Telegram is a notification channel, not an execution control.

