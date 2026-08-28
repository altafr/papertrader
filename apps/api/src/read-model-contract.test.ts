import { describe, expect, it } from "vitest";

import { attachUnmanagedPositions } from "./read-model-contract.js";

describe("authenticated read-model contract", () => {
  it("places bounded unmanaged-position state inside the dashboard model", () => {
    const result = attachUnmanagedPositions({ positions: [{ symbol: "AAPL" }] }, [{ assetClass: "crypto", symbol: "BTCUSD" }]);
    expect(result).toEqual({ positions: [{ symbol: "AAPL" }], unmanagedPositions: [{ assetClass: "crypto", symbol: "BTCUSD" }] });
  });
});
