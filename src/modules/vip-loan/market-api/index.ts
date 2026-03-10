// src/tools/binance-vip-loan/market-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceGetBorrowInterestRate } from "./getBorrowInterestRate.js"
import { registerBinanceGetCollateralAssetData } from "./getCollateralAssetData.js"
import { registerBinanceGetLoanableAssetsData } from "./getLoanableAssetsData.js"

export function registerBinanceVipLoanMarketApiTools(server: McpServer) {
  registerBinanceGetBorrowInterestRate(server)
  registerBinanceGetCollateralAssetData(server)
  registerBinanceGetLoanableAssetsData(server)
}
