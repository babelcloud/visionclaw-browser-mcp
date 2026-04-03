import { chromium, type Browser, type BrowserContext, type Page } from "@xmorse/playwright-core";
import { startPlayWriterCDPRelayServer, getCdpUrl, type RelayServer } from "playwriter";
import { execFile } from "node:child_process";
import net from "node:net";
import type { Config } from "../config.js";
import { BrowserState } from "./state.js";

const CONNECT_TIMEOUT = 15_000;

function isPortInUse(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", () => resolve(true))
      .once("listening", () => { tester.close(() => resolve(false)); })
      .listen(port, host);
  });
}

export class BrowserConnection {
  private _browser: Browser | null = null;
  private _context: BrowserContext | null = null;
  private _relay: RelayServer | null = null;
  private _connecting = false;

  readonly state = new BrowserState();

  constructor(private readonly config: Config) {}

  get isConnected(): boolean {
    return this._browser?.isConnected() ?? false;
  }

  /**
   * Start the Playwriter CDP relay (if not already running) and connect
   * to the Chrome extension via `connectOverCDP`.
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;
    if (this._connecting) return;
    this._connecting = true;

    try {
      // Start relay server only if port is free
      const portBusy = await isPortInUse(this.config.relayPort, this.config.relayHost);
      if (portBusy) {
        console.log(`[browser] Relay port ${this.config.relayPort} already in use, connecting to existing`);
      } else {
        this._relay = await startPlayWriterCDPRelayServer({
          port: this.config.relayPort,
          host: this.config.relayHost,
          logger: { log: () => {}, error: console.error },
        });
      }

      // Resolve extensionId: use config, or auto-detect the first one
      let extensionId = this.config.extensionId || undefined;
      if (!extensionId) {
        extensionId = await this._resolveFirstExtension();
      }

      const cdpUrl = getCdpUrl({
        port: this.config.relayPort,
        host: this.config.relayHost,
        extensionId,
      });
      console.log(`[browser] Connecting to extension: ${extensionId ?? "(auto)"}`);


      this._browser = await chromium.connectOverCDP(cdpUrl, {
        timeout: CONNECT_TIMEOUT,
      });

      const contexts = this._browser.contexts();
      this._context = contexts[0] ?? await this._browser.newContext();

      // Attach listeners to all existing pages
      for (const page of this._context.pages()) {
        this.state.attachPageListeners(page);
      }

      // Attach listeners to future pages
      this._context.on("page", (page: Page) => {
        this.state.attachPageListeners(page);
      });

      this._browser.on("disconnected", () => {
        console.log("[browser] Disconnected from Chrome");
        this._browser = null;
        this._context = null;
      });

      console.log(`[browser] Connected via CDP relay (${this._context.pages().length} pages)`);
    } finally {
      this._connecting = false;
    }
  }

  /**
   * Ensure connected and return the current active page.
   * Creates a new page if none exist.
   */
  async getPage(): Promise<Page> {
    if (!this.isConnected) {
      await this.connect();
    }

    const context = this._context;
    if (!context) {
      throw new Error("Not connected. Ensure Chrome is open with the Playwriter extension activated.");
    }

    let page = this.state.getPage(context);
    if (!page || page.isClosed()) {
      page = await context.newPage();
      this.state.currentPageIndex = context.pages().indexOf(page);
      this.state.attachPageListeners(page);
    }

    return page;
  }

  /**
   * Return the browser context (for tab management).
   */
  async getContext(): Promise<BrowserContext> {
    if (!this.isConnected) {
      await this.connect();
    }
    if (!this._context) {
      throw new Error("Not connected. Ensure Chrome is open with the Playwriter extension activated.");
    }
    return this._context;
  }

  /**
   * Run `playwriter browser list` to find the first connected extension key.
   */
  private async _resolveFirstExtension(): Promise<string | undefined> {
    try {
      const output = await new Promise<string>((resolve, reject) => {
        execFile("playwriter", ["browser", "list"], { timeout: 10_000 }, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      });
      // Parse lines like: "profile:104623951740642372686  extension  Chrome   user@email.com"
      for (const line of output.split("\n")) {
        const match = line.match(/^(profile:\S+)\s+extension/);
        if (match) {
          console.log(`[browser] Auto-selected extension: ${match[1]}`);
          return match[1];
        }
      }
    } catch {
      // CLI not available
    }
    return undefined;
  }

  async disconnect(): Promise<void> {
    if (this._browser) {
      // Don't close the browser — it's the user's real Chrome
      this._browser = null;
      this._context = null;
    }
    if (this._relay) {
      this._relay.close();
      this._relay = null;
    }
  }
}
