import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAriaSnapshot } from "playwriter";
import type { BrowserConnection } from "../browser/connection.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerVisionTools(
  server: McpServer,
  conn: BrowserConnection,
): void {
  server.tool(
    "browser_mouse_move_xy",
    "Move mouse to a given position",
    {
      element: z.string().describe("Human-readable element description"),
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
    },
    async ({ x, y }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.move(x, y);
        return textResult(`Mouse moved to (${x}, ${y}).`);
      } catch (err) {
        return errorResult(`Mouse move failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_mouse_click_xy",
    "Click left mouse button at a given position",
    {
      element: z.string().describe("Human-readable element description"),
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
    },
    async ({ x, y }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.click(x, y);

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        return textResult(`Clicked at (${x}, ${y}).\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Mouse click failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_mouse_drag_xy",
    "Drag left mouse button from one position to another",
    {
      element: z.string().describe("Human-readable element description"),
      startX: z.number().describe("Start X coordinate"),
      startY: z.number().describe("Start Y coordinate"),
      endX: z.number().describe("End X coordinate"),
      endY: z.number().describe("End Y coordinate"),
    },
    async ({ startX, startY, endX, endY }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();

        const result = await getAriaSnapshot({ page });
        conn.state.lastSnapshot = result;
        return textResult(`Dragged from (${startX}, ${startY}) to (${endX}, ${endY}).\n\n${result.snapshot}`);
      } catch (err) {
        return errorResult(`Mouse drag failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_mouse_down",
    "Press mouse button down",
    {
      button: z.enum(["left", "right", "middle"]).optional().describe("Button to press, defaults to left"),
    },
    async ({ button }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.down({ button: button ?? "left" });
        return textResult(`Mouse ${button ?? "left"} button pressed down.`);
      } catch (err) {
        return errorResult(`Mouse down failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_mouse_up",
    "Release mouse button",
    {
      button: z.enum(["left", "right", "middle"]).optional().describe("Button to release, defaults to left"),
    },
    async ({ button }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.up({ button: button ?? "left" });
        return textResult(`Mouse ${button ?? "left"} button released.`);
      } catch (err) {
        return errorResult(`Mouse up failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  server.tool(
    "browser_mouse_wheel",
    "Scroll mouse wheel",
    {
      deltaX: z.number().describe("Horizontal scroll amount"),
      deltaY: z.number().describe("Vertical scroll amount"),
    },
    async ({ deltaX, deltaY }) => {
      try {
        const page = await conn.getPage();
        await page.mouse.wheel(deltaX, deltaY);
        return textResult(`Mouse wheel scrolled (${deltaX}, ${deltaY}).`);
      } catch (err) {
        return errorResult(`Mouse wheel failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
