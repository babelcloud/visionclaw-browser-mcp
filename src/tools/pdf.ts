import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import type { BrowserConnection } from "../browser/connection.js";
import type { Config } from "../config.js";
import { textResult, errorResult } from "../utils/result.js";

export function registerPdfTools(
  server: McpServer,
  conn: BrowserConnection,
  config: Config,
): void {
  server.tool(
    "browser_pdf_save",
    "Save the current page as a PDF file",
    {
      filename: z.string().optional().describe("File name to save the PDF to (defaults to auto-generated name)"),
    },
    async ({ filename }) => {
      try {
        const page = await conn.getPage();
        const outputDir = config.outputDir;
        fs.mkdirSync(outputDir, { recursive: true });

        const name = filename ?? `page-${Date.now()}.pdf`;
        const filePath = path.resolve(outputDir, name);

        await page.pdf({ path: filePath, format: "A4" });

        return textResult(`PDF saved to: ${filePath}`);
      } catch (err) {
        return errorResult(`PDF save failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
