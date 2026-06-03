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

/** Floating card shell (artist panel, legend, title). */
export const floatingPanelCardClassName = cn("flex flex-col gap-0 py-0", glassCardClassName);

/** Title card in top-left — slightly more vertical padding than side panels. */
export const titlePanelCardClassName = cn("flex flex-col gap-0 py-4", glassCardClassName);

export const panelHeaderClassName = cn(
  "grid-rows-none flex shrink-0 flex-col gap-3 border-b border-border/50 pt-4 pb-4",
  panelX
);

export const panelBodyClassName = cn("py-4", panelX);

export const panelFooterClassName = cn(
  "mt-auto shrink-0 flex flex-wrap gap-2 border-t border-border/50 bg-transparent py-3",
  panelX
);
