import { AddBalanceApiSchema } from "@repo/types";
import type { Request, Response } from "express";
import { loopback } from "../services/loopback";

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
    });
  } catch (error) {
    return res.status(400).json({ error: "Error while adding balance" });
  }
};
