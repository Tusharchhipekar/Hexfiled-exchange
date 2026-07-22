import type { Position } from "@repo/types";
import { createOrder } from "../handler/createOrder";
import { POSITIONS } from "../engine-store";
import { adl } from "./adl";

export function liquidatePosition(userId: string, position: Position) {
  try {
    createOrder({
      userId,
      symbol: position.symbol,
      side: position.positionSide === "long" ? "sell" : "buy",
      orderType: "market",
      qty: position.qty,
      leverage: Math.max(
        1,
        Math.floor((position.averagePrice * position.qty) / position.margin),
      ),
      slippageBps: 10000,
    });
  } catch (err) {}
  const remaining = POSITIONS.get(userId)?.get(position.symbol);
  if (remaining && remaining.positionSide === position.positionSide) {
    adl(remaining);
  }
}
