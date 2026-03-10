// src/tools/binance-vip-loan/trade-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceVipLoanBorrow } from "./vipLoanBorrow.js"
import { registerBinanceVipLoanRenew } from "./vipLoanRenew.js"
import { registerBinanceVipLoanRepay } from "./vipLoanRepay.js"

export function registerBinanceVipLoanTradeApiTools(server: McpServer) {
  registerBinanceVipLoanRenew(server)
  registerBinanceVipLoanRepay(server)
  registerBinanceVipLoanBorrow(server)
}
