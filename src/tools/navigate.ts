import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerNavigateTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_navigate",
    "Navigate to a URL",
    {
      url: z.string().describe("The URL to navigate to"),
    },
    async ({ url }) => {
      try {
        const page = await conn.getPage();
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});
        conn.state.resetForNavigation();

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        conn.state.needsFullSnapshot = false;

        const header = `- Page URL: ${page.url()}\n- Page Title: ${await page.title()}\n\n`;
        return textResult(header + result.snapshot);
      } catch (err) {
        return errorResult(`Navigation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_navigate_back",
    "Go back to the previous page in the history",
    {},
    async () => {
      try {
        const page = await conn.getPage();
        await page.goBack({ waitUntil: "domcontentloaded" });
        conn.state.resetForNavigation();

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        const header = `- Page URL: ${page.url()}\n- Page Title: ${await page.title()}\n\n`;
        return textResult(header + result.snapshot);
      } catch (err) {
        return errorResult(`Navigation back failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
