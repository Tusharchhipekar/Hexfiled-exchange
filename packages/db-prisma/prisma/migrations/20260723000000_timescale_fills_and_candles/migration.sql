-- TimescaleDB objects used by the exchange read paths (fills_ts, candles_1h).
-- These live outside the Prisma schema because they are hypertables /
-- continuous aggregates that Prisma cannot model.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw trade fills, written by insertFill() in @repo/timescaledb.
CREATE TABLE IF NOT EXISTS fills_ts (
    time   TIMESTAMPTZ      NOT NULL,
    symbol TEXT             NOT NULL,
    price  DOUBLE PRECISION NOT NULL,
    qty    DOUBLE PRECISION NOT NULL,
    side   TEXT             NOT NULL
);

SELECT create_hypertable('fills_ts', 'time', if_not_exists => TRUE);

-- getTrades / getKLines filter by symbol and read newest-first.
CREATE INDEX IF NOT EXISTS fills_ts_symbol_time_idx ON fills_ts (symbol, time DESC);

-- Hourly OHLCV rollup backing getTicker.
-- WITH NO DATA is required: Prisma runs each migration inside a transaction and
-- CREATE MATERIALIZED VIEW ... WITH DATA cannot run in one. materialized_only =
-- false makes this a real-time aggregate, so buckets newer than the last refresh
-- are still served live from fills_ts.
CREATE MATERIALIZED VIEW candles_1h
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
    symbol,
    time_bucket('1 hour', time) AS bucket,
    first(price, time)          AS open,
    max(price)                  AS high,
    min(price)                  AS low,
    last(price, time)           AS close,
    sum(qty)                    AS volume
FROM fills_ts
GROUP BY symbol, bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('candles_1h',
    start_offset      => INTERVAL '3 days',
    end_offset        => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes');