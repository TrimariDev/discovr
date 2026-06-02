const palette = ["#4dd7a8", "#7cc7ff", "#ffcf5a", "#ff7f9f", "#b8a1ff", "#7fe7f0", "#f59f68"];

export function communityColor(communityId: number) {
  return palette[Math.abs(communityId) % palette.length];
}

export function communityColorWithAlpha(communityId: number, alpha: number) {
  const color = communityColor(communityId);
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`;
}
