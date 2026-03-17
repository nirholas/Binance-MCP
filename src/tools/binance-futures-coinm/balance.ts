// src/tools/binance-futures-coinm/balance.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../config/binanceClient.js";

export function registerBinanceFuturesCOINMBalance(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMBalance",
    {
      description: "Get COIN-M futures account balance.",
      inputSchema: {
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const data = await deliveryClient.balance({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        return {
          content: [{ type: "text", text: `COIN-M balance: ${JSON.stringify(data)}` }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to get COIN-M balance: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
