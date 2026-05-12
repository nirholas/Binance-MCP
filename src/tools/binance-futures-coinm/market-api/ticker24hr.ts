/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-coinm/market-api/ticker24hr.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../../config/binanceClient.js";

export function registerBinanceDelivery24hrTicker(server: McpServer) {
  server.registerTool(
    "BinanceDelivery24hrTicker",
    {
      description: "Get 24hr rolling window price change statistics for COIN-M Futures.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe("Contract symbol (e.g., BTCUSD_PERP). If not provided, returns all symbols"),
        pair: z.string().optional().describe("Filter by underlying pair (e.g., BTCUSD)"),
      },
    },
    async (params) => {
      try {
        const response = await deliveryClient.restAPI.ticker24hr({
          ...(params.symbol && { symbol: params.symbol }),
          ...(params.pair && { pair: params.pair }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📊 24hr Ticker${params.symbol ? ` for ${params.symbol}` : ""}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get 24hr ticker: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
