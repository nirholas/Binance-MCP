/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-auto-invest/getIndexInfo.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { autoInvestClient } from "../../config/binanceClient.js";

export function registerBinanceAutoInvestGetIndexInfo(server: McpServer) {
  server.registerTool(
    "BinanceAutoInvestGetIndexInfo",
    {
      description:
        "Get information about auto-invest index portfolios. Index portfolios are pre-built diversified portfolios.",
      inputSchema: {
        indexId: z.number().int().optional().describe("Specific index ID to query"),
        recvWindow: z.number().int().optional().describe("Recv window in milliseconds"),
      },
    },
    async (params) => {
      try {
        const response = await (autoInvestClient as any).restAPI.getIndexInfo({
          ...(params.indexId && { indexId: params.indexId }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });
        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Index portfolio info:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to get index info: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
