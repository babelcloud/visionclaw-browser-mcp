import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";
import { resolveRef } from "../utils/ref-resolver.js";

export function registerTestingTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_generate_locator",
    "Generate a Playwright locator for an element (useful for writing tests)",
    {
      ref: z.string().describe("Element reference from page snapshot"),
      element: z.string().optional().describe("Human-readable element description"),
    },
    async ({ ref }) => {
      try {
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
        const selector = resolveRef(snapshot, ref);
        if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);

        return textResult(`Locator for [${ref}]: page.locator('${selector}')`);
      } catch (err) {
        return errorResult(`Generate locator failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_verify_element_visible",
    "Verify an element is visible on the page",
    {
      role: z.string().describe("ARIA role of the element (e.g., 'button', 'heading')"),
      accessibleName: z.string().describe("Accessible name of the element"),
    },
    async ({ role, accessibleName }) => {
      try {
        const page = await conn.getPage();
        const locator = page.getByRole(role as Parameters<typeof page.getByRole>[0], { name: accessibleName });
        const visible = await locator.isVisible();

        if (visible) {
          return textResult(`PASS: ${role} "${accessibleName}" is visible.`);
        } else {
          return errorResult(`FAIL: ${role} "${accessibleName}" is NOT visible.`);
        }
      } catch (err) {
        return errorResult(`Verify failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_verify_text_visible",
    "Verify text is visible on the page",
    {
      text: z.string().describe("Text to verify is visible"),
    },
    async ({ text }) => {
      try {
        const page = await conn.getPage();
        const locator = page.getByText(text, { exact: false });
        const visible = await locator.first().isVisible();

        if (visible) {
          return textResult(`PASS: Text "${text}" is visible.`);
        } else {
          return errorResult(`FAIL: Text "${text}" is NOT visible.`);
        }
      } catch (err) {
        return errorResult(`Verify failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_verify_list_visible",
    "Verify a list with specific items is visible on the page",
    {
      ref: z.string().describe("Element reference pointing to the list"),
      element: z.string().describe("Human-readable list description"),
      items: z.array(z.string()).describe("Expected items in the list"),
    },
    async ({ ref, items }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
        const selector = resolveRef(snapshot, ref);
        if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);

        const locator = page.locator(selector);
        const listItems = await locator.locator("li, [role=option], [role=listitem], [role=row]").allTextContents();

        const missing = items.filter((item) => !listItems.some((li) => li.includes(item)));
        if (missing.length === 0) {
          return textResult(`PASS: All ${items.length} items found in list.`);
        } else {
          return errorResult(`FAIL: Missing items: ${missing.join(", ")}\nFound: ${listItems.join(", ")}`);
        }
      } catch (err) {
        return errorResult(`Verify failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_verify_value",
    "Verify an element's value",
    {
      ref: z.string().describe("Element reference"),
      element: z.string().describe("Human-readable element description"),
      type: z.enum(["textbox", "checkbox", "radio", "combobox", "slider"]).describe("Type of the element"),
      value: z.string().describe("Expected value (for checkbox, use 'true' or 'false')"),
    },
    async ({ ref, type, value }) => {
      try {
        const page = await conn.getPage();
        const snapshot = conn.state.lastSnapshot;
        if (!snapshot) return errorResult("No snapshot. Take a browser_snapshot first.");
        const selector = resolveRef(snapshot, ref);
        if (!selector) return errorResult(`Cannot resolve ref "${ref}".`);

        const locator = page.locator(selector);
        let actual: string;

        if (type === "checkbox" || type === "radio") {
          const checked = await locator.isChecked();
          actual = String(checked);
        } else {
          actual = await locator.inputValue();
        }

        if (actual === value) {
          return textResult(`PASS: [${ref}] value is "${value}".`);
        } else {
          return errorResult(`FAIL: [${ref}] expected "${value}", got "${actual}".`);
        }
      } catch (err) {
        return errorResult(`Verify failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
