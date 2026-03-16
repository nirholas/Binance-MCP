// src/tools/binance-futures-coinm/listenKey.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { deliveryClient } from "../../config/binanceClient.js";

export function registerBinanceFuturesCOINMListenKeyCreate(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMListenKeyCreate",
    {
      description:
        "Start a new user data stream for COIN-M Futures. Returns a listenKey for WebSocket connection.",
    },
    async () => {
      try {
        const data = await deliveryClient.createListenKey();

        return {
          content: [
            {
              type: "text",
              text: `COIN-M Futures listen key created. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to create COIN-M Futures listen key: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

export function registerBinanceFuturesCOINMListenKeyRenew(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMListenKeyRenew",
    { description: "Keepalive a user data stream to prevent timeout for COIN-M Futures." },
    async () => {
      try {
        const data = await deliveryClient.keepAliveListenKey();

        return {
          content: [
            {
              type: "text",
              text: `COIN-M Futures listen key renewed. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to renew COIN-M Futures listen key: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

export function registerBinanceFuturesCOINMListenKeyClose(server: McpServer) {
  server.registerTool(
    "BinanceFuturesCOINMListenKeyClose",
    { description: "Close a user data stream for COIN-M Futures." },
    async () => {
      try {
        const data = await deliveryClient.closeListenKey();

        return {
          content: [
            {
              type: "text",
              text: `COIN-M Futures listen key closed. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to close COIN-M Futures listen key: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
