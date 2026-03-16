/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-coinm/trade-api/openOrders.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../../config/binanceClient.js";

export function registerBinanceDeliveryOpenOrders(server: McpServer) {
  server.registerTool(
    "BinanceDeliveryOpenOrders",
    {
      description: "Get all current open COIN-M Futures orders.",
      inputSchema: {
        symbol: z.string().optional().describe("Contract symbol filter"),
        pair: z.string().optional().describe("Filter by underlying pair"),
        recvWindow: z.number().int().optional().describe("Recv window in milliseconds"),
      },
    },
    async (params) => {
      try {
        const response = await deliveryClient.restAPI.currentAllOpenOrders({
          ...(params.symbol && { symbol: params.symbol }),
          ...(params.pair && { pair: params.pair }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📋 Open Orders\n\nCount: ${Array.isArray(data) ? data.length : 0}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get open orders: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
