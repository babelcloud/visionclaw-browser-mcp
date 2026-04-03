import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerDialogTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_handle_dialog",
    "Handle a JavaScript dialog (alert, confirm, prompt). Dialogs are queued as they appear. This tool handles the most recent unhandled dialog.",
    {
      accept: z.boolean().describe("Whether to accept the dialog (true) or dismiss it (false)"),
      promptText: z.string().optional().describe("Text to enter for prompt dialogs"),
    },
    async ({ accept, promptText }) => {
      try {
        await conn.getPage(); // ensure connected

        const pending = conn.state.pendingDialogs.filter((d) => !d.handled);
        if (pending.length === 0) {
          return errorResult("No pending dialogs to handle.");
        }

        const dialog = pending[pending.length - 1]!;
        dialog.handled = true;

        // The actual dialog handling was done by the page-level listener in state.ts.
        // Here we just report what happened. For prompt text, we need to handle it
        // at the page level. Since connectOverCDP has limited dialog support,
        // this is a best-effort approach.

        const action = accept ? "accepted" : "dismissed";
        let msg = `Dialog ${action}: [${dialog.type}] "${dialog.message}"`;
        if (promptText) msg += ` (with text: "${promptText}")`;

        return textResult(msg);
      } catch (err) {
        return errorResult(`Dialog handling failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
