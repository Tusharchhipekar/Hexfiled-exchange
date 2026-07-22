import type { Position } from "@repo/types";
import { INDEX_PRICES, POSITIONS } from "../engine-store";
import { fetchBalance } from "./fetchBalance";
import { updatePosition } from "./updatePostion";

export function adl(position: Position) {
  const markPrice = INDEX_PRICES.get(position.symbol);
  if (markPrice === undefined) {
    console.warn(
      `ADL skipped for ${position.symbol}: no index price, position left open`,
    );
    return;
  }

  const oppositeSide = position.positionSide === "long" ? "short" : "long";
  const candidates: { pos: Position; pnl: number }[] = [];

  for (const userPositionsMap of POSITIONS.values()) {
    const pos = userPositionsMap.get(position.symbol);
    if (!pos) continue;
    if (pos.positionSide !== oppositeSide) continue;
    if (pos.userId === position.userId) continue;

    const pnl =
      pos.positionSide === "short"
        ? (pos.averagePrice - markPrice) * pos.qty
        : (markPrice - pos.averagePrice) * pos.qty;

    if (pnl <= 0) continue;
    candidates.push({ pos, pnl });
  }
  candidates.sort((a, b) => b.pnl - a.pnl);

  let remainingQty = position.qty;

  for (const { pos } of candidates) {
    if (remainingQty <= 0) break;

    const fillQty = Math.min(pos.qty, remainingQty);
    const { userId, positionSide, qty, margin, averagePrice } = pos;

    const releasedMargin = Math.floor((margin * fillQty) / qty);
    const realizedPnl = Math.floor(
      positionSide === "short"
        ? (averagePrice - markPrice) * fillQty
        : (markPrice - averagePrice) * fillQty,
    );

    updatePosition({
      userId,
      symbol: position.symbol,
      positionSide: positionSide === "long" ? "short" : "long",
      fillQty,
      fillPrice: markPrice,
      fillMargin: releasedMargin,
      leverage: deriveLeverage(averagePrice, qty, margin),
    });

    const counterpartyBalance = fetchBalance(userId, "USD");
    counterpartyBalance.locked -= releasedMargin;
    counterpartyBalance.available += releasedMargin + realizedPnl;

    settleBankruptLeg(position, fillQty, markPrice);
    remainingQty -= fillQty;
  }

  if (remainingQty > 0) {
    console.warn(
      `ADL for ${position.symbol} (user ${position.userId}) found no counterparty for ${remainingQty} of ${position.qty}; force-closing remainder`,
    );
    settleBankruptLeg(position, remainingQty, markPrice);
  }
}

function deriveLeverage(avgPrice: number, qty: number, margin: number): number {
  if (margin <= 0) return 1;
  return Math.max(1, Math.floor((avgPrice * qty) / margin));
}

function settleBankruptLeg(
  position: Position,
  fillQty: number,
  markPrice: number,
) {
  const current = POSITIONS.get(position.userId)?.get(position.symbol);
  if (!current) return;

  const forfeitedMargin = Math.floor((current.margin * fillQty) / current.qty);

  updatePosition({
    userId: position.userId,
    symbol: position.symbol,
    positionSide: current.positionSide === "long" ? "short" : "long",
    fillQty,
    fillPrice: markPrice,
    fillMargin: forfeitedMargin,
    leverage: deriveLeverage(current.averagePrice, current.qty, current.margin),
  });

  const balance = fetchBalance(position.userId, "USD");
  balance.locked -= forfeitedMargin;
}
