// src/tools/binance-spot/trade-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBinanceAllOrders } from "./allOrders.js";
import { registerBinanceDeleteOpenOrders } from "./deleteOpenOrders.js";
import { registerBinanceDeleteOrder } from "./deleteOrder.js";
import { registerBinanceGetOpenOrders } from "./getOpenOrders.js";
import { registerBinanceGetOrder } from "./getOrder.js";
import { registerBinanceNewOrder } from "./newOrder.js";
import { registerBinanceOpenOrderList } from "./openOrderList.js";
import { registerBinanceOrderOco } from "./orderOco.js";

export function registerBinanceTradeApiTools(server: McpServer) {
  registerBinanceDeleteOrder(server);
  registerBinanceAllOrders(server);
  registerBinanceOpenOrderList(server);
  registerBinanceNewOrder(server);
  registerBinanceGetOrder(server);
  registerBinanceGetOpenOrders(server);
  registerBinanceDeleteOpenOrders(server);
  registerBinanceOrderOco(server);
}
