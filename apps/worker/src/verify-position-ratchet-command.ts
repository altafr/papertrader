import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabase, createPaperOrderRepository } from "@momentum/db";

/** Exercise the real PostgreSQL ratchet predicates without retaining test records. */
const { db, pool } = createDatabase();
const rollback = new Error("rollback_position_ratchet_verification");
try {
  await db.transaction(async (transaction) => {
    const repository = createPaperOrderRepository(transaction as unknown as typeof db);
    for (const side of ["buy", "sell"] as const) {
      const intentId = `verify-ratchet:${randomUUID()}`;
      await repository.recordSubmission({ approvalId: intentId, assetClass: "us_equity", clientOrderId: intentId, intentId, quantity: "1", side, status: "verification_only", symbol: "VERIFY", trailingStopPrice: side === "buy" ? "95" : "105" });
      await repository.ratchetTrailingStop(intentId, "100");
      await repository.ratchetTrailingStop(intentId, side === "buy" ? "99" : "101");
      assert.equal((await repository.getByIntentId(intentId))?.trailingStopPrice, "100.00000000");
      await repository.ratchetTrailingStop(intentId, side === "buy" ? "101" : "99");
      assert.equal((await repository.getByIntentId(intentId))?.trailingStopPrice, side === "buy" ? "101.00000000" : "99.00000000");
    }
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(JSON.stringify({ status: "passed", longRatchet: "upward_only", shortRatchet: "downward_only", testRecords: "rolled_back", brokerMutations: 0 }));
} finally { await pool.end(); }
