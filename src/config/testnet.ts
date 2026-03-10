// src/config/testnet.ts
// Binance Testnet configuration
// Reference: https://testnet.binance.vision

import Logger from "../utils/logger.js"

export const IS_TESTNET = process.env.BINANCE_TESTNET === "true"

// Spot Testnet — only /api endpoints are supported (NOT /sapi)
const TESTNET_SPOT_BASE_URL = "https://testnet.binance.vision"
const TESTNET_SPOT_WS_API_URL = "wss://ws-api.testnet.binance.vision/ws-api/v3"
const TESTNET_SPOT_WS_STREAM_URL = "wss://stream.testnet.binance.vision"

// Futures Testnet — both USD-M (/fapi) and COIN-M (/dapi) share the same host
const TESTNET_FUTURES_BASE_URL = "https://testnet.binancefuture.com"

// Production URLs
const PROD_SPOT_BASE_URL = "https://api.binance.com"
const PROD_SPOT_WS_API_URL = "wss://ws-api.binance.com/ws-api/v3"
const PROD_SPOT_WS_STREAM_URL = "wss://stream.binance.com"
const PROD_FUTURES_USD_BASE_URL = "https://fapi.binance.com"
const PROD_FUTURES_COIN_BASE_URL = "https://dapi.binance.com"
const PROD_OPTIONS_BASE_URL = "https://eapi.binance.com"

export const URLS = {
  SPOT_BASE_URL: IS_TESTNET ? TESTNET_SPOT_BASE_URL : PROD_SPOT_BASE_URL,
  SPOT_WS_API_URL: IS_TESTNET ? TESTNET_SPOT_WS_API_URL : PROD_SPOT_WS_API_URL,
  SPOT_WS_STREAM_URL: IS_TESTNET ? TESTNET_SPOT_WS_STREAM_URL : PROD_SPOT_WS_STREAM_URL,
  FUTURES_USD_BASE_URL: IS_TESTNET ? TESTNET_FUTURES_BASE_URL : PROD_FUTURES_USD_BASE_URL,
  FUTURES_COIN_BASE_URL: IS_TESTNET ? TESTNET_FUTURES_BASE_URL : PROD_FUTURES_COIN_BASE_URL,
  // No testnet for options — always production
  OPTIONS_BASE_URL: PROD_OPTIONS_BASE_URL,
} as const

/**
 * Endpoints using /sapi are NOT available on the Spot Test Network.
 * This list of modules rely on /sapi and will not work in testnet mode.
 */
export const SAPI_ONLY_MODULES = [
  "Algo Trading",
  "Auto-Invest",
  "C2C (P2P)",
  "Convert",
  "Copy Trading",
  "Crypto Loans",
  "Dual Investment",
  "Fiat",
  "Gift Card",
  "Margin",
  "Mining",
  "NFT",
  "Pay",
  "Portfolio Margin",
  "Rebate",
  "Simple Earn",
  "Staking",
  "Sub-Account",
  "VIP Loan",
  "Wallet",
] as const

/**
 * Throws a descriptive error when a /sapi endpoint is called in testnet mode.
 */
export function assertNotTestnet(moduleName: string): void {
  if (IS_TESTNET) {
    throw new Error(
      `[Testnet] ${moduleName} is not available on the Binance Spot Test Network. ` +
        `Only /api endpoints are supported. See https://testnet.binance.vision`,
    )
  }
}

/**
 * Log testnet status on startup.
 */
export function logTestnetStatus(): void {
  if (IS_TESTNET) {
    Logger.info("=== BINANCE TESTNET MODE ===")
    Logger.info(`Spot REST API:     ${URLS.SPOT_BASE_URL}`)
    Logger.info(`Spot WS API:       ${URLS.SPOT_WS_API_URL}`)
    Logger.info(`Spot WS Stream:    ${URLS.SPOT_WS_STREAM_URL}`)
    Logger.info(`Futures USD-M:     ${URLS.FUTURES_USD_BASE_URL}`)
    Logger.info(`Futures COIN-M:    ${URLS.FUTURES_COIN_BASE_URL}`)
    Logger.info(`Options:           ${URLS.OPTIONS_BASE_URL} (no testnet available)`)
    Logger.warn(
      `The following modules use /sapi and are NOT available on testnet: ${SAPI_ONLY_MODULES.join(", ")}`,
    )
  }
}
