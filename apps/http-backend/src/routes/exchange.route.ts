import { Router } from "express";
import {
  addBalance,
  cancelOrder,
  createMarket,
  createOrder,
} from "../controllers/exchange.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getMarkets } from "../handler/getMarkets";
import { getDepth } from "../handler/getDepth";
import { getKLines } from "../handler/getKLines";
import { getTicker } from "../handler/getTicker";
import { getTrades } from "../handler/getTrades";
import { getUserOrders } from "../handler/getUserOrders";
import { getUserFills } from "../handler/getUserFills";
import { getBalance } from "../handler/getBalance";

export const exchangeRouter = Router();

// protected routes
exchangeRouter.post("/onramp", authMiddleware, addBalance);
exchangeRouter.post("/market", authMiddleware, createMarket);
exchangeRouter.post("/order", authMiddleware, createOrder);
exchangeRouter.post("/order/:id", authMiddleware, cancelOrder);

// public
exchangeRouter.get("/markets", getMarkets);
exchangeRouter.get("/depth/:symbol", getDepth);
exchangeRouter.get("/klines/:symbol", getKLines);
exchangeRouter.get("/ticker/:symbol", getTicker);
exchangeRouter.get("/trades/:symbol", getTrades);

// authenticated
exchangeRouter.get("/orders", authMiddleware, getUserOrders);
exchangeRouter.get("/fills", authMiddleware, getUserFills);
exchangeRouter.get("/balance", authMiddleware, getBalance);
