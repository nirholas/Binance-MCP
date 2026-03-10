/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-crypto-loans/fixed-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceCryptoLoansFixedAdjustLTV } from "./adjustLTV.js"
import { registerBinanceCryptoLoansFixedBorrow } from "./borrow.js"
import { registerBinanceCryptoLoansFixedCollateralRate } from "./checkCollateralRate.js"
import { registerBinanceCryptoLoansFixedMarginCall } from "./customizeMarginCall.js"
import { registerBinanceCryptoLoansFixedBorrowHistory } from "./getBorrowHistory.js"
import { registerBinanceCryptoLoansFixedCollateral } from "./getFixedCollateralData.js"
import { registerBinanceCryptoLoansFixedAssets } from "./getFixedLoanData.js"
import { registerBinanceCryptoLoansFixedOngoing } from "./getOngoingOrders.js"
import { registerBinanceCryptoLoansFixedRepayHistory } from "./getRepayHistory.js"
import { registerBinanceCryptoLoansFixedRepay } from "./repay.js"

export function registerBinanceCryptoLoansFixedTools(server: McpServer) {
  registerBinanceCryptoLoansFixedAssets(server)
  registerBinanceCryptoLoansFixedCollateral(server)
  registerBinanceCryptoLoansFixedCollateralRate(server)
  registerBinanceCryptoLoansFixedMarginCall(server)
  registerBinanceCryptoLoansFixedBorrow(server)
  registerBinanceCryptoLoansFixedRepay(server)
  registerBinanceCryptoLoansFixedAdjustLTV(server)
  registerBinanceCryptoLoansFixedOngoing(server)
  registerBinanceCryptoLoansFixedBorrowHistory(server)
  registerBinanceCryptoLoansFixedRepayHistory(server)
}
