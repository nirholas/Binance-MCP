/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/copy-trading/FutureCopyTrading-api/getTraderSymbolStats.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { z } from "zod"

import { copyTradingClient } from "../../../config/binanceClient.js"

export function registerBinanceGetTraderSymbolStats(server: McpServer) {
  server.tool(
    "BinanceCopyTradingGetTraderSymbolStats",
    "Get a lead trader's trading statistics per symbol. Shows which symbols they trade most and their success rate.",
    {
      leadPortfolioId: z.string().describe("Lead trader's portfolio ID"),
      tradeType: z.enum(["PERPETUAL"]).optional().describe("Trade type"),
      recvWindow: z.number().int().optional().describe("Request validity window in ms"),
    },
    async (params) => {
      try {
        const response = await copyTradingClient.restAPI.getTraderSymbolStats({
          leadPortfolioId: params.leadPortfolioId,
          ...(params.tradeType && { tradeType: params.tradeType }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        })

        const data = await response.data()

        return {
          content: [
            {
              type: "text",
              text: `📊 Trader Symbol Statistics\n\nPortfolio: ${params.leadPortfolioId}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get trader symbol stats: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )
}
