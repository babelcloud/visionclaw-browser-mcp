import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerNetworkTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_network_requests",
    "Returns network requests captured since page load",
    {
      filter: z.string().optional().describe("Regex filter for URLs (e.g., '/api/')"),
      static: z.boolean().optional().describe("Include static resources like images, fonts, scripts. Defaults to false."),
    },
    async ({ filter, static: includeStatic }) => {
      try {
        await conn.getPage(); // ensure connected

        const staticTypes = new Set(["image", "font", "stylesheet", "script", "media"]);
        let entries = conn.state.networkEntries;

        if (!includeStatic) {
          entries = entries.filter((e) => !staticTypes.has(e.resourceType));
        }

        if (filter) {
          const regex = new RegExp(filter);
          entries = entries.filter((e) => regex.test(e.url));
        }

        if (entries.length === 0) {
          return textResult("No network requests captured.");
        }

        const lines = entries.map((e) =>
          `${e.method} ${e.status ?? "..."} ${e.url} [${e.resourceType}]`,
        );
        return textResult(`Network requests (${entries.length}):\n${lines.join("\n")}`);
      } catch (err) {
        return errorResult(`Network requests failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
