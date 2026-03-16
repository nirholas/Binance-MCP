// src/tools/binance-futures-coinm/getOrder.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../config/binanceClient.js";

export function registerBinanceFuturesCOINMGetOrder(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMGetOrder",
    {
      description: "Query a COIN-M futures order.",
      inputSchema: {
        symbol: z.string().describe("Trading symbol"),
        orderId: z.number().int().optional().describe("Order ID"),
        origClientOrderId: z.string().optional().describe("Original client order ID"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const data = await deliveryClient.getOrder({
          symbol: params.symbol,
          ...(params.orderId && { orderId: params.orderId }),
          ...(params.origClientOrderId && { origClientOrderId: params.origClientOrderId }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        return {
          content: [{ type: "text", text: `COIN-M order: ${JSON.stringify(data)}` }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to get COIN-M order: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
