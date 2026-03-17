// src/tools/binance-mining/mining-api/hashrateResaleDetail.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { miningClient } from "../../../config/binanceClient.js";

export function registerBinanceHashRateResaleDetail(server: McpServer) {
  server.registerTool(
    "BinanceHashRateResaleDetail",
    {
      description:
        "Retrieves details of hashrate resale transactions, including the transferring and receiving subaccounts, algorithm, hash rate, transfer date, and associated income.",
      inputSchema: {
        configId: z.number().int().min(1).describe("Mining ID"),
        userName: z.string().min(1).describe("Mining Account"),
        pageIndex: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Page number, default is the first page starting from 1"),
        pageSize: z
          .number()
          .int()
          .min(10)
          .max(200)
          .optional()
          .describe("Number of pages, minimum 10, maximum 200"),
        recvWindow: z.number().int().optional().describe("Optional: cannot be greater than 60000"),
      },
    },
    async (params) => {
      try {
        const requestParams = {
          configId: params.configId,
          userName: params.userName,
          ...(params.pageIndex != null && { pageIndex: params.pageIndex }),
          ...(params.pageSize != null && { pageSize: params.pageSize }),
          ...(params.recvWindow != null && { recvWindow: params.recvWindow }),
        };
        const response = await (
          (miningClient as any).restAPI as {
            hashrateResaleDetail: (p: any) => Promise<{ data: () => Promise<unknown> }>;
          }
        ).hashrateResaleDetail(requestParams);

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `Successfully retrieved details of hashrate resale transactions. Response: ${JSON.stringify(
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
              text: `Failed to retrieve details of hashrate resale transactions. ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
