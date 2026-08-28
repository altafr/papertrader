import { describe, expect, it } from "vitest";

import { attachActiveExitPositions, attachUnmanagedPositions } from "./read-model-contract.js";

describe("authenticated read-model contract", () => {
  it("places bounded unmanaged-position state inside the dashboard model", () => {
    const result = attachUnmanagedPositions({ positions: [{ symbol: "AAPL" }] }, [{ assetClass: "crypto", symbol: "BTCUSD" }]);
    expect(result).toEqual({ positions: [{ symbol: "AAPL" }], unmanagedPositions: [{ assetClass: "crypto", symbol: "BTCUSD" }] });
  });

  it("places active exit state inside the dashboard model", () => {
    const result = attachActiveExitPositions({ positions: [{ symbol: "AAPL" }] }, [{ assetClass: "us_equity", symbol: "AAPL" }]);
    expect(result.activeExitPositions).toEqual([{ assetClass: "us_equity", symbol: "AAPL" }]);
  });
});
