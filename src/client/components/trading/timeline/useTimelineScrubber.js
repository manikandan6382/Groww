import { useState, useRef, useCallback, useMemo } from 'react';
import { soundEngine } from '../../../utils/soundEngine';
import { triggerScrubHaptic } from './timelineCache';

export function useTimelineScrubber({
  renderedPoints = [],
  containerRef,
  entryPoint,
  peakPoint,
  troughPoint,
  exitPoint,
  replayIndex
}) {
  const rAFRef = useRef(null);
  const pendingClientX = useRef(null);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [latchedIndex, setLatchedIndex] = useState(null);

  const resolveNearestIndex = useCallback((clientX) => {
    if (!renderedPoints.length || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = clientX - rect.left;

    // 12px Magnetic Milestone Snapping
    const SNAP_THRESHOLD_PX = 12;
    const milestones = [
      entryPoint && { index: entryPoint.index ?? 0, x: entryPoint.x },
      peakPoint && { index: peakPoint.index, x: peakPoint.x },
      troughPoint && { index: troughPoint.index, x: troughPoint.x },
      exitPoint && { index: exitPoint.index, x: exitPoint.x }
    ].filter(Boolean);

    for (const m of milestones) {
      if (typeof m.x === 'number' && Math.abs(m.x - cursorX) <= SNAP_THRESHOLD_PX) {
        if (m.index >= 0 && m.index < renderedPoints.length) {
          return m.index;
        }
      }
    }

    let index = 0;
    let minDistance = Infinity;
    for (let i = 0; i < renderedPoints.length; i++) {
      const dist = Math.abs(renderedPoints[i].x - cursorX);
      if (dist < minDistance) {
        minDistance = dist;
        index = i;
      }
    }
    return index;
  }, [renderedPoints, containerRef, entryPoint, peakPoint, troughPoint, exitPoint]);

  const flushScrub = useCallback(() => {
    rAFRef.current = null;
    if (pendingClientX.current === null) return;
    const index = resolveNearestIndex(pendingClientX.current);
    if (index === null) return;

    setScrubIndex((prev) => {
      if (prev !== index) {
        triggerScrubHaptic();
        if (index === 0 || (peakPoint && index === peakPoint.index) || (troughPoint && index === troughPoint.index) || (exitPoint && index === exitPoint.index)) {
          soundEngine.playMilestoneTone?.();
        }
      }
      return index;
    });
    setLatchedIndex(index);
  }, [resolveNearestIndex, peakPoint, troughPoint, exitPoint]);

  const updateScrubFromClientX = useCallback((clientX) => {
    pendingClientX.current = clientX;
    if (!rAFRef.current) {
      rAFRef.current = requestAnimationFrame(flushScrub);
    }
  }, [flushScrub]);

  const handleMouseMove = (e) => updateScrubFromClientX(e.clientX);

  const handleClickCanvas = (e) => {
    const clickedIdx = resolveNearestIndex(e.clientX);
    if (clickedIdx !== null) {
      setPinnedIndex((prev) => (prev === clickedIdx ? null : clickedIdx));
      setScrubIndex(clickedIdx);
      setLatchedIndex(clickedIdx);
    }
  };

  const handleTouch = (e) => {
    if (e.touches && e.touches[0]) {
      updateScrubFromClientX(e.touches[0].clientX);
    }
  };

  const handleEndScrub = () => {
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    pendingClientX.current = null;
    // Keep latchedIndex so the telemetry callout does not vanish jarringly
  };

  const clearScrub = useCallback(() => {
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
    pendingClientX.current = null;
    setScrubIndex(null);
    setPinnedIndex(null);
    setLatchedIndex(null);
  }, []);

  const currentActivePoint = useMemo(() => {
    if (pinnedIndex !== null && renderedPoints[pinnedIndex]) {
      return renderedPoints[pinnedIndex];
    }
    if (scrubIndex !== null && renderedPoints[scrubIndex]) {
      return renderedPoints[scrubIndex];
    }
    if (latchedIndex !== null && renderedPoints[latchedIndex]) {
      return renderedPoints[latchedIndex];
    }
    if (replayIndex !== null && renderedPoints[renderedPoints.length - 1]) {
      return renderedPoints[renderedPoints.length - 1];
    }
    return null;
  }, [pinnedIndex, scrubIndex, latchedIndex, replayIndex, renderedPoints]);

  return {
    scrubIndex,
    pinnedIndex,
    isPinned: pinnedIndex !== null,
    setScrubIndex,
    setPinnedIndex,
    clearScrub,
    handleMouseMove,
    handleClickCanvas,
    handleTouch,
    handleEndScrub,
    currentActivePoint
  };
}

