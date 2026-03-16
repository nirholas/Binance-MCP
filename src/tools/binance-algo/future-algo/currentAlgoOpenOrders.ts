// src/tools/binance-algo/future-algo/currentAlgoOpenOrders.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { algoClient } from "../../../config/binanceClient.js";

export function registerBinanceFutureCurrentAlgoOpenOrders(server: McpServer) {
  server.registerTool(
    "BinanceFutureCurrentAlgoOpenOrders",
    {
      description:
        "The Query Current Algo Open Orders API retrieves a list of currently active algorithmic orders for USDⓈ-M Contracts in Binance Futures.",
      inputSchema: {
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const response = await algoClient.restAPI.queryCurrentAlgoOpenOrdersFutureAlgo({
          ...(params.recvWindow !== undefined && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Currently active algorithmic orders. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Failed to Query Current Algo Open Orders: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
