import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerSelectTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_select_option",
    "Select an option in a dropdown",
    {
      ref: z.string().describe("Element reference for the select/dropdown"),
      element: z.string().optional().describe("Human-readable element description"),
      values: z.array(z.string()).describe("Values to select in the dropdown"),
    },
    async ({ ref, values }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
        const selector = resolveRef(snapshot, ref);
        if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);

        await page.locator(selector).selectOption(values, { timeout: 5000 });

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        return textResult(`Selected [${values.join(", ")}] in [${ref}].\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Select failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
