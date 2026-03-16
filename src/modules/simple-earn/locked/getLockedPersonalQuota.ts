/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/simple-earn/locked/getLockedPersonalQuota.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { simpleEarnClient } from "../../../config/binanceClient.js";

export function registerSimpleEarnLockedPersonalQuota(server: McpServer) {
  server.registerTool(
    "BinanceSimpleEarnLockedPersonalQuota",
    {
      description:
        "Get your personal subscription quota for a locked product. Shows remaining quota available to subscribe.",
      inputSchema: {
        projectId: z.string().describe("Project ID to check quota for"),
        recvWindow: z.number().int().optional().describe("Request validity window in ms"),
      },
    },
    async (params) => {
      try {
        const response = await simpleEarnClient.restAPI.getLockedPersonalLeftQuota({
          projectId: params.projectId,
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `📊 Personal Quota for Project ${params.projectId}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to get personal quota: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
