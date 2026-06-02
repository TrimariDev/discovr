"use client";

type Props = {
  onReset: () => void;
};

export function GraphControls({ onReset }: Props) {
  return (
    <div className="controls floatingPanel panel">
      <button className="iconButton" type="button" onClick={onReset} aria-label="Reset graph">
        Reset
      </button>
    </div>
  );
}

