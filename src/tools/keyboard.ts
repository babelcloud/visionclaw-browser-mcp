import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerKeyboardTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_press_key",
    "Press a key on the keyboard. Use key names like 'ArrowLeft', 'Enter', 'Escape', 'a', 'Control+c', etc.",
    {
      key: z.string().describe("Key to press (e.g., 'Enter', 'Escape', 'ArrowDown', 'Control+a')"),
    },
    async ({ key }) => {
      try {
        const page = await conn.getPage();
        await page.keyboard.press(key);

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        return textResult(`Pressed "${key}". Page: ${page.url()}\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Key press failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
