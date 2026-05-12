/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-gift-card/tokenLimit.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { giftCardClient } from "../../config/binanceClient.js";

export function registerBinanceGiftCardTokenLimit(server: McpServer) {
  server.registerTool(
    "BinanceGiftCardTokenLimit",
    {
      description:
        "Get token limit information for Binance Gift Card creation. Shows minimum and maximum amounts.",
      inputSchema: {
        baseToken: z.string().describe("Base token for buying gift cards (e.g., 'USDT')"),
        recvWindow: z.number().int().optional().describe("Request validity window in ms"),
      },
    },
    async (params) => {
      try {
        const response = await giftCardClient.restAPI.tokenLimit({
          baseToken: params.baseToken,
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📊 Gift Card Token Limits for ${params.baseToken}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get token limits: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
