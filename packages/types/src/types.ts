import { email, z } from "zod";

const int = z.number().int();
const side = z.enum(["buy", "sell"]);

export const SignupApiRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().email().optional(),
});

export const SigninApiRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const CreateOrderApiRequestSchema = z.discriminatedUnion("orderType", [
  z.object({
    orderType: z.literal("limit"),
    side,
    price: int,
    qty: int,
    leverage: int.min(1),
    symbol: z.string().min(1),
  }),
  z.object({
    orderType: z.literal("market"),
    side,
    qty: int,
    leverage: int.min(1),
    slippageBps: int.min(0),
    symbol: z.string().min(1),
  }),
]);

export const CancelOrderApiRequestSchema = z.string();

export const CreateMarketApiRequestSchema = z.object({
  symbol: z.string().min(1),
  imageUrl: z.string(),
  maxLeverage: int.min(1),
  minQty: int.min(1),
});

export const AddBalanceApiSchema = z.object({
  amount: int.min(1),
});

export const OrderParamsSchema = z.object({
  orderId: z.uuid(),
});

export const DepthParamsSchema = z.object({
  symbol: z.string().min(1),
});

export const getDepthApiSchema = z.string();

export const getKLinesApiSchema = z.object({
  symbol: z.string().min(1),
  interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1m"),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export type TSignupApi = z.infer<typeof SignupApiRequestSchema>;
export type TSigninApi = z.infer<typeof SigninApiRequestSchema>;
export type TCreateOrderApi = z.infer<typeof CreateOrderApiRequestSchema>;
export type TCreateMarketApi = z.infer<typeof CreateMarketApiRequestSchema>;
export type TAddBalanceApi = z.infer<typeof AddBalanceApiSchema>;
export type TOrderParams = z.infer<typeof OrderParamsSchema>;
export type TDepthParams = z.infer<typeof DepthParamsSchema>;
