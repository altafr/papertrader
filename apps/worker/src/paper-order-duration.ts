export function getPaperTimeInForce(assetClass: "crypto" | "us_equity"): "day" | "gtc" {
  return assetClass === "crypto" ? "gtc" : "day";
}
