const DEFAULT_API_PORT = 3001;

export const DEFAULT_DAILY_PREPARATION_CRON = "0 0 * * *";
export const DAILY_PREPARATION_TIMEZONE = "UTC" as const;

export const PAPER_TRADING_API_BASE_URL = "https://paper-api.alpaca.markets";
export const ALPACA_MARKET_DATA_BASE_URL = "https://data.alpaca.markets";

export function getDailyPreparationCron(environment = process.env): string {
  const cron = environment.DAILY_PREPARATION_CRON ?? DEFAULT_DAILY_PREPARATION_CRON;
  if (cron.trim().length === 0 || cron.length > 120) throw new Error("DAILY_PREPARATION_CRON must be a non-empty cron expression no longer than 120 characters.");
  return cron;
}

export type PaperOnlyRuntimeConfig = {
  brokerConnectionEnabled: boolean;
  paperTrade: true;
  tradingMode: "paper";
  tradingApiBaseUrl: typeof PAPER_TRADING_API_BASE_URL;
};

export type PaperAutopilotConfig = {
  readonly enabled: boolean;
  readonly mode: "paper_autopilot" | "disabled";
};

export type PaperOperatingMode = "observe" | "recommend" | "paper_autopilot";

/** Server-side emergency stop. It defaults to inactive and fails closed on invalid values. */
export function isGlobalKillSwitchActive(environment = process.env): boolean {
  return parseBooleanFlag("GLOBAL_KILL_SWITCH_ACTIVE", environment.GLOBAL_KILL_SWITCH_ACTIVE, false);
}

export type ClerkRuntimeConfig = {
  authorizedParties: string[];
  operatorUserId: string;
  publishableKey: string;
  secretKey: string;
};

export function getServerPort(environment = process.env): number {
  const rawPort = environment.PORT;

  if (rawPort === undefined) {
    return DEFAULT_API_PORT;
  }

  const parsedPort = Number.parseInt(rawPort, 10);

  if (!Number.isSafeInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return parsedPort;
}

function parseBooleanFlag(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be exactly true or false.`);
}

/**
 * Validates the deployment safety envelope without returning or logging secrets.
 * Broker access remains opt-in until a later read-only implementation unit.
 */
export function getPaperOnlyRuntimeConfig(environment = process.env): PaperOnlyRuntimeConfig {
  const tradingMode = environment.TRADING_MODE ?? "paper";
  if (tradingMode !== "paper") {
    throw new Error("TRADING_MODE must be paper; live mode is unavailable.");
  }

  const paperTrade = parseBooleanFlag("ALPACA_PAPER_TRADE", environment.ALPACA_PAPER_TRADE, true);
  if (!paperTrade) {
    throw new Error("ALPACA_PAPER_TRADE must be true for this deployment.");
  }

  const brokerConnectionEnabled = parseBooleanFlag(
    "BROKER_CONNECTION_ENABLED",
    environment.BROKER_CONNECTION_ENABLED,
    false,
  );

  if (brokerConnectionEnabled) {
    if (!environment.ALPACA_API_KEY?.trim() || !environment.ALPACA_SECRET_KEY?.trim()) {
      throw new Error(
        "BROKER_CONNECTION_ENABLED=true requires both paper Alpaca credentials in server secret storage.",
      );
    }
  }

  return {
    brokerConnectionEnabled,
    paperTrade: true,
    tradingMode: "paper",
    tradingApiBaseUrl: PAPER_TRADING_API_BASE_URL,
  };
}

/** Explicit, paper-only mode gate. Live mode can never be enabled by this function. */
export function getPaperAutopilotConfig(environment = process.env): PaperAutopilotConfig {
  const raw = environment.PAPER_AUTOPILOT_ENABLED ?? "false";
  if (raw !== "true" && raw !== "false") throw new Error("PAPER_AUTOPILOT_ENABLED must be exactly true or false.");
  if (raw !== "true") return { enabled: false, mode: "disabled" };
  const paper = getPaperOnlyRuntimeConfig(environment);
  if (!paper.brokerConnectionEnabled) throw new Error("PAPER_AUTOPILOT_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  return { enabled: true, mode: "paper_autopilot" };
}

/** Resolves the explicit paper operating mode and rejects contradictory flags. */
export function getPaperOperatingMode(environment = process.env): PaperOperatingMode {
  const autopilot = getPaperAutopilotConfig(environment);
  const rawMode = environment.OPERATING_MODE ?? (autopilot.enabled ? "paper_autopilot" : "observe");
  if (rawMode !== "observe" && rawMode !== "recommend" && rawMode !== "paper_autopilot") {
    throw new Error("OPERATING_MODE must be observe, recommend, or paper_autopilot.");
  }
  if (rawMode === "paper_autopilot" && !autopilot.enabled) {
    throw new Error("OPERATING_MODE=paper_autopilot requires PAPER_AUTOPILOT_ENABLED=true.");
  }
  if (rawMode !== "paper_autopilot" && autopilot.enabled) {
    throw new Error("PAPER_AUTOPILOT_ENABLED=true conflicts with the selected operating mode.");
  }
  return rawMode;
}

/**
 * Returns the server-side Clerk configuration when complete, or null when Clerk
 * has not been provisioned yet. Partial configuration fails closed.
 */
export function getClerkRuntimeConfig(environment = process.env): ClerkRuntimeConfig | null {
  const publishableKey = environment.CLERK_PUBLISHABLE_KEY;
  const secretKey = environment.CLERK_SECRET_KEY;
  const operatorUserId = environment.CLERK_OPERATOR_USER_ID;
  const authorizedParties = environment.CLERK_AUTHORIZED_PARTIES
    ?.split(",")
    .map((party) => party.trim())
    .filter(Boolean);

  const configured = Boolean(publishableKey || secretKey || operatorUserId || authorizedParties?.length);
  if (!configured) {
    return null;
  }

  if (!publishableKey || !secretKey || !operatorUserId || !authorizedParties?.length) {
    throw new Error(
      "Clerk configuration requires CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_OPERATOR_USER_ID, and CLERK_AUTHORIZED_PARTIES.",
    );
  }

  return { authorizedParties, operatorUserId, publishableKey, secretKey };
}
