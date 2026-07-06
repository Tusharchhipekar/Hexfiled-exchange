import { Router } from "express";
import { addBalance } from "../controllers/exchange.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export const exchangeRouter = Router();

exchangeRouter.post("/onramp", authMiddleware, addBalance);

exchangeRouter.post("/order", authMiddleware, addBalance);

exchangeRouter.post("/order:id", authMiddleware, addBalance);
