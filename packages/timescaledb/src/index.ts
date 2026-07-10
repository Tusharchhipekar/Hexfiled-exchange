import { Pool } from "pg";
import { config } from "./config/config";
export const timescale = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
});

timescale.on("error", (err) => {
  console.error("Unexpected error on idle Timescale client", err);
});

export async function insertFill(
  symbol: string,
  price: number,
  qty: number,
  side: "buy" | "sell",
  createdAt: number,
) {
  try {
    await timescale.query(
      `INSERT INTO fills_ts (time, symbol, price, qty, side)
       VALUES (to_timestamp($1 / 1000.0), $2, $3, $4, $5)`,
      [createdAt, symbol, price, qty, side],
    );
  } catch (err) {
    console.error("insertFill failed", {
      symbol,
      price,
      qty,
      side,
      createdAt,
      err,
    });
    throw err;
  }
}
