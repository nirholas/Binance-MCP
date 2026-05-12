/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/tools/binance-futures-coinm/account-api/balance.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deliveryClient } from "../../../config/binanceClient.js";

export function registerBinanceDeliveryBalance(server: McpServer) {
  server.registerTool(
    "BinanceDeliveryBalance",
    {
      description: "Get current COIN-M Futures account balance.",
      inputSchema: {
        recvWindow: z.number().int().optional().describe("Recv window in milliseconds"),
      },
    },
    async (params) => {
      try {
        const response = await deliveryClient.restAPI.balance({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `💰 COIN-M Futures Balance\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `❌ Failed to get balance: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
