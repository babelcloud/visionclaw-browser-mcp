import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerFileTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_file_upload",
    "Upload one or multiple files to a file input element",
    {
      paths: z.array(z.string()).describe("Absolute paths to files to upload"),
      ref: z.string().optional().describe("File input element reference. If omitted, finds the first file input."),
    },
    async ({ paths, ref }) => {
      try {
        const page = await conn.getPage();

        if (ref) {
          const snapshot = conn.state.lastSnapshot;
          if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
          const selector = resolveRef(snapshot, ref);
          if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);
          await page.locator(selector).setInputFiles(paths, { timeout: 10000 });
        } else {
          await page.locator('input[type="file"]').first().setInputFiles(paths, { timeout: 10000 });
        }

        return textResult(`Uploaded ${paths.length} file(s): ${paths.join(", ")}`);
      } catch (err) {
        return errorResult(`File upload failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
