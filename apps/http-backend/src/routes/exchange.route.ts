import { Router } from "express";
import {
  addBalance,
  createMarket,
  createOrder,
} from "../controllers/exchange.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export const exchangeRouter = Router();

exchangeRouter.post("/onramp", authMiddleware, addBalance);

exchangeRouter.post("/market", authMiddleware, createMarket);

exchangeRouter.post("/order", authMiddleware, createOrder);

exchangeRouter.post("/order:id", authMiddleware, addBalance);
