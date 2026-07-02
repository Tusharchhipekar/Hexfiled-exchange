import { redisConfig } from "./config/config";
import { createClient } from "redis";

export const getRedisClient = async () => {
  const redis = createClient({
    url: redisConfig.REDIS_URL,
  });

  redis.on("error", (err: any) => console.log("Redis Client Error", err));
  await redis.connect();
  return redis;
};
export { createClient };
