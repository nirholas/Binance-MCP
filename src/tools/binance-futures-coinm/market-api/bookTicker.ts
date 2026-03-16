/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-coinm/market-api/bookTicker.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../../config/binanceClient.js";

export function registerBinanceDeliveryTickerBookTicker(server: McpServer) {
  server.registerTool(
    "BinanceDeliveryTickerBookTicker",
    {
      description: "Get best bid/ask price and quantity for COIN-M Futures symbol(s).",
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
        const response = await deliveryClient.restAPI.tickerBookTicker({
          ...(params.symbol && { symbol: params.symbol }),
          ...(params.pair && { pair: params.pair }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📖 Book Ticker${params.symbol ? ` for ${params.symbol}` : ""}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get book ticker: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
