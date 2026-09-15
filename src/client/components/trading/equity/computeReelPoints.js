export function computeReelPoints(equityPoints, reelFilter, reelSort, reelPage, pageSize = 25) {
  let list = equityPoints.map((p, originalIndex) => ({ ...p, originalIndex }));
  if (reelFilter === "win") list = list.filter((p) => p.originalIndex > 0 && p.pnl >= 0);
  else if (reelFilter === "loss") list = list.filter((p) => p.originalIndex > 0 && p.pnl < 0);

  if (reelSort === "newest") {
    const tradesOnly = list.filter((p) => p.originalIndex > 0).reverse();
    list = [...tradesOnly, ...list.filter((p) => p.originalIndex === 0)];
  }

  const total = list.length;
  const computedPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(reelPage, computedPages);
  return {
    displayReelPoints: list.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalReelMatches: total,
    totalPages: computedPages,
    currentPage: safePage,
  };
}
