// src/tools/binance-spot/general-api/time.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { spotClient } from "../../../config/binanceClient.js";

export function registerBinanceTime(server: McpServer) {
  server.registerTool(
    "BinanceTime",
    { description: "Get the current server time from Binance API." },
    async () => {
      try {
        const response = await spotClient.restAPI.time();

        const data = await response.data();

        // @ts-expect-error - serverTime not in generated type definition
        const serverTime = new Date(data.serverTime).toISOString();

        return {
          content: [
            {
              type: "text",
              text: `Current Binance server time: ${serverTime} (${
                data.serverTime
              }). Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to retrieve server time: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
