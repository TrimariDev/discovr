const palette = ["#4dd7a8", "#7cc7ff", "#ffcf5a", "#ff7f9f", "#b8a1ff", "#7fe7f0", "#f59f68"];

export function communityColor(communityId: number) {
  return palette[Math.abs(communityId) % palette.length];
}

