/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/portfolio-margin/cm-trade/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerPortfolioMarginCmCancelAllOrders } from "./cancelAllOrders.js"
import { registerPortfolioMarginCmCancelOrder } from "./cancelOrder.js"
import { registerPortfolioMarginCmChangeLeverage } from "./changeLeverage.js"
import { registerPortfolioMarginCmChangeMarginType } from "./changeMarginType.js"
import { registerPortfolioMarginCmGetAllOrders } from "./getAllOrders.js"
import { registerPortfolioMarginCmGetOpenOrders } from "./getOpenOrders.js"
import { registerPortfolioMarginCmGetOrder } from "./getOrder.js"
import { registerPortfolioMarginCmGetUserTrades } from "./getUserTrades.js"
import { registerPortfolioMarginCmNewOrder } from "./newOrder.js"

export function registerPortfolioMarginCmTradeApi(server: McpServer) {
  registerPortfolioMarginCmNewOrder(server)
  registerPortfolioMarginCmCancelOrder(server)
  registerPortfolioMarginCmCancelAllOrders(server)
  registerPortfolioMarginCmGetOrder(server)
  registerPortfolioMarginCmGetAllOrders(server)
  registerPortfolioMarginCmGetOpenOrders(server)
  registerPortfolioMarginCmGetUserTrades(server)
  registerPortfolioMarginCmChangeLeverage(server)
  registerPortfolioMarginCmChangeMarginType(server)
}
