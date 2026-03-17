/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/options/market-api/time.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { optionsClient } from "../../../config/binanceClient.js";

export function registerOptionsMarketTime(server: McpServer) {
  server.registerTool(
    "BinanceOptionsTime",
    { description: "Get the current server time from the Options API." },
    async () => {
      try {
        const data = await optionsClient.time();

        const serverTime = new Date(data.serverTime).toISOString();

        return {
          content: [
            {
              type: "text",
              text: `✅ Options Server Time\n\nTimestamp: ${data.serverTime}\nUTC: ${serverTime}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get Options server time: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
