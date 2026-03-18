#!/usr/bin/env node
import "dotenv/config";

// If Binance API is IP-restricted, ensure requests bypass any proxy (HTTP_PROXY/HTTPS_PROXY)
// so Binance sees your real IP. See README "Troubleshooting: Invalid API-key, IP, or permissions".
if (!process.env.NO_PROXY?.includes("binance.com")) {
  const binanceNoProxy = "api.binance.com,api1.binance.com,api2.binance.com,api3.binance.com";
  process.env.NO_PROXY = process.env.NO_PROXY
    ? `${process.env.NO_PROXY},${binanceNoProxy}`
    : binanceNoProxy;
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Server } from "http";

import { logTestnetStatus } from "./config/testnet.js";
import { startSSEServer } from "./server/sse.js";
import { startStdioServer } from "./server/stdio.js";
import Logger from "./utils/logger.js";

const args = process.argv.slice(2);

// Transport mode flags
const sseMode = args.includes("--sse") || args.includes("-s");

function printUsage() {
  console.log(`
Binance MCP Server

Usage: binance-mcp [options]

Options:
  --stdio, (default)  Run in stdio mode (for Claude Desktop)
  --sse, -s           Run in SSE mode (HTTP)

Environment Variables:
  PORT                Server port for SSE mode (default: 3002)
  BINANCE_API_KEY     Binance API key
  BINANCE_API_SECRET  Binance API secret
  BINANCE_TESTNET     Set to "true" to use Binance Spot Test Network
  LOG_LEVEL           Logging level (DEBUG, INFO, WARN, ERROR)

Examples:
  # Claude Desktop (stdio)
  binance-mcp

  # SSE mode
  binance-mcp --sse
`);
}

async function main() {
  if (args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  logTestnetStatus();

  let handle: McpServer | Server | undefined;

  if (sseMode) {
    Logger.info("Starting in SSE mode");
    handle = await startSSEServer();
  } else {
    handle = await startStdioServer();
  }

  if (!handle) {
    Logger.error("Failed to start server");
    process.exit(1);
  }

  const server = handle;

  const handleShutdown = async () => {
    if ("close" in server && typeof server.close === "function") {
      await server.close();
    }
    process.exit(0);
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

main();
