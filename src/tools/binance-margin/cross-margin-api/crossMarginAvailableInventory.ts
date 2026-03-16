// src/tools/binance-margin/cross-margin-api/crossMarginAvailableInventory.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { marginClient } from "../../../config/binanceClient.js";

export function registerBinanceCrossMarginAvailableInventory(server: McpServer) {
  server.registerTool(
    "BinanceCrossMarginAvailableInventory",
    {
      description: "Query margin available inventory for borrowing.",
      inputSchema: {
        type: z
          .enum(["MARGIN", "ISOLATED"])
          .describe("Type of margin (MARGIN for cross, ISOLATED for isolated)"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const data = await marginClient.getAvailableInventory({
          type: params.type,
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        return {
          content: [
            {
              type: "text",
              text: `Margin Available Inventory: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to query available inventory: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
