import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import http from "node:http";
import crypto from "node:crypto";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./mcp-server.js";

async function main(): Promise<void> {
  console.log("[browser-mcp] Starting...");

  const config = loadConfig();

  const sseTransports = new Map<string, SSEServerTransport>();
  const transports = new Map<string, {
    transport: StreamableHTTPServerTransport;
    lastUsedAt: number;
  }>();

  // Cleanup stale sessions every 5 minutes
  const sessionCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [sid, entry] of transports) {
      if (now - entry.lastUsedAt > 30 * 60 * 1000) {
        transports.delete(sid);
      }
    }
  }, 5 * 60 * 1000);

  // One shared browser connection for all sessions
  const { server: mcpServerTemplate, connection } = createMcpServer(config);

  const httpServer = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

    // Health check
    if (req.url === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        status: "ok",
        service: "browser-mcp",
        connected: connection.isConnected,
      }));
      return;
    }

    // SSE transport (legacy)
    if (req.url === "/sse" && req.method === "GET") {
      const transport = new SSEServerTransport("/messages", res);
      const { server } = createMcpServer(config);
      sseTransports.set(transport.sessionId, transport);
      transport.onclose = () => sseTransports.delete(transport.sessionId);
      await server.connect(transport);
      await transport.start();
      return;
    }

    if (req.url?.startsWith("/messages") && req.method === "POST") {
      const url = new URL(req.url, "http://localhost");
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessionId ? sseTransports.get(sessionId) : null;
      if (!transport) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid or missing sessionId" }));
        return;
      }
      await transport.handlePostMessage(req, res);
      return;
    }

    // Streamable HTTP transport (modern)
    if (req.url === "/mcp" || req.url?.startsWith("/mcp")) {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        const entry = transports.get(sessionId)!;
        entry.lastUsedAt = Date.now();
        await entry.transport.handleRequest(req, res);
        return;
      }

      if (req.method === "POST") {
        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
          });
          transport.onclose = () => {
            const sid = (transport as unknown as { sessionId?: string }).sessionId;
            if (sid) transports.delete(sid);
          };
          const { server } = createMcpServer(config);
          await server.connect(transport);
          await transport.handleRequest(req, res);
          const sid = res.getHeader("mcp-session-id") as string | undefined;
          if (sid) transports.set(sid, { transport, lastUsedAt: Date.now() });
        } catch (err) {
          console.error(`[mcp] Error: ${err instanceof Error ? err.message : String(err)}`);
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: "Internal error" })); }
        }
        return;
      }

      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Bad request" }));
      return;
    }

    res.statusCode = 404;
    res.end("Not found");
  });

  httpServer.listen(config.mcpPort, () => {
    console.log(`[browser-mcp] Listening on port ${config.mcpPort}`);
  });

  console.log("");
  console.log("=== Browser MCP Ready ===");
  console.log(`  MCP:   http://localhost:${config.mcpPort}/mcp`);
  console.log(`  SSE:   http://localhost:${config.mcpPort}/sse`);
  console.log(`  Relay: ${config.relayHost}:${config.relayPort}`);
  console.log("=========================");

  const shutdown = () => {
    console.log("\nShutting down...");
    clearInterval(sessionCleanupTimer);
    connection.disconnect().catch(() => {});
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
