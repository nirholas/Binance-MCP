/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-usdm/trade-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceFuturesBatchOrders } from "./batchOrders.js"
import { registerBinanceFuturesCancelAllOrders } from "./cancelAllOrders.js"
import { registerBinanceFuturesCancelBatchOrders } from "./cancelBatchOrders.js"
import { registerBinanceFuturesCancelOrder } from "./cancelOrder.js"
import { registerBinanceFuturesChangeLeverage } from "./changeLeverage.js"
import { registerBinanceFuturesChangeMarginType } from "./changeMarginType.js"
import { registerBinanceFuturesChangeMultiAssetsMode } from "./changeMultiAssetsMode.js"
import { registerBinanceFuturesChangePositionMode } from "./changePositionMode.js"
import { registerBinanceFuturesCountdownCancelAll } from "./countdownCancelAll.js"
import { registerBinanceFuturesGetAllOrders } from "./getAllOrders.js"
import { registerBinanceFuturesGetOpenOrder } from "./getOpenOrder.js"
import { registerBinanceFuturesGetOpenOrders } from "./getOpenOrders.js"
import { registerBinanceFuturesGetOrder } from "./getOrder.js"
import { registerBinanceFuturesModifyIsolatedPositionMargin } from "./modifyIsolatedPositionMargin.js"
import { registerBinanceFuturesModifyOrder } from "./modifyOrder.js"
import { registerBinanceFuturesNewOrder } from "./newOrder.js"
import { registerBinanceFuturesPositionMarginHistory } from "./positionMarginHistory.js"

export function registerBinanceFuturesTradeApiTools(server: McpServer) {
  // Order Placement
  registerBinanceFuturesNewOrder(server)
  registerBinanceFuturesBatchOrders(server)
  registerBinanceFuturesModifyOrder(server)

  // Order Query
  registerBinanceFuturesGetOrder(server)
  registerBinanceFuturesGetOpenOrder(server)
  registerBinanceFuturesGetOpenOrders(server)
  registerBinanceFuturesGetAllOrders(server)

  // Order Cancellation
  registerBinanceFuturesCancelOrder(server)
  registerBinanceFuturesCancelAllOrders(server)
  registerBinanceFuturesCancelBatchOrders(server)
  registerBinanceFuturesCountdownCancelAll(server)

  // Leverage & Margin
  registerBinanceFuturesChangeLeverage(server)
  registerBinanceFuturesChangeMarginType(server)
  registerBinanceFuturesModifyIsolatedPositionMargin(server)
  registerBinanceFuturesPositionMarginHistory(server)

  // Position & Asset Modes
  registerBinanceFuturesChangePositionMode(server)
  registerBinanceFuturesChangeMultiAssetsMode(server)
}
