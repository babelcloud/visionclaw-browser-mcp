import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs";
import path from "node:path";
import type { BrowserConnection } from "../browser/connection.js";
import type { Config } from "../config.js";
import { textResult, errorResult } from "../utils/result.js";

let tracing = false;

export function registerTracingTools(
  server: McpServer,
  conn: BrowserConnection,
  config: Config,
): void {
  server.tool(
    "browser_start_tracing",
    "Start recording a Playwright trace. Stop with browser_stop_tracing to save the trace file.",
    {},
    async () => {
      try {
        if (tracing) return errorResult("Tracing is already in progress.");

        const context = await conn.getContext();
        await context.tracing.start({ screenshots: true, snapshots: true });
        tracing = true;

        return textResult("Trace recording started.");
      } catch (err) {
        return errorResult(`Start tracing failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_stop_tracing",
    "Stop trace recording and save the trace file",
    {},
    async () => {
      try {
        if (!tracing) return errorResult("No tracing in progress. Call browser_start_tracing first.");

        const context = await conn.getContext();
        const outputDir = config.outputDir;
        fs.mkdirSync(outputDir, { recursive: true });

        const filePath = path.resolve(outputDir, `trace-${Date.now()}.zip`);
        await context.tracing.stop({ path: filePath });
        tracing = false;

        return textResult(`Trace saved to: ${filePath}\nView with: npx playwright show-trace ${filePath}`);
      } catch (err) {
        return errorResult(`Stop tracing failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
