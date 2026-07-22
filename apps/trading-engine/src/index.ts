import express from "express";
import { getRedisClient } from "@repo/redis";
import { handleCommand } from "./controller/engine.controller";
import {
  REDIS_KEYS,
  type EngineRequest,
  type RedisResponseType,
} from "@repo/types";
import { loadSnapshot, saveSnapshot } from "./helper/snapShot";
import morgan from "morgan";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok", service: "trading-engine" });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({ status: "ready", service: "trading-engine" });
});

const readClient = getRedisClient();
const writeClient = getRedisClient();
type RedisClient = Awaited<ReturnType<typeof getRedisClient>>;
const GLOBAL_EVENTS = new Set([
  "create_order",
  "cancel_order",
  "create_market",
]);

let lastSeenId: string;
let lastSnapshotTime = Date.now();

//snapshot every 5 mins
const SNAPSHOT_INTERVAL = 5 * 60 * 1000;

//universal funding_rate times
const FUNDING_TIMES_UTC_HOURS = [0, 8, 16] as const;

async function startUp() {
  //loadSnapshot
  lastSeenId = await loadSnapshot();
  let readRedis = await readClient;
  let writeRedis = await writeClient;

  scheduleFundingRate(writeRedis);
  while (true) {
    const streams = (await readRedis.xRead(
      [
        {
          key: REDIS_KEYS.engineCommands,
          id: lastSeenId,
        },
      ],
      {
        BLOCK: 0,
        COUNT: 1,
      },
    )) as RedisResponseType | null;
    if (!streams) continue;
    for (const stream of streams) {
      for (const msg of stream.messages) {
        lastSeenId = msg.id;
        const { correlationId, type, responseQueue, payload } = msg.message;
        try {
          const request: EngineRequest = {
            correlationId: correlationId as string,
            type: type as EngineRequest["type"],
            responseQueue: responseQueue as string,
            payload: JSON.parse(payload as string),
          };

          const response = handleCommand(request);

          if (!response) continue; // for update_index_price

          if (GLOBAL_EVENTS.has(request.type)) {
            // create_order, cancel_order, create_market,
            await writeRedis.xAdd(REDIS_KEYS.engineEvents, "*", {
              type: request.type,
              correlationId: request.correlationId,
              ok: "true",
              error: "",
              data: JSON.stringify(response),
            });
          } else {
            await writeRedis.xAdd(responseQueue as string, "*", {
              type: request.type,
              correlationId: request.correlationId,
              ok: "true",
              error: "",
              data: JSON.stringify(response),
            });
          }
        } catch (err) {
          console.error("command failed", { type, correlationId, err });

          if (responseQueue) {
            await writeRedis.xAdd(responseQueue as string, "*", {
              type: type as string,
              correlationId: correlationId as string,
              ok: "false",
              error: (err as Error).message,
              data: "",
            });
          }
        }
      }
    }
    if (Date.now() - lastSnapshotTime > SNAPSHOT_INTERVAL) {
      await saveSnapshot(lastSeenId);
      lastSnapshotTime = Date.now();
    }
  }
}

function msUntilNextFunding(): number {
  const now = new Date();
  const currentHour = now.getUTCHours();

  const nextHour =
    FUNDING_TIMES_UTC_HOURS.find((h) => h > currentHour) ??
    FUNDING_TIMES_UTC_HOURS[0];
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      nextHour,
      0,
      0,
      0,
    ),
  );

  if (nextHour <= currentHour) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleFundingRate(writeRedis: RedisClient) {
  setTimeout(async function trigger() {
    await writeRedis.xAdd(REDIS_KEYS.engineCommands, "*", {
      type: "funding_rate",
      correlationId: crypto.randomUUID(),
      responseQueue: "",
      payload: JSON.stringify({}),
    });

    scheduleFundingRate(writeRedis);
  }, msUntilNextFunding());
}

startUp().catch((err) => {
  console.error("Engine crashed:", err);
  process.exit(1);
});

app.listen(4000, () => {
  console.log("Trading engine running on port 4000");
});
