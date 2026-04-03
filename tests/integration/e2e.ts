/**
 * End-to-end test: starts the MCP server, connects as a client,
 * lists all tools, and optionally exercises core tools if Chrome is running.
 *
 * Usage:
 *   npx tsx tests/integration/e2e.ts
 *   npx tsx tests/integration/e2e.ts --with-browser   # also test browser tools
 */

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const MCP_URL = "http://localhost:3280/mcp";
const WITH_BROWSER = process.argv.includes("--with-browser");

let passed = 0;
let failed = 0;

function ok(msg: string): void {
  passed++;
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string): void {
  failed++;
  console.log(`  ❌ ${msg}`);
}

async function main(): Promise<void> {
  console.log("\n=== visionclaw-browser-mcp E2E Test ===\n");

  // ── Connect to MCP server ──
  console.log("[1] Connecting to MCP server...");
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: "e2e-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    ok("Connected to MCP server");
  } catch (err) {
    fail(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ── List tools ──
  console.log("\n[2] Listing all tools...");
  const { tools } = await client.listTools();
  console.log(`  Found ${tools.length} tools:\n`);

  const expectedTools = [
    // Core
    "browser_navigate", "browser_navigate_back",
    "browser_snapshot", "browser_take_screenshot",
    // Input
    "browser_click", "browser_type", "browser_press_key",
    "browser_hover", "browser_drag", "browser_select_option", "browser_fill_form",
    // Page management
    "browser_tabs", "browser_close", "browser_wait_for", "browser_resize",
    // Code execution
    "browser_evaluate", "browser_run_code",
    // Observability
    "browser_console_messages", "browser_network_requests",
    // File & dialog
    "browser_file_upload", "browser_handle_dialog",
    // Vision
    "browser_mouse_move_xy", "browser_mouse_click_xy", "browser_mouse_drag_xy",
    "browser_mouse_down", "browser_mouse_up", "browser_mouse_wheel",
    // Testing
    "browser_generate_locator", "browser_verify_element_visible",
    "browser_verify_text_visible", "browser_verify_list_visible", "browser_verify_value",
    // PDF & Tracing
    "browser_pdf_save", "browser_start_tracing", "browser_stop_tracing",
    // Install & Session
    "browser_install", "browser_session",
  ];

  const toolNames = tools.map((t) => t.name).sort();
  for (const name of toolNames) {
    const params = tools.find((t) => t.name === name)?.inputSchema;
    const paramKeys = params && typeof params === "object" && "properties" in params
      ? Object.keys(params.properties as Record<string, unknown>)
      : [];
    console.log(`    ${name}(${paramKeys.join(", ")})`);
  }

  console.log("");

  // Check all expected tools exist
  const missing = expectedTools.filter((t) => !toolNames.includes(t));
  const extra = toolNames.filter((t) => !expectedTools.includes(t));

  if (missing.length === 0) {
    ok(`All ${expectedTools.length} expected tools registered`);
  } else {
    fail(`Missing tools: ${missing.join(", ")}`);
  }

  if (extra.length > 0) {
    console.log(`  ℹ️  Extra tools: ${extra.join(", ")}`);
  }

  if (tools.length === expectedTools.length) {
    ok(`Tool count matches: ${tools.length}`);
  } else {
    fail(`Tool count mismatch: got ${tools.length}, expected ${expectedTools.length}`);
  }

  // ── Test browser_session status (no browser needed) ──
  console.log("\n[3] Testing browser_session (status)...");
  try {
    const result = await client.callTool({ name: "browser_session", arguments: { action: "status" } });
    const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
    if (text.includes("Not connected") || text.includes("Connected")) {
      ok(`browser_session works: "${text.substring(0, 80)}"`);
    } else {
      fail(`Unexpected response: ${text}`);
    }
  } catch (err) {
    fail(`browser_session failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Browser tools (only if --with-browser) ──
  if (WITH_BROWSER) {
    console.log("\n[4] Testing browser tools (Chrome + Playwriter extension required)...");

    // Navigate
    console.log("  Testing browser_navigate...");
    try {
      const result = await client.callTool({
        name: "browser_navigate",
        arguments: { url: "https://example.com" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      if (text.includes("example.com") || text.includes("Example Domain")) {
        ok("browser_navigate → example.com");
      } else {
        fail(`Navigate unexpected response: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      fail(`browser_navigate failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Snapshot
    console.log("  Testing browser_snapshot...");
    try {
      const result = await client.callTool({ name: "browser_snapshot", arguments: {} });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      if (text.includes("Example Domain") || text.includes("ref")) {
        ok(`browser_snapshot returned ${text.length} chars`);
      } else {
        fail(`Snapshot unexpected: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      fail(`browser_snapshot failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Screenshot
    console.log("  Testing browser_take_screenshot...");
    try {
      const result = await client.callTool({
        name: "browser_take_screenshot",
        arguments: { type: "png" },
      });
      const content = result.content as Array<{ type: string; data?: string; mimeType?: string }>;
      const img = content.find((c) => c.type === "image");
      if (img?.data && img.data.length > 100) {
        ok(`browser_take_screenshot returned ${img.data.length} bytes base64`);
      } else {
        fail("Screenshot returned no image data");
      }
    } catch (err) {
      fail(`browser_take_screenshot failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Tabs
    console.log("  Testing browser_tabs (list)...");
    try {
      const result = await client.callTool({
        name: "browser_tabs",
        arguments: { action: "list" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      if (text.includes("Tabs (")) {
        ok(`browser_tabs: ${text.substring(0, 80)}`);
      } else {
        fail(`Tabs unexpected: ${text}`);
      }
    } catch (err) {
      fail(`browser_tabs failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Console messages
    console.log("  Testing browser_console_messages...");
    try {
      const result = await client.callTool({
        name: "browser_console_messages",
        arguments: { level: "info" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      ok(`browser_console_messages: "${text.substring(0, 60)}"`);
    } catch (err) {
      fail(`browser_console_messages failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Evaluate
    console.log("  Testing browser_evaluate...");
    try {
      const result = await client.callTool({
        name: "browser_evaluate",
        arguments: { function: "() => document.title" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      if (text.includes("Example Domain")) {
        ok(`browser_evaluate returned: "${text}"`);
      } else {
        fail(`Evaluate unexpected: ${text}`);
      }
    } catch (err) {
      fail(`browser_evaluate failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    console.log("\n[4] Skipping browser tools (pass --with-browser to test)");
  }

  // ── Summary ──
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  await client.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
