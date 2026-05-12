// src/tools/binance-dual-investment/trade-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBinanceChangeAutoCompoundStatus } from "./changeAutoCompoundStatus.js";
import { registerBinanceCheckDualInvestmentAccounts } from "./checkDualInvestmentAccounts.js";
import { registerBinanceGetDualInvestmentPositions } from "./getDualInvestmentPositions.js";
import { registerBinanceSubscribeDualInvestmentProducts } from "./subscribeDualInvestmentProducts.js";

export function registerBinanceDualInvestmentTradeApiTools(server: McpServer) {
  registerBinanceSubscribeDualInvestmentProducts(server);
  registerBinanceCheckDualInvestmentAccounts(server);
  registerBinanceGetDualInvestmentPositions(server);
  registerBinanceChangeAutoCompoundStatus(server);
}
