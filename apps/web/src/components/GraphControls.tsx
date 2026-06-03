"use client";

type Props = {
  visible: boolean;
  hasActiveFilters: boolean;
  onResetView: () => void;
  onClearFilters: () => void;
  onFocusSeed: () => void;
};

export function GraphControls({ visible, hasActiveFilters, onResetView, onClearFilters, onFocusSeed }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <section className="graphControls panel" aria-label="Graph controls">
      <button type="button" className="iconButton graphControlButton" onClick={onResetView}>
        Reset view
      </button>
      <button type="button" className="iconButton graphControlButton" onClick={onFocusSeed}>
        Focus seed
      </button>
      <button
        type="button"
        className="iconButton graphControlButton"
        onClick={onClearFilters}
        disabled={!hasActiveFilters}
      >
        Clear filters
      </button>
    </section>
  );
}
