import { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../../../utils/soundEngine';
import { triggerScrubHaptic } from './timelineCache';

export function useTimelinePlayback({
  allPoints = [],
  peakPoint,
  troughPoint,
  exitPoint,
  onClose,
  carouselNav,
  onSwitchFlightScope,
  setFlightScope,
  setScrubIndex
}) {
  const replayTimerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(null);
  const [replaySpeed, setReplaySpeed] = useState(1);

  // Replay Animation Engine with Teardown & Milestone Haptic Telemetry
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(25, Math.round(180 / replaySpeed));
      replayTimerRef.current = setInterval(() => {
        setReplayIndex((prev) => {
          const next = (prev === null ? 0 : prev) + 1;
          if (next >= allPoints.length) {
            setIsPlaying(false);
            return allPoints.length - 1;
          }
          triggerScrubHaptic();
          if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
            soundEngine.playMilestoneTone?.();
          }
          return next;
        });
      }, intervalMs);
    } else if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
        replayTimerRef.current = null;
      }
    };
  }, [isPlaying, replaySpeed, allPoints.length, peakPoint, troughPoint, exitPoint]);

  const handleTogglePlay = () => {
    soundEngine.playTabSwitchTone?.();
    if (replayIndex === null || replayIndex >= allPoints.length - 1) {
      setReplayIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleResetReplay = () => {
    soundEngine.playTabSwitchTone?.();
    setIsPlaying(false);
    setReplayIndex(null);
    setScrubIndex?.(null);
  };

  const handleStepForward = () => {
    soundEngine.playTabSwitchTone?.();
    setIsPlaying(false);
    setReplayIndex((prev) => {
      const current = prev === null ? allPoints.length - 1 : prev;
      const next = Math.min(allPoints.length - 1, current + 1);
      triggerScrubHaptic();
      if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
        soundEngine.playMilestoneTone?.();
      }
      return next;
    });
  };

  const handleStepBack = () => {
    soundEngine.playTabSwitchTone?.();
    setIsPlaying(false);
    setReplayIndex((prev) => {
      const current = prev === null ? allPoints.length - 1 : prev;
      const next = Math.max(0, current - 1);
      triggerScrubHaptic();
      if (next === 0 || (peakPoint && next === peakPoint.index) || (troughPoint && next === troughPoint.index) || (exitPoint && next === exitPoint.index)) {
        soundEngine.playMilestoneTone?.();
      }
      return next;
    });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;

      if (e.key === 'Escape') {
        if (typeof onClose === 'function') onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J' || e.key === '[') {
        if (carouselNav?.hasPrev && typeof carouselNav.onPrev === 'function') {
          e.preventDefault();
          carouselNav.onPrev();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K' || e.key === ']') {
        if (carouselNav?.hasNext && typeof carouselNav.onNext === 'function') {
          e.preventDefault();
          carouselNav.onNext();
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        soundEngine.playTabSwitchTone?.();
        setFlightScope?.((prev) => {
          const scopes = ['scalp', 'day', 'week', 'month'];
          const currentIdx = Math.max(0, scopes.indexOf(prev === 'expiry' ? 'day' : prev));
          const next = scopes[(currentIdx + 1) % scopes.length];
          if (typeof onSwitchFlightScope === 'function') onSwitchFlightScope(next);
          return next;
        });
      } else if (e.key === '1') setReplaySpeed(1);
      else if (e.key === '2') setReplaySpeed(2);
      else if (e.key === '4') setReplaySpeed(4);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, carouselNav, onSwitchFlightScope, setFlightScope, replayIndex, allPoints.length, isPlaying]);

  return {
    isPlaying,
    replayIndex,
    replaySpeed,
    setReplayIndex,
    setReplaySpeed,
    handleTogglePlay,
    handleResetReplay,
    handleStepForward,
    handleStepBack
  };
}
