import dotenv from "dotenv";
dotenv.config();

if (!process.env.REDIS_URL) throw Error("Redis URL is not set");

if (!process.env.DATABASE_URL) throw Error("Database URL is not set");

if (!process.env.PRICE_FEEDER_REST_FALLBACK)
  throw Error("Price feeder REST fallback is not set");

export const config = {
  REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  PRICE_FEEDER_REST_FALLBACK: process.env.PRICE_FEEDER_REST_FALLBACK,
};
