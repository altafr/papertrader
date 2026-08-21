import { describe, expect, it } from "vitest";

import { getServerPort } from "./index.js";

describe("server configuration", () => {
  it("uses a safe local default", () => {
    expect(getServerPort({})).toBe(3001);
  });

  it("rejects an invalid port", () => {
    expect(() => getServerPort({ PORT: "nope" })).toThrow(/PORT/);
  });
});
