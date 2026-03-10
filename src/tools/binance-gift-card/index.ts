// src/tools/binance-gift-card/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerBinanceGiftCardBuyCode } from "./buyCode.js"
import { registerBinanceGiftCardCreateCode } from "./createCode.js"
import { registerBinanceGiftCardCreateDualTokenCode } from "./createDualTokenCode.js"
import { registerBinanceGiftCardGetTokenLimit } from "./getTokenLimit.js"
import { registerBinanceGiftCardRedeemCode } from "./redeemCode.js"
import { registerBinanceGiftCardRsaPublicKey } from "./rsaPublicKey.js"
import { registerBinanceGiftCardVerify } from "./verify.js"

export function registerBinanceGiftCardTools(server: McpServer) {
  // Create Gift Cards
  registerBinanceGiftCardCreateCode(server)
  registerBinanceGiftCardCreateDualTokenCode(server)
  registerBinanceGiftCardBuyCode(server)

  // Redeem & Verify
  registerBinanceGiftCardRedeemCode(server)
  registerBinanceGiftCardVerify(server)

  // Utilities
  registerBinanceGiftCardRsaPublicKey(server)
  registerBinanceGiftCardGetTokenLimit(server)
}
