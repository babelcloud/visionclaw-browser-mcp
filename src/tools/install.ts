import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFile } from "node:child_process";
import { textResult, errorResult } from "../utils/result.js";

export function registerInstallTools(
  server: McpServer,
): void {
  server.tool(
    "browser_install",
    "Install the Chromium browser binary required by Playwright",
    {},
    async () => {
      try {
        const result = await new Promise<string>((resolve, reject) => {
          execFile("npx", ["playwright", "install", "chromium"], { timeout: 120_000 }, (err, stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve(stdout);
          });
        });

        return textResult(`Browser installed.\n${result}`);
      } catch (err) {
        return errorResult(`Install failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
