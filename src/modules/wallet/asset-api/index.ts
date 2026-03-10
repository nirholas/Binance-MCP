// src/tools/binance-wallet/asset-api/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceWalletAssetDetail } from "./assetDetail.js"
import { registerBinanceWalletAssetDividendRecord } from "./assetDividendRecord.js"
import { registerBinanceWalletDustlog } from "./dustlog.js"
import { registerBinanceWalletDustTransfer } from "./dustTransfer.js"
import { registerBinanceWalletFundingWallet } from "./fundingWallet.js"
import { registerBinanceWalletGetAssetsThatCanBeConvertedIntoBnb } from "./getAssetsThatCanBeConvertedIntoBnb.js"
import { registerBinanceWalletGetCloudMiningPaymentAndRefundHistory } from "./getCloudMiningPaymentAndRefundHistory.js"
import { registerBinanceWalletGetOpenSymbolList } from "./getOpenSymbolList.js"
import { registerBinanceWalletQueryUserDelegationHistory } from "./queryUserDelegationHistory.js"
import { registerBinanceWalletQueryUserUniversalTransferHistory } from "./queryUserUniversalTransferHistory.js"
import { registerBinanceWalletQueryUserWalletBalance } from "./queryUserWalletBalance.js"
import { registerBinanceWalletToggleBnbBurnOnSpotTradeAndMarginInterest } from "./toggleBnbBurnOnSpotTradeAndMarginInterest.js"
import { registerBinanceWalletTradeFee } from "./tradeFee.js"
import { registerBinanceWalletUserAsset } from "./userAsset.js"
import { registerBinanceWalletUserUniversalTransfer } from "./userUniversalTransfer.js"

export function registerBinanceWalletAssetApiTools(server: McpServer) {
  registerBinanceWalletUserAsset(server)
  registerBinanceWalletFundingWallet(server)
  registerBinanceWalletAssetDetail(server)
  registerBinanceWalletTradeFee(server)
  registerBinanceWalletUserUniversalTransfer(server)
  registerBinanceWalletQueryUserUniversalTransferHistory(server)
  registerBinanceWalletDustTransfer(server)
  registerBinanceWalletDustlog(server)
  registerBinanceWalletAssetDividendRecord(server)
  registerBinanceWalletGetAssetsThatCanBeConvertedIntoBnb(server)
  registerBinanceWalletToggleBnbBurnOnSpotTradeAndMarginInterest(server)
  registerBinanceWalletGetCloudMiningPaymentAndRefundHistory(server)
  registerBinanceWalletQueryUserDelegationHistory(server)
  registerBinanceWalletGetOpenSymbolList(server)
  registerBinanceWalletQueryUserWalletBalance(server)
}
