// src/tools/binance-spot/trade-api/newOrder.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { spotClient } from "../../../config/binanceClient.js";

/** Binance allows only [a-zA-Z0-9-_], max 36 chars. */
function sanitizeNewClientOrderId(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 36);
}

export function registerBinanceNewOrder(server: McpServer) {
  server.registerTool(
    "BinanceNewOrder",
    {
      description: "Create a new order on Binance for a specific trading pair.",
      inputSchema: {
        symbol: z.string().describe("Symbol of the trading pair (e.g., BTCUSDT)"),
        side: z.enum(["BUY", "SELL"]).describe("Order side: BUY or SELL"),
        type: z
          .enum([
            "LIMIT",
            "MARKET",
            "STOP_LOSS",
            "STOP_LOSS_LIMIT",
            "TAKE_PROFIT",
            "TAKE_PROFIT_LIMIT",
            "LIMIT_MAKER",
          ])
          .describe("Order type"),
        timeInForce: z.enum(["GTC", "IOC", "FOK"]).optional().describe("Time in force"),
        quantity: z.number().describe("Order quantity"),
        quoteOrderQty: z.number().optional().describe("Quote order quantity"),
        price: z.number().optional().describe("Order price"),
        newClientOrderId: z
          .string()
          .optional()
          .describe("Client order ID: only a-zA-Z0-9-_ allowed, max 36 chars"),
        stopPrice: z.number().optional().describe("Stop price"),
        icebergQty: z.number().optional().describe("Iceberg quantity"),
        newOrderRespType: z.enum(["ACK", "RESULT", "FULL"]).optional().describe("Response type"),
      },
    },
    async ({
      symbol,
      side,
      type,
      timeInForce,
      quantity,
      quoteOrderQty,
      price,
      newClientOrderId,
      stopPrice,
      icebergQty,
      newOrderRespType,
    }) => {
      try {
        const params: any = {
          symbol,
          side,
          type,
          quantity,
        };

        const timeInForceTypes = ["LIMIT", "STOP_LOSS_LIMIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"];
        if (timeInForce && timeInForceTypes.includes(type)) params.timeInForce = timeInForce;
        if (type === "MARKET" && quoteOrderQty !== undefined) params.quoteOrderQty = quoteOrderQty;
        const priceTypes = ["LIMIT", "STOP_LOSS_LIMIT", "TAKE_PROFIT_LIMIT", "LIMIT_MAKER"];
        if (price !== undefined && priceTypes.includes(type)) params.price = price;
        if (newClientOrderId) {
          const sanitized = sanitizeNewClientOrderId(newClientOrderId);
          if (sanitized) params.newClientOrderId = sanitized;
        }
        const stopOrderTypes = ["STOP_LOSS", "STOP_LOSS_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT"];
        if (stopPrice !== undefined && stopOrderTypes.includes(type)) params.stopPrice = stopPrice;
        if (icebergQty !== undefined) params.icebergQty = icebergQty;
        if (newOrderRespType) params.newOrderRespType = newOrderRespType;

        const response = await spotClient.restAPI.newOrder(params);

        const data = await response.data();

        return {
          content: [
            {
              type: "text",
              text: `New order successfully created. Response: ${JSON.stringify(data)}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Failed to create new order: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}
