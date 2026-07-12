import type { ReactNode } from "react";
import type { ChartInterval, MarketDataTab } from "../app/types";
import { chartIntervals } from "../app/constants";

export function BrandBar() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-8 place-items-center rounded-md border border-primary/40 bg-primary/10 text-xs font-bold text-primary">
        HXF
      </div>
      <div>
        <p className="text-sm font-semibold leading-none text-foreground">hexfield</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Exchange</p>
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring"
      />
    </label>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function TickerStat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "positive" | "negative" | "accent" }) {
  const toneClass = {
    neutral: "text-foreground",
    positive: "text-emerald-300",
    negative: "text-rose-300",
    accent: "text-primary",
  }[tone];

  return (
    <div className="flex h-14 flex-col justify-center bg-card px-4 lg:h-16">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function HeaderActionButton({
  children,
  onClick,
  emphasis = false,
}: {
  children: ReactNode;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 min-w-[72px] items-center justify-center whitespace-nowrap rounded-md border px-3 text-xs font-semibold leading-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
        emphasis
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-background/40 text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function SegmentedTabs({
  value,
  onChange,
  options,
}: {
  value: MarketDataTab;
  onChange: (value: MarketDataTab) => void;
  options: Array<{ id: MarketDataTab; label: string }>;
}) {
  return (
    <div className="flex gap-1 rounded-md bg-background/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`h-7 rounded px-2.5 text-[11px] font-medium ${
            value === option.id
              ? "bg-primary text-primary-foreground"
              : "bg-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StatusBanner({ message }: { message: string }) {
  return (
    <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
      {message}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`flex min-h-0 flex-col bg-card ${className}`}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function DepthSyncBadge({ status, lastUpdateId }: { status: "idle" | "connecting" | "snapshot" | "live" | "error"; lastUpdateId?: number }) {
  const isLive = status === "live";
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      <span className={`h-1.5 w-1.5 ${isLive ? "bg-emerald-300" : status === "error" ? "bg-rose-300" : "bg-amber-300"}`} />
      <span>{isLive ? `Live ${lastUpdateId ?? 0}` : status === "idle" ? "waiting" : status}</span>
    </div>
  );
}

export function LiveStatusBadge({ isLive, error }: { isLive: boolean; error: string | null }) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      <span className={`h-1.5 w-1.5 ${error ? "bg-rose-300" : isLive ? "bg-emerald-300" : "bg-amber-300"}`} />
      <span>{error ? "error" : isLive ? "live" : "waiting"}</span>
    </div>
  );
}

export function PanelState({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className="grid h-full min-h-36 place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        {detail ? <p className="mt-2 max-w-56 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

export function IntervalControl({ value, onChange }: { value: ChartInterval; onChange: (interval: ChartInterval) => void }) {
  return (
    <div className="flex gap-1 rounded-md bg-background/40 p-0.5">
      {chartIntervals.map((interval) => (
        <button
          key={interval}
          type="button"
          onClick={() => onChange(interval)}
          className={`h-7 rounded px-2.5 font-mono text-[11px] ${
            value === interval
              ? "bg-primary text-primary-foreground"
              : "bg-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {interval}
        </button>
      ))}
    </div>
  );
}