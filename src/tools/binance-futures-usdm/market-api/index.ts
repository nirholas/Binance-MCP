/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-usdm/market-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceFuturesAggTrades } from "./aggTrades.js"
import { registerBinanceFuturesAssetIndex } from "./assetIndex.js"
import { registerBinanceFuturesContinuousKlines } from "./continuousKlines.js"
import { registerBinanceFuturesDepth } from "./depth.js"
import { registerBinanceFuturesExchangeInfo } from "./exchangeInfo.js"
import { registerBinanceFuturesFundingInfo } from "./fundingInfo.js"
import { registerBinanceFuturesFundingRate } from "./fundingRate.js"
import { registerBinanceFuturesGlobalLongShortAccountRatio } from "./globalLongShortAccountRatio.js"
import { registerBinanceFuturesHistoricalTrades } from "./historicalTrades.js"
import { registerBinanceFuturesIndexInfo } from "./indexInfo.js"
import { registerBinanceFuturesIndexPriceKlines } from "./indexPriceKlines.js"
import { registerBinanceFuturesKlines } from "./klines.js"
import { registerBinanceFuturesLvtKlines } from "./lvtKlines.js"
import { registerBinanceFuturesMarkPriceKlines } from "./markPriceKlines.js"
import { registerBinanceFuturesOpenInterest } from "./openInterest.js"
import { registerBinanceFuturesOpenInterestHist } from "./openInterestHist.js"
import { registerBinanceFuturesPing } from "./ping.js"
import { registerBinanceFuturesPremiumIndex } from "./premiumIndex.js"
import { registerBinanceFuturesTakerLongShortRatio } from "./takerLongShortRatio.js"
import { registerBinanceFuturesTicker24hr } from "./ticker24hr.js"
import { registerBinanceFuturesTickerBookTicker } from "./tickerBookTicker.js"
import { registerBinanceFuturesTickerPrice } from "./tickerPrice.js"
import { registerBinanceFuturesTime } from "./time.js"
import { registerBinanceFuturesTopLongShortAccountRatio } from "./topLongShortAccountRatio.js"
import { registerBinanceFuturesTopLongShortPositionRatio } from "./topLongShortPositionRatio.js"
import { registerBinanceFuturesTrades } from "./trades.js"

export function registerBinanceFuturesMarketApiTools(server: McpServer) {
  // General
  registerBinanceFuturesPing(server)
  registerBinanceFuturesTime(server)
  registerBinanceFuturesExchangeInfo(server)

  // Market Data
  registerBinanceFuturesDepth(server)
  registerBinanceFuturesTrades(server)
  registerBinanceFuturesHistoricalTrades(server)
  registerBinanceFuturesAggTrades(server)

  // Klines
  registerBinanceFuturesKlines(server)
  registerBinanceFuturesContinuousKlines(server)
  registerBinanceFuturesIndexPriceKlines(server)
  registerBinanceFuturesMarkPriceKlines(server)

  // Funding & Premium
  registerBinanceFuturesPremiumIndex(server)
  registerBinanceFuturesFundingRate(server)
  registerBinanceFuturesFundingInfo(server)

  // Ticker
  registerBinanceFuturesTicker24hr(server)
  registerBinanceFuturesTickerPrice(server)
  registerBinanceFuturesTickerBookTicker(server)

  // Open Interest & Analytics
  registerBinanceFuturesOpenInterest(server)
  registerBinanceFuturesOpenInterestHist(server)
  registerBinanceFuturesTopLongShortAccountRatio(server)
  registerBinanceFuturesTopLongShortPositionRatio(server)
  registerBinanceFuturesGlobalLongShortAccountRatio(server)
  registerBinanceFuturesTakerLongShortRatio(server)

  // Index
  registerBinanceFuturesLvtKlines(server)
  registerBinanceFuturesIndexInfo(server)
  registerBinanceFuturesAssetIndex(server)
}
