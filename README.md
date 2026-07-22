# exchanges

A perpetual-futures exchange built as a Turborepo monorepo: an in-memory matching engine driven by Redis Streams, an HTTP API, a WebSocket fan-out server, a Binance mark-price feeder, and a database writer — plus a React trading UI.

The engine is the single source of truth for orderbooks, balances, and positions. Everything else talks to it by appending commands to a Redis stream and reading the events it emits, so the hot path never touches Postgres.

## Architecture

```
                 ┌──────────────┐
  browser  ────► │ http-backend │──┐  xAdd to_engine
                 └──────────────┘  │  (correlationId + responseQueue)
                                   ▼
  binance  ────► price-poller ──►  Redis Streams  ◄── funding-rate timer
  mark px         (also pubsub          │
                   markPrice)           ▼
                              ┌──────────────────┐
                              │  trading-engine  │  in-memory books,
                              │  single-threaded │  balances, positions,
                              └──────────────────┘  liquidation, ADL
                                       │ xAdd from_engine
                        ┌──────────────┴───────────────┐
                        ▼                              ▼
                  ws-backend                       db-poller
              (pub/sub → browsers)          (consumer group → Postgres)
```

- **Commands** go to the `to_engine` stream; the engine replies on a per-backend response queue (`Backend-<id>`) keyed by `correlationId`, so an HTTP request can block on its own answer.
- **Global events** (`create_order`, `cancel_order`, `create_market`) instead go to the `from_engine` stream, which multiple consumers read independently.
- **db-poller** reads `from_engine` with a consumer group and only acks after a successful write, so a crash replays rather than drops.
- **ws-backend** turns engine events into Redis pub/sub channels and fans them out to subscribed sockets.
- The engine snapshots state to `data/snapshots/` every 5 minutes and replays the stream from the snapshot's last-seen ID on boot.

## Request & response flow

### Placing an order (command → response)

1. **`POST /api/v1/exchange/order`** — `authMiddleware` verifies the JWT cookie and sets `req.userId`; the body is parsed with `CreateOrderApiRequestSchema` (a discriminated union on `orderType`, so a market order requires `slippageBps` and a limit order requires `price`).
2. **`loopback("create_order", payload)`** mints a `correlationId`, registers a pending promise with a **10 s timeout**, and `XADD`s to `to_engine`:
   ```
   { type, correlationId, responseQueue: "Backend-<uuid>", payload }
   ```
   Each http-backend process generates its own `responseQueue` at boot, so replicas never steal each other's replies.
3. **The engine** blocks on `XREAD to_engine`, dispatches through `handleCommand`, and mutates its in-memory maps (`ORDERBOOKS`, `ORDERS`, `POSITIONS`, `BALANCES`) — matching, margin locking, and position updates all happen synchronously in one loop, so there are no races.
4. **The engine replies** on one of two paths:
   - `create_order` / `cancel_order` / `create_market` are **global events** → `XADD from_engine` (every consumer sees them).
   - Everything else (`add_balance`, `get_balance`, `get_depth`, `get_markets`) → `XADD <responseQueue>` (point-to-point).
   - `update_index_price` returns nothing and is never published.
5. **The loopback listener** does a single blocking `XREAD` over *both* `from_engine` and its own `Backend-<uuid>` queue, matches `correlationId` against the pending map, then resolves with `data` or rejects with `error` (`ok === "true"` decides). Unmatched correlation IDs are ignored — that's how a replica skips another replica's traffic.
6. **The controller** returns the resolved engine payload as JSON. A timeout or an engine rejection surfaces as a 4xx.

### Failure handling

Errors inside `handleCommand` are caught in the engine loop. A `RejectionError` (insufficient margin, unknown market, bad order) is logged as a warning; anything else is logged as an error. Either way, if the command carried a `responseQueue`, a message with `ok: "false"` and the error string is written back so the caller fails fast instead of waiting out the 10 s timeout. Commands with no response queue (index prices, funding) are fire-and-forget.

### Fan-out (event → browser)

A single `create_order` event on `from_engine` is consumed independently by two consumer groups:

- **ws-backend** (`GROUP wss`, one consumer per process) translates `CreateOrderResponse` into pub/sub publishes — `market:<symbol>:depth` from `depthDiff`, one `market:<symbol>:trade` per fill (side flipped to the taker's), `user:<id>:fills` to both sides of each fill, and `user:<id>:orders` for the taker plus every touched maker order. It acks after publishing, and drains stale pending entries on startup.
- **db-poller** (`GROUP db-puller`) writes the same event to Postgres via Prisma and **only then** acks; a failed write leaves the message pending so it is redelivered after a restart. Non-`ok` or irrelevant event types are acked and skipped.

`publishListener` keeps one Redis subscription per channel no matter how many sockets want it; `wsServer` maps `channel → Set<WebSocket>` and drops dead sockets on send failure. `user:*` subscriptions are rejected unless the `token` in the SUBSCRIBE frame verifies against that user ID.

### Prices in, state out

`price-poller` holds one Binance `fstream` connection, scales each mark price to an integer, and does two things per tick: `XADD update_index_price` to the engine (which drives liquidation and ADL checks) and a direct `publish` to `market:<symbol>:markPrice` for the UI — the second path deliberately bypasses the engine so chart ticks don't queue behind order flow. It also tails `from_engine` for `create_market` to subscribe to newly listed symbols. Separately, the engine schedules a `funding_rate` command onto its own input stream at 00:00, 08:00, and 16:00 UTC.

### Recovery

The engine writes a snapshot to `data/snapshots/<lastSeenId>.json` every 5 minutes. On boot it loads the newest snapshot and resumes `XREAD` from that stream ID, replaying every command since — which is what makes an in-memory book safe to restart.

## Apps

| App | Port | What it does |
| --- | --- | --- |
| `apps/http-backend` | 3000 | REST API — auth (JWT in cookie), order entry, market data reads |
| `apps/trading-engine` | 4000 | Matching engine, margin, funding, liquidation, ADL, snapshots |
| `apps/price-poller` | 5000 | Binance `fstream` mark-price WS → engine + `markPrice` pub/sub |
| `apps/db-poller` | 6000 | Durable writer: engine events → Postgres/Prisma |
| `apps/ws-backend` | 8080 | WebSocket server, channel subscriptions, Redis pub/sub bridge |
| `apps/frontend` | 5173 | React 19 + Vite + Tailwind + Redux Toolkit + lightweight-charts |
| `apps/test` | — | Bun integration tests against the running stack |

Each service exposes `/api/status/healthz` and `/api/status/readyz` for k8s probes.

## Packages

| Package | Contents |
| --- | --- |
| `@repo/types` | Engine command/response types, Zod API schemas, `REDIS_KEYS` |
| `@repo/redis` | Shared `createClient` wrapper (`getRedisClient()`) |
| `@repo/db-prisma` | Prisma schema, migrations, generated client |
| `@repo/timescaledb` | `pg` pool + `fills_ts` hypertable writes for candles/trades |
| `@repo/ui`, `@repo/eslint-config`, `@repo/typescript-config` | Shared UI + tooling config |

Prices and quantities are integers throughout (mark prices are scaled by `1_000_000`) to avoid float drift in the matching path.

## HTTP API

Base path `/api/v1`.

**Auth** — `POST /auth/signup`, `POST /auth/signin`

**Exchange** (`/exchange`)

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/onramp` | ✅ | Credit balance |
| POST | `/market` | ✅ | Create a market |
| POST | `/order` | ✅ | Place a limit or market order |
| POST | `/order/:id` | ✅ | Cancel an order |
| GET | `/markets` | — | List markets |
| GET | `/depth/:symbol` | — | Orderbook snapshot |
| GET | `/klines/:symbol` | — | Candles (`1m`–`1d`) from TimescaleDB |
| GET | `/ticker/:symbol` | — | Last price / 24h stats |
| GET | `/trades/:symbol` | — | Recent trades |
| GET | `/orders` | ✅ | Caller's orders |
| GET | `/fills` | ✅ | Caller's fills |
| GET | `/balance` | ✅ | Caller's balance |

## WebSocket

Connect to the ws-backend and send:

```json
{ "type": "SUBSCRIBE", "channel": "market:BTC:depth" }
```

`UNSUBSCRIBE` uses the same shape. `user:*` channels require a `token` field carrying the JWT.

Channels: `market:<SYMBOL>:depth`, `market:<SYMBOL>:trade`, `market:<SYMBOL>:markPrice`, `user:<userId>:orders`, `user:<userId>:fills`.

## Getting started

Requires [Bun](https://bun.sh) 1.3.9+ and Docker.

```sh
bun install

# Postgres (TimescaleDB) + Redis
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d

# schema
bun run --filter @repo/db-prisma db:generate
bun run --filter @repo/db-prisma db:migrate

# everything, in watch mode
bun run dev
```

Run a single service with a Turborepo filter:

```sh
bun run dev --filter @repo/trading-engine
```

Other root scripts: `bun run build`, `bun run lint`, `bun run check-types`, `bun run format`.

### Environment

Each app reads its own `.env` (see the checked-in examples). The variables in play:

- `DATABASE_URL` — Postgres/TimescaleDB connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET`, `ADMIN_SECRET` — auth secrets (http-backend, ws-backend)
- `PORT`, `WSS_PORT` — http-backend and ws-backend listen ports
- `PRICE_FEEDER_REST_FALLBACK` — price-poller REST fallback toggle
- `VITE_API_URL`, `VITE_WS_URL`, `API_PROXY_TARGET`, `WS_PROXY_TARGET` — frontend

## Kubernetes

`k8s/` holds a Deployment + Service per app, an nginx Ingress, and a Secret. Copy the example secret first, then let Skaffold build, deploy, and file-sync:

```sh
cp k8s/secret-example.yml k8s/secret.yml   # edit before using anywhere real
skaffold dev
```

Skaffold port-forwards the frontend to `localhost:5173` and ws-backend to `localhost:8080`. http-backend deployments run a Prisma migration init container on start.
