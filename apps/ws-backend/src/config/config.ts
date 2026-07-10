import dotenv from "dotenv";
dotenv.config();

if (!process.env.REDIS_URL) throw new Error("Missing REDIS_URL");
if (!process.env.WSS_PORT) throw new Error("Missing WSS_PORT");
if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

export const Config = {
  REDIS_URL: process.env.REDIS_URL,
  WSS_PORT: process.env.WSS_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
};
