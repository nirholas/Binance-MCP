import crypto from "crypto";

import { Algo } from "@binance/algo";
import { AutoInvest } from "@binance/auto-invest";
import { C2C } from "@binance/c2c";
import { Spot as ConnectorSpot } from "@binance/connector-typescript";
import { Convert } from "@binance/convert";
import { CopyTrading } from "@binance/copy-trading";
import { CryptoLoan } from "@binance/crypto-loan";
import { DualInvestment } from "@binance/dual-investment";
import { Fiat } from "@binance/fiat";
import { Mining } from "@binance/mining";
import { NFT } from "@binance/nft";
import { Pay } from "@binance/pay";
import { Rebate } from "@binance/rebate";
import { SimpleEarn } from "@binance/simple-earn";
// src/config/binanceClient.ts
import { Spot } from "@binance/spot";
import { Staking } from "@binance/staking";
import { SubAccount } from "@binance/sub-account";
import { VIPLoan } from "@binance/vip-loan";
import { Wallet } from "@binance/wallet";

import { assertNotTestnet, IS_TESTNET, URLS } from "./testnet.js";

export { assertNotTestnet, IS_TESTNET };

const API_KEY = process.env.BINANCE_API_KEY ?? "";
const API_SECRET = process.env.BINANCE_API_SECRET ?? "";
const BASE_URL = URLS.SPOT_BASE_URL;

const configurationRestAPI = {
  apiKey: API_KEY,
  apiSecret: API_SECRET,
  basePath: BASE_URL,
};

// Spot Trading
export const spotClient = new Spot({ configurationRestAPI });

// Connector-typescript client (for margin and other APIs)
export const connectorClient = new ConnectorSpot(API_KEY, API_SECRET, { baseURL: BASE_URL });

// Algo Trading
export const algoClient = new Algo({ configurationRestAPI });

// Earn & Investment
export const simpleEarnClient = new SimpleEarn({ configurationRestAPI });
export const dualInvestmentClient = new DualInvestment({ configurationRestAPI });
export const stakingClient = new Staking({ configurationRestAPI });
export const autoInvestClient = new AutoInvest({ configurationRestAPI });

// Trading
export const c2cClient = new C2C({ configurationRestAPI });
export const convertClient = new Convert({ configurationRestAPI });
export const copyTradingClient = new CopyTrading({ configurationRestAPI });

// Loans
export const vipLoanClient = new VIPLoan({ configurationRestAPI });
export const cryptoLoanClient = new CryptoLoan({ configurationRestAPI });

// Wallet & Finance
export const walletClient = new Wallet({ configurationRestAPI });
export const fiatClient = new Fiat({ configurationRestAPI });

// Sub-Account Management
export const subAccountClient = new SubAccount({ configurationRestAPI });

// Other
export const nftClient = new NFT({ configurationRestAPI });
export const payClient = new Pay({ configurationRestAPI });
export const rebateClient = new Rebate({ configurationRestAPI });
export const miningClient = new Mining({ configurationRestAPI });

// Generic REST client for APIs without dedicated packages
// (Margin, Futures, Options, Gift Card, Portfolio Margin)
function generateSignature(queryString: string): string {
  return crypto.createHmac("sha256", API_SECRET).update(queryString).digest("hex");
}

async function makeSignedRequest(
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  params: Record<string, any> = {},
): Promise<any> {
  if (IS_TESTNET && endpoint.startsWith("/sapi")) {
    throw new Error(
      `[Testnet] Endpoint ${endpoint} is not available on the Binance Spot Test Network. ` +
        `Only /api endpoints are supported.`,
    );
  }

  const timestamp = Date.now();
  const queryParams = { ...params, timestamp };
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)])),
  ).toString();
  const signature = generateSignature(queryString);
  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Binance API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function makePublicRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  if (IS_TESTNET && endpoint.startsWith("/sapi")) {
    throw new Error(
      `[Testnet] Endpoint ${endpoint} is not available on the Binance Spot Test Network. ` +
        `Only /api endpoints are supported.`,
    );
  }

  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const url = `${BASE_URL}${endpoint}${queryString ? "?" + queryString : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Binance API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// Portfolio Margin uses papi.binance.com for trade/account sub-endpoints
const PAPI_BASE_URL = URLS.PAPI_BASE_URL;

async function makePapiSignedRequest(
  method: "GET" | "POST" | "DELETE" | "PUT",
  endpoint: string,
  params: Record<string, any> = {},
): Promise<any> {
  const timestamp = Date.now();
  const queryParams = { ...params, timestamp };
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)])),
  ).toString();
  const signature = generateSignature(queryString);
  const url = `${PAPI_BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Binance API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

function wrapData<T>(p: Promise<T>): Promise<{ data: () => Promise<T> }> {
  return p.then((data) => ({ data: () => Promise.resolve(data) }));
}

// Portfolio Margin client wrapper (includes restAPI for modules that expect .restAPI.method().then(r => r.data()))
export const portfolioMarginClient = {
  getAccount: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/account", params),
  getCollateralRate: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/collateralRate", params),
  getBankruptcyLoanAmount: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/pmLoan", params),
  repayBankruptcyLoan: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/repay", params),
  getInterestHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/interest-history", params),
  getAssetIndexPrice: (params: Record<string, any> = {}) =>
    makePublicRequest("/sapi/v1/portfolio/asset-index-price", params),
  fundAutoCollection: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/auto-collection", params),
  fundCollection: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/asset-collection", params),
  bnbTransfer: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/bnb-transfer", params),
  changeAutoRepayFutures: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/repay-futures-switch", params),
  getAutoRepayFuturesStatus: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/repay-futures-switch", params),
  repayFuturesNegativeBalance: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/portfolio/repay-futures-negative-balance", params),
  getAssetLeverage: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/margin-asset-leverage", params),
  getBalance: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/portfolio/balance", params),
  restAPI: {
    account: (params: Record<string, any> = {}) =>
      wrapData(makeSignedRequest("GET", "/sapi/v1/portfolio/account", params)),
    balance: (params: Record<string, any> = {}) =>
      wrapData(makeSignedRequest("GET", "/sapi/v1/portfolio/balance", params)),
    umAccount: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/account", params)),
    umPositionRisk: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/positionRisk", params)),
    cmAccount: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/account", params)),
    cmPositionRisk: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/positionRisk", params)),
    marginAccount: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/marginAccount", params)),
    marginMaxWithdraw: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/marginMaxWithdraw", params)),
    marginMaxBorrowable: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/marginMaxBorrowable", params)),
    umNewOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/um/order", params)),
    umCancelOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/um/order", params)),
    umOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/order", params)),
    umOpenOrders: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/openOrders", params)),
    umAllOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/allOrders", params)),
    umUserTrades: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/um/userTrades", params)),
    umLeverage: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/um/leverage", params)),
    umMarginType: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/um/marginType", params)),
    umCancelAllOpenOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/um/allOpenOrders", params)),
    cmNewOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/cm/order", params)),
    cmCancelOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/cm/order", params)),
    cmOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/order", params)),
    cmOpenOrders: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/openOrders", params)),
    cmAllOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/allOrders", params)),
    cmUserTrades: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/cm/userTrades", params)),
    cmLeverage: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/cm/leverage", params)),
    cmMarginType: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/cm/marginType", params)),
    cmCancelAllOpenOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/cm/allOpenOrders", params)),
    marginNewOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/margin/order", params)),
    marginCancelOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/margin/order", params)),
    marginOrder: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/margin/order", params)),
    marginOpenOrders: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/margin/openOrders", params)),
    marginAllOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/margin/allOrders", params)),
    marginMyTrades: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("GET", "/papi/v1/margin/myTrades", params)),
    marginLoan: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/margin/loan", params)),
    marginRepay: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("POST", "/papi/v1/margin/repay", params)),
    marginCancelAllOpenOrders: (params: Record<string, any>) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/margin/allOpenOrders", params)),
    createListenKey: () => wrapData(makePapiSignedRequest("POST", "/papi/v1/listenKey", {})),
    deleteListenKey: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("DELETE", "/papi/v1/listenKey", params)),
    renewListenKey: (params: Record<string, any> = {}) =>
      wrapData(makePapiSignedRequest("PUT", "/papi/v1/listenKey", params)),
  },
};

// Gift Card client wrapper
export const giftCardClient = {
  createCode: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/giftcard/createCode", params),
  createDualTokenCode: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/giftcard/buyCode", params),
  redeemCode: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/giftcard/redeemCode", params),
  verify: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/giftcard/verify", params),
  rsaPublicKey: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/giftcard/cryptography/rsa-public-key", params),
  buyCode: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/giftcard/buyCode", params),
  getTokenLimit: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/giftcard/buyCode/token-limit", params),
  restAPI: {
    createCode: (p: Record<string, any> = {}) => wrapData(giftCardClient.createCode(p)),
    createDualTokenCode: (p: Record<string, any> = {}) =>
      wrapData(giftCardClient.createDualTokenCode(p)),
    redeemCode: (p: Record<string, any> = {}) => wrapData(giftCardClient.redeemCode(p)),
    redeemDualTokenCode: (p: Record<string, any> = {}) => wrapData(giftCardClient.redeemCode(p)),
    verify: (p: Record<string, any> = {}) => wrapData(giftCardClient.verify(p)),
    tokenLimit: (p: Record<string, any> = {}) => wrapData(giftCardClient.getTokenLimit(p)),
  },
};

// Margin client wrapper
export const marginClient = {
  borrow: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/loan", params),
  repay: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/repay", params),
  getAccount: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/account", params),
  getMaxBorrowable: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/maxBorrowable", params),
  getMaxTransferable: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/maxTransferable", params),
  transfer: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/transfer", params),
  getAllPairs: (params: Record<string, any> = {}) =>
    makePublicRequest("/sapi/v1/margin/allPairs", params),
  getPriceIndex: (params: Record<string, any> = {}) =>
    makePublicRequest("/sapi/v1/margin/priceIndex", params),
  newOrder: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/order", params),
  cancelOrder: (params: Record<string, any> = {}) =>
    makeSignedRequest("DELETE", "/sapi/v1/margin/order", params),
  getOpenOrders: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/openOrders", params),
  getAllOrders: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/allOrders", params),
  getMyTrades: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/myTrades", params),
  cancelAllOpenOrders: (params: Record<string, any> = {}) =>
    makeSignedRequest("DELETE", "/sapi/v1/margin/openOrders", params),
  getLoanRecord: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/loan", params),
  getRepayRecord: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/repay", params),
  getInterestHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/interestHistory", params),
  getForceLiquidationRecord: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/forceLiquidationRec", params),
  getIsolatedAccount: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/isolated/account", params),
  enableIsolatedAccount: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/isolated/account", params),
  disableIsolatedAccount: (params: Record<string, any> = {}) =>
    makeSignedRequest("DELETE", "/sapi/v1/margin/isolated/account", params),
  getIsolatedMarginPairs: (params: Record<string, any> = {}) =>
    makePublicRequest("/sapi/v1/margin/isolated/allPairs", params),
  getIsolatedMarginTier: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/isolatedMarginTier", params),
  getCrossMarginFee: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/crossMarginData", params),
  getIsolatedMarginFee: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/isolatedMarginData", params),
  getSmallLiabilityExchangeCoinList: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/exchange-small-liability", params),
  smallLiabilityExchange: (params: Record<string, any> = {}) =>
    makeSignedRequest("POST", "/sapi/v1/margin/exchange-small-liability", params),
  getSmallLiabilityExchangeHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/exchange-small-liability-history", params),
  getDustLog: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/dribblet", params),
  getCapitalFlow: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/capital-flow", params),
  getDelistSchedule: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/delist-schedule", params),
  getAvailableInventory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/available-inventory", params),
  getAllAssets: (params: Record<string, any> = {}) =>
    makePublicRequest("/sapi/v1/margin/allAssets", params),
  getInterestRateHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/margin/interestRateHistory", params),
};

const FUTURES_USD_BASE_URL = URLS.FUTURES_USD_BASE_URL;
const FUTURES_COIN_BASE_URL = URLS.FUTURES_COIN_BASE_URL;

async function makeFuturesSignedRequest(
  baseUrl: string,
  method: "GET" | "POST" | "DELETE" | "PUT",
  endpoint: string,
  params: Record<string, any> = {},
): Promise<any> {
  const timestamp = Date.now();
  const queryParams = { ...params, timestamp };
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)])),
  ).toString();
  const signature = generateSignature(queryString);
  const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

  const response = await fetch(url, {
    method,
    headers: {
      "X-MBX-APIKEY": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Binance API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

async function makeFuturesPublicRequest(
  baseUrl: string,
  endpoint: string,
  params: Record<string, any> = {},
): Promise<any> {
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const url = `${baseUrl}${endpoint}${queryString ? "?" + queryString : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Binance API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// Futures USD-M client wrapper
export const futuresClient = {
  // Market Data
  ping: () => makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/ping"),
  time: () => makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/time"),
  exchangeInfo: () => makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/exchangeInfo"),
  depth: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/depth", params),
  trades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/trades", params),
  historicalTrades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/historicalTrades", params),
  aggTrades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/aggTrades", params),
  klines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/klines", params),
  continuousKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/continuousKlines", params),
  indexPriceKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/indexPriceKlines", params),
  markPriceKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/markPriceKlines", params),
  premiumIndex: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/premiumIndex", params),
  fundingRate: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/fundingRate", params),
  ticker24hr: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/ticker/24hr", params),
  tickerPrice: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/ticker/price", params),
  bookTicker: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/ticker/bookTicker", params),
  openInterest: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/openInterest", params),
  // Account/Trade
  newOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/order", params),
  modifyOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "PUT", "/fapi/v1/order", params),
  batchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/batchOrders", params),
  getOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/order", params),
  cancelOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "DELETE", "/fapi/v1/order", params),
  cancelAllOpenOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "DELETE", "/fapi/v1/allOpenOrders", params),
  cancelBatchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "DELETE", "/fapi/v1/batchOrders", params),
  openOrders: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/openOrders", params),
  allOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/allOrders", params),
  balance: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v2/balance", params),
  account: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v2/account", params),
  leverage: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/leverage", params),
  marginType: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/marginType", params),
  positionMargin: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/positionMargin", params),
  positionRisk: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v2/positionRisk", params),
  userTrades: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/userTrades", params),
  income: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/income", params),
  commissionRate: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/commissionRate", params),
  adlQuantile: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/adlQuantile", params),
  forceOrders: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/forceOrders", params),
  positionMode: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/positionSide/dual", params),
  changePositionMode: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/positionSide/dual", params),
  multiAssetsMargin: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/multiAssetsMargin", params),
  // User Data Stream
  createListenKey: () =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/listenKey", {}),
  keepAliveListenKey: () =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "PUT", "/fapi/v1/listenKey", {}),
  closeListenKey: () =>
    makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "DELETE", "/fapi/v1/listenKey", {}),
  restAPI: {
    account: (p: Record<string, any> = {}) => wrapData(futuresClient.account(p)),
    balance: (p: Record<string, any> = {}) => wrapData(futuresClient.balance(p)),
    positionRisk: (p: Record<string, any> = {}) => wrapData(futuresClient.positionRisk(p)),
    ping: () => wrapData(futuresClient.ping()),
    time: () => wrapData(futuresClient.time()),
    exchangeInfo: () => wrapData(futuresClient.exchangeInfo()),
    depth: (p: Record<string, any>) => wrapData(futuresClient.depth(p)),
    trades: (p: Record<string, any>) => wrapData(futuresClient.trades(p)),
    historicalTrades: (p: Record<string, any>) => wrapData(futuresClient.historicalTrades(p)),
    aggTrades: (p: Record<string, any>) => wrapData(futuresClient.aggTrades(p)),
    klines: (p: Record<string, any>) => wrapData(futuresClient.klines(p)),
    continuousKlines: (p: Record<string, any>) => wrapData(futuresClient.continuousKlines(p)),
    indexPriceKlines: (p: Record<string, any>) => wrapData(futuresClient.indexPriceKlines(p)),
    markPriceKlines: (p: Record<string, any>) => wrapData(futuresClient.markPriceKlines(p)),
    premiumIndex: (p: Record<string, any> = {}) => wrapData(futuresClient.premiumIndex(p)),
    fundingRate: (p: Record<string, any>) => wrapData(futuresClient.fundingRate(p)),
    ticker24hr: (p: Record<string, any> = {}) => wrapData(futuresClient.ticker24hr(p)),
    tickerPrice: (p: Record<string, any>) => wrapData(futuresClient.tickerPrice(p)),
    bookTicker: (p: Record<string, any> = {}) => wrapData(futuresClient.bookTicker(p)),
    openInterest: (p: Record<string, any>) => wrapData(futuresClient.openInterest(p)),
    newOrder: (p: Record<string, any>) => wrapData(futuresClient.newOrder(p)),
    modifyOrder: (p: Record<string, any>) => wrapData(futuresClient.modifyOrder(p)),
    getOrder: (p: Record<string, any>) => wrapData(futuresClient.getOrder(p)),
    queryOrder: (p: Record<string, any>) => wrapData(futuresClient.getOrder(p)),
    cancelOrder: (p: Record<string, any>) => wrapData(futuresClient.cancelOrder(p)),
    cancelAllOpenOrders: (p: Record<string, any> = {}) =>
      wrapData(futuresClient.cancelAllOpenOrders(p)),
    cancelBatchOrders: (p: Record<string, any>) => wrapData(futuresClient.cancelBatchOrders(p)),
    openOrders: (p: Record<string, any> = {}) => wrapData(futuresClient.openOrders(p)),
    allOrders: (p: Record<string, any>) => wrapData(futuresClient.allOrders(p)),
    userTrades: (p: Record<string, any>) => wrapData(futuresClient.userTrades(p)),
    income: (p: Record<string, any> = {}) => wrapData(futuresClient.income(p)),
    commissionRate: (p: Record<string, any>) => wrapData(futuresClient.commissionRate(p)),
    adlQuantile: (p: Record<string, any> = {}) => wrapData(futuresClient.adlQuantile(p)),
    forceOrders: (p: Record<string, any>) => wrapData(futuresClient.forceOrders(p)),
    positionMode: (p: Record<string, any> = {}) => wrapData(futuresClient.positionMode(p)),
    getPositionMode: (p: Record<string, any> = {}) => wrapData(futuresClient.positionMode(p)),
    changePositionMode: (p: Record<string, any>) => wrapData(futuresClient.changePositionMode(p)),
    leverage: (p: Record<string, any>) => wrapData(futuresClient.leverage(p)),
    changeInitialLeverage: (p: Record<string, any>) => wrapData(futuresClient.leverage(p)),
    marginType: (p: Record<string, any>) => wrapData(futuresClient.marginType(p)),
    changeMarginType: (p: Record<string, any>) => wrapData(futuresClient.marginType(p)),
    positionMargin: (p: Record<string, any>) => wrapData(futuresClient.positionMargin(p)),
    modifyIsolatedPositionMargin: (p: Record<string, any>) =>
      wrapData(futuresClient.positionMargin(p)),
    currentAllOpenOrders: (p: Record<string, any> = {}) => wrapData(futuresClient.openOrders(p)),
    createListenKey: () => wrapData(futuresClient.createListenKey()),
    keepAliveListenKey: () => wrapData(futuresClient.keepAliveListenKey()),
    closeListenKey: () => wrapData(futuresClient.closeListenKey()),
    fundingInfo: () =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/fundingRate", {})),
    assetIndex: (p: Record<string, any> = {}) =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/assetIndex", p)),
    // Aliases / additional endpoints for tool compatibility
    apiTradingStatus: (p: Record<string, any> = {}) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/apiTradingStatus", p),
      ),
    downloadIdForFuturesTransactionHistory: (p: Record<string, any> = {}) =>
      wrapData(makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/income/asyn", p)),
    leverageBracket: (p: Record<string, any> = {}) =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/leverageBracket", p)),
    getMultiAssetsMode: (p: Record<string, any> = {}) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/multiAssetsMargin", p),
      ),
    getPositionMarginChangeHistory: (p: Record<string, any> = {}) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/positionMargin/history", p),
      ),
    getPositionMarginHistory: (p: Record<string, any> = {}) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "GET", "/fapi/v1/positionMargin/history", p),
      ),
    globalLongShortAccountRatio: (p: Record<string, any>) =>
      wrapData(
        makeFuturesPublicRequest(
          FUTURES_USD_BASE_URL,
          "/futures/data/globalLongShortAccountRatio",
          p,
        ),
      ),
    indexInfo: (p: Record<string, any> = {}) =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/fapi/v1/indexInfo", p)),
    lvtKlines: (p: Record<string, any>) =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/futures/data/lvtKlines", p)),
    openInterestHist: (p: Record<string, any>) =>
      wrapData(makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/futures/data/openInterestHist", p)),
    takerlongshortRatio: (p: Record<string, any>) =>
      wrapData(
        makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/futures/data/takerlongshortRatio", p),
      ),
    tickerBookTicker: (p: Record<string, any> = {}) => wrapData(futuresClient.bookTicker(p)),
    topLongShortAccountRatio: (p: Record<string, any>) =>
      wrapData(
        makeFuturesPublicRequest(FUTURES_USD_BASE_URL, "/futures/data/topLongShortAccountRatio", p),
      ),
    topLongShortPositionRatio: (p: Record<string, any>) =>
      wrapData(
        makeFuturesPublicRequest(
          FUTURES_USD_BASE_URL,
          "/futures/data/topLongShortPositionRatio",
          p,
        ),
      ),
    placeMultipleOrders: (p: Record<string, any>) => wrapData(futuresClient.batchOrders(p)),
    cancelMultipleOrders: (p: Record<string, any>) => wrapData(futuresClient.cancelBatchOrders(p)),
    changeMultiAssetsMode: (p: Record<string, any>) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/multiAssetsMargin", p),
      ),
    autoCancelAllOpenOrders: (p: Record<string, any>) =>
      wrapData(
        makeFuturesSignedRequest(FUTURES_USD_BASE_URL, "POST", "/fapi/v1/countdownCancelAll", p),
      ),
    queryCurrentOpenOrder: (p: Record<string, any>) => wrapData(futuresClient.getOrder(p)),
    currentOpenOrder: (p: Record<string, any> = {}) => wrapData(futuresClient.openOrders(p)),
    renewListenKey: () => wrapData(futuresClient.keepAliveListenKey()),
  },
};

// Futures COIN-M client wrapper (delivery)
export const deliveryClient = {
  // Market Data
  ping: () => makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/ping"),
  time: () => makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/time"),
  exchangeInfo: () => makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/exchangeInfo"),
  depth: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/depth", params),
  trades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/trades", params),
  historicalTrades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/historicalTrades", params),
  aggTrades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/aggTrades", params),
  klines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/klines", params),
  continuousKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/continuousKlines", params),
  indexPriceKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/indexPriceKlines", params),
  markPriceKlines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/markPriceKlines", params),
  premiumIndex: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/premiumIndex", params),
  fundingRate: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/fundingRate", params),
  ticker24hr: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/ticker/24hr", params),
  tickerPrice: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/ticker/price", params),
  bookTicker: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/ticker/bookTicker", params),
  openInterest: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/openInterest", params),
  openInterestHist: (params: Record<string, any>) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/openInterestHist", params),
  leverageBracket: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(FUTURES_COIN_BASE_URL, "/dapi/v1/leverageBracket", params),
  // Account/Trade
  newOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/order", params),
  batchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/batchOrders", params),
  getOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/order", params),
  cancelOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "DELETE", "/dapi/v1/order", params),
  cancelAllOpenOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "DELETE", "/dapi/v1/allOpenOrders", params),
  cancelBatchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "DELETE", "/dapi/v1/batchOrders", params),
  openOrders: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/openOrders", params),
  allOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/allOrders", params),
  balance: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/balance", params),
  account: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/account", params),
  leverage: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/leverage", params),
  marginType: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/marginType", params),
  positionMargin: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/positionMargin", params),
  positionRisk: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/positionRisk", params),
  userTrades: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/userTrades", params),
  income: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/income", params),
  commissionRate: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/commissionRate", params),
  adlQuantile: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/adlQuantile", params),
  forceOrders: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/forceOrders", params),
  positionMode: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "GET", "/dapi/v1/positionSide/dual", params),
  changePositionMode: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/positionSide/dual", params),
  // User Data Stream
  createListenKey: () =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/listenKey", {}),
  keepAliveListenKey: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "PUT", "/dapi/v1/listenKey", params),
  closeListenKey: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "DELETE", "/dapi/v1/listenKey", params),
  autoCancelAllOpenOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(FUTURES_COIN_BASE_URL, "POST", "/dapi/v1/countdownCancelAll", params),
  restAPI: {
    account: (p: Record<string, any> = {}) => wrapData(deliveryClient.account(p)),
    balance: (p: Record<string, any> = {}) => wrapData(deliveryClient.balance(p)),
    positionRisk: (p: Record<string, any> = {}) => wrapData(deliveryClient.positionRisk(p)),
    ping: () => wrapData(deliveryClient.ping()),
    time: () => wrapData(deliveryClient.time()),
    exchangeInfo: () => wrapData(deliveryClient.exchangeInfo()),
    depth: (p: Record<string, any>) => wrapData(deliveryClient.depth(p)),
    trades: (p: Record<string, any>) => wrapData(deliveryClient.trades(p)),
    historicalTrades: (p: Record<string, any>) => wrapData(deliveryClient.historicalTrades(p)),
    aggTrades: (p: Record<string, any>) => wrapData(deliveryClient.aggTrades(p)),
    klines: (p: Record<string, any>) => wrapData(deliveryClient.klines(p)),
    continuousKlines: (p: Record<string, any>) => wrapData(deliveryClient.continuousKlines(p)),
    indexPriceKlines: (p: Record<string, any>) => wrapData(deliveryClient.indexPriceKlines(p)),
    markPriceKlines: (p: Record<string, any>) => wrapData(deliveryClient.markPriceKlines(p)),
    premiumIndex: (p: Record<string, any> = {}) => wrapData(deliveryClient.premiumIndex(p)),
    fundingRate: (p: Record<string, any>) => wrapData(deliveryClient.fundingRate(p)),
    ticker24hr: (p: Record<string, any> = {}) => wrapData(deliveryClient.ticker24hr(p)),
    tickerPrice: (p: Record<string, any>) => wrapData(deliveryClient.tickerPrice(p)),
    bookTicker: (p: Record<string, any> = {}) => wrapData(deliveryClient.bookTicker(p)),
    tickerBookTicker: (p: Record<string, any> = {}) => wrapData(deliveryClient.bookTicker(p)),
    openInterest: (p: Record<string, any>) => wrapData(deliveryClient.openInterest(p)),
    openInterestHist: (p: Record<string, any>) => wrapData(deliveryClient.openInterestHist(p)),
    leverageBracket: (p: Record<string, any> = {}) => wrapData(deliveryClient.leverageBracket(p)),
    newOrder: (p: Record<string, any>) => wrapData(deliveryClient.newOrder(p)),
    getOrder: (p: Record<string, any>) => wrapData(deliveryClient.getOrder(p)),
    queryOrder: (p: Record<string, any>) => wrapData(deliveryClient.getOrder(p)),
    cancelOrder: (p: Record<string, any>) => wrapData(deliveryClient.cancelOrder(p)),
    cancelAllOpenOrders: (p: Record<string, any> = {}) =>
      wrapData(deliveryClient.cancelAllOpenOrders(p)),
    cancelBatchOrders: (p: Record<string, any>) => wrapData(deliveryClient.cancelBatchOrders(p)),
    cancelMultipleOrders: (p: Record<string, any>) => wrapData(deliveryClient.cancelBatchOrders(p)),
    openOrders: (p: Record<string, any> = {}) => wrapData(deliveryClient.openOrders(p)),
    currentAllOpenOrders: (p: Record<string, any> = {}) => wrapData(deliveryClient.openOrders(p)),
    allOrders: (p: Record<string, any>) => wrapData(deliveryClient.allOrders(p)),
    currentOpenOrder: (p: Record<string, any>) => wrapData(deliveryClient.getOrder(p)),
    userTrades: (p: Record<string, any>) => wrapData(deliveryClient.userTrades(p)),
    income: (p: Record<string, any> = {}) => wrapData(deliveryClient.income(p)),
    commissionRate: (p: Record<string, any>) => wrapData(deliveryClient.commissionRate(p)),
    adlQuantile: (p: Record<string, any> = {}) => wrapData(deliveryClient.adlQuantile(p)),
    forceOrders: (p: Record<string, any>) => wrapData(deliveryClient.forceOrders(p)),
    positionMode: (p: Record<string, any> = {}) => wrapData(deliveryClient.positionMode(p)),
    getPositionMode: (p: Record<string, any> = {}) => wrapData(deliveryClient.positionMode(p)),
    changePositionMode: (p: Record<string, any>) => wrapData(deliveryClient.changePositionMode(p)),
    leverage: (p: Record<string, any>) => wrapData(deliveryClient.leverage(p)),
    changeInitialLeverage: (p: Record<string, any>) => wrapData(deliveryClient.leverage(p)),
    marginType: (p: Record<string, any>) => wrapData(deliveryClient.marginType(p)),
    changeMarginType: (p: Record<string, any>) => wrapData(deliveryClient.marginType(p)),
    positionMargin: (p: Record<string, any>) => wrapData(deliveryClient.positionMargin(p)),
    modifyIsolatedPositionMargin: (p: Record<string, any>) =>
      wrapData(deliveryClient.positionMargin(p)),
    batchOrders: (p: Record<string, any>) => wrapData(deliveryClient.batchOrders(p)),
    placeMultipleOrders: (p: Record<string, any>) => wrapData(deliveryClient.batchOrders(p)),
    autoCancelAllOpenOrders: (p: Record<string, any>) =>
      wrapData(deliveryClient.autoCancelAllOpenOrders(p)),
    createListenKey: () => wrapData(deliveryClient.createListenKey()),
    keepAliveListenKey: () => wrapData(deliveryClient.keepAliveListenKey()),
    renewListenKey: (p: Record<string, any> = {}) => wrapData(deliveryClient.keepAliveListenKey(p)),
    closeListenKey: (p: Record<string, any> = {}) => wrapData(deliveryClient.closeListenKey(p)),
  },
};

// Sub-Account client wrapper (using REST API)
export const subAccountApiClient = {
  createVirtualSubAccount: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/virtualSubAccount", params),
  getSubAccountList: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/list", params),
  getSubAccountSpotSummary: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/spotSummary", params),
  getSubAccountStatus: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/status", params),
  getSubAccountAssets: (params: Record<string, any>) =>
    makeSignedRequest("GET", "/sapi/v3/sub-account/assets", params),
  enableMarginForSubAccount: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/margin/enable", params),
  enableFuturesForSubAccount: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/futures/enable", params),
  getSubAccountMarginSummary: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/margin/accountSummary", params),
  getSubAccountFuturesSummary: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v2/sub-account/futures/accountSummary", params),
  getSubAccountFuturesPositionRisk: (params: Record<string, any>) =>
    makeSignedRequest("GET", "/sapi/v2/sub-account/futures/positionRisk", params),
  transferToSubAccount: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/transfer/subToSub", params),
  transferToMaster: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/transfer/subToMaster", params),
  subAccountUniversalTransfer: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/universalTransfer", params),
  getSubAccountUniversalTransferHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/universalTransfer", params),
  getSubAccountTransferHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/sub/transfer/history", params),
  getSubAccountDepositAddress: (params: Record<string, any>) =>
    makeSignedRequest("GET", "/sapi/v1/capital/deposit/subAddress", params),
  getSubAccountDepositHistory: (params: Record<string, any> = {}) =>
    makeSignedRequest("GET", "/sapi/v1/capital/deposit/subHisrec", params),
  createSubAccountApiKey: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/subAccountApi/ipRestriction", params),
  deleteSubAccountApiKey: (params: Record<string, any>) =>
    makeSignedRequest("DELETE", "/sapi/v1/sub-account/subAccountApi/ipRestriction/ipList", params),
  getSubAccountApiKeyIpRestriction: (params: Record<string, any>) =>
    makeSignedRequest("GET", "/sapi/v1/sub-account/subAccountApi/ipRestriction", params),
  updateSubAccountApiKeyIpRestriction: (params: Record<string, any>) =>
    makeSignedRequest("POST", "/sapi/v1/sub-account/subAccountApi/ipRestriction", params),
};

const OPTIONS_BASE_URL = URLS.OPTIONS_BASE_URL;

export const optionsClient = {
  // Market Data
  ping: () => makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/ping"),
  time: () => makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/time"),
  exchangeInfo: () => makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/exchangeInfo"),
  depth: (params: Record<string, any>) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/depth", params),
  trades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/trades", params),
  klines: (params: Record<string, any>) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/klines", params),
  mark: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/mark", params),
  ticker: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/ticker", params),
  index: (params: Record<string, any>) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/index", params),
  // Account/Trade
  newOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "POST", "/eapi/v1/order", params),
  batchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "POST", "/eapi/v1/batchOrders", params),
  cancelOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "DELETE", "/eapi/v1/order", params),
  cancelBatchOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "DELETE", "/eapi/v1/batchOrders", params),
  cancelAllOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "DELETE", "/eapi/v1/allOpenOrders", params),
  getOrder: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/order", params),
  openOrders: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/openOrders", params),
  historyOrders: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/historyOrders", params),
  position: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/position", params),
  userTrades: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/userTrades", params),
  account: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/account", params),
  exerciseRecord: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/exerciseRecord", params),
  openInterest: (params: Record<string, any> = {}) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/openInterest", params),
  bill: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/bill", params),
  incomeAsyn: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/incomeAsyn", params),
  incomeAsynId: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "GET", "/eapi/v1/incomeAsynId", params),
  historicalTrades: (params: Record<string, any>) =>
    makeFuturesPublicRequest(OPTIONS_BASE_URL, "/eapi/v1/historicalTrades", params),
  cancelAllOpenOrdersByUnderlying: (params: Record<string, any>) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "DELETE", "/eapi/v1/allOpenOrders", params),
  // User Data Stream
  createListenKey: () =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "POST", "/eapi/v1/listenKey", {}),
  keepAliveListenKey: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "PUT", "/eapi/v1/listenKey", params),
  closeListenKey: (params: Record<string, any> = {}) =>
    makeFuturesSignedRequest(OPTIONS_BASE_URL, "DELETE", "/eapi/v1/listenKey", params),
};
