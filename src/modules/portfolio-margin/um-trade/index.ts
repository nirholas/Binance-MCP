/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/portfolio-margin/um-trade/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerPortfolioMarginUmCancelAllOrders } from "./cancelAllOrders.js"
import { registerPortfolioMarginUmCancelOrder } from "./cancelOrder.js"
import { registerPortfolioMarginUmChangeLeverage } from "./changeLeverage.js"
import { registerPortfolioMarginUmChangeMarginType } from "./changeMarginType.js"
import { registerPortfolioMarginUmGetAllOrders } from "./getAllOrders.js"
import { registerPortfolioMarginUmGetOpenOrders } from "./getOpenOrders.js"
import { registerPortfolioMarginUmGetOrder } from "./getOrder.js"
import { registerPortfolioMarginUmGetUserTrades } from "./getUserTrades.js"
import { registerPortfolioMarginUmNewOrder } from "./newOrder.js"

export function registerPortfolioMarginUmTradeApi(server: McpServer) {
  registerPortfolioMarginUmNewOrder(server)
  registerPortfolioMarginUmCancelOrder(server)
  registerPortfolioMarginUmCancelAllOrders(server)
  registerPortfolioMarginUmGetOrder(server)
  registerPortfolioMarginUmGetAllOrders(server)
  registerPortfolioMarginUmGetOpenOrders(server)
  registerPortfolioMarginUmGetUserTrades(server)
  registerPortfolioMarginUmChangeLeverage(server)
  registerPortfolioMarginUmChangeMarginType(server)
}
