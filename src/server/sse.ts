import type { Server } from "http";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";
import express from "express";

import Logger from "../utils/logger.js";

import { startServer } from "./base.js";

// src/server/sse.ts
import "dotenv/config";

const PORT = process.env.PORT || 3002;

/**
 * How tool `content` flows when the SSE server runs a tool:
 *
 * 1. Tool handler (e.g. getAccount.ts) returns { content: [{ type: "text", text: "..." }] }.
 * 2. McpServer (SDK) CallTool request handler runs the handler and returns that object.
 * 3. Server (SDK) validates it as CallToolResult and returns it from the tools/call handler.
 * 4. Protocol (SDK) puts it in response.result and calls transport.send({ jsonrpc, id, result }).
 * 5. SSEServerTransport.send() writes the JSON to the SSE stream (event: message, data: ...).
 *
 * This wrapper logs every tools/call request and every tool result content when using SSE.
 */
function wrapTransportWithToolLogging(transport: SSEServerTransport) {
  const pendingToolCalls = new Map<string | number, string>();

  return {
    get sessionId() {
      return transport.sessionId;
    },
    get onmessage() {
      return transport.onmessage;
    },
    set onmessage(handler: typeof transport.onmessage) {
      transport.onmessage = handler;
    },
    get onclose() {
      return transport.onclose;
    },
    set onclose(handler: typeof transport.onclose) {
      transport.onclose = handler;
    },
    get onerror() {
      return transport.onerror;
    },
    set onerror(handler: typeof transport.onerror) {
      transport.onerror = handler;
    },
    async start() {
      return transport.start();
    },
    async close() {
      return transport.close();
    },
    async send(message: Parameters<SSEServerTransport["send"]>[0]) {
      const msg = message as { id?: string | number; result?: { content?: unknown } };
      if (msg?.result && msg.result.content !== undefined) {
        const toolName = pendingToolCalls.get(msg.id as string | number);

        console.log(
          "[MCP SSE] tool result content",
          toolName !== undefined ? `(tool: ${toolName})` : "",
          JSON.stringify(msg.result.content),
        );
        if (msg.id !== undefined) pendingToolCalls.delete(msg.id);
      }

      return transport.send(message);
    },
    async handlePostMessage(req: express.Request, res: express.Response, parsedBody?: unknown) {
      const body = parsedBody ?? (req as express.Request & { body?: unknown }).body;
      const parsed = typeof body === "string" ? JSON.parse(body as string) : body;

      if (parsed?.method === "tools/call" && parsed.params) {
        console.log("[MCP SSE] tools/call request", parsed.params.name, parsed.params.arguments);
        if (parsed.id !== undefined) pendingToolCalls.set(parsed.id, parsed.params.name);
      }

      return transport.handlePostMessage(req, res, parsedBody ?? body);
    },
  };
}

// Start the server in SSE mode
export const startSSEServer = async (): Promise<Server | undefined> => {
  try {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Store active transports and their associated server instances
    const transports = new Map<string, ReturnType<typeof wrapTransportWithToolLogging>>();

    // SSE endpoint — each connection gets its own McpServer instance
    app.get("/sse", async (req, res) => {
      const server = startServer();
      const rawTransport = new SSEServerTransport("/message", res);
      const transport = wrapTransportWithToolLogging(rawTransport);

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
