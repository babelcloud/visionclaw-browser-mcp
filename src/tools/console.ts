import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

const LOG_LEVELS = ["error", "warning", "info", "debug"] as const;

export function registerConsoleTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_console_messages",
    "Returns console messages captured from the page. Each level includes more severe levels (error < warning < info < debug).",
    {
      level: z.enum(LOG_LEVELS).describe("Minimum level to include (e.g., 'error' returns only errors, 'info' returns errors + warnings + info)"),
    },
    async ({ level }) => {
      try {
        await conn.getPage(); // ensure connected

        const levelIndex = LOG_LEVELS.indexOf(level);
        const filtered = conn.state.consoleEntries.filter((e) => {
          const entryLevel = e.level === "warn" ? "warning" : e.level;
          const entryIndex = LOG_LEVELS.indexOf(entryLevel as typeof LOG_LEVELS[number]);
          return entryIndex >= 0 && entryIndex <= levelIndex;
        });

        if (filtered.length === 0) {
          return textResult(`No console messages at level "${level}" or above.`);
        }

        const lines = filtered.map((e) => `[${e.level}] ${e.text}`);
        return textResult(`Console messages (${filtered.length}):\n${lines.join("\n")}`);
      } catch (err) {
        return errorResult(`Console messages failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
