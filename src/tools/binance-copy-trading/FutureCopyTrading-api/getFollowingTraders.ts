// src/tools/binance-copy-trading/FutureCopyTrading-api/getFollowingTraders.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { copyTradingClient } from "../../../config/binanceClient.js";

export function registerBinanceCopyTradingGetFollowing(server: McpServer) {
  server.registerTool(
    "BinanceCopyTradingGetFollowing",
    {
      description: "Get list of traders you are currently following in copy trading.",
      inputSchema: {
        recvWindow: z.number().int().optional().describe("Time window for request validity in ms"),
      },
    },
    async (params) => {
      try {
        const response = await (copyTradingClient as any).restAPI.getFollowingTraders({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Traders You're Following:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get following traders: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
