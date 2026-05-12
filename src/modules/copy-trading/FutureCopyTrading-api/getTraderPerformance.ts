/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/copy-trading/FutureCopyTrading-api/getTraderPerformance.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { copyTradingClient } from "../../../config/binanceClient.js";

export function registerBinanceGetTraderPerformance(server: McpServer) {
  server.registerTool(
    "BinanceCopyTradingGetTraderPerformance",
    {
      description:
        "Get detailed performance statistics for a lead trader. Includes ROI, PNL, win rate, and other metrics.",
      inputSchema: {
        leadPortfolioId: z.string().describe("Lead trader's portfolio ID"),
        tradeType: z.enum(["PERPETUAL"]).optional().describe("Trade type"),
        recvWindow: z.number().int().optional().describe("Request validity window in ms"),
      },
    },
    async (params) => {
      try {
        const response = await (copyTradingClient as any).restAPI.getTraderPerformance({
          leadPortfolioId: params.leadPortfolioId,
          ...(params.tradeType && { tradeType: params.tradeType }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📊 Trader Performance\n\nPortfolio: ${params.leadPortfolioId}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get trader performance: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
