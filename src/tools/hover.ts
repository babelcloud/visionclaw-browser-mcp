import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerHoverTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_hover",
    "Hover over an element on the page",
    {
      ref: z.string().describe("Element reference from the page snapshot"),
      element: z.string().optional().describe("Human-readable element description"),
    },
    async ({ ref }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
        const selector = resolveRef(snapshot, ref);
        if (!selector) return errorResult(`Cannot resolve ref "${ref}". Take a new browser_snapshot.`);

        await page.locator(selector).hover({ timeout: 5000 });

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        return textResult(`Hovered [${ref}]. Page: ${page.url()}\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Hover failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
