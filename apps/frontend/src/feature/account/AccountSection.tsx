import { useMemo, useState } from "react";
import { api } from "../../api/client";
import type { Balance, Market, UserFill, UserOrder } from "../../api/types";
import type { AccountTab } from "../../app/types";
import { formatAccountId, formatNumber, formatTime, isCancellableOrder, isTerminalCancelError } from "../../lib/format";
import { getMarketSymbol } from "../../lib/markets";
import { derivePositions } from "./position";

export function AccountSection({
  token,
  userId,
  balance,
  openOrders,
  orderHistory,
  fills,
  markets,
  selectedMarket,
  markPrice,
  isLoading,
  onOrderSettled,
}: {
  token: string | null;
  userId: string | null;
  balance: Balance | null;
  openOrders: UserOrder[];
  orderHistory: UserOrder[];
  fills: UserFill[];
  markets: Market[];
  selectedMarket: string;
  markPrice?: number;
  isLoading: boolean;
  onOrderSettled: () => void;
}) {
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<AccountTab>("positions");

  const [prevToken, setPrevToken] = useState(token);
  if (token !== prevToken) {
    setPrevToken(token);
    setHiddenOrderIds(new Set());
  }

  const [prevOpenOrders, setPrevOpenOrders] = useState(openOrders);
  if (openOrders !== prevOpenOrders) {
    setPrevOpenOrders(openOrders);
    if (hiddenOrderIds.size > 0) {
      const stillOpenIds = new Set(openOrders.map((order) => order.id));
      const pruned = new Set([...hiddenOrderIds].filter((id) => stillOpenIds.has(id)));
      if (pruned.size !== hiddenOrderIds.size) {
        setHiddenOrderIds(pruned);
      }
    }
  }

  const cancellableOrders = openOrders.filter((order) => isCancellableOrder(order) && !hiddenOrderIds.has(order.id));
  const positions = useMemo(() => derivePositions(fills), [fills]);
  const accountTabs: Array<{ id: AccountTab; label: string; count: number }> = [
    { id: "positions", label: "Positions", count: positions.length },
    { id: "open", label: "Open orders", count: cancellableOrders.length },
    { id: "history", label: "History", count: orderHistory.length },
    { id: "fills", label: "Fills", count: fills.length },
  ];

  async function handleCancel(orderId: string) {
    if (!token) return;
    setError(null);
    setCancelingOrderId(orderId);
    setHiddenOrderIds((current) => new Set(current).add(orderId));
    try {
      await api.cancelOrder(token, orderId);
      onOrderSettled();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cancel failed";
      if (isTerminalCancelError(message)) {
        onOrderSettled();
      } else {
        setHiddenOrderIds((current) => {
          const next = new Set(current);
          next.delete(orderId);
          return next;
        });
      }
      setError(isTerminalCancelError(message) ? null : message);
    } finally {
      setCancelingOrderId(null);
    }
  }

  if (!token) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-border px-3 py-8 text-center text-sm text-muted-foreground">
          Sign in to view balances, orders, and fills.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Signed in as</p>
          <p className="mt-1 font-mono text-xs text-foreground/80">{formatAccountId(userId)}</p>
        </div>
        <div className="text-right font-mono text-[10px] text-muted-foreground">
          <p>{fills.length} fills</p>
          <p>{positions.length} positions</p>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border">
        <MiniMetric label="Available" value={isLoading ? "..." : `$${formatNumber(balance?.available ?? 0)}`} />
        <MiniMetric label="Locked" value={isLoading ? "..." : `$${formatNumber(balance?.locked ?? 0)}`} />
      </div>
      {error ? <div className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">{error}</div> : null}
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-md bg-background/40 p-0.5">
        {accountTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 shrink-0 rounded px-3 text-xs font-medium ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} <span className="font-mono opacity-70">{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border border-border">
      <div className={activeTab === "positions" ? "" : "hidden"}>
        {positions.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <p>No positions</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              Positions are derived from this account's fills. Open orders will not appear here until they trade.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {positions.map((position) => {
              const mark = position.symbol === selectedMarket && typeof markPrice === "number" ? markPrice / 1_000_000 : null;
              const notional = position.averagePrice * position.qty;
              const pnl = mark === null
                ? null
                : position.side === "long"
                  ? (mark - position.averagePrice) * position.qty
                  : (position.averagePrice - mark) * position.qty;
              const roe = pnl === null || notional === 0 ? null : (pnl / notional) * 100;

              return (
                <div key={position.symbol} className="space-y-2 px-3 py-3 font-mono text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-foreground/80">{position.symbol}</span>
                      <span className={`ml-2 ${position.side === "long" ? "text-emerald-300" : "text-rose-300"}`}>{position.side}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Unrealized PnL</p>
                      <p className={pnl === null ? "text-muted-foreground" : pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {pnl === null ? "-" : `${pnl >= 0 ? "+" : ""}$${formatNumber(pnl)}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <PositionMetric label="Qty" value={formatNumber(position.qty)} />
                    <PositionMetric label="Entry" value={formatNumber(position.averagePrice)} />
                    <PositionMetric label="ROE" value={roe === null ? "-" : `${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={activeTab === "open" ? "" : "hidden"}>
        {cancellableOrders.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No open orders</div>
        ) : (
          <div className="divide-y divide-border">
            {cancellableOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-[1fr_0.6fr_0.9fr_0.8fr_auto] items-center gap-2 px-3 py-2 font-mono text-xs">
                <span className="truncate text-foreground/80">{getMarketSymbol(order.marketId, markets)}</span>
                <span className={order.side === "buy" ? "text-emerald-300" : "text-rose-300"}>{order.side}</span>
                <span className="text-right text-foreground/90">{formatNumber(order.price)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(order.qty - order.filledQty)}</span>
                <button
                  type="button"
                  disabled={cancelingOrderId === order.id}
                  onClick={() => void handleCancel(order.id)}
                  className="rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-foreground/80 hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelingOrderId === order.id ? "..." : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={activeTab === "history" ? "" : "hidden"}>
        {orderHistory.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No order history</div>
        ) : (
          <div className="divide-y divide-border">
            {orderHistory.map((order) => (
              <div key={order.id} className="grid grid-cols-[1fr_0.6fr_0.9fr_0.9fr_1fr] gap-2 px-3 py-2 font-mono text-xs">
                <span className="truncate text-foreground/80">{getMarketSymbol(order.marketId, markets)}</span>
                <span className={order.side === "buy" ? "text-emerald-300" : "text-rose-300"}>{order.side}</span>
                <span className="text-right text-foreground/90">{formatNumber(order.price)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(order.filledQty)}/{formatNumber(order.qty)}</span>
                <span className="text-right text-muted-foreground">{order.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={activeTab === "fills" ? "" : "hidden"}>
        {fills.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No fills</div>
        ) : (
          <div className="divide-y divide-border">
            {fills.map((fill) => (
              <div key={fill.id} className="grid grid-cols-[1fr_0.6fr_0.9fr_0.8fr_0.8fr] gap-2 px-3 py-2 font-mono text-xs">
                <span className="truncate text-foreground/80">{fill.symbol}</span>
                <span className={fill.side === "buy" ? "text-emerald-300" : "text-rose-300"}>{fill.side}</span>
                <span className="text-right text-foreground/90">{formatNumber(fill.price)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(fill.qty)}</span>
                <span className="text-right text-muted-foreground">{formatTime(fill.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function PositionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-foreground/80">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-2">
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}