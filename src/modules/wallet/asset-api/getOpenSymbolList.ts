// src/tools/binance-wallet/asset-api/getOpenSymbolList.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { walletClient } from "../../../config/binanceClient.js";

export function registerBinanceWalletGetOpenSymbolList(server: McpServer) {
  server.registerTool(
    "BinanceWalletGetOpenSymbolList",
    { description: "Get open symbol list." },
    async () => {
      try {
        const response = await (walletClient as any).restAPI.getOpenSymbolList();
        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Retrieved open symbol list. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to retrieve open symbol list: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
