import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerEvaluateTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_evaluate",
    "Evaluate JavaScript expression on the page or on a specific element",
    {
      function: z.string().describe("JavaScript function to evaluate, e.g. '() => document.title' or '(el) => el.textContent' when ref is provided"),
      ref: z.string().optional().describe("Element reference — the function receives the element as first argument"),
      element: z.string().optional().describe("Human-readable element description"),
    },
    async ({ function: fn, ref }) => {
      try {
        const page = await conn.getPage();
        let result: unknown;

        // Wrap the string as a function if it isn't already
        const wrappedFn = fn.trim().startsWith("(") || fn.trim().startsWith("function")
          ? `(${fn})()`
          : fn;

        if (ref) {
          const snapshot = conn.state.lastSnapshot;
          if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
          const selector = resolveRef(snapshot, ref);
          if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);
          // For element evaluation, pass the function as-is (receives element arg)
          result = await page.locator(selector).evaluate(fn);
        } else {
          // page.evaluate expects a function or expression string
          result = await page.evaluate(wrappedFn);
        }

        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return textResult(text ?? "undefined");
      } catch (err) {
        return errorResult(`Evaluate failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
