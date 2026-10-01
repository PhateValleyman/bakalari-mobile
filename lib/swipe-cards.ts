export function getSwipeCardIndex(offsetX: number, cardWidth: number, cardCount: number): number {
  if (cardCount <= 0 || cardWidth <= 0 || !Number.isFinite(offsetX)) return 0;
  return Math.min(cardCount - 1, Math.max(0, Math.round(offsetX / cardWidth)));
}
