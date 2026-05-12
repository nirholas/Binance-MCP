// src/tools/binance-margin/isolated-margin-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBinanceGetBnbBurnStatus } from "./getBnbBurnStatus.js";
import { registerBinanceIsolatedMarginAccount } from "./isolatedMarginAccount.js";
import { registerBinanceIsolatedMarginAccountLimit } from "./isolatedMarginAccountLimit.js";
import { registerBinanceIsolatedMarginAllOrders } from "./isolatedMarginAllOrders.js";
import { registerBinanceIsolatedMarginAllPairs } from "./isolatedMarginAllPairs.js";
import { registerBinanceIsolatedMarginCancelOrder } from "./isolatedMarginCancelOrder.js";
import { registerBinanceIsolatedMarginFee } from "./isolatedMarginFee.js";
import { registerBinanceIsolatedMarginMyTrades } from "./isolatedMarginMyTrades.js";
import { registerBinanceIsolatedMarginNewOrder } from "./isolatedMarginNewOrder.js";
import { registerBinanceIsolatedMarginOpenOrders } from "./isolatedMarginOpenOrders.js";
import { registerBinanceIsolatedMarginPair } from "./isolatedMarginPair.js";
import { registerBinanceIsolatedMarginTierData } from "./isolatedMarginTierData.js";
import { registerBinanceIsolatedMarginTransfer } from "./isolatedMarginTransfer.js";
import { registerBinanceToggleBnbBurn } from "./toggleBnbBurn.js";

export function registerBinanceIsolatedMarginTools(server: McpServer) {
  // Transfer
  registerBinanceIsolatedMarginTransfer(server);

  // Account Info
  registerBinanceIsolatedMarginAccount(server);
  registerBinanceIsolatedMarginAccountLimit(server);

  // Pairs & Info
  registerBinanceIsolatedMarginPair(server);
  registerBinanceIsolatedMarginAllPairs(server);
  registerBinanceIsolatedMarginTierData(server);
  registerBinanceIsolatedMarginFee(server);

  // Trading
  registerBinanceIsolatedMarginNewOrder(server);
  registerBinanceIsolatedMarginCancelOrder(server);
  registerBinanceIsolatedMarginOpenOrders(server);
  registerBinanceIsolatedMarginAllOrders(server);
  registerBinanceIsolatedMarginMyTrades(server);

  // BNB Burn
  registerBinanceToggleBnbBurn(server);
  registerBinanceGetBnbBurnStatus(server);
}
