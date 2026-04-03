import fs from "node:fs";
import path from "node:path";

function validatePort(value: string, name: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name}: "${value}" — must be 1-65535`);
  }
  return port;
}

export interface Config {
  mcpPort: number;
  relayPort: number;
  relayHost: string;
  outputDir: string;
  extensionId: string;
}

export function loadConfig(): Config {
  const envFile = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  return {
    mcpPort: validatePort(process.env.MCP_PORT ?? "3280", "MCP_PORT"),
    relayPort: validatePort(process.env.PLAYWRITER_RELAY_PORT ?? "19988", "PLAYWRITER_RELAY_PORT"),
    relayHost: process.env.PLAYWRITER_RELAY_HOST ?? "127.0.0.1",
    outputDir: process.env.OUTPUT_DIR ?? path.resolve(process.cwd(), "output"),
    extensionId: process.env.PLAYWRITER_EXTENSION_ID ?? "",
  };
}
