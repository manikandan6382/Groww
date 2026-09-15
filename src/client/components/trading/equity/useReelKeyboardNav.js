import { useEffect } from "react";

export function useReelKeyboardNav(data) {
  const handleReelKeyDown = (e) => {
    if (!data.displayReelPoints || data.displayReelPoints.length === 0) return;

    if (e.key === "Escape") {
      data.playScrubAudio();
      data.setSelectedId(null);
      data.setScrubIndex(null);
      return;
    }

    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;

    const currentIdx = data.displayReelPoints.findIndex((p) => p.id === data.activePoint?.id);
    const cols = window.innerWidth >= 1280 ? 5 : window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 2 : 1;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (currentIdx >= data.displayReelPoints.length - 1 && data.currentPage < data.totalPages) {
        data.playScrubAudio();
        data.setReelPage((p) => p + 1);
        return;
      }
      const targetIdx = currentIdx < 0 ? 0 : Math.min(data.displayReelPoints.length - 1, currentIdx + 1);
      if (targetIdx >= 0 && data.displayReelPoints[targetIdx]) {
        data.playScrubAudio();
        data.setSelectedId(data.displayReelPoints[targetIdx].id);
        data.setScrubIndex(null);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (currentIdx === 0 && data.currentPage > 1) {
        data.playScrubAudio();
        data.setReelPage((p) => p - 1);
        return;
      }
      const targetIdx = currentIdx < 0 ? data.displayReelPoints.length - 1 : Math.max(0, currentIdx - 1);
      if (targetIdx >= 0 && data.displayReelPoints[targetIdx]) {
        data.playScrubAudio();
        data.setSelectedId(data.displayReelPoints[targetIdx].id);
        data.setScrubIndex(null);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const targetIdx = currentIdx < 0 ? 0 : Math.min(data.displayReelPoints.length - 1, currentIdx + cols);
      if (targetIdx >= 0 && data.displayReelPoints[targetIdx]) {
        data.playScrubAudio();
        data.setSelectedId(data.displayReelPoints[targetIdx].id);
        data.setScrubIndex(null);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const targetIdx = currentIdx < 0 ? 0 : Math.max(0, currentIdx - cols);
      if (targetIdx >= 0 && data.displayReelPoints[targetIdx]) {
        data.playScrubAudio();
        data.setSelectedId(data.displayReelPoints[targetIdx].id);
        data.setScrubIndex(null);
      }
    }
  };

  useEffect(() => {
    const onGlobalKeyDown = (e) => {
      if (e.target?.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
        return;
      }
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Escape"].includes(e.key)) {
        handleReelKeyDown(e);
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [data.displayReelPoints, data.activePoint, data.currentPage, data.totalPages]);

  return { handleReelKeyDown };
}
