// src/tools/binance-spot/trade-api/deleteOpenOrders.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { spotClient } from "../../../config/binanceClient.js";

export function registerBinanceDeleteOpenOrders(server: McpServer) {
  server.registerTool(
    "BinanceDeleteOpenOrders",
    {
      description: "Cancel all open orders on Binance for a specific symbol.",
      inputSchema: {
        symbol: z.string().describe("Symbol of the trading pair (e.g., BTCUSDT)"),
      },
    },
    async ({ symbol }) => {
      try {
        const response = await (spotClient as any).restAPI.deleteOpenOrders({
          symbol: symbol,
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Successfully canceled all open orders for ${symbol}. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to cancel open orders: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
