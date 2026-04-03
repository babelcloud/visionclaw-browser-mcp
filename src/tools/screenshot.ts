import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { errorResult, type ToolResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerScreenshotTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_take_screenshot",
    "Take a screenshot of the current page",
    {
      type: z.enum(["png", "jpeg"]).optional().describe("Image format, defaults to png"),
      fullPage: z.boolean().optional().describe("Capture full scrollable page instead of viewport"),
      ref: z.string().optional().describe("Element reference to screenshot (instead of full page)"),
      element: z.string().optional().describe("Human-readable element description"),
    },
    async ({ type: imageType, fullPage, ref }) => {
      try {
        const page = await conn.getPage();
        const format = imageType ?? "png";

        let buffer: Buffer;
        if (ref) {
          const snapshot = conn.state.lastSnapshot;
          if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
          const selector = resolveRef(snapshot, ref);
          if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);
          buffer = await page.locator(selector).screenshot({ type: format, timeout: 10000 });
        } else {
          buffer = await page.screenshot({
            type: format,
            fullPage: fullPage ?? false,
            scale: "css",
            timeout: 10000,
          });
        }

        const base64 = buffer.toString("base64");
        const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";

        const result: ToolResult = {
          content: [{ type: "image", data: base64, mimeType }],
        };
        return result;
      } catch (err) {
        return errorResult(`Screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
