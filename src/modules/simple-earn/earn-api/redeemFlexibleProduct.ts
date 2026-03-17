// src/tools/binance-simple-earn/earn-api/redeemFlexibleProduct.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { simpleEarnClient } from "../../../config/binanceClient.js";

export function registerBinanceRedeemFlexibleProduct(server: McpServer) {
  server.registerTool(
    "BinanceRedeemFlexibleProduct",
    {
      description:
        "Allows users to redeem their funds from a Flexible Earn investment product using a programmatic HTTP POST request.",
      inputSchema: {
        productId: z.string().describe("Product ID"),
        redeemAll: z.boolean().optional().describe("true or false, default to false"),
        amount: z
          .number()
          .positive()
          .optional()
          .describe("If redeemAll is false, amount is mandatory"),
        destAccount: z
          .enum(["SPOT", "FUND"])
          .optional()
          .describe("Destination account: SPOT or FUND; default is SPOT"),
        recvWindow: z.number().int().optional().describe("Time window for request validity"),
      },
    },
    async (params) => {
      try {
        const { productId, redeemAll = false, amount, destAccount, recvWindow } = params;

        // Defensive check
        if (!redeemAll && (amount === undefined || amount <= 0)) {
          return {
            content: [
              {
                type: "text",
                text: "You must provide a valid amount when redeemAll is false.",
              },
            ],
            isError: true,
          };
        }

        const response = await (simpleEarnClient as any).restAPI.redeemFlexibleProduct({
          productId,
          ...(redeemAll !== undefined && { redeemAll }),
          ...(amount !== undefined && { amount }),
          ...(destAccount && { destAccount }),
          ...(recvWindow && { recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Successfully redeem funds from a flexible earn investment. Response: ${JSON.stringify(
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
              text: `Failed to allows users to redeem their funds from a Flexible Earn investment: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
