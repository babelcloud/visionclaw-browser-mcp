import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerSessionTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_session",
    "Diagnostic tool for browser connection. You do NOT need to call this before using other browser tools — connection is automatic. Only use this to check status when debugging issues, or to explicitly disconnect.",
    {
      action: z.enum(["status", "connect", "disconnect"]).describe("Action to perform"),
    },
    async ({ action }) => {
      try {
        switch (action) {
          case "status": {
            const connected = conn.isConnected;
            if (!connected) {
              return textResult("Not connected. Use browser_session with action 'connect', or call any browser tool to auto-connect.");
            }
            const context = await conn.getContext();
            const pages = context.pages();
            const current = conn.state.currentPageIndex;
            return textResult(
              `Connected. ${pages.length} pages open. Current page index: ${current}.`,
            );
          }

          case "connect": {
            await conn.connect();
            const context = await conn.getContext();
            return textResult(
              `Connected to Chrome via Playwriter relay. ${context.pages().length} pages available.`,
            );
          }

          case "disconnect": {
            await conn.disconnect();
            return textResult("Disconnected from browser.");
          }
        }
      } catch (err) {
        return errorResult(`Session operation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
