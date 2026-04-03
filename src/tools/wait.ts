import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerWaitTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_wait_for",
    "Wait for text to appear or disappear, or wait for a specified time",
    {
      text: z.string().optional().describe("Text to wait for on the page"),
      textGone: z.string().optional().describe("Text to wait for to disappear"),
      time: z.number().optional().describe("Time to wait in seconds"),
    },
    async ({ text, textGone, time }) => {
      try {
        const page = await conn.getPage();

        if (time !== undefined) {
          await new Promise((r) => setTimeout(r, time * 1000));
        }

        if (text) {
          await page.getByText(text, { exact: false }).first().waitFor({
            state: "visible",
            timeout: 30_000,
          });
        }

        if (textGone) {
          await page.getByText(textGone, { exact: false }).first().waitFor({
            state: "hidden",
            timeout: 30_000,
          });
        }

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        let msg = "Wait completed.";
        if (text) msg = `Text "${text}" appeared.`;
        if (textGone) msg = `Text "${textGone}" disappeared.`;
        if (time) msg = `Waited ${time} seconds.`;
        return textResult(`${msg}\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Wait failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
