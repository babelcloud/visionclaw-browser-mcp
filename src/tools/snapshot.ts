import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerSnapshotTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_snapshot",
    "Capture accessibility snapshot of the current page. Returns a text representation of the page with [ref] markers for interactive elements. Use these refs with other tools like browser_click.",
    {},
    async () => {
      try {
        const page = await conn.getPage();
        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        conn.state.needsFullSnapshot = false;

        const url = page.url();
        const title = await page.title();
        const header = `- Page URL: ${url}\n- Page Title: ${title}\n\n`;

        return textResult(header + result.snapshot);
      } catch (err) {
        return errorResult(`Snapshot failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
