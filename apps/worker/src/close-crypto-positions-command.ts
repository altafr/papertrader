import { createPaperAccountReader, createPaperExitOrderSubmitter } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";

if (process.env.CLOSE_CRYPTO_POSITIONS_ONCE !== "true") throw new Error("CLOSE_CRYPTO_POSITIONS_ONCE must be exactly true for a one-shot paper liquidation.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("BROKER_CONNECTION_ENABLED must be true.");
if (process.env.TRADING_MODE !== "paper" || process.env.ALPACA_PAPER_TRADE !== "true") throw new Error("Crypto liquidation is paper-only.");
const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
const submitter = createPaperExitOrderSubmitter({ apiKey: process.env.ALPACA_API_KEY ?? "", brokerConnectionEnabled: true, secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
const state = await reader.readAccountState();
const cryptoPositions = state.positions.filter((position) => position.assetClass === "crypto" && position.quantity.trim() !== "0");
for (const position of cryptoPositions) {
  const clientOrderId = `crypto-liquidation-${position.symbol.replaceAll("/", "")}-${Date.now()}`.slice(0, 48);
  await submitter.submitExit({ assetClass: "crypto", clientOrderId, decision: { exitPrice: position.averageEntryPrice, reason: "time_stop", shouldExit: true, symbol: position.symbol }, quantity: position.quantity, timeInForce: "gtc", type: "market" });
  console.log(JSON.stringify({ event: "crypto_position_liquidation_submitted", symbol: position.symbol }));
}
console.log(JSON.stringify({ event: "crypto_position_liquidation_complete", positionsFound: cryptoPositions.length }));
