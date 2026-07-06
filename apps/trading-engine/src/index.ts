import { getRedisClient } from "@repo/redis";
import { handleCommand } from "./controller/engine.controller";

const client = getRedisClient();
