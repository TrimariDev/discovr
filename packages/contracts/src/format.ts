/** Display form for artist names (graph labels, search dropdown). */
export function titleCaseArtistName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return trimmed;
  }

  // Keep punctuation-heavy names (e.g. "R.E.M.", "AC/DC") as-is.
  if (/[./\\]/.test(trimmed)) {
    return trimmed;
  }

  const words = trimmed.split(/\s+/g);

  return words
    .map((word) =>
      word
        .split("-")
        .map((segment) => {
          const lower = segment.toLocaleLowerCase();
          return lower ? lower.charAt(0).toLocaleUpperCase() + lower.slice(1) : lower;
        })
        .join("-")
    )
    .join(" ");
}
