// src/server/base.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerBinance } from "../binance.js";
import { IS_TESTNET } from "../config/testnet.js";
import Logger from "../utils/logger.js";

export const startServer = () => {
  try {
    const name = IS_TESTNET ? "binance-mcp (TESTNET)" : "binance-mcp";
    const description = IS_TESTNET
      ? "MCP server for Binance Spot Test Network — only /api endpoints (spot trading & market data) are available"
      : "MCP server for Binance exchange - spot trading, staking, wallet, NFT, pay, mining, and more";

    const server = new McpServer({
      name,
      version: "1.0.0",
      description,
    });

    registerBinance(server);

    return server;
  } catch (error) {
    Logger.error("Failed to initialize server:", error);
    process.exit(1);
  }
};
