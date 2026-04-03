import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerTabTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_tabs",
    "List, create, close, or select a browser tab",
    {
      action: z.enum(["list", "new", "close", "select"]).describe("Operation to perform"),
      index: z.number().optional().describe("Tab index for close/select. If omitted for close, current tab is closed."),
    },
    async ({ action, index }) => {
      try {
        const context = await conn.getContext();
        const pages = context.pages();

        switch (action) {
          case "list": {
            const entries = await Promise.all(
              pages.map(async (p, i) => {
                const current = i === conn.state.currentPageIndex ? " (current)" : "";
                return `${i}: [${await p.title()}] ${p.url()}${current}`;
              }),
            );
            return textResult(`Tabs (${pages.length}):\n${entries.join("\n")}`);
          }

          case "new": {
            const newPage = await context.newPage();
            conn.state.currentPageIndex = context.pages().indexOf(newPage);
            conn.state.attachPageListeners(newPage);
            return textResult(`New tab opened (index ${conn.state.currentPageIndex}).`);
          }

          case "close": {
            const targetIndex = index ?? conn.state.currentPageIndex;
            const target = pages[targetIndex];
            if (!target) return errorResult(`No tab at index ${targetIndex}.`);
            await target.close();
            if (conn.state.currentPageIndex >= context.pages().length) {
              conn.state.currentPageIndex = Math.max(0, context.pages().length - 1);
            }
            return textResult(`Closed tab ${targetIndex}. ${context.pages().length} tabs remaining.`);
          }

          case "select": {
            if (index === undefined) return errorResult("index is required for select.");
            if (index < 0 || index >= pages.length) return errorResult(`Invalid index ${index}. Range: 0-${pages.length - 1}.`);
            conn.state.currentPageIndex = index;
            const p = pages[index]!;
            await p.bringToFront();
            return textResult(`Switched to tab ${index}: [${await p.title()}] ${p.url()}`);
          }
        }
      } catch (err) {
        return errorResult(`Tab operation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
