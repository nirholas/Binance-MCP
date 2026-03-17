/**
 * @author nich
 * @website x.com/nichxbt
 * @github github.com/nirholas
 * @license Apache-2.0
 */
// src/modules/crypto-loans/flexible/repay.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { cryptoLoanClient } from "../../../config/binanceClient.js";

export function registerFlexibleLoanRepay(server: McpServer) {
  server.registerTool(
    "BinanceCryptoLoanFlexibleRepay",
    {
      description:
        "Repay a flexible crypto loan. Your collateral will be released proportionally. 💸",
      inputSchema: {
        loanCoin: z.string().describe("Loan coin to repay"),
        collateralCoin: z.string().describe("Collateral coin"),
        repayAmount: z.string().describe("Amount to repay"),
        collateralReturn: z.boolean().optional().describe("Return collateral after full repayment"),
        fullRepayment: z.boolean().optional().describe("Repay full outstanding amount"),
        recvWindow: z.number().int().optional().describe("Request validity window in ms"),
      },
    },
    async (params) => {
      try {
        const response = await (cryptoLoanClient as any).restAPI.flexibleLoanRepay({
          loanCoin: params.loanCoin,
          collateralCoin: params.collateralCoin,
          repayAmount: params.repayAmount,
          ...(params.collateralReturn !== undefined && {
            collateralReturn: params.collateralReturn,
          }),
          ...(params.fullRepayment !== undefined && { fullRepayment: params.fullRepayment }),
          ...(params.recvWindow && { recvWindow: params.recvWindow }),
        });

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `✅ Loan Repayment Successful!\n\nRepaid: ${params.repayAmount} ${params.loanCoin}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to repay loan: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
