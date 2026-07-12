import { useEffect, useRef, useState } from "react";
import type { Market } from "../../api/types";
import { formatPairSymbol, formatPerpSymbol, getMarketSearchAliases } from "../../lib/markets";

export function MarketPicker({
  markets,
  selectedSymbol,
  isOpen,
  onOpenChange,
  onSelect,
}: {
  markets: Market[];
  selectedSymbol: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (symbol: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const selectedMarket = markets.find((market) => market.symbol === selectedSymbol);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMarkets = normalizedQuery
    ? markets.filter((market) => {
        const aliases = getMarketSearchAliases(market.symbol);
        return market.symbol.toLowerCase().includes(normalizedQuery)
          || aliases.some((alias) => alias.includes(normalizedQuery));
      })
    : markets;

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) setQuery("");
  }

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="relative bg-card">
      <button
        type="button"
        disabled={markets.length === 0}
        onClick={() => onOpenChange(!isOpen)}
        className="flex h-14 w-full items-center justify-between gap-3 px-4 text-left outline-none hover:bg-border disabled:cursor-not-allowed disabled:opacity-60 lg:h-16"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{selectedMarket ? formatPerpSymbol(selectedMarket.symbol) : "Loading"}</span>
            {selectedMarket ? (
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {selectedMarket.maxLeverage}x
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {selectedMarket ? formatPairSymbol(selectedMarket.symbol) : "Markets"}
          </p>
        </div>
        <span className="shrink-0 text-muted-foreground">▾</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-px w-[320px] rounded-md border border-border bg-background shadow-2xl shadow-black/50">
          <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Perpetual markets
          </div>
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search BTC"
              className="h-9 w-full rounded-md border border-border bg-card px-3 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {filteredMarkets.length > 0 ? filteredMarkets.map((market) => (
              <button
                key={market.id}
                type="button"
                onClick={() => {
                  onSelect(market.symbol);
                  setQuery("");
                }}
                className={`grid w-full grid-cols-[1fr_auto] gap-3 rounded border-l-2 px-3 py-2 text-left hover:bg-border ${
                  market.symbol === selectedSymbol ? "bg-primary/10" : ""
                } ${market.symbol === selectedSymbol ? "border-primary" : "border-transparent"}`}
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{formatPerpSymbol(market.symbol)}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{formatPairSymbol(market.symbol)}</span>
                </span>
                <span className="self-center font-mono text-[10px] text-muted-foreground">{market.maxLeverage}x</span>
              </button>
            )) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No markets found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}