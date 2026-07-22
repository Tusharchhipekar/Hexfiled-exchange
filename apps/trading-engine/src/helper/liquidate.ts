import type { Position } from "@repo/types";
import { createOrder } from "../handler/createOrder";
import { adl } from "./adl";

export function liquidatePosition(userId: string, position: Position) {
  let order;
  try {
    order = createOrder({
      userId,
      symbol: position.symbol,
      side: position.positionSide === "long" ? "sell" : "buy",
      orderType: "market",
      qty: position.qty,
      leverage: Math.floor(
        (position.averagePrice * position.qty) / position.margin,
      ),
      slippageBps: 10000,
    });
  } catch (err) {
    adl(position);
    return;
  }

  if (order.fills.length === 0) {
    adl(position);
    return;
  }
}
