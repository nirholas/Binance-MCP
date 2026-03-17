// src/tools/binance-copy-trading/FutureCopyTrading-api/getFuturesLeadTraderStatus.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { copyTradingClient } from "../../../config/binanceClient.js";

export function registerBinanceGetFuturesLeadTraderStatus(server: McpServer) {
  server.registerTool(
    "BinanceGetFuturesLeadTraderStatus",
    {
      description:
        "Checks and returns whether the user is currently a Futures Lead Trader in Binance Copy Trading, along with the timestamp of the status check.",
      inputSchema: {
        recvWindow: z
          .number()
          .int()
          .optional()
          .describe("Optional time window for request validity"),
      },
    },
    async (params) => {
      try {
        const response = await (copyTradingClient as any).restAPI.getFuturesLeadTraderStatus({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Successfully retrieved user futures trading details. Response: ${JSON.stringify(
                data,
              )}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `Failed to Check and return whether the user is currently a Futures Lead Trader in Binance Copy Trading: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
