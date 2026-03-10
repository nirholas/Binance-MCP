// src/tools/binance-futures-coinm/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Account & Trading
import { registerBinanceFuturesCOINMAccount } from "./account.js";
import { registerBinanceFuturesCOINMADLQuantile } from "./adlQuantile.js";
import { registerBinanceFuturesCOINMAggTrades } from "./aggTrades.js";
import { registerBinanceFuturesCOINMAllOrders } from "./allOrders.js";
import { registerBinanceFuturesCOINMBalance } from "./balance.js";
import { registerBinanceFuturesCOINMBatchOrders } from "./batchOrders.js";
import { registerBinanceFuturesCOINMBookTicker } from "./bookTicker.js";
import { registerBinanceFuturesCOINMCancelAllOrders } from "./cancelAllOrders.js";
import { registerBinanceFuturesCOINMCancelBatchOrders } from "./cancelBatchOrders.js";
import { registerBinanceFuturesCOINMCancelOrder } from "./cancelOrder.js";
import { registerBinanceFuturesCOINMCommissionRate } from "./commissionRate.js";
import { registerBinanceFuturesCOINMContinuousKlines } from "./continuousKlines.js";
import { registerBinanceFuturesCOINMDepth } from "./depth.js";
import { registerBinanceFuturesCOINMExchangeInfo } from "./exchangeInfo.js";
import { registerBinanceFuturesCOINMForceOrders } from "./forceOrders.js";
import { registerBinanceFuturesCOINMFundingRate } from "./fundingRate.js";
import { registerBinanceFuturesCOINMGetOrder } from "./getOrder.js";
import { registerBinanceFuturesCOINMHistoricalTrades } from "./historicalTrades.js";
import { registerBinanceFuturesCOINMIncome } from "./income.js";
import { registerBinanceFuturesCOINMIndexPriceKlines } from "./indexPriceKlines.js";
import { registerBinanceFuturesCOINMKlines } from "./klines.js";
import { registerBinanceFuturesCOINMLeverage } from "./leverage.js";
// User Data Stream
import {
  registerBinanceFuturesCOINMListenKeyClose,
  registerBinanceFuturesCOINMListenKeyCreate,
  registerBinanceFuturesCOINMListenKeyRenew,
} from "./listenKey.js";
import { registerBinanceFuturesCOINMMarginType } from "./marginType.js";
import { registerBinanceFuturesCOINMMarkPriceKlines } from "./markPriceKlines.js";
import { registerBinanceFuturesCOINMNewOrder } from "./newOrder.js";
import { registerBinanceFuturesCOINMOpenInterest } from "./openInterest.js";
import { registerBinanceFuturesCOINMOpenOrders } from "./openOrders.js";
// Market Data
import { registerBinanceFuturesCOINMPing } from "./ping.js";
import { registerBinanceFuturesCOINMPositionMargin } from "./positionMargin.js";
import { registerBinanceFuturesCOINMPositionMode } from "./positionMode.js";
import { registerBinanceFuturesCOINMPositionRisk } from "./positionRisk.js";
import { registerBinanceFuturesCOINMPremiumIndex } from "./premiumIndex.js";
import { registerBinanceFuturesCOINMTicker24hr } from "./ticker24hr.js";
import { registerBinanceFuturesCOINMTickerPrice } from "./tickerPrice.js";
import { registerBinanceFuturesCOINMTime } from "./time.js";
import { registerBinanceFuturesCOINMTrades } from "./trades.js";
import { registerBinanceFuturesCOINMUserTrades } from "./userTrades.js";

export function registerBinanceFuturesCOINMTools(server: McpServer) {
  // Market Data
  registerBinanceFuturesCOINMPing(server);
  registerBinanceFuturesCOINMTime(server);
  registerBinanceFuturesCOINMExchangeInfo(server);
  registerBinanceFuturesCOINMDepth(server);
  registerBinanceFuturesCOINMTrades(server);
  registerBinanceFuturesCOINMHistoricalTrades(server);
  registerBinanceFuturesCOINMAggTrades(server);
  registerBinanceFuturesCOINMKlines(server);
  registerBinanceFuturesCOINMContinuousKlines(server);
  registerBinanceFuturesCOINMIndexPriceKlines(server);
  registerBinanceFuturesCOINMMarkPriceKlines(server);
  registerBinanceFuturesCOINMPremiumIndex(server);
  registerBinanceFuturesCOINMFundingRate(server);
  registerBinanceFuturesCOINMTicker24hr(server);
  registerBinanceFuturesCOINMTickerPrice(server);
  registerBinanceFuturesCOINMBookTicker(server);
  registerBinanceFuturesCOINMOpenInterest(server);

  // Account & Trading
  registerBinanceFuturesCOINMAccount(server);
  registerBinanceFuturesCOINMBalance(server);
  registerBinanceFuturesCOINMPositionRisk(server);
  registerBinanceFuturesCOINMNewOrder(server);
  registerBinanceFuturesCOINMBatchOrders(server);
  registerBinanceFuturesCOINMGetOrder(server);
  registerBinanceFuturesCOINMCancelOrder(server);
  registerBinanceFuturesCOINMCancelAllOrders(server);
  registerBinanceFuturesCOINMCancelBatchOrders(server);
  registerBinanceFuturesCOINMOpenOrders(server);
  registerBinanceFuturesCOINMAllOrders(server);
  registerBinanceFuturesCOINMUserTrades(server);
  registerBinanceFuturesCOINMIncome(server);
  registerBinanceFuturesCOINMLeverage(server);
  registerBinanceFuturesCOINMMarginType(server);
  registerBinanceFuturesCOINMPositionMargin(server);
  registerBinanceFuturesCOINMPositionMode(server);
  registerBinanceFuturesCOINMCommissionRate(server);
  registerBinanceFuturesCOINMForceOrders(server);
  registerBinanceFuturesCOINMADLQuantile(server);

  // User Data Stream
  registerBinanceFuturesCOINMListenKeyCreate(server);
  registerBinanceFuturesCOINMListenKeyRenew(server);
  registerBinanceFuturesCOINMListenKeyClose(server);
}
