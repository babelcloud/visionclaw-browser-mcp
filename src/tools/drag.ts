import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerDragTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_drag",
    "Perform drag and drop between two elements",
    {
      startRef: z.string().describe("Source element reference"),
      startElement: z.string().describe("Human-readable source element description"),
      endRef: z.string().describe("Target element reference"),
      endElement: z.string().describe("Human-readable target element description"),
    },
    async ({ startRef, endRef }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");

        const startSel = resolveRef(snapshot, startRef);
        const endSel = resolveRef(snapshot, endRef);
        if (!startSel) return errorResult(`Cannot resolve startRef "${startRef}".`);
        if (!endSel) return errorResult(`Cannot resolve endRef "${endRef}".`);

        await page.locator(startSel).dragTo(page.locator(endSel), { timeout: 5000 });

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        return textResult(`Dragged [${startRef}] to [${endRef}].\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Drag failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
