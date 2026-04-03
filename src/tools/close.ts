import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerCloseTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_close",
    "Close the current page",
    {},
    async () => {
      try {
        const page = await conn.getPage();
        const url = page.url();
        await page.close();
        const context = await conn.getContext();
        const remaining = context.pages().length;
        if (conn.state.currentPageIndex >= remaining) {
          conn.state.currentPageIndex = Math.max(0, remaining - 1);
        }
        return textResult(`Closed page: ${url}. ${remaining} pages remaining.`);
      } catch (err) {
        return errorResult(`Close failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
