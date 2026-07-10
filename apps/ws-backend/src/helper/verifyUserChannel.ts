import { Config } from "../config/config";
import jwt from "jsonwebtoken";
export function verifyUserChannel(channel: string, token: string): boolean {
  const { userId } = jwt.verify(token, Config.JWT_SECRET) as { userId: string };
  return (
    channel === `user:${userId}:orders` ||
    channel === `user:${userId}:fills` ||
    channel === `user:${userId}:liquidations`
  );
}
