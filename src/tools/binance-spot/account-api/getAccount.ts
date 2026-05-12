import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { JSONStringify } from "json-with-bigint";
import { z } from "zod";

import { spotClient } from "../../../config/binanceClient.js";

export function registerBinanceGetAccount(server: McpServer) {
  server.registerTool(
    "BinanceGetAccount",
    {
      description: "Get current account information.",
      inputSchema: {
        recvWindow: z.number().optional().describe("The value cannot be greater than 60000"),
      },
    },
    async ({ recvWindow }) => {
      try {
        const params: any = {
          omitZeroBalances: true,
        };
        if (recvWindow !== undefined) params.recvWindow = recvWindow;

        const response = await (spotClient as any).restAPI.getAccount(params);

        const data = await response.data();

        // This `content` is the CallToolResult payload: it flows up through McpServer → Server → Protocol
        // and is sent to the client via transport.send(). When using SSE, see server/sse.ts for logging.
        const content = [
          {
            type: "text" as const,
            text: `Retrieved account information. Account contains ${data.balances?.length || 0} balances. Response: ${JSONStringify(data)}`,
          },
        ];
        console.log("[MCP tool BinanceGetAccount] returning content (length)", content.length);

        return { content };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            { type: "text", text: `Failed to retrieve account information: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
