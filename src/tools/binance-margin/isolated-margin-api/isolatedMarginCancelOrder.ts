// src/tools/binance-margin/isolated-margin-api/isolatedMarginCancelOrder.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { marginClient } from "../../../config/binanceClient.js";

export function registerBinanceIsolatedMarginCancelOrder(server: McpServer) {
  server.registerTool(
    "BinanceIsolatedMarginCancelOrder",
    {
      description:
        "Cancel an active isolated margin order. Either orderId or origClientOrderId must be provided.",
      inputSchema: {
        symbol: z.string().describe("Isolated margin symbol (e.g., BTCUSDT)"),
        orderId: z.number().int().optional().describe("Order ID to cancel"),
        origClientOrderId: z.string().optional().describe("Original client order ID to cancel"),
        newClientOrderId: z
          .string()
          .optional()
          .describe("New client order ID for the cancel request"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const data = await marginClient.cancelOrder({
          symbol: params.symbol,
          isIsolated: "TRUE",
          ...(params.orderId && { orderId: params.orderId }),
          ...(params.origClientOrderId && { origClientOrderId: params.origClientOrderId }),
          ...(params.newClientOrderId && { newClientOrderId: params.newClientOrderId }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Isolated margin order cancelled successfully: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to cancel isolated margin order: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
