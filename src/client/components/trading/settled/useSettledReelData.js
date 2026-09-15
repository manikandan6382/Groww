import { useState, useMemo } from "react";
import { soundEngine } from "../../../utils/soundEngine";
import { normalizeTrade } from "../../../utils/tradeNormalizer";

export const PAGE_SIZE = 25;

export function useSettledReelData({
  equityPoints = [],
  activePoint = null,
  onSelectTrade,
  onSnapLatest,
}) {
  const [reelFilter, setReelFilter] = useState("all"); // "all" | "win" | "loss"
  const [reelSort, setReelSort] = useState("newest");  // "newest" | "chrono"
  const [reelPage, setReelPage] = useState(1);

  const playAudio = () => {
    if (typeof soundEngine?.playScrub === "function") {
      soundEngine.playScrub();
    }
  };

  const displayReelPoints = useMemo(() => {
    if (!equityPoints.length) return [];
    let pts = equityPoints.map((p) => normalizeTrade(p));

    if (reelFilter === "win") {
      pts = pts.filter((p) => p.id === "genesis-origin" || p.pnl >= 0);
    } else if (reelFilter === "loss") {
      pts = pts.filter((p) => p.id === "genesis-origin" || p.pnl < 0);
    }

    if (reelSort === "newest") {
      const genesis = pts.find((p) => p.id === "genesis-origin");
      const regular = pts.filter((p) => p.id !== "genesis-origin").reverse();
      return genesis ? [genesis, ...regular] : regular;
    }

    return pts;
  }, [equityPoints, reelFilter, reelSort]);

  const totalReelMatches = displayReelPoints.length;
  const totalPages = Math.ceil(totalReelMatches / PAGE_SIZE) || 1;
  const currentPage = Math.min(reelPage, totalPages);
  const paginatedPoints = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayReelPoints.slice(start, start + PAGE_SIZE);
  }, [displayReelPoints, currentPage]);

  const handleKeyDown = (e) => {
    if (!displayReelPoints.length) return;
    const currentIdx = displayReelPoints.findIndex((p) => p.id === activePoint?.id);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      playAudio();
      const nextIdx = currentIdx < displayReelPoints.length - 1 ? currentIdx + 1 : 0;
      onSelectTrade(displayReelPoints[nextIdx].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      playAudio();
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : displayReelPoints.length - 1;
      onSelectTrade(displayReelPoints[prevIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      playAudio();
      onSnapLatest();
    }
  };

  return {
    reelFilter,
    setReelFilter,
    reelSort,
    setReelSort,
    reelPage,
    setReelPage,
    playAudio,
    displayReelPoints,
    totalReelMatches,
    totalPages,
    currentPage,
    paginatedPoints,
    handleKeyDown,
  };
}
