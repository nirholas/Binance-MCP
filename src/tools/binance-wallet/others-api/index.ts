//src/tools/binance-wallet/others-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceWalletGetSymbolsDelistScheduleForSpot } from "./getSymbolsDelistScheduleForSpot.js"
import { registerBinanceWalletSystemStatus } from "./systemStatus.js"

export function registerBinanceWalletOthersApiTools(server: McpServer) {
  registerBinanceWalletSystemStatus(server)
  registerBinanceWalletGetSymbolsDelistScheduleForSpot(server)
}
