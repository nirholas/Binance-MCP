import type { Server } from "http";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";
import express from "express";

import Logger from "../utils/logger.js";

import { startServer } from "./base.js";

// src/server/sse.ts
import "dotenv/config";

const PORT = process.env.PORT || 3002;

// Start the server in SSE mode
export const startSSEServer = async (): Promise<Server | undefined> => {
  try {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Store active transports and their associated server instances
    const transports = new Map<string, SSEServerTransport>();

    // SSE endpoint — each connection gets its own McpServer instance
    app.get("/sse", async (req, res) => {
      const server = startServer();
      const transport = new SSEServerTransport("/message", res);

      Logger.info(`New SSE connection: ${transport.sessionId}`);
      transports.set(transport.sessionId, transport);

      res.on("close", async () => {
        Logger.info(`SSE connection closed: ${transport.sessionId}`);
        transports.delete(transport.sessionId);
        await server.close();
      });

      await server.connect(transport);
    });

    // Message endpoint
    app.post("/message", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);

      if (!transport) {
        res.status(404).json({ error: "Session not found" });

        return;
      }

      await transport.handlePostMessage(req, res);
    });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", mode: "sse" });
    });

    const httpServer = app.listen(PORT, () => {
      Logger.info(`Binance MCP Server running on SSE mode at http://localhost:${PORT}`);
      Logger.info(`SSE endpoint: http://localhost:${PORT}/sse`);
    });

    return httpServer;
  } catch (error) {
    Logger.error("Error starting Binance MCP SSE server:", error);

    return undefined;
  }
};
