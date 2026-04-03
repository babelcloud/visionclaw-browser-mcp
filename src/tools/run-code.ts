import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerRunCodeTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_run_code",
    "Run a Playwright code snippet. The function receives `page` as its argument. Example: `async (page) => { await page.goto('https://example.com'); return await page.title(); }`",
    {
      code: z.string().describe("A JavaScript async function string that receives `page` as argument"),
    },
    async ({ code }) => {
      try {
        const page = await conn.getPage();

        // Create and execute the function
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const fn = new Function("page", `return (${code})(page);`);
        const result: unknown = await (fn as Function)(page);

        const text = result === undefined
          ? "(no return value)"
          : typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);

        return textResult(text);
      } catch (err) {
        return errorResult(`Code execution failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
