import { useState, useRef, useCallback, useMemo } from 'react';
import { soundEngine } from '../../../utils/soundEngine';
import { triggerScrubHaptic } from './timelineCache';

export function useTimelineScrubber({
  renderedPoints = [],
  containerRef,
  peakPoint,
  troughPoint,
  exitPoint,
  replayIndex
}) {
  const rAFRef = useRef(null);
  const pendingClientX = useRef(null);
  const [scrubIndex, setScrubIndex] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);

  const flushScrub = useCallback(() => {
    rAFRef.current = null;
    if (pendingClientX.current === null || !renderedPoints.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = pendingClientX.current - rect.left;

    let index = 0;
    let minDistance = Infinity;
    for (let i = 0; i < renderedPoints.length; i++) {
      const dist = Math.abs(renderedPoints[i].x - cursorX);
      if (dist < minDistance) {
        minDistance = dist;
        index = i;
      }
    }

    setScrubIndex((prev) => {
      if (prev !== index) {
        triggerScrubHaptic();
        if (index === 0 || (peakPoint && index === peakPoint.index) || (troughPoint && index === troughPoint.index) || (exitPoint && index === exitPoint.index)) {
          soundEngine.playMilestoneTone?.();
        }
      }
      return index;
    });
  }, [renderedPoints, containerRef, peakPoint, troughPoint, exitPoint]);

  const updateScrubFromClientX = useCallback((clientX) => {
    pendingClientX.current = clientX;
    if (!rAFRef.current) {
      rAFRef.current = requestAnimationFrame(flushScrub);
    }
  }, [flushScrub]);

  const handleMouseMove = (e) => updateScrubFromClientX(e.clientX);
  const handleClickCanvas = (e) => {
    updateScrubFromClientX(e.clientX);
    if (scrubIndex !== null) {
      setPinnedIndex((prev) => (prev === scrubIndex ? null : scrubIndex));
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
    setScrubIndex(null);
  };

  const currentActivePoint = useMemo(() => {
    if (scrubIndex !== null && renderedPoints[scrubIndex]) {
      return renderedPoints[scrubIndex];
    }
    if (replayIndex !== null && renderedPoints[renderedPoints.length - 1]) {
      return renderedPoints[renderedPoints.length - 1];
    }
    if (pinnedIndex !== null && renderedPoints[pinnedIndex]) {
      return renderedPoints[pinnedIndex];
    }
    return null;
  }, [scrubIndex, replayIndex, pinnedIndex, renderedPoints]);

  return {
    scrubIndex,
    pinnedIndex,
    setScrubIndex,
    setPinnedIndex,
    handleMouseMove,
    handleClickCanvas,
    handleTouch,
    handleEndScrub,
    currentActivePoint
  };
}
