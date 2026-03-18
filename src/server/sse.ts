import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Request, Response } from "express";
import type { Server } from "http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { randomUUID } from "node:crypto";

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";

import Logger from "../utils/logger.js";

import { startServer } from "./base.js";

// src/server/sse.ts
// Credentials are not passed per-request here. They are loaded at process startup (see index.ts
// dotenv/config) and applied when config/binanceClient.ts is first required by tool handlers.
import "dotenv/config";

const PORT = process.env.PORT || 3002;

function ensureBinanceEnv(): void {
  const key = process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_API_SECRET;
  if (!key?.trim() || !secret?.trim()) {
    Logger.warn(
      "[SSE] BINANCE_API_KEY or BINANCE_API_SECRET is missing or empty. Signed API calls will fail.",
    );
  }
}

/** Log the outbound IP this process uses (same as Binance would see). Helps debug IP whitelist / proxy issues. */
async function logOutboundIp(): Promise<void> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = (await res.json()) as { ip?: string };
    const ip = data?.ip ?? "(unknown)";
    Logger.info(`[SSE] Outbound IP (Binance will see this): ${ip}`);
  } catch (err) {
    Logger.warn(
      "[SSE] Could not resolve outbound IP:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

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
            entry.server.close().catch(() => undefined);
            Logger.info(`Streamable HTTP session closed: ${sessionId}`);
          }
        },
      });
      const transport = wrapTransportWithToolLogging(rawTransport);

      return { transport, server };
    };

    // Streamable HTTP handler (GET for SSE, POST for JSON-RPC)
    const handleMcpRequest = async (req: Request, res: Response) => {
      const sessionId =
        req.get("mcp-session-id") ?? (req.headers["mcp-session-id"] as string | undefined);
      let entry: SessionEntry | undefined = sessionId ? sessions.get(sessionId) : undefined;

      if (!entry) {
        entry = createNewSession();
        await entry.server.connect(entry.transport);
      }

      await entry.transport.handleRequest(req, res, req.body);
    };

    // Primary endpoint (Streamable HTTP)
    app.all("/mcp", handleMcpRequest);
    // Alias for MCP Inspector and clients that default to /sse.
    // Use transport type "streamable-http" in the inspector (not deprecated "sse") so the
    // client sends POST initialize before GET; otherwise the server returns 400.
    app.all("/sse", handleMcpRequest);

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", mode: "streamable-http" });
    });

    const httpServer = app.listen(PORT, async () => {
      Logger.info(`Binance MCP Server running in Streamable HTTP mode at http://localhost:${PORT}`);
      Logger.info(`MCP endpoints: http://localhost:${PORT}/mcp and http://localhost:${PORT}/sse`);
      ensureBinanceEnv();
      await logOutboundIp();
    });

    return httpServer;
  } catch (error) {
    Logger.error("Error starting Binance MCP Streamable HTTP server:", error);

    return undefined;
  }
};
