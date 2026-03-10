/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/crypto-loans/flexible/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerFlexibleLoanAdjustLTV } from "./adjustLTV.js"
import { registerFlexibleLoanBorrow } from "./borrow.js"
import { registerFlexibleLoanBorrowHistory } from "./getBorrowHistory.js"
import { registerFlexibleCollateralAssets } from "./getFlexibleCollateralAssets.js"
import { registerFlexibleLoanAssets } from "./getFlexibleLoanAssets.js"
import { registerFlexibleLoanOngoingOrders } from "./getOngoingOrders.js"
import { registerFlexibleLoanRepayHistory } from "./getRepayHistory.js"
import { registerFlexibleLoanRepay } from "./repay.js"

export function registerCryptoLoansFlexibleTools(server: McpServer) {
  registerFlexibleLoanAssets(server)
  registerFlexibleCollateralAssets(server)
  registerFlexibleLoanBorrow(server)
  registerFlexibleLoanRepay(server)
  registerFlexibleLoanAdjustLTV(server)
  registerFlexibleLoanOngoingOrders(server)
  registerFlexibleLoanBorrowHistory(server)
  registerFlexibleLoanRepayHistory(server)
}
