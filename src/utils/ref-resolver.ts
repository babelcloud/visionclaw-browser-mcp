import type { AriaSnapshotResult } from "playwriter";

/**
 * Resolve a ref to a Playwright selector.
 *
 * Playwriter's getAriaSnapshot returns refs in different formats:
 * - Short ref with stable ID: "sb_form_q", "submit-btn" → getSelectorForRef handles these
 * - Auto-generated: "e1", "e2" → getSelectorForRef handles these
 * - Role selector: 'role=textbox[name="Search"]' → already a valid Playwright selector
 *
 * This function tries getSelectorForRef first, then falls back to treating the ref
 * as a direct Playwright selector if it looks like one.
 */
export function resolveRef(snapshot: AriaSnapshotResult | null, ref: string): string | null {
  if (!snapshot) return null;

  // 1. Try the official ref resolver
  const selector = snapshot.getSelectorForRef(ref);
  if (selector) return selector;

  // 2. If the ref looks like a Playwright role selector, use it directly
  //    e.g., 'role=textbox[name="Customer name:"]'
  if (ref.startsWith("role=")) return ref;

  // 3. If it looks like a CSS id selector
  if (/^[a-zA-Z][\w-]*$/.test(ref)) return `#${ref}`;

  return null;
}
