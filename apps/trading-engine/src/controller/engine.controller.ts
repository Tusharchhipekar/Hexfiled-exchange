import { createOrder } from "../handler/createOrder";
import { cancelOrder } from "../handler/cancelOrder";
import { addBalance } from "../handler/addBalance";
import type {
  addBalancePayload,
  cancelOrderPayload,
  CreateMarketPayload,
  createOrderPayload,
  EngineRequest,
  getBalancePayload,
  updateIndexPricePayload,
} from "@repo/types";
import { getBalance } from "../handler/getBalance";
import { updateIndexPrice } from "../handler/updateIndexPrice";
import { createMarket } from "../handler/createMarket";

export function handleCommand(request: EngineRequest) {
  const { type, payload } = request;
  switch (type) {
    case "create_order":
      return createOrder(payload as createOrderPayload);
    case "cancel_order":
      return cancelOrder(payload as cancelOrderPayload);
    case "update_index_price":
      return updateIndexPrice(payload as updateIndexPricePayload);
    case "add_balance":
      return addBalance(payload as addBalancePayload);
    case "get_balance":
      return getBalance(payload as getBalancePayload);
    case "get_depth":
      return getDepth(payload);
    case "create_market":
      return createMarket(payload as CreateMarketPayload);
    default:
      throw new Error("unknown command");
  }
}
