// src/tools/binance-futures-coinm/positionRisk.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../config/binanceClient.js";

export function registerBinanceFuturesCOINMPositionRisk(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMPositionRisk",
    {
      description: "Get COIN-M futures position information.",
      inputSchema: {
        marginAsset: z.string().optional().describe("Margin asset"),
        pair: z.string().optional().describe("Trading pair"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const data = await deliveryClient.getPositionRisk({
          ...(params.marginAsset && { marginAsset: params.marginAsset }),
          ...(params.pair && { pair: params.pair }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        return {
          content: [{ type: "text", text: `COIN-M position risk: ${JSON.stringify(data)}` }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to get COIN-M position risk: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
