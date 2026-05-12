/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/copy-trading/FutureCopyTrading-api/getCopyPositions.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { copyTradingClient } from "../../../config/binanceClient.js";

export function registerBinanceCopyTradingGetCopyPositions(server: McpServer) {
  server.registerTool(
    "BinanceCopyTradingGetCopyPositions",
    {
      description:
        "Get your current positions from copy trading. Shows all open positions created by following lead traders.",
      inputSchema: {
        recvWindow: z.number().int().optional().describe("Request validity window in ms"),
      },
    },
    async (params) => {
      try {
        const response = await (copyTradingClient as any).restAPI.getCopyPositions({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📈 Your Copy Trading Positions\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get copy positions: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
