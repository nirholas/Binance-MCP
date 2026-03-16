/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-margin/isolated-margin-api/disableIsolatedMarginAccount.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { marginClient } from "../../../config/binanceClient.js";

export function registerBinanceDisableIsolatedMarginAccount(server: McpServer) {
  server.registerTool(
    "BinanceDisableIsolatedMarginAccount",
    {
      description:
        "Disable isolated margin account for a specific symbol. All assets must be transferred out first.",
      inputSchema: {
        symbol: z.string().describe("Symbol to disable isolated margin for (e.g., BTCUSDT)"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const response = await marginClient.restAPI.disableIsolatedMarginAccount({
          symbol: params.symbol,
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Isolated margin account disabled for ${params.symbol}: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to disable isolated margin: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
