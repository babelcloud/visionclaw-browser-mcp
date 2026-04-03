import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

const fieldSchema = z.object({
  ref: z.string().describe("Field element reference from the page snapshot"),
  name: z.string().describe("Human-readable field name"),
  type: z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the field"),
  value: z.string().describe("Value to fill. For checkboxes use 'true'/'false'. For combobox, use option text."),
});

export function registerFormTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_fill_form",
    "Fill multiple form fields at once",
    {
      fields: z.array(fieldSchema).describe("Fields to fill in"),
    },
    async ({ fields }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");

        const errors: string[] = [];

        for (const field of fields) {
          const selector = resolveRef(snapshot, field.ref);
          if (!selector) {
            errors.push(`Cannot resolve ref "${field.ref}" for field "${field.name}"`);
            continue;
          }
          const locator = page.locator(selector);

          switch (field.type) {
            case "textbox":
              await locator.fill(field.value, { timeout: 5000 });
              break;
            case "checkbox":
            case "radio":
              await locator.setChecked(field.value === "true", { timeout: 5000 });
              break;
            case "combobox":
              await locator.selectOption(field.value, { timeout: 5000 });
              break;
            case "slider":
              await locator.fill(field.value, { timeout: 5000 });
              break;
          }
        }

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;

        let summary = `Filled ${fields.length - errors.length}/${fields.length} fields.`;
        if (errors.length > 0) {
          summary += `\nErrors:\n${errors.join("\n")}`;
        }
        return textResult(`${summary}\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Form fill failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
