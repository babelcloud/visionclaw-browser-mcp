import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerResizeTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_resize",
    "Resize the browser window",
    {
      width: z.number().describe("Width of the browser window"),
      height: z.number().describe("Height of the browser window"),
    },
    async ({ width, height }) => {
      try {
        const page = await conn.getPage();
        await page.setViewportSize({ width, height });
        return textResult(`Viewport resized to ${width}x${height}.`);
      } catch (err) {
        return errorResult(`Resize failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
