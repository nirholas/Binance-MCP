/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-crypto-loans/flexible-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceCryptoLoansFlexibleAdjustLTV } from "./adjustLTV.js"
import { registerBinanceCryptoLoansFlexibleBorrow } from "./borrow.js"
import { registerBinanceCryptoLoansFlexibleBorrowHistory } from "./getBorrowHistory.js"
import { registerBinanceCryptoLoansFlexibleCollateral } from "./getFlexibleCollateralAssets.js"
import { registerBinanceCryptoLoansFlexibleAssets } from "./getFlexibleLoanAssets.js"
import { registerBinanceCryptoLoansFlexibleOngoing } from "./getOngoingOrders.js"
import { registerBinanceCryptoLoansFlexibleRepayHistory } from "./getRepayHistory.js"
import { registerBinanceCryptoLoansFlexibleRepay } from "./repay.js"

export function registerBinanceCryptoLoansFlexibleTools(server: McpServer) {
  registerBinanceCryptoLoansFlexibleAssets(server)
  registerBinanceCryptoLoansFlexibleCollateral(server)
  registerBinanceCryptoLoansFlexibleBorrow(server)
  registerBinanceCryptoLoansFlexibleRepay(server)
  registerBinanceCryptoLoansFlexibleAdjustLTV(server)
  registerBinanceCryptoLoansFlexibleOngoing(server)
  registerBinanceCryptoLoansFlexibleBorrowHistory(server)
  registerBinanceCryptoLoansFlexibleRepayHistory(server)
}
