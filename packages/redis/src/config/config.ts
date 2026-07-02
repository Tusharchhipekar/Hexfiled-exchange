import dotenv from "dotenv";
dotenv.config();

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not set");
}

export const redisConfig = {
  REDIS_URL: process.env.REDIS_URL,
};
