import { cn } from "@/lib/utils";

/**
 * Semi-transparent panels — search input and floating cards.
 * Color: --discovr-surface in globals.css (no backdrop blur).
 */
export const panelSurfaceClassName =
  "border-border/70 bg-[var(--discovr-surface)] dark:bg-[var(--discovr-surface)]";

/** Floating cards: same surface as search, light shadow only. */
export const glassCardClassName = cn(panelSurfaceClassName, "shadow-sm");

/** Search results dropdown — more opaque than panels (--discovr-surface-dropdown in .dark). */
export const searchDropdownCardClassName = cn(
  "border-border/70 bg-discovr-surface-dropdown dark:bg-discovr-surface-dropdown",
  "shadow-sm"
);

/** Shared horizontal inset for panel header, body, and footer. */
export const panelX = "px-4";
