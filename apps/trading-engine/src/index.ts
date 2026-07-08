import { getRedisClient } from "@repo/redis";
import { handleCommand } from "./controller/engine.controller";
import {
  REDIS_KEYS,
  type EngineRequest,
  type RedisResponseType,
} from "@repo/types";

const GLOBAL_EVENTS = new Set([
  "create_order",
  "cancel_order",
  "create_market",
]);

const readClient = getRedisClient();
const writeClient = getRedisClient();
let lastSeenId = "0-0";

async function startUp() {
  let readRedis = await readClient;
  let writeRedis = await writeClient;

  while (true) {
    const streams =
      ((await readRedis.xRead(
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
      )) as RedisResponseType) || null;
    if (!streams) continue;
    for (const stream of streams) {
      for (const msg of stream.messages) {
        lastSeenId = msg.id;
        const { correlationId, type, responseQueue, payload } = msg.message;
        try {
          const request: EngineRequest = {
            correlationId: correlationId as string,
            type: type as EngineRequest["type"],
            responseQueue: responseQueue!,
            payload: JSON.parse(payload as string),
          };
          const response = handleCommand(request);

          if (!response) continue; // for update_index_price

          await writeRedis.xAdd(request.responseQueue, "*", {
            correlationId: request.correlationId,
            ok: "true",
            error: "",
            data: JSON.stringify(response),
          });

          if (GLOBAL_EVENTS.has(request.type)) {
            await writeRedis.xAdd(REDIS_KEYS.engineEvents, "*", {
              correlationId: request.correlationId,
              ok: "true",
              error: "",
              data: JSON.stringify(response),
            });
          }
        } catch (err) {
          // business logic error — send back to backend, don't crash
          await writeRedis.xAdd(responseQueue as string, "*", {
            correlationId: correlationId as string,
            ok: "false",
            error: (err as Error).message,
            data: "{}",
          });
        }
      }
    }
  }
}
