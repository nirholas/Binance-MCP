// src/tools/binance-futures-usdm/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

// Account & Trading
import { registerBinanceFuturesUSDMAccount } from "./account.js"
import { registerBinanceFuturesUSDMADLQuantile } from "./adlQuantile.js"
import { registerBinanceFuturesUSDMAggTrades } from "./aggTrades.js"
import { registerBinanceFuturesUSDMAllOrders } from "./allOrders.js"
import { registerBinanceFuturesUSDMBalance } from "./balance.js"
import { registerBinanceFuturesUSDMBatchOrders } from "./batchOrders.js"
import { registerBinanceFuturesUSDMBookTicker } from "./bookTicker.js"
import { registerBinanceFuturesUSDMCancelAllOrders } from "./cancelAllOrders.js"
import { registerBinanceFuturesUSDMCancelBatchOrders } from "./cancelBatchOrders.js"
import { registerBinanceFuturesUSDMCancelOrder } from "./cancelOrder.js"
import { registerBinanceFuturesUSDMCommissionRate } from "./commissionRate.js"
import { registerBinanceFuturesUSDMContinuousKlines } from "./continuousKlines.js"
import { registerBinanceFuturesUSDMDepth } from "./depth.js"
import { registerBinanceFuturesUSDMExchangeInfo } from "./exchangeInfo.js"
import { registerBinanceFuturesUSDMForceOrders } from "./forceOrders.js"
import { registerBinanceFuturesUSDMFundingRate } from "./fundingRate.js"
import { registerBinanceFuturesUSDMGetOrder } from "./getOrder.js"
import { registerBinanceFuturesUSDMHistoricalTrades } from "./historicalTrades.js"
import { registerBinanceFuturesUSDMIncome } from "./income.js"
import { registerBinanceFuturesUSDMIndexPriceKlines } from "./indexPriceKlines.js"
import { registerBinanceFuturesUSDMKlines } from "./klines.js"
import { registerBinanceFuturesUSDMLeverage } from "./leverage.js"
// User Data Stream
import {
  registerBinanceFuturesUSDMListenKeyClose,
  registerBinanceFuturesUSDMListenKeyCreate,
  registerBinanceFuturesUSDMListenKeyRenew,
} from "./listenKey.js"
import { registerBinanceFuturesUSDMMarginType } from "./marginType.js"
import { registerBinanceFuturesUSDMMarkPriceKlines } from "./markPriceKlines.js"
import { registerBinanceFuturesUSDMMultiAssetsMode } from "./multiAssetsMode.js"
import { registerBinanceFuturesUSDMNewOrder } from "./newOrder.js"
import { registerBinanceFuturesUSDMOpenInterest } from "./openInterest.js"
import { registerBinanceFuturesUSDMOpenOrders } from "./openOrders.js"
// Market Data
import { registerBinanceFuturesUSDMPing } from "./ping.js"
import { registerBinanceFuturesUSDMPositionMargin } from "./positionMargin.js"
import { registerBinanceFuturesUSDMPositionMode } from "./positionMode.js"
import { registerBinanceFuturesUSDMPositionRisk } from "./positionRisk.js"
import { registerBinanceFuturesUSDMPremiumIndex } from "./premiumIndex.js"
import { registerBinanceFuturesUSDMTicker24hr } from "./ticker24hr.js"
import { registerBinanceFuturesUSDMTickerPrice } from "./tickerPrice.js"
import { registerBinanceFuturesUSDMTime } from "./time.js"
import { registerBinanceFuturesUSDMTrades } from "./trades.js"
import { registerBinanceFuturesUSDMUserTrades } from "./userTrades.js"

export function registerBinanceFuturesUSDMTools(server: McpServer) {
  // Market Data
  registerBinanceFuturesUSDMPing(server)
  registerBinanceFuturesUSDMTime(server)
  registerBinanceFuturesUSDMExchangeInfo(server)
  registerBinanceFuturesUSDMDepth(server)
  registerBinanceFuturesUSDMTrades(server)
  registerBinanceFuturesUSDMHistoricalTrades(server)
  registerBinanceFuturesUSDMAggTrades(server)
  registerBinanceFuturesUSDMKlines(server)
  registerBinanceFuturesUSDMContinuousKlines(server)
  registerBinanceFuturesUSDMIndexPriceKlines(server)
  registerBinanceFuturesUSDMMarkPriceKlines(server)
  registerBinanceFuturesUSDMPremiumIndex(server)
  registerBinanceFuturesUSDMFundingRate(server)
  registerBinanceFuturesUSDMTicker24hr(server)
  registerBinanceFuturesUSDMTickerPrice(server)
  registerBinanceFuturesUSDMBookTicker(server)
  registerBinanceFuturesUSDMOpenInterest(server)

  // Account & Trading
  registerBinanceFuturesUSDMAccount(server)
  registerBinanceFuturesUSDMBalance(server)
  registerBinanceFuturesUSDMPositionRisk(server)
  registerBinanceFuturesUSDMNewOrder(server)
  registerBinanceFuturesUSDMBatchOrders(server)
  registerBinanceFuturesUSDMGetOrder(server)
  registerBinanceFuturesUSDMCancelOrder(server)
  registerBinanceFuturesUSDMCancelAllOrders(server)
  registerBinanceFuturesUSDMCancelBatchOrders(server)
  registerBinanceFuturesUSDMOpenOrders(server)
  registerBinanceFuturesUSDMAllOrders(server)
  registerBinanceFuturesUSDMUserTrades(server)
  registerBinanceFuturesUSDMIncome(server)
  registerBinanceFuturesUSDMLeverage(server)
  registerBinanceFuturesUSDMMarginType(server)
  registerBinanceFuturesUSDMPositionMargin(server)
  registerBinanceFuturesUSDMPositionMode(server)
  registerBinanceFuturesUSDMMultiAssetsMode(server)
  registerBinanceFuturesUSDMCommissionRate(server)
  registerBinanceFuturesUSDMForceOrders(server)
  registerBinanceFuturesUSDMADLQuantile(server)

  // User Data Stream
  registerBinanceFuturesUSDMListenKeyCreate(server)
  registerBinanceFuturesUSDMListenKeyRenew(server)
  registerBinanceFuturesUSDMListenKeyClose(server)
}
