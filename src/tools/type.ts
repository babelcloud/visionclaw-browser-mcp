import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerTypeTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_type",
    "Type text into an editable element identified by ref",
    {
      ref: z.string().describe("Element reference from the page snapshot"),
      text: z.string().describe("Text to type into the element"),
      element: z.string().optional().describe("Human-readable element description"),
      submit: z.boolean().optional().describe("Press Enter after typing"),
      slowly: z.boolean().optional().describe("Type one character at a time (for triggering key handlers)"),
    },
    async ({ ref, text, submit, slowly }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) {
          return errorResult(`No snapshot available. Take a browser_snapshot first.`);
        }

        const selector = resolveRef(snapshot, ref);
        if (!selector) {
          return errorResult(`Cannot resolve ref "${ref}". Take a new browser_snapshot first.`);
        }

        const locator = page.locator(selector);

        if (slowly) {
          await locator.pressSequentially(text, { delay: 50, timeout: 10000 });
        } else {
          await locator.fill(text, { timeout: 5000 });
        }

        if (submit) {
          await locator.press("Enter", { timeout: 5000 });
        }

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        return textResult(`Typed into [${ref}]. Page: ${page.url()}\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Type failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
