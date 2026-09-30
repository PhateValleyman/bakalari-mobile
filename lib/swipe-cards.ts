export function getSwipeCardIndex(offsetX: number, cardWidth: number, cardCount: number): number {
  if (cardCount <= 0 || cardWidth <= 0) return 0;
  const nextIndex = Math.round(Math.max(0, offsetX) / cardWidth);
  return Math.min(Math.max(nextIndex, 0), cardCount - 1);
}
