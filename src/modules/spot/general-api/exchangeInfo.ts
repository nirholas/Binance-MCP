// src/tools/binance-spot/general-api/exchangeInfo.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { spotClient } from "../../../config/binanceClient.js";

export function registerBinanceExchangeInfo(server: McpServer) {
  server.registerTool(
    "BinanceExchangeInfo",
    {
      description: "Get exchange information including rate limits, symbol configs, etc.",
      inputSchema: {
        symbol: z
          .string()
          .optional()
          .describe(
            "Single trading pair in UPPERCASE, no separators (e.g. BTCUSDT, SOLUSDT). Use this for one pair; do not use both symbol and symbols.",
          ),
        symbols: z
          .array(z.string())
          .optional()
          .describe(
            'Multiple pairs as array; each symbol UPPERCASE (e.g. ["BTCUSDT","ETHUSDT"]). Do not use with symbol.',
          ),
        permissions: z.array(z.string()).optional().describe("Array of permissions to filter by"),
      },
    },
    async ({ symbol, symbols, permissions }) => {
      try {
        const params: any = {};

        if (symbol) params.symbol = symbol.toUpperCase();
        if (symbols?.length) {
          params.symbols = JSON.stringify(symbols.map((s) => s.toUpperCase()));
        }
        if (permissions?.length && !params.symbol && !params.symbols)
          params.permissions = permissions;

        const response = await (spotClient as any).restAPI.exchangeInfo(params);

        const data = await response.data();

        const symbolCount = data.symbols?.length || 0;
        const exchangeFiltersCount = data.exchangeFilters?.length || 0;

        return {
          content: [
            {
              type: "text",
              text: `Retrieved exchange information. Total symbols: ${symbolCount}, Exchange filters: ${exchangeFiltersCount}. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to retrieve exchange information: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
