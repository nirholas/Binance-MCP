// src/tools/binance-wallet/capital-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceWalletAllCoinsInformation } from "./allCoinsInformation.js"
import { registerBinanceWalletDepositAddress } from "./depositAddress.js"
import { registerBinanceWalletDepositHistory } from "./depositHistory.js"
import { registerBinanceWalletFetchDepositAddressListWithNetwork } from "./fetchDepositAddressListWithNetwork.js"
import { registerBinanceWalletFetchWithdrawAddressList } from "./fetchWithdrawAddressList.js"
import { registerBinanceWalletOneClickArrivalDepositApply } from "./oneClickArrivalDepositApply.js"
import { registerBinanceWalletWithdraw } from "./withdraw.js"
import { registerBinanceWalletWithdrawHistory } from "./withdrawHistory.js"

export function registerBinanceWalletCapitalApiTools(server: McpServer) {
  registerBinanceWalletAllCoinsInformation(server)
  registerBinanceWalletDepositAddress(server)
  registerBinanceWalletDepositHistory(server)
  registerBinanceWalletWithdrawHistory(server)
  registerBinanceWalletWithdraw(server)
  registerBinanceWalletFetchDepositAddressListWithNetwork(server)
  registerBinanceWalletFetchWithdrawAddressList(server)
  registerBinanceWalletOneClickArrivalDepositApply(server)
}
