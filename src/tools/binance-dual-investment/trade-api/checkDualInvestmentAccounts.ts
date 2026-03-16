// src/tools/binance-dual-investment/trade-api/checkDualInvestmentAccounts.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { dualInvestmentClient } from "../../../config/binanceClient.js";

export function registerBinanceCheckDualInvestmentAccounts(server: McpServer) {
  server.registerTool(
    "BinanceCheckDualInvestmentAccounts",
    {
      description:
        "Retrieve Dual Investment account balances, including total value in BTC and USDT equivalents.",
      inputSchema: {
        recvWindow: z
          .number()
          .int()
          .max(60000)
          .optional()
          .describe("Optional time window for request validity (max 60000)"),
      },
    },
    async (params) => {
      try {
        const response = await dualInvestmentClient.restAPI.checkDualInvestmentAccounts({
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Successfully retrieve Dual Investment account balances, including total value in BTC and USDT equivalents. Response: ${JSON.stringify(
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
              text: `Failed to retrieve Dual Investment account balances: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
