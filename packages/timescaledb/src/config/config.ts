import "dotenv/config";

if (!process.env.DATABASE_URL) throw new Error("database url not found");

export const config = {
  DATABASE_URL: process.env.DATABASE_URL,
};
