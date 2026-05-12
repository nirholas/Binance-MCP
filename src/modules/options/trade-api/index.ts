/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/options/trade-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerOptionsBatchOrders } from "./batchOrders.js";
import { registerOptionsCancelAllOrders } from "./cancelAllOrders.js";
import { registerOptionsCancelBatchOrders } from "./cancelBatchOrders.js";
import { registerOptionsCancelBySymbol } from "./cancelBySymbol.js";
import { registerOptionsCancelOrder } from "./cancelOrder.js";
import { registerOptionsGetHistoryOrders } from "./getHistoryOrders.js";
import { registerOptionsGetOpenOrders } from "./getOpenOrders.js";
import { registerOptionsGetUserTrades } from "./getUserTrades.js";
import { registerOptionsNewOrder } from "./newOrder.js";

export function registerOptionsTradeApi(server: McpServer) {
  registerOptionsNewOrder(server);
  registerOptionsBatchOrders(server);
  registerOptionsCancelOrder(server);
  registerOptionsCancelBatchOrders(server);
  registerOptionsCancelAllOrders(server);
  registerOptionsCancelBySymbol(server);
  registerOptionsGetOpenOrders(server);
  registerOptionsGetHistoryOrders(server);
  registerOptionsGetUserTrades(server);
}
