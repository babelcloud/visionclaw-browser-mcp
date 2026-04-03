import type { Page, BrowserContext } from "@xmorse/playwright-core";
import type { AriaSnapshotResult } from "playwriter";

export interface ConsoleEntry {
  level: string;
  text: string;
  timestamp: number;
}

export interface NetworkEntry {
  method: string;
  url: string;
  status?: number;
  resourceType: string;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
}

export interface DialogEntry {
  type: string;
  message: string;
  defaultValue?: string;
  handled: boolean;
}

export class BrowserState {
  currentPageIndex = 0;
  needsFullSnapshot = true;
  lastSnapshot: AriaSnapshotResult | null = null;
  consoleEntries: ConsoleEntry[] = [];
  networkEntries: NetworkEntry[] = [];
  pendingDialogs: DialogEntry[] = [];

  private _listenersAttached = new WeakSet<Page>();

  resetForNavigation(): void {
    this.needsFullSnapshot = true;
  }

  attachPageListeners(page: Page): void {
    if (this._listenersAttached.has(page)) return;
    this._listenersAttached.add(page);

    page.on("console", (msg) => {
      this.consoleEntries.push({
        level: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
      // Cap at 500 entries
      if (this.consoleEntries.length > 500) {
        this.consoleEntries = this.consoleEntries.slice(-300);
      }
    });

    page.on("request", (req) => {
      this.networkEntries.push({
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
        timestamp: Date.now(),
      });
      if (this.networkEntries.length > 500) {
        this.networkEntries = this.networkEntries.slice(-300);
      }
    });

    page.on("response", (resp) => {
      const entry = this.networkEntries.find(
        (e) => e.url === resp.url() && e.status === undefined,
      );
      if (entry) {
        entry.status = resp.status();
      }
    });

    page.on("dialog", (dialog) => {
      this.pendingDialogs.push({
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
        handled: false,
      });
      // Auto-dismiss after 30s to prevent blocking
      setTimeout(() => {
        dialog.dismiss().catch(() => {});
      }, 30_000);
    });
  }

  getPage(context: BrowserContext): Page | null {
    const pages = context.pages();
    if (pages.length === 0) return null;
    if (this.currentPageIndex >= pages.length) {
      this.currentPageIndex = pages.length - 1;
    }
    return pages[this.currentPageIndex] ?? null;
  }
}
