import { getRedisClient } from "@repo/redis";
import { REDIS_KEYS } from "@repo/types";
import type { RedisResponseType } from "@repo/types";
import { updateDb } from "./updateDb";
import express from "express";
import morgan from "morgan";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/status/healthz", (req, res) => {
  res.status(200).json({ status: "ok", service: "db-poller" });
});

app.get("/api/status/readyz", (req, res) => {
  res.status(200).json({ status: "ready", service: "db-poller" });
});

const readRedis = getRedisClient();

const DB_EVENTS = new Set(["create_order", "cancel_order"]);
const GROUP = "db-puller";
const CONSUMER = "db-puller-1";

async function dbPuller() {
  const client = await readRedis;
  try {
    await client.xGroupCreate(REDIS_KEYS.engineEvents, GROUP, "0", {
      MKSTREAM: true,
    });
  } catch {
    // group already exists — fine
  }
  while (true) {
    const streams = (await client.xReadGroup(
      GROUP,
      CONSUMER,
      [
        {
          key: REDIS_KEYS.engineEvents,
          id: ">",
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
        //skip rest types other then dbEvents
        const { type, ok, data } = msg.message;

        if (!DB_EVENTS.has(type as string) || ok !== "true") {
          // ack and skip — not our concern
          await client.xAck(REDIS_KEYS.engineEvents, GROUP, msg.id);
          continue;
        }

        try {
          await updateDb(
            type as "create_order" | "cancel_order",
            data ? JSON.parse(data) : undefined,
          );
          await client.xAck(REDIS_KEYS.engineEvents, GROUP, msg.id);
        } catch (err) {
          console.error("DB write failed:", err);
          // don't ack — message will be redelivered on restart
        }
      }
    }
  }
}

dbPuller().catch(() => process.exit(1));

app.listen(6000, () => {
  console.log("DB-poller running on port 6000");
});
