import { describe, expect, it } from "vitest";

import { attachActiveExitPositions, attachPositionMetadata, attachUnmanagedPositions } from "./read-model-contract.js";

describe("authenticated read-model contract", () => {
  it("places bounded unmanaged-position state inside the dashboard model", () => {
    const result = attachUnmanagedPositions({ positions: [{ symbol: "AAPL" }] }, [{ assetClass: "crypto", symbol: "BTCUSD", missingFields: ["plannedStopPrice"] }]);
    expect(result).toEqual({ positions: [{ symbol: "AAPL" }], unmanagedPositions: [{ assetClass: "crypto", symbol: "BTCUSD", missingFields: ["plannedStopPrice"] }] });
  });

  it("places active exit state inside the dashboard model", () => {
    const result = attachActiveExitPositions({ positions: [{ symbol: "AAPL" }] }, [{ assetClass: "us_equity", symbol: "AAPL" }]);
    expect(result.activeExitPositions).toEqual([{ assetClass: "us_equity", symbol: "AAPL" }]);
  });

  it("projects originating strategy and exit metadata onto matching positions", () => {
    const result = attachPositionMetadata({ positions: [{ assetClass: "crypto", symbol: "BTCUSD", marketValue: "100" }, { assetClass: "us_equity", symbol: "AAPL" }] }, [{ assetClass: "crypto", symbol: "BTC/USD", effectiveStopPrice: "114", plannedStopPrice: "95", plannedTargetPrice: "110", positionOpenedAt: "2026-08-29T00:00:00.000Z", strategyKey: "breakout", strategyVersion: "1.0.0" }]);
    expect(result.positions[0]).toMatchObject({ effectiveStopPrice: "114", plannedStopPrice: "95", plannedTargetPrice: "110", strategyKey: "breakout", strategyVersion: "1.0.0" });
    expect(result.positions[1]).toEqual({ assetClass: "us_equity", symbol: "AAPL" });
  });
});
