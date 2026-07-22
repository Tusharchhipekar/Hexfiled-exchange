import type { cancelOrderPayload } from "@repo/types";
import { ORDERBOOKS, ORDERS } from "../engine-store";
import { fetchBalance } from "../helper/fetchBalance";
import { getDepthDiff } from "../helper/getDepthDiff";
import { RejectionError } from "../errors";

export function cancelOrder(payload: cancelOrderPayload) {
  const { orderId, userId } = payload;
  const order = ORDERS.get(orderId);

  if (!order) throw new RejectionError("Order doesn't exist");

  if (order.userId !== userId) throw new RejectionError("Unauthorized request");

  if (order.status === "filled" || order.status === "cancelled")
    throw new RejectionError(`Order status ${order.status} can't be cancelled`);

  const orderbook = ORDERBOOKS.get(order.symbol);
  if (!orderbook) throw new Error(`market ${order.symbol} doesn't exist`);
  let tree = order.side === "buy" ? orderbook.bids : orderbook.asks;
  let priceBracket = tree.get(order.price);
  if (!priceBracket) throw new Error("price priceBracket doesn't exist");
  const remaining = priceBracket.filter((o) => o.orderId !== orderId);
  if (remaining.length === priceBracket.length)
    throw new Error("resting order not found");
  if (remaining.length === 0) tree.delete(order.price);
  else tree.set(order.price, remaining);

  const remainingQty = order.qty - order.filledQty;
  const usdBalance = fetchBalance(userId, "USD");
  const refund = Math.floor(
    Number(
      (BigInt(remainingQty) * BigInt(order.price)) / BigInt(order.leverage),
    ),
  );
  usdBalance.locked -= refund;
  usdBalance.available += refund;

  order.status = "cancelled";

  const depthDiff = getDepthDiff(
    order.symbol,
    order.side === "buy" ? [order.price] : [],
    order.side === "sell" ? [order.price] : [],
  );

  return { order, depthDiff };
}
