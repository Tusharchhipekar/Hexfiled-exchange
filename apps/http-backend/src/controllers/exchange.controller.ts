import {
  AddBalanceApiSchema,
  CreateMarketApiRequestSchema,
  CreateOrderApiRequestSchema,
  CancelOrderApiRequestSchema,
} from "@repo/types";
import type { Request, Response } from "express";
import prisma from "@repo/db-prisma";
import { loopback } from "../services/loopback";
import { config } from "../configs/config";

export const addBalance = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const parseBody = AddBalanceApiSchema.safeParse(req.body);

  if (!parseBody.success) {
    return res.status(411).json({
      message: "Invalid inputs",
    });
  }

  const { amount } = parseBody.data;

  try {
    const response = await loopback("add_balance", {
      userId,
      amount,
    });

    return res.status(200).json({
      success: true,
      response,
    });
  } catch (error) {
    return res.status(400).json({ error: "Error while adding balance" });
  }
};

export const createMarket = async (req: Request, res: Response) => {
  try {
    const adminEnv = req.headers.token;
    if (adminEnv !== config.ADMIN_SECRET) {
      res.status(401).json({
        message: "Invalid inputs",
      });
      return;
    }

    const parsed = CreateMarketApiRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }

    const { maxLeverage, minQty, symbol, imageUrl } = parsed.data;
    const existingMarket = await prisma.market.findUnique({
      where: { symbol },
    });
    if (existingMarket) {
      res.status(409).json({
        message: "market already present",
      });
      return;
    }

    const market = await prisma.market.create({
      data: {
        maxLeverage,
        minQty,
        symbol,
        imageUrl,
      },
    });

    await loopback("create_market", {
      marketId: market.id,
      maxLeverage,
      minQty,
      symbol,
    });

    res.status(201).json({
      marketId: market.id,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "server error",
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const parsed = CreateOrderApiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  try {
    const response = await loopback("create_order", {
      userId,
      ...parsed.data,
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({
      error: (error as Error).message,
    });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  const userId = req.userId!;
  const parsed = CancelOrderApiRequestSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }
  const orderId = parsed.data;
  try {
    const response = await loopback("cancel_order", {
      userId,
      orderId,
    });

    res.status(200).json(response);
  } catch (error) {
    const message = (error as Error).message;
    if (message.toLowerCase().includes("doesn't exist")) {
      console.error(
        "Cancel requested for DB-projected order missing from engine",
        {
          orderId,
          userId,
          error: message,
        },
      );
    }
    res.status(400).json({
      error: (error as Error).message,
    });
  }
};
