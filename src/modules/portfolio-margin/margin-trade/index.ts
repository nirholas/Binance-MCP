/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/portfolio-margin/margin-trade/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerPortfolioMarginMarginCancelAllOrders } from "./cancelAllOrders.js";
import { registerPortfolioMarginMarginCancelOrder } from "./cancelOrder.js";
import { registerPortfolioMarginMarginGetAllOrders } from "./getAllOrders.js";
import { registerPortfolioMarginMarginGetOpenOrders } from "./getOpenOrders.js";
import { registerPortfolioMarginMarginGetOrder } from "./getOrder.js";
import { registerPortfolioMarginMarginGetUserTrades } from "./getUserTrades.js";
import { registerPortfolioMarginMarginLoan } from "./marginLoan.js";
import { registerPortfolioMarginMarginRepay } from "./marginRepay.js";
import { registerPortfolioMarginMarginNewOrder } from "./newOrder.js";

export function registerPortfolioMarginMarginTradeApi(server: McpServer) {
  registerPortfolioMarginMarginNewOrder(server);
  registerPortfolioMarginMarginCancelOrder(server);
  registerPortfolioMarginMarginCancelAllOrders(server);
  registerPortfolioMarginMarginGetOrder(server);
  registerPortfolioMarginMarginGetAllOrders(server);
  registerPortfolioMarginMarginGetOpenOrders(server);
  registerPortfolioMarginMarginLoan(server);
  registerPortfolioMarginMarginRepay(server);
  registerPortfolioMarginMarginGetUserTrades(server);
}
