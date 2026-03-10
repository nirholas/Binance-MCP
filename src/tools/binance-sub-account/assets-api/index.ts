/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-sub-account/assets-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBinanceSubAccountFuturesSummary } from "./getFuturesAssetsSummary.js";
import { registerBinanceSubAccountFuturesPositionRisk } from "./getFuturesPositionRisk.js";
import { registerBinanceSubAccountMarginSummary } from "./getMarginAssetsSummary.js";
import { registerBinanceSubAccountSpotSummary } from "./getSpotAssetsSummary.js";
import { registerBinanceSubAccountAssets } from "./getSubAccountAssets.js";

export function registerBinanceSubAccountAssetsTools(server: McpServer) {
  registerBinanceSubAccountAssets(server);
  registerBinanceSubAccountSpotSummary(server);
  registerBinanceSubAccountMarginSummary(server);
  registerBinanceSubAccountFuturesSummary(server);
  registerBinanceSubAccountFuturesPositionRisk(server);
}
