import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Server } from "http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { randomUUID } from "node:crypto";

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";

import Logger from "../utils/logger.js";

import { startServer } from "./base.js";

// src/server/sse.ts
import "dotenv/config";

const PORT = process.env.PORT || 3002;

/** Transport + Streamable HTTP handleRequest for routing and logging. */
type StreamableTransportWithHandle = Transport & {
  handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void>;
};

/**
 * How tool `content` flows when the Streamable HTTP server runs a tool:
 *
 * 1. Tool handler (e.g. getAccount.ts) returns { content: [{ type: "text", text: "..." }] }.
 * 2. McpServer (SDK) CallTool request handler runs the handler and returns that object.
 * 3. Server (SDK) validates it as CallToolResult and returns it from the tools/call handler.
 * 4. Protocol (SDK) puts it in response.result and calls transport.send({ jsonrpc, id, result }).
 * 5. StreamableHTTPServerTransport.send() writes the JSON to the response/SSE stream.
 *
 * This wrapper logs every tools/call request and every tool result content.
 */
function wrapTransportWithToolLogging(
  transport: StreamableHTTPServerTransport,
): StreamableTransportWithHandle {
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
    async send(
      message: Parameters<Transport["send"]>[0],
      options?: Parameters<Transport["send"]>[1],
    ) {
      const msg = message as { id?: string | number; result?: { content?: unknown } };
      if (msg?.result && msg.result.content !== undefined) {
        const toolName = pendingToolCalls.get(msg.id as string | number);

        console.log(
          "[MCP Streamable HTTP] tool result content",
          toolName !== undefined ? `(tool: ${toolName})` : "",
          JSON.stringify(msg.result.content),
        );
        if (msg.id !== undefined) pendingToolCalls.delete(msg.id);
      }

      return transport.send(message, options);
    },
    async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) {
      const body = parsedBody ?? (req as IncomingMessage & { body?: unknown }).body;
      const parsed = typeof body === "string" ? JSON.parse(body as string) : body;

      if (parsed?.method === "tools/call" && parsed.params) {
        console.log(
          "[MCP Streamable HTTP] tools/call request",
          parsed.params.name,
          parsed.params.arguments,
        );
        if (parsed.id !== undefined) pendingToolCalls.set(parsed.id, parsed.params.name);
      }

      return transport.handleRequest(req, res, parsedBody ?? body);
    },
  };
}

interface SessionEntry {
  transport: StreamableTransportWithHandle;
  server: Awaited<ReturnType<typeof startServer>>;
}

// Start the server in Streamable HTTP mode (replaces deprecated SSE transport)
export const startSSEServer = async (): Promise<Server | undefined> => {
  try {
    const app = createMcpExpressApp();
    app.use(cors());

    const sessions = new Map<string, SessionEntry>();

    const createNewSession = (): SessionEntry => {
      const server = startServer();
      const rawTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          sessions.set(sessionId, { transport, server });
          Logger.info(`Streamable HTTP session initialized: ${sessionId}`);
        },
        onsessionclosed: (sessionId) => {
          const entry = sessions.get(sessionId);
          if (entry) {
            sessions.delete(sessionId);
            entry.server.close().catch(() => {});
            Logger.info(`Streamable HTTP session closed: ${sessionId}`);
          }
        },
      });
      const transport = wrapTransportWithToolLogging(rawTransport);

      return { transport, server };
    };

    // Single endpoint for Streamable HTTP (GET for SSE, POST for JSON-RPC)
    app.all("/mcp", async (req, res) => {
      const sessionId =
        req.get("mcp-session-id") ?? (req.headers["mcp-session-id"] as string | undefined);
      let entry: SessionEntry | undefined = sessionId ? sessions.get(sessionId) : undefined;

      if (!entry) {
        entry = createNewSession();
        await entry.server.connect(entry.transport);
      }

      await entry.transport.handleRequest(req, res, req.body);
    });

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", mode: "streamable-http" });
    });

    const httpServer = app.listen(PORT, () => {
      Logger.info(`Binance MCP Server running in Streamable HTTP mode at http://localhost:${PORT}`);
      Logger.info(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });

    return httpServer;
  } catch (error) {
    Logger.error("Error starting Binance MCP Streamable HTTP server:", error);

    return undefined;
  }
};
