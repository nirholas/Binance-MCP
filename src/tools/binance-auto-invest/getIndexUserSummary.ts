/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-auto-invest/getIndexUserSummary.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { autoInvestClient } from "../../config/binanceClient.js";

export function registerBinanceAutoInvestGetIndexUserSummary(server: McpServer) {
  server.registerTool(
    "BinanceAutoInvestGetIndexUserSummary",
    {
      description:
        "Get user's index-linked plan summary including total invested and current value.",
      inputSchema: {
        indexId: z.number().int().describe("Index ID to query"),
        recvWindow: z.number().int().optional().describe("Recv window in milliseconds"),
      },
    },
    async (params) => {
      try {
        const response = await (autoInvestClient as any).restAPI.getIndexUserSummary({
          indexId: params.indexId,
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });
        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Index user summary for index ${params.indexId}:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to get index user summary: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
