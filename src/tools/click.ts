import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerClickTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_click",
    "Perform click on a web page element identified by its ref from a snapshot",
    {
      ref: z.string().describe("Element reference from the page snapshot (e.g., 'e1', 'submit-btn')"),
      element: z.string().optional().describe("Human-readable element description"),
      button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button, defaults to left"),
      doubleClick: z.boolean().optional().describe("Whether to double-click"),
      modifiers: z
        .array(z.enum(["Alt", "Control", "ControlOrMeta", "Meta", "Shift"]))
        .optional()
        .describe("Modifier keys to hold"),
    },
    async ({ ref, button, doubleClick, modifiers }) => {
      try {
        const page = await conn.getPage();
        const selector = resolveRef(conn.state.lastSnapshot, ref);
        if (!selector) {
          return errorResult(`Cannot resolve ref "${ref}". Take a new browser_snapshot first.`);
        }

        const locator = page.locator(selector);
        await locator.click({
          button: button ?? "left",
          clickCount: doubleClick ? 2 : 1,
          modifiers: modifiers as Array<"Alt" | "Control" | "ControlOrMeta" | "Meta" | "Shift"> | undefined,
          timeout: 5000,
        });

        // Return updated snapshot
        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        const header = `Clicked [${ref}]. Page: ${page.url()}\n\n`;
        return textResult(header + result.snapshot);
      } catch (err) {
        return errorResult(`Click failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
