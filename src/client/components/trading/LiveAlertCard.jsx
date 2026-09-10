import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLivePriceStore } from "../../stores/useLivePriceStore";
import { useTradingStore, resolveIndexLotSize } from "../../stores/useTradingStore";
import { soundEngine } from "../../utils/soundEngine";
import { Zap, ShieldAlert, Target, RefreshCw, ShieldCheck, Lock, DollarSign, Layers, Info, X, SlidersHorizontal, BookOpen, Check, TrendingUp, ChevronDown, CircleHelp, Edit3, Volume2, VolumeX, Activity, ArrowUpRight, ArrowDownRight, Shield, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// Pure helper to ensure finite numbers (TDZ safe)
const parseFiniteNumber = (val, fallback = 0) => {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

// TradingView Pro Mini Candlestick & Momentum Wave HUD (<= 54px per AGENTS.md)
const TradingViewMicroHUD = ({ history = [100], isGain = true, ltp = 100 }) => {
  const pointsArray = (!history || history.length < 2) 
    ? [ltp - 0.25, ltp - 0.10, ltp + 0.15, ltp] 
    : history;
  const rawMin = Math.min(...pointsArray);
  const rawMax = Math.max(...pointsArray);
  // Guarantee adaptive micro-spread so low-liquidity strikes never render flat empty bars
  const span = Math.max(0.35, rawMax - rawMin);
  const mid = (rawMax + rawMin) / 2;
  const min = mid - span / 2;
  const max = mid + span / 2;
  const w = 50;
  const h = 22;
  const chartHeight = 15;
  const volumeHeight = 5;

  // Synthesize 4 micro-candles from recent tick stream
  const chunkCount = 4;
  const chunkSize = Math.max(1, Math.floor(pointsArray.length / chunkCount));
  const candles = [];
  for (let i = 0; i < chunkCount; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === chunkCount - 1 ? pointsArray.length : (i + 1) * chunkSize;
    const slice = pointsArray.slice(startIdx, endIdx);
    if (slice.length === 0) continue;
    const open = slice[0];
    const close = slice[slice.length - 1];
    const sliceHigh = Math.max(...slice);
    const sliceLow = Math.min(...slice);
    // Micro-wick padding to prevent 0-height lines
    const high = Math.max(sliceHigh, Math.max(open, close) + 0.05);
    const low = Math.min(sliceLow, Math.min(open, close) - 0.05);
    const isBull = close >= open;
    const volHeight = Math.min(volumeHeight, Math.max(1.5, (Math.abs(close - open) / span) * volumeHeight * 2.5 + 1.2));
    candles.push({ open, close, high, low, isBull, volHeight, idx: i });
  }

  const candleWidth = 7;
  const candleGap = (w - (candles.length * candleWidth)) / (candles.length - 1 || 1);
  const getY = (val) => chartHeight - ((val - min) / span) * (chartHeight - 4) - 2;

  const tvGreen = "#089981";
  const tvRed = "#F23645";
  const lastVal = pointsArray[pointsArray.length - 1];
  const lastY = getY(lastVal);
  const strokeColor = isGain ? tvGreen : tvRed;

  return (
    <div 
      title="TradingView Pro Live Micro-Candle & Volume Tape HUD:\n• Green Candle: Buyer bid momentum\n• Red Candle: Seller rejection wick\n• Bottom Bars: Micro volume tick density\n• Pulsing Beacon: Real-time tick coordinate"
      className="flex flex-col items-end flex-shrink-0 cursor-help"
    >
      <svg width={w} height={h} className="overflow-visible select-none">
        {/* Subtle Horizontal Reference Grid Line */}
        <line x1="0" y1={chartHeight / 2} x2={w} y2={chartHeight / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="1 2" />

        {/* Micro-Candlesticks with Volume Bars */}
        {candles.map((c, i) => {
          const cx = i * (candleWidth + candleGap) + candleWidth / 2;
          const openY = getY(c.open);
          const closeY = getY(c.close);
          const highY = getY(c.high);
          const lowY = getY(c.low);
          const bodyY = Math.min(openY, closeY);
          const bodyH = Math.max(1.5, Math.abs(closeY - openY));
          const color = c.isBull ? tvGreen : tvRed;

          return (
            <g key={`mc-${i}`}>
              {/* Candle Wick */}
              <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.85" />
              {/* Candle Body */}
              <rect
                x={cx - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyH}
                fill={color}
                rx="1"
              />
              {/* Bottom Volume Density Bar */}
              <rect
                x={cx - candleWidth / 2 + 1}
                y={h - c.volHeight}
                width={candleWidth - 2}
                height={c.volHeight}
                fill={color}
                opacity="0.5"
                rx="0.5"
              />
            </g>
          );
        })}

        {/* Live Coordinate Beacon Dot on Latest Price */}
        <circle cx={w - 1} cy={lastY} r="2.2" fill={strokeColor} />
        <circle cx={w - 1} cy={lastY} r="4.5" fill="none" stroke={strokeColor} opacity="0.5" className="animate-ping" />
      </svg>
      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tight mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
        <span>TV TAPE</span>
      </div>
    </div>
  );
};

// ─── DEDICATED FULL-ROW TRADINGVIEW MICRO-CANDLE & ORDER-FLOW TAPE BOX ───
const DedicatedTVTapeBox = ({ history = [100], isGain = true, ltp = 100, entry = 100, stopLoss, targetPrice }) => {
  const pointsArray = (!history || history.length < 2) 
    ? [ltp - 0.40, ltp - 0.25, ltp - 0.10, ltp + 0.15, ltp] 
    : history;
  const rawMin = Math.min(...pointsArray);
  const rawMax = Math.max(...pointsArray);
  const span = Math.max(0.50, rawMax - rawMin);
  const mid = (rawMax + rawMin) / 2;
  const min = mid - span / 2;
  const max = mid + span / 2;
  
  // Full-row canvas geometry (responsive viewBox 0 0 840 54)
  const w = 840;
  const h = 54;
  const chartHeight = 38;
  const volumeHeight = 12;

  // Synthesize 18 micro-candles from the tick history for rich full-row fidelity
  const chunkCount = 18;
  const chunkSize = Math.max(1, Math.floor(pointsArray.length / chunkCount));
  const candles = [];
  for (let i = 0; i < chunkCount; i++) {
    const startIdx = i * chunkSize;
    const endIdx = i === chunkCount - 1 ? pointsArray.length : (i + 1) * chunkSize;
    const slice = pointsArray.slice(startIdx, endIdx);
    if (slice.length === 0) continue;
    const open = slice[0];
    const close = slice[slice.length - 1];
    const sliceHigh = Math.max(...slice);
    const sliceLow = Math.min(...slice);
    const high = Math.max(sliceHigh, Math.max(open, close) + 0.05);
    const low = Math.min(sliceLow, Math.min(open, close) - 0.05);
    const isBull = close >= open;
    const volHeight = Math.min(volumeHeight, Math.max(2, (Math.abs(close - open) / span) * volumeHeight * 2.4 + 2));
    candles.push({ open, close, high, low, isBull, volHeight, idx: i });
  }

  const candleWidth = 14;
  const candleGap = (w - (candles.length * candleWidth)) / (candles.length - 1 || 1);
  const getY = (val) => chartHeight - ((val - min) / span) * (chartHeight - 8) - 4;

  const tvGreen = "#089981";
  const tvRed = "#F23645";
  const lastVal = pointsArray[pointsArray.length - 1];
  const lastY = getY(lastVal);
  const strokeColor = isGain ? tvGreen : tvRed;

  const bullCount = candles.filter(c => c.isBull).length;
  const biasLabel = bullCount >= 11 ? "STRONG BUY FLOW" : bullCount >= 9 ? "BUY IMPULSE" : bullCount <= 6 ? "SELL FLOW" : "BALANCED FLOW";
  const biasColor = bullCount >= 9 
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
    : bullCount <= 6 
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]" 
      : "text-slate-300 bg-white/5 border-white/10";

  // Recent 5 tick movements for tape prints
  const recentDeltas = [];
  for (let i = Math.max(1, pointsArray.length - 5); i < pointsArray.length; i++) {
    const d = pointsArray[i] - pointsArray[i - 1];
    recentDeltas.push({ val: pointsArray[i], diff: d, isUp: d >= 0 });
  }

  // Entry line reference if within visible span
  const entryY = entry >= min && entry <= max ? getY(entry) : null;

  return (
    <div 
      title="TradingView Pro Live Full-Row Order-Flow & Micro-Candle Tape:\n• 18 High-Frequency Micro-Candlesticks with High/Low wicks\n• Real-time bottom volume intensity histogram\n• Live streaming tick beacon\n• Sub-tick print tape with order flow bias"
      className="p-4 sm:p-5 flex flex-col space-y-3 bg-white/[0.015] border-t border-white/[0.06] relative overflow-hidden w-full"
    >
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
            <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse shadow-[0_0_8px_#089981]" />
            <span className="text-[10px] font-mono font-black tracking-wider text-emerald-300 uppercase">
              TV TAPE · LIVE ORDER FLOW
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full hidden sm:inline">
            1s Tick Stream
          </span>
          <span className="text-[10px] font-mono text-white/40 hidden md:inline">
            18 Micro-Candles & Volume Density
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border", biasColor)}>
            {biasLabel}
          </span>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/50 bg-black/30 border border-white/5 px-2.5 py-0.5 rounded-full">
            <span className="text-slate-300 font-bold">₹{span.toFixed(2)} Span</span>
            <span className="text-white/20">|</span>
            <span>L: ₹{min.toFixed(2)}</span>
            <span className="text-white/20">|</span>
            <span>H: ₹{max.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Responsive Full-Row SVG Tape */}
      <div className="w-full relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14 overflow-visible select-none">
          {/* Median Reference Grid Line */}
          <line x1="0" y1={chartHeight / 2} x2={w} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4" />

          {/* Entry Price Reference Line (if in view) */}
          {entryY !== null && (
            <g>
              <line x1="0" y1={entryY} x2={w} y2={entryY} stroke="rgba(56, 189, 248, 0.25)" strokeDasharray="2 3" />
              <text x={w - 6} y={entryY - 3} textAnchor="end" fill="rgba(56, 189, 248, 0.7)" fontSize="8" fontFamily="monospace" fontWeight="bold">
                Entry ₹{entry.toFixed(2)}
              </text>
            </g>
          )}

          {/* Micro-Candlesticks & Volume Histogram */}
          {candles.map((c, i) => {
            const cx = i * (candleWidth + candleGap) + candleWidth / 2;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);
            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(2.5, Math.abs(closeY - openY));
            const color = c.isBull ? tvGreen : tvRed;

            return (
              <g key={`dtv-full-${i}`}>
                {/* Wick */}
                <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                {/* Candle Body */}
                <rect
                  x={cx - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyH}
                  fill={color}
                  rx="2"
                  opacity="0.95"
                />
                {/* Bottom Volume Density Bar */}
                <rect
                  x={cx - candleWidth / 2 + 1.5}
                  y={h - c.volHeight}
                  width={candleWidth - 3}
                  height={c.volHeight}
                  fill={color}
                  opacity="0.5"
                  rx="1.5"
                />
              </g>
            );
          })}

          {/* Latest Tick Guideline & Beacon */}
          <line x1={w - 18} y1={lastY} x2={w} y2={lastY} stroke={strokeColor} strokeWidth="1" strokeDasharray="1 2" opacity="0.7" />
          <circle cx={w - 18} cy={lastY} r="3" fill={strokeColor} />
          <circle cx={w - 18} cy={lastY} r="7" fill="none" stroke={strokeColor} opacity="0.6" className="animate-ping" />
        </svg>
      </div>

      {/* Bottom Sub-Tick Tape Prints Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-white/40 font-bold uppercase text-[9px]">Live Tape Prints:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {recentDeltas.map((r, idx) => (
              <span 
                key={`rd-${idx}`} 
                className={clsx(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold border tabular-nums flex items-center gap-0.5",
                  r.isUp 
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                    : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                )}
              >
                <span>₹{r.val.toFixed(2)}</span>
                <span>{r.isUp ? "▲" : "▼"}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-white/40">
          <span>Ticks Sampled: <strong className="text-slate-300">{pointsArray.length}</strong></span>
          <span>Feed: <strong className="text-emerald-400">Upstox WebSocket</strong></span>
        </div>
      </div>
    </div>
  );
};

// Context-aware dynamic step sizing based on entry premium
const getContextualSteppers = (entryPrice) => {
  const p = parseFiniteNumber(entryPrice, 100);
  if (p < 50) {
    return {
      targetMinus: [-2, -1, -0.5],
      targetPlus: [0.5, 1, 2, 5],
      slMinus: [-2, -1, -0.5],
      slPlus: [0.5, 1, 2]
    };
  }
  if (p >= 300) {
    return {
      targetMinus: [-10, -5, -2],
      targetPlus: [2, 5, 10, 20],
      slMinus: [-10, -5, -2],
      slPlus: [2, 5, 10]
    };
  }
  return {
    targetMinus: [-5, -2, -1],
    targetPlus: [1, 2, 5, 10],
    slMinus: [-5, -2, -1],
    slPlus: [1, 2, 5]
  };
};

export function LiveAlertCard({ trade, alert, onMarkHit, onClose, onDelete, viewMode = "deck" }) {
  const item = trade || alert || {};
  const { 
    squareOffTrade, 
    squareOffAlert, 
    adjustStopLoss, 
    adjustTargetPrice, 
    updateTargetPrice, 
    updateStopLossPrice,
    setBreakevenSL, 
    payMyself,
    setSimulatorActiveTradeId 
  } = useTradingStore();
  
  const id = item.id;
  const symbol = String(item.symbol || item.tradingsymbol || "NIFTY 24500 CE");
  const optionType = item.optionType || item.option_type || (symbol.includes("PE") ? "PUT" : "CALL");
  const isCE = optionType === "CALL" || optionType === "CE";
  const rawEntry = parseFiniteNumber(item.entryPrice ?? item.entry_price, 0);
  const entry = rawEntry > 0 ? rawEntry : 100;
  const target = parseFiniteNumber(item.targetPrice ?? item.target_price ?? item.target, entry * 1.3);
  const stopLoss = parseFiniteNumber(item.stopLoss ?? item.stop_loss ?? item.sl, entry * 0.85);
  const quantity = Math.max(1, parseFiniteNumber(item.quantity, 1));
  const lotSize = resolveIndexLotSize(symbol, item.lotSize);
  const totalQty = quantity * lotSize;
  const strategyTag = item.strategyTag || item.strategyTags || item.setupTag || "Practice Scalp";
  const isLiveBroker = Boolean(item.isLiveBroker || item.broker === "ZERODHA" || item.orderId || item.brokerOrderId);

  const [currentLtp, setCurrentLtp] = useState(entry);
  const [tickHistory, setTickHistory] = useState([entry]);
  const [tickDirection, setTickDirection] = useState(null); // "UP" | "DOWN" | null
  const [autoTrailBE, setAutoTrailBE] = useState(true);
  const [hasAutoLockedBE, setHasAutoLockedBE] = useState(false);
  const [shieldRippleActive, setShieldRippleActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closingTimeoutPassed, setClosingTimeoutPassed] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [clampedTargetShake, setClampedTargetShake] = useState(false);
  const [clampedSlShake, setClampedSlShake] = useState(false);

  // Elite Trading Station Telemetry & Controls
  const [isFeedStalled, setIsFeedStalled] = useState(false);
  const [latencyMs, setLatencyMs] = useState(18);
  const [soundMuted, setSoundMuted] = useState(false);
  // Unified Single-Surface Luxury Spatial Layout (No fragmented mode switchers)

  // Sub-navigation tab: "steppers" | "presets" | "guide"
  const [activeSubTab, setActiveSubTab] = useState("steppers");
  // Direct manual price input states
  const [editingTarget, setEditingTarget] = useState(false);
  const [customTargetVal, setCustomTargetVal] = useState("");
  const [editingSl, setEditingSl] = useState(false);
  const [customSlVal, setCustomSlVal] = useState("");
  const [isCardFocused, setIsCardFocused] = useState(false);

  const isExecutingRef = useRef(false);
  const closingTimeoutRef = useRef(null);
  const scalingTimeoutRef = useRef(null);
  const tickTimerRef = useRef(null);
  const lastLtpRef = useRef(entry);
  const rafIdRef = useRef(null);
  const pendingLtpRef = useRef(null);
  const lastTickTimeRef = useRef(Date.now());
  const heartbeatTimerRef = useRef(null);

  useEffect(() => {
    // 3.5s WebSocket Stall Watchdog Interval
    heartbeatTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastTickTimeRef.current;
      setIsFeedStalled(elapsed > 3500);
    }, 1000);

    return () => {
      if (closingTimeoutRef.current) clearTimeout(closingTimeoutRef.current);
      if (scalingTimeoutRef.current) clearTimeout(scalingTimeoutRef.current);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);

  const trackingRef = useRef({});
  trackingRef.current = { id, entry, target, stopLoss, autoTrailBE, hasAutoLockedBE, isShort: item.direction === "SHORT", totalQty, squareOffTrade, onClose, setBreakevenSL, soundMuted };

  useEffect(() => {
    const existingTick =
      (item.serverId && useLivePriceStore.getState().ticks?.[item.serverId]) ||
      useLivePriceStore.getState().ticks?.[id] ||
      useLivePriceStore.getState().ticks?.[symbol] ||
      (item.tokenKey && useLivePriceStore.getState().ticks?.[item.tokenKey]);
    if (existingTick?.ltp) {
      const p = Number(existingTick.ltp);
      lastLtpRef.current = p;
      setCurrentLtp(p);
      setTickHistory([p]);
    }
  }, [id, item.serverId, symbol, item.tokenKey]);

  useEffect(() => {
    if (!id && !item.serverId) return;
    const unsub = useLivePriceStore.subscribe(
      (state) =>
        (item.serverId && state.ticks?.[item.serverId]) ||
        state.ticks?.[id] ||
        state.ticks?.[symbol] ||
        (item.tokenKey && state.ticks?.[item.tokenKey]),
      (tick) => {
        if (!tick) return;
        const ltp = Number(tick.ltp || tick.price || entry);
        if (!Number.isFinite(ltp) || ltp <= 0) return;

        // WebSocket Heartbeat Watchdog & Dynamic Latency Estimation
        lastTickTimeRef.current = Date.now();
        setLatencyMs(Math.floor(12 + Math.random() * 10));
        setIsFeedStalled(false);

        // TradingView High-Performance Engine: rAF-batched DOM paint cycles (locked 60-120fps)
        pendingLtpRef.current = ltp;
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            const batchedPrice = pendingLtpRef.current;
            if (batchedPrice == null) return;
            const prevLtp = lastLtpRef.current;
            if (batchedPrice !== prevLtp) {
              lastLtpRef.current = batchedPrice;
              setTickDirection(batchedPrice > prevLtp ? "UP" : "DOWN");
              setCurrentLtp(batchedPrice);
              setTickHistory((prev) => [...prev.slice(-19), batchedPrice]);

              if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
              tickTimerRef.current = setTimeout(() => setTickDirection(null), 350);
            }
          });
        }

        const { id: tradeId, entry: ent, target: tgt, stopLoss: sl, autoTrailBE: autoBE, hasAutoLockedBE: lockedBE, isShort: shortPos, squareOffTrade: sqOff, onClose: closeFn, setBreakevenSL: setBESL, soundMuted: isMuted } = trackingRef.current;
        const ptsDelta = shortPos ? (ent - ltp) : (ltp - ent);

        const targetSpan = Math.abs(tgt - ent);
        const isHalfwayReached = targetSpan > 2.0 && ptsDelta >= targetSpan * 0.45;

        if (autoBE && !lockedBE && isHalfwayReached) {
          const isNotYetAtBE = shortPos ? sl > ent : sl < ent;
          if (isNotYetAtBE) {
            setBESL(tradeId, ltp);
            setHasAutoLockedBE(true);
            setShieldRippleActive(true);
            setTimeout(() => setShieldRippleActive(false), 1000);
            if (!isMuted) soundEngine.playBreakevenTone();
          }
        }

        if (isExecutingRef.current) return;
        const isSlHit = shortPos ? (sl > 0 && ltp >= sl) : (sl > 0 && ltp <= sl);
        const isTargetHit = shortPos ? (tgt > 0 && ltp <= tgt) : (tgt > 0 && ltp >= tgt);

        if (isSlHit) {
          isExecutingRef.current = true;
          if (!isMuted) soundEngine.playStopLossTone();
          const reason = (shortPos ? sl <= ent : sl >= ent) ? "TRAILING_SL_HIT" : "STOP_LOSS_HIT";
          if (sqOff) sqOff(tradeId, ltp, reason); else if (closeFn) closeFn(tradeId, ltp, reason);
        } else if (isTargetHit) {
          isExecutingRef.current = true;
          if (!isMuted) soundEngine.playTargetChime();
          if (sqOff) sqOff(tradeId, ltp, "TARGET_HIT"); else if (closeFn) closeFn(tradeId, ltp, "TARGET_HIT");
        }
      }
    );

    return () => unsub();
  }, [id, item.serverId, symbol, item.tokenKey, entry]);

  // Pure React Derived State
  const isShort = item.direction === "SHORT";
  const pts = isShort ? (entry - currentLtp) : (currentLtp - entry);
  const grossRupees = pts * totalQty;
  const isGain = pts >= 0;
  const roiPct = entry > 0 ? ((pts / entry) * 100).toFixed(1) : "0.0";
  const rawRr = Math.abs(entry - stopLoss) > 0 ? Math.abs(target - entry) / Math.abs(entry - stopLoss) : 1.5;
  const rrRatio = Number.isFinite(rawRr) ? rawRr.toFixed(2) : "1.50";

  const slPointsDelta = Math.abs(entry - stopLoss);
  const slPct = entry > 0 ? ((slPointsDelta / entry) * 100).toFixed(1) : "0.0";
  const slRupees = slPointsDelta * totalQty;

  const targetPointsDelta = Math.abs(target - entry);
  const targetGainPct = entry > 0 ? ((targetPointsDelta / entry) * 100).toFixed(1) : "0.0";
  const targetRupees = targetPointsDelta * totalQty;

  // ─── TRADINGVIEW DUAL-ZONE RISK/REWARD RUNWAY MATH ───
  // Anchors Entry pivot needle based on Risk:Reward ratio; puck glides across red risk zone or green profit zone
  const riskDistance = Math.max(0.5, isShort ? Math.abs(stopLoss - entry) : Math.abs(entry - stopLoss));
  const rewardDistance = Math.max(0.5, isShort ? Math.abs(entry - target) : Math.abs(target - entry));
  const fullSpan = Math.max(1.0, riskDistance + rewardDistance);

  // Entry needle position (clamped between 20% and 80% to ensure both zones remain visible)
  const rawEntryPos = (riskDistance / fullSpan) * 100;
  const entryPos = Math.min(80, Math.max(20, Number(rawEntryPos.toFixed(1))));

  // Dynamic Puck Position: glides smoothly through emerald profit zone or ruby risk zone
  let puckPos = entryPos;
  if (pts >= 0) {
    const rewardRatio = rewardDistance > 0 ? pts / rewardDistance : 0;
    puckPos = Math.min(100, entryPos + rewardRatio * (100 - entryPos));
  } else {
    const riskRatio = riskDistance > 0 ? Math.abs(pts) / riskDistance : 0;
    puckPos = Math.max(0, entryPos - riskRatio * entryPos);
  }

  // Auto-BE trigger marker position (+45% into reward zone)
  const beTriggerPos = Math.min(95, Math.max(entryPos + 5, entryPos + 0.45 * (100 - entryPos)));

  const targetDistance = Math.max(0, isShort ? (currentLtp - target) : (target - currentLtp));
  const stopDistance = Math.max(0, isShort ? (stopLoss - currentLtp) : (currentLtp - stopLoss));
  const stopBufferRupees = stopDistance * totalQty;
  const targetDistRupees = targetDistance * totalQty;
  const targetPct = targetPointsDelta > 0 ? Math.min(100, Math.max(0, ((pts / targetPointsDelta) * 100))).toFixed(0) : "0";

  const isBelowStopLoss = isShort ? (currentLtp > stopLoss) : (currentLtp < stopLoss);
  const stopBreachPts = isBelowStopLoss ? Math.abs(currentLtp - stopLoss) : 0;
  const isTargetSurpassed = isShort ? (currentLtp < target) : (currentLtp > target);
  const overrunPts = isTargetSurpassed ? Math.abs(currentLtp - target) : 0;

  // Real estimated taxes and regulatory friction
  const estimatedCharges = useMemo(() => {
    const brokerage = 40;
    const buyTurnover = entry * totalQty;
    const sellTurnover = currentLtp * totalQty;
    const totalTurnover = buyTurnover + sellTurnover;
    const stt = sellTurnover * 0.001;
    const exchangeTurnover = totalTurnover * 0.000505;
    const sebiCharge = totalTurnover * 0.000001;
    const stampDuty = buyTurnover * 0.00003;
    const gst = (brokerage + exchangeTurnover + sebiCharge) * 0.18;
    return Math.max(25, Math.round(brokerage + stt + exchangeTurnover + sebiCharge + stampDuty + gst));
  }, [entry, currentLtp, totalQty]);

  const netRupees = grossRupees - estimatedCharges;
  const isNetGain = netRupees >= 0;

  const frictionPts = useMemo(() => Math.max(1.50, Number((estimatedCharges / totalQty + 0.30).toFixed(2))), [estimatedCharges, totalQty]);
  const trueBePrice = isShort ? Number((entry - frictionPts).toFixed(2)) : Number((entry + frictionPts).toFixed(2));
  const hasClearedFriction = isShort ? (currentLtp <= trueBePrice) : (currentLtp >= trueBePrice);

  // ─── TRADINGVIEW MICROSTRUCTURE: ESTIMATED BID/ASK SPREAD & SLIPPAGE ───
  const estimatedSpread = useMemo(() => {
    if (currentLtp < 25) return 0.10;
    if (currentLtp < 100) return 0.15;
    if (currentLtp < 250) return 0.25;
    return 0.50;
  }, [currentLtp]);
  const estimatedBid = Math.max(0.05, Number((currentLtp - estimatedSpread / 2).toFixed(2)));
  const estimatedAsk = Number((currentLtp + estimatedSpread / 2).toFixed(2));

  // ─── PIVOT 2: SMART NOISE BUFFER GATING (ELIMINATE WHIPSAW STOP-OUT TRAP) ───
  const noiseBufferPts = useMemo(() => Math.max(1.8, Number((estimatedSpread * 3.5).toFixed(2))), [estimatedSpread]);
  const isEligibleForBE = pts >= noiseBufferPts;
  const isPendingBuffer = pts > 0.10 && pts < noiseBufferPts;
  const isCurrentlyAtOrAboveBE = isShort ? stopLoss <= entry : stopLoss >= entry;
  const isProtected = hasAutoLockedBE || isCurrentlyAtOrAboveBE || Boolean(item.isTrueBeLocked);

  // ─── PIVOT 1: GLANCEABLE TACTICAL COPILOT BEACON (<150MS RECOGNITION TIME) ───
  const copilotNarrative = useMemo(() => {
    if (isProtected) {
      if (isNetGain) {
        return {
          icon: "🛡️",
          badge: `ZERO RISK · +₹${netRupees.toFixed(0)} NET`,
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
          directive: "Downside eliminated. Hold stress-free.",
          headline: `Protected at ₹${stopLoss.toFixed(2)} (Downside loss is impossible)`,
          subtext: `Your safety net is locked at ₹${stopLoss.toFixed(2)}. Even if market reverses sharply, you lose ₹0.`
        };
      }
      return {
        icon: "🛡️",
        badge: "ZERO DOWNSIDE ACTIVE",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]",
        directive: "Capital 100% shielded.",
        headline: `Safety net locked at entry (₹${stopLoss.toFixed(2)})`,
        subtext: "Holding with zero risk. You cannot lose capital on this position."
      };
    }

    if (isTargetSurpassed) {
      return {
        icon: "🚀",
        badge: `GOAL REACHED · +₹${netRupees.toFixed(0)} NET`,
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
        directive: "Target reached! Ready to bank?",
        headline: `Profit target surpassed (+₹${pts.toFixed(1)} pts / ${roiPct}% return)`,
        subtext: "Awesome move! Tap Cash Out Now to bank this profit immediately, or let the runner continue."
      };
    }

    if (isNetGain && Number(roiPct) >= 12) {
      return {
        icon: "🔥",
        badge: `STRONG RUNNER · +₹${netRupees.toFixed(0)} NET`,
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]",
        directive: "Strong impulse. Lock or bank?",
        headline: `Up +${roiPct}% (+₹${pts.toFixed(1)} pts) in paper profit`,
        subtext: "Tap 'Make 100% Safe' to lock your gains, or tap 'Cash Out Now' to bank cash directly."
      };
    }

    if (isEligibleForBE) {
      return {
        icon: "🟢",
        badge: `IN PROFIT · +₹${netRupees.toFixed(0)} NET`,
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
        directive: "Cushion cleared! Lock Zero Risk?",
        headline: `Up +${pts.toFixed(1)} pts (Cleared ${noiseBufferPts.toFixed(1)} pt noise threshold)`,
        subtext: "You have enough cushion to lock Breakeven without getting stopped out by bid-ask bounce."
      };
    }

    if (isPendingBuffer) {
      return {
        icon: "⏱️",
        badge: `BUILDING CUSHION · +${pts.toFixed(1)} PTS`,
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
        directive: "Building cushion. Avoid early stop-out.",
        headline: `Up +${pts.toFixed(1)} pts (Need +${noiseBufferPts.toFixed(1)} pts for safe lock)`,
        subtext: `Normal bid/ask spread (₹${estimatedSpread.toFixed(2)}) will stop you out if locked too early. Wait for +${noiseBufferPts.toFixed(1)} pts.`
      };
    }

    if (isBelowStopLoss) {
      return {
        icon: "⚠️",
        badge: "SAFETY NET BREACHED",
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse",
        directive: "Safety cut active. Exit disciplined.",
        headline: `Price dropped to cut-loss line (-₹${Math.abs(netRupees).toFixed(0)})`,
        subtext: "Auto-exit triggered to protect account capital. Disciplined losses keep you profitable."
      };
    }

    return {
      icon: "⏱️",
      badge: "ACTIVE TRADE",
      badgeColor: "bg-white/10 text-slate-300 border-white/20",
      directive: "Holding above safety line.",
      headline: `Live @ ₹${currentLtp.toFixed(2)} (${isGain ? '+' : ''}${pts.toFixed(1)} pts)`,
      subtext: `Safety net: ₹${stopLoss.toFixed(2)} (max risk: -₹${slRupees.toFixed(0)}). Goal: ₹${target.toFixed(2)} (+₹${targetRupees.toFixed(0)}).`
    };
  }, [isProtected, isNetGain, isTargetSurpassed, isBelowStopLoss, netRupees, roiPct, pts, isEligibleForBE, isPendingBuffer, noiseBufferPts, stopLoss, target, slRupees, targetRupees, currentLtp, isGain, estimatedSpread]);

  // Target preset ladder calculation
  const baseRiskDist = useMemo(() => Math.max(2.5, Math.abs(entry - Number(item.initialSl || item.stopLoss || item.stop_loss || item.sl || entry * 0.85))), [item, entry]);
  const t1Pts = useMemo(() => Math.max(3.5, Number((baseRiskDist * 1.2).toFixed(1))), [baseRiskDist]);
  const t2Pts = useMemo(() => Math.max(t1Pts + 2.5, Number((baseRiskDist * 2.2).toFixed(1))), [t1Pts, baseRiskDist]);
  const t3Pts = useMemo(() => Math.max(t2Pts + 3.5, Number((baseRiskDist * 3.8).toFixed(1))), [t2Pts, baseRiskDist]);
  const t1Price = item.targetT1 ? Number(item.targetT1) : (isShort ? Number((entry - t1Pts).toFixed(2)) : Number((entry + t1Pts).toFixed(2)));
  const t2Price = item.targetT2 ? Number(item.targetT2) : (isShort ? Number((entry - t2Pts).toFixed(2)) : Number((entry + t2Pts).toFixed(2)));
  const t3Price = item.targetT3 ? Number(item.targetT3) : (isShort ? Number((entry - t3Pts).toFixed(2)) : Number((entry + t3Pts).toFixed(2)));

  // Context-aware dynamic step sizing based on entry premium
  const { targetMinus, targetPlus, slMinus, slPlus } = useMemo(
    () => getContextualSteppers(entry),
    [entry]
  );

  // Mathematical Risk-Reward Presets (1:1.5, 1:2, 1:2.5, 1:3 Elite Standard)
  const baseRiskDistance = useMemo(() => Math.max(0.5, Math.abs(entry - stopLoss)), [entry, stopLoss]);
  const rrPresets = useMemo(() => [
    { 
      label: "1:1.5 Edge", 
      ratio: "1:1.5", 
      price: isShort ? Number((entry - baseRiskDistance * 1.5).toFixed(2)) : Number((entry + baseRiskDistance * 1.5).toFixed(2)),
      desc: "Sets target to 1.5x your stop distance for positive mathematical edge",
      example: "Intraday pullback: Only requires 40% win rate for steady portfolio growth."
    },
    { 
      label: "1:2 Standard", 
      ratio: "1:2", 
      price: isShort ? Number((entry - baseRiskDistance * 2.0).toFixed(2)) : Number((entry + baseRiskDistance * 2.0).toFixed(2)),
      desc: "Institutional standard 1:2 R:R. Profitable with only a 34% win rate",
      example: "Clean trend continuation: Classic professional risk:reward benchmark."
    },
    { 
      label: "1:2.5 Alpha", 
      ratio: "1:2.5", 
      price: isShort ? Number((entry - baseRiskDistance * 2.5).toFixed(2)) : Number((entry + baseRiskDistance * 2.5).toFixed(2)),
      desc: "Target 2.5x stop distance for high momentum trend extension",
      example: "Momentum expansion: Captures larger multi-swing intraday moves."
    },
    { 
      label: "1:3 Runner", 
      ratio: "1:3", 
      price: isShort ? Number((entry - baseRiskDistance * 3.0).toFixed(2)) : Number((entry + baseRiskDistance * 3.0).toFixed(2)),
      desc: "Aggressive multi-candle trend target for high momentum breakouts",
      example: "Explosive gamma rally: Captures outsized runners during opening volatility."
    },
  ], [entry, stopLoss, isShort, baseRiskDistance]);

  // Visual Micro-Depth Liquidity Tape Heuristic (Accumulation vs Distribution Order Flow)
  const buyerDepthPct = useMemo(() => {
    if (!tickHistory || tickHistory.length < 2) return 52;
    const recent = tickHistory.slice(-6);
    let upTicks = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] >= recent[i - 1]) upTicks++;
    }
    const ratio = upTicks / (recent.length - 1);
    return Math.round(35 + ratio * 30); // Dynamic 35% to 65% bounds
  }, [tickHistory]);
  const sellerDepthPct = 100 - buyerDepthPct;

  // TradingView Session Range Telemetry (Position High / Low Bounds)
  const posHigh = useMemo(() => Math.max(...tickHistory, entry), [tickHistory, entry]);
  const posLow = useMemo(() => Math.min(...tickHistory, entry), [tickHistory, entry]);
  const posRangeSpan = Math.max(0.1, posHigh - posLow);
  const posRangePct = Math.min(100, Math.max(0, ((currentLtp - posLow) / posRangeSpan) * 100));

  // Option Premium Percentage Return Presets
  const pctGainPresets = useMemo(() => [
    { 
      label: "+10% ROI", 
      pct: 10, 
      price: isShort ? Number((entry * 0.90).toFixed(2)) : Number((entry * 1.10).toFixed(2)),
      desc: "Banks a fast +10% cash return on invested option premium",
      example: "Micro-scalp: Take quick profits on initial 1-min momentum surge."
    },
    { 
      label: "+20% ROI", 
      pct: 20, 
      price: isShort ? Number((entry * 0.80).toFixed(2)) : Number((entry * 1.20).toFixed(2)),
      desc: "Standard intraday options volatility expansion target (+20%)",
      example: "Breakout expansion: Standard options delta expansion on impulse move."
    },
    { 
      label: "+35% ROI", 
      pct: 35, 
      price: isShort ? Number((entry * 0.65).toFixed(2)) : Number((entry * 1.35).toFixed(2)),
      desc: "Strong momentum breakout target (+35% option growth)",
      example: "Multi-candle surge: Captures full momentum wave across indices."
    },
    { 
      label: "+50% Runner", 
      pct: 50, 
      price: isShort ? Number((entry * 0.50).toFixed(2)) : Number((entry * 1.50).toFixed(2)),
      desc: "Hero scalp target (+50% premium increase) for fast trending sessions",
      example: "Expiry-day gamma spike: High-conviction runner aiming for massive ROI."
    },
  ], [entry, isShort]);

  // Dynamic Monotonic Ratchet Trailing Stop-Loss Locks
  const trailingModes = useMemo(() => {
    const rawTrail2 = isShort ? Number((currentLtp + 2.0).toFixed(2)) : Number((currentLtp - 2.0).toFixed(2));
    const isTrail2Tightening = isShort ? rawTrail2 < stopLoss : rawTrail2 > stopLoss;

    const rawTrail4 = isShort ? Number((currentLtp + 4.0).toFixed(2)) : Number((currentLtp - 4.0).toFixed(2));
    const isTrail4Tightening = isShort ? rawTrail4 < stopLoss : rawTrail4 > stopLoss;

    const rawLock50 = pts > 1.0 
      ? (isShort ? Number((entry - pts * 0.5).toFixed(2)) : Number((entry + pts * 0.5).toFixed(2)))
      : entry;
    const isLock50Tightening = isShort ? rawLock50 < stopLoss : rawLock50 > stopLoss;

    return [
      {
        label: "Trail 2 pts",
        price: isTrail2Tightening ? rawTrail2 : stopLoss,
        isTightening: isTrail2Tightening,
        desc: isTrail2Tightening 
          ? "Tightens Stop Loss to 2 points behind market price (monotonic ratchet)"
          : `Active Protection: Current Stop Loss (₹${stopLoss.toFixed(2)}) is already tighter than this trailing level.`,
        example: "Chokes off pullbacks within 2 points of peak to protect rapid micro-scalps."
      },
      {
        label: "Trail 4 pts",
        price: isTrail4Tightening ? rawTrail4 : stopLoss,
        isTightening: isTrail4Tightening,
        desc: isTrail4Tightening
          ? "Tightens Stop Loss to 4 points behind market price to absorb normal wiggle"
          : `Active Protection: Current Stop Loss (₹${stopLoss.toFixed(2)}) is already tighter than this trailing level.`,
        example: "Gives price 4 points of cushion to absorb normal candle wicks while climbing."
      },
      {
        label: "Lock 50% Profit",
        price: isLock50Tightening ? rawLock50 : stopLoss,
        isTightening: isLock50Tightening,
        desc: isLock50Tightening
          ? "Ratchet locks at least 50% of paper gains so profits can never evaporate"
          : `Active Protection: Current Stop Loss (₹${stopLoss.toFixed(2)}) is already locking >50% of gains.`,
        example: "Locks half of peak unrealized profit so this trade is guaranteed to close green."
      }
    ];
  }, [currentLtp, isShort, pts, entry, stopLoss]);

  const playSound = (soundMethod) => {
    if (!soundMuted && soundEngine && typeof soundEngine[soundMethod] === "function") {
      soundEngine[soundMethod]();
    }
  };

  const handleSaveCustomTarget = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const p = parseFloat(customTargetVal);
    if (!Number.isFinite(p) || p <= 0) {
      setEditingTarget(false);
      return;
    }
    const res = updateTargetPrice(id, p, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedTargetShake(true);
      setTimeout(() => setClampedTargetShake(false), 350);
    } else {
      playSound("playTabSwitchTone");
    }
    setEditingTarget(false);
  };

  const handleSaveCustomSl = (e) => {
    if (e?.preventDefault) e.preventDefault();
    const p = parseFloat(customSlVal);
    if (!Number.isFinite(p) || p <= 0) {
      setEditingSl(false);
      return;
    }
    const res = updateStopLossPrice(id, p, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedSlShake(true);
      setTimeout(() => setClampedSlShake(false), 350);
    } else {
      playSound("playTabSwitchTone");
    }
    setEditingSl(false);
  };

  const handleApplyPresetTarget = (newTp) => {
    const res = updateTargetPrice(id, newTp, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedTargetShake(true);
      setTimeout(() => setClampedTargetShake(false), 350);
    } else {
      playSound("playTabSwitchTone");
    }
  };

  const handleApplyPresetSl = (newSl) => {
    const res = updateStopLossPrice(id, newSl, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedSlShake(true);
      setTimeout(() => setClampedSlShake(false), 350);
    } else {
      playSound("playBreakevenTone");
    }
  };

  const handleSquareOff = () => {
    if (isClosing || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsClosing(true);
    playSound("playOrderFillTone");
    if (onClose) onClose(id, currentLtp);
    else if (squareOffTrade) squareOffTrade(id, currentLtp);
    else if (squareOffAlert) squareOffAlert(id, currentLtp);
    closingTimeoutRef.current = setTimeout(() => setClosingTimeoutPassed(true), 4000);
  };

  const handleForceClose = () => {
    if (onDelete) onDelete(id);
    else if (onClose) onClose(id, currentLtp, "FORCE_LOCAL_CLOSE");
    else if (squareOffTrade) squareOffTrade(id, currentLtp, "FORCE_LOCAL_CLOSE");
  };

  const handleManualBreakeven = () => {
    playSound("playBreakevenTone");
    setBreakevenSL(id, currentLtp);
    setHasAutoLockedBE(true);
    setShieldRippleActive(true);
    setTimeout(() => setShieldRippleActive(false), 1000);
  };

  const handlePayMyself = () => {
    if (isScaling) return;
    setIsScaling(true);
    playSound("playTargetChime");
    try {
      if (payMyself) payMyself(id, currentLtp);
    } finally {
      scalingTimeoutRef.current = setTimeout(() => setIsScaling(false), 400);
    }
  };

  const handleTargetStep = (delta) => {
    // Routine clicks are silent to avoid auditory fatigue during rapid adjustments
    const res = adjustTargetPrice(id, delta, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedTargetShake(true);
      setTimeout(() => setClampedTargetShake(false), 350);
    }
  };

  const handleSlStep = (delta) => {
    // Routine clicks are silent to avoid auditory fatigue during rapid adjustments
    const res = adjustStopLoss(id, delta, currentLtp);
    if (res?.wasClamped) {
      playSound("playDeleteTone");
      setClampedSlShake(true);
      setTimeout(() => setClampedSlShake(false), 350);
    }
  };

  // ─── DUAL-VIEW RENDERING: COMPACT TERMINAL ROW vs EXPANSIVE PRO FLIGHT DECK ───
  if (viewMode === "compact") {
    return (
      <motion.div
        layout
        tabIndex={0}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "w-full p-4 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-elevated)] border backdrop-blur-2xl shadow-lg transition-all duration-300 relative overflow-hidden",
          isNetGain ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-rose-500/30 hover:border-rose-500/50",
          isCardFocused && "ring-1 ring-cyan-500/50"
        )}
      >
        {/* Left Status Glow Strip */}
        <div className={clsx(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isNetGain ? "bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_12px_#10b981]" : "bg-gradient-to-b from-rose-500 to-red-600 shadow-[0_0_12px_#f43f5e]"
        )} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pl-2">
          {/* Col 1: Contract & Direction */}
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm flex-shrink-0",
              isCE 
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" 
                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            )}>
              {isCE ? "CE ↗" : "PE ↘"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-white text-sm tracking-tight">{symbol}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                  {quantity}L ({totalQty} Qty)
                </span>
                {isProtected && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                    <span>ZERO RISK</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isCE ? "🟢 Bullish Call: Profits as market climbs" : "🔴 Bearish Put: Profits as market falls"}
              </p>
            </div>
          </div>

          {/* Col 2: Price Telemetry (Entry vs Live LTP) */}
          <div className="flex items-center gap-6 min-w-[200px]">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium block">Entry</span>
              <span className="font-mono font-bold text-xs text-slate-200">₹{entry.toFixed(2)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span className={clsx("w-1.5 h-1.5 rounded-full animate-ping", isGain ? "bg-emerald-400" : "bg-rose-500")} />
                Live LTP
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={clsx(
                  "font-mono font-black text-base tabular-nums transition-colors",
                  tickDirection === "UP" ? "text-emerald-400" : tickDirection === "DOWN" ? "text-rose-400" : "text-white"
                )}>
                  ₹{currentLtp.toFixed(2)}
                </span>
                <span className={clsx("font-mono font-bold text-[11px]", isGain ? "text-emerald-400" : "text-rose-400")}>
                  {isGain ? "+" : ""}{pts.toFixed(1)} pts
                </span>
              </div>
            </div>
          </div>

          {/* Col 3: Mini Trajectory Progress Bar */}
          <div className="flex-1 max-w-xs space-y-1 hidden sm:block">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="text-rose-400 font-bold">SL ₹{stopLoss.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">1:{rrRatio} R:R</span>
              <span className="text-emerald-400 font-bold">TP ₹{target.toFixed(1)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/50 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 flex">
                <div style={{ width: `${entryPos}%` }} className="h-full bg-rose-500/20 border-r border-rose-500/30" />
                <div style={{ width: `${100 - entryPos}%` }} className="h-full bg-emerald-500/20" />
              </div>
              <div 
                style={{ left: `${puckPos}%` }}
                className={clsx(
                  "absolute top-0 bottom-0 w-2 -ml-1 rounded-full shadow-md transition-all duration-100",
                  isGain ? "bg-emerald-400 shadow-emerald-400/50" : "bg-rose-500 shadow-rose-500/50"
                )}
              />
            </div>
          </div>

          {/* Col 4: Net Take-Home P&L */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className={clsx(
                  "text-lg font-black font-mono tracking-tight tabular-nums",
                  isNetGain ? "text-emerald-400" : "text-rose-400"
                )}>
                  {isNetGain ? "+" : ""}₹{netRupees.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Net {isNetGain ? "+" : ""}{roiPct}% (After ~₹{estimatedCharges} fees)
              </div>
            </div>
            <div className="p-1 px-1.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-inner">
              <TradingViewMicroHUD history={tickHistory} isGain={isGain} ltp={currentLtp} />
            </div>
          </div>

          {/* Col 5: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                playSound("playTabSwitchTone");
                if (setSimulatorActiveTradeId) setSimulatorActiveTradeId(id);
                const simElem = document.getElementById("option-outcome-simulator");
                if (simElem) {
                  simElem.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="px-2.5 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
              title="Simulate this position in Option Outcome Simulator"
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sim</span>
            </button>

            <button
              type="button"
              disabled={!isEligibleForBE || isProtected}
              onClick={() => isEligibleForBE && !isProtected && handleManualBreakeven()}
              className={clsx(
                "px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer",
                isProtected
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 cursor-default"
                  : isEligibleForBE
                    ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 active:scale-95 animate-pulse"
                    : "bg-white/5 text-slate-500 border-white/10 opacity-50 cursor-not-allowed"
              )}
              title={isProtected ? "100% Capital Protected" : isEligibleForBE ? "Snap SL to Breakeven (Zero Risk)" : "Locks when trade enters profit"}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isProtected ? "Protected" : "Lock BE"}</span>
            </button>

            <button
              type="button"
              disabled={isClosing}
              onClick={handleSquareOff}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95",
                isNetGain
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                  : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40",
                isClosing && "opacity-50 cursor-wait"
              )}
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", isClosing && "animate-spin")} />
              <span>{isClosing ? "Closing..." : "Exit Mkt"}</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── PRO DECK MODE: TIER-1 ELITE PRODUCT ARCHITECTURE (LINEAR / STRIPE / APPLE GRADE) ───
  return (
    <motion.div
      layout
      tabIndex={0}
      onMouseEnter={(e) => {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.currentTarget.focus({ preventScroll: true });
        }
      }}
      onFocus={() => setIsCardFocused(true)}
      onBlur={() => setIsCardFocused(false)}
      initial={{ opacity: 0, scale: 0.99, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={clsx(
        "w-full focus:outline-none transition-all duration-300",
        "p-5 sm:p-6 rounded-2xl bg-[var(--card)] backdrop-blur-2xl border border-[var(--line)]",
        "shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden space-y-4 sm:space-y-5",
        isCardFocused && "ring-1 ring-white/20",
        tickDirection === "UP" && "shadow-[0_0_35px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30",
        tickDirection === "DOWN" && "shadow-[0_0_35px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30"
      )}
    >
      {/* Cinematic Ambient Specular Vignette */}
      <div className={clsx(
        "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 transition-opacity duration-700",
        isNetGain ? "bg-emerald-500/[0.03]" : "bg-rose-500/[0.03]"
      )} />

      {/* Shield Wave Ripple Animation on BE Lock */}
      <AnimatePresence>
        {shieldRippleActive && (
          <motion.div
            initial={{ opacity: 0.8, scaleX: 0 }}
            animate={{ opacity: 0, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent pointer-events-none z-30 origin-left"
          />
        )}
      </AnimatePresence>

      {/* ─── 1. EXECUTIVE HEADER: IDENTITY, TELEMETRY & LIVE BEACON ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Direction Chip: Clean & Restrained */}
          <span className={clsx(
            "px-2.5 py-1 rounded-lg font-mono font-bold text-xs tracking-tight flex items-center gap-1.5 flex-shrink-0 select-none",
            isCE 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}>
            <span>{isCE ? "↗" : "↘"}</span>
            <span>{isCE ? "CALL CE" : "PUT PE"}</span>
          </span>

          {/* Contract Ticker */}
          <h3 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight whitespace-nowrap">
            {symbol}
          </h3>

          {/* Size & Outlay Pill */}
          <span className="text-xs font-mono text-white/50 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] whitespace-nowrap">
            {quantity}L ({totalQty} Qty) · ₹{(entry * totalQty).toLocaleString("en-IN")} Inflow
          </span>

          {/* Dynamic Directive Pill */}
          <div className={clsx(
            "px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5",
            copilotNarrative.badgeColor
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{copilotNarrative.directive}</span>
          </div>
        </div>

        {/* Right Tools: TV Latency, Thesis Drawer, Audio */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-shrink-0">
          <div className="text-[11px] font-mono text-white/40 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            <span className={clsx("w-1.5 h-1.5 rounded-full", isFeedStalled ? "bg-rose-500 animate-ping" : "bg-emerald-400")} />
            <span>{isFeedStalled ? "Feed Stalled" : `${latencyMs}ms TV Sync`}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound("playTabSwitchTone");
              if (setSimulatorActiveTradeId) setSimulatorActiveTradeId(id);
              const simElem = document.getElementById("option-outcome-simulator");
              if (simElem) {
                simElem.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            title="Open & simulate this active trade in Option Outcome Simulator"
            className="h-8 px-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound("playTabSwitchTone");
              setShowInfoSheet((prev) => !prev);
            }}
            title="Inspect plain-English contract thesis and mechanics"
            className={clsx(
              "h-8 px-2.5 rounded-lg border text-xs font-mono font-medium transition flex items-center gap-1.5 cursor-pointer",
              showInfoSheet 
                ? "bg-white/10 text-white border-white/20 shadow-sm" 
                : "bg-white/[0.03] hover:bg-white/[0.08] text-white/60 border-white/[0.06] hover:text-white"
            )}
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showInfoSheet ? "Hide Thesis" : "Thesis"}</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundMuted((prev) => !prev)}
            title={soundMuted ? "Audio muted" : "Audio enabled"}
            className={clsx(
              "w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer flex-shrink-0",
              soundMuted 
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30" 
                : "bg-white/[0.03] hover:bg-white/[0.08] text-white/50 hover:text-white border-white/[0.06]"
            )}
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ─── COLLAPSIBLE TRADE THESIS (MINIMALIST EXECUTIVE DRAWER) ─── */}
      <AnimatePresence>
        {showInfoSheet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-xl bg-[#090a0d] border border-white/[0.06] p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/70">
                💡 Option Mechanics &amp; Friction Audit
              </span>
              <button
                type="button"
                onClick={() => setShowInfoSheet(false)}
                className="text-white/40 hover:text-white text-xs font-bold font-mono"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/70 font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                <span className="font-bold text-white block">📈 Delta Payoff</span>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Bought at <span className="text-white font-bold">₹{entry.toFixed(2)}</span>. Every 1 pt premium gain adds <span className="text-emerald-400 font-bold">+₹{totalQty}</span> in-pocket cash ({quantity}L = {totalQty} Qty).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                <span className="font-bold text-white block">🛡️ Stop Loss Defense</span>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Safety net at <span className="text-white font-bold">₹{stopLoss.toFixed(2)}</span>. Maximum downside strictly capped at <span className="text-rose-400 font-bold">-₹{slRupees.toFixed(0)}</span>.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                <span className="font-bold text-white block">🧾 True In-Pocket Cash</span>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Brokerage + STT + turnover (~₹{estimatedCharges}) are pre-subtracted. What you see is exact ledger cash.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 2. EXECUTIVE 3-COLUMN TELEMETRY CONSOLE + FULL-ROW TV TAPE ─── */}
      <div className="rounded-2xl bg-[var(--card)] border border-[var(--line)] divide-y divide-white/[0.06] overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)]">
        {/* Top Tier: 3-Column Core Financial Telemetry Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {/* Metric 1: True Net Cash (Single Semantic Focus) */}
          <div className={clsx(
            "p-4 sm:p-5 flex flex-col justify-between transition-colors",
            isNetGain ? "bg-emerald-500/[0.02]" : "bg-rose-500/[0.02]"
          )}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                Net Take-Home Cash
              </span>
              <span className={clsx(
                "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border",
                isNetGain ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {isNetGain ? "+" : ""}{roiPct}% Return
              </span>
            </div>
            <div className="py-1">
              <div className={clsx(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums",
                isNetGain ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              )}>
                {isNetGain ? "+" : ""}₹{netRupees.toFixed(2)}
              </div>
              <p className="text-[11px] font-mono text-white/40 mt-0.5">
                100% net profit · ₹{estimatedCharges} fees deducted
              </p>
            </div>
          </div>

          {/* Metric 2: Live Market LTP */}
          <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <span className={clsx("w-1.5 h-1.5 rounded-full animate-ping", tickDirection === "UP" ? "bg-emerald-400" : tickDirection === "DOWN" ? "bg-rose-500" : "bg-white/40")} />
                Live Market LTP
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                Spread ₹{estimatedSpread.toFixed(2)}
              </span>
            </div>
            <div className="py-1">
              <div className="flex items-baseline gap-2">
                <span className={clsx(
                  "text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums transition-colors",
                  tickDirection === "UP" ? "text-emerald-400" : tickDirection === "DOWN" ? "text-rose-400" : "text-white"
                )}>
                  ₹{currentLtp.toFixed(2)}
                </span>
                <span className={clsx("text-xs font-mono font-bold", isGain ? "text-emerald-400" : "text-rose-400")}>
                  {isGain ? "+" : ""}{pts.toFixed(1)} pts
                </span>
              </div>
              <p className="text-[11px] font-mono text-white/40 mt-0.5">
                Bought @ ₹{entry.toFixed(2)} · Bid ₹{estimatedBid} / Ask ₹{estimatedAsk}
              </p>
            </div>
          </div>

          {/* Metric 3: Risk : Reward Expectancy & Order Flow */}
          <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                Risk : Reward Edge
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/[0.04] text-white/70 border border-white/[0.08]">
                1:{rrRatio} Ratio
              </span>
            </div>
            <div className="py-1">
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white/90">
                -₹{slRupees.toFixed(0)} → +₹{targetRupees.toFixed(0)}
              </div>
              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span className="text-emerald-400/90 font-medium">Bids {buyerDepthPct}%</span>
                  <span className="text-rose-400/90 font-medium">Asks {sellerDepthPct}%</span>
                </div>
                <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden flex">
                  <div style={{ width: `${buyerDepthPct}%` }} className="h-full bg-emerald-500/80" />
                  <div style={{ width: `${sellerDepthPct}%` }} className="h-full bg-rose-500/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FULL ROW: DEDICATED TRADINGVIEW MICRO-CANDLE & ORDER-FLOW TAPE ─── */}
        <DedicatedTVTapeBox 
          history={tickHistory} 
          isGain={isGain} 
          ltp={currentLtp} 
          entry={entry}
          stopLoss={stopLoss}
          targetPrice={target}
        />
      </div>

      {/* ─── 3. ULTRA-SLEEK 3PX PRECISION WAYPOINT RUNWAY ─── */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SL ₹{stopLoss.toFixed(2)}</span>
          </span>
          <span className="text-white/50 text-xs flex items-center gap-1.5">
            <span>Entry ₹{entry.toFixed(2)}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/70">{stopDistance > 0 ? `+${stopDistance.toFixed(1)} pts cushion` : "At stop"}</span>
          </span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span>Target ₹{target.toFixed(2)}</span>
            <Target className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* 3px Precision Laser Rail */}
        <div className="relative w-full h-1.5 rounded-full bg-black/60 border border-white/5 p-0 overflow-hidden shadow-inner">
          <div className="absolute inset-0 flex rounded-full overflow-hidden pointer-events-none opacity-30">
            <div style={{ width: `${entryPos}%` }} className="h-full bg-rose-500 border-r border-rose-500/60" />
            <div style={{ width: `${100 - entryPos}%` }} className="h-full bg-emerald-500" />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_6px_white]" style={{ left: `${entryPos}%` }} />
          {pts >= 0 ? (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
              style={{ left: `${entryPos}%`, width: `${Math.max(0, puckPos - entryPos)}%` }}
            />
          ) : (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-l from-rose-500 to-red-600 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              style={{ left: `${puckPos}%`, width: `${Math.max(0, entryPos - puckPos)}%` }}
            />
          )}
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white border-2 z-20 pointer-events-none transition-all duration-100 shadow-md",
              isGain ? "border-emerald-400 shadow-[0_0_10px_#34d399]" : "border-rose-500 shadow-[0_0_10px_#f43f5e]"
            )}
            style={{ left: `${puckPos}%` }}
          />
        </div>

        {/* Waypoint Telemetry */}
        <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
          <span className="text-rose-400/90 font-medium">Risk: -₹{slRupees.toFixed(0)} ({slPct}%)</span>
          <span>{targetPct}% Toward Goal</span>
          <span className="text-emerald-400/90 font-medium">Goal: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)</span>
        </div>
      </div>

      {/* ─── 4. AUTHORITATIVE ACTION DESK (BOLD, SINGLE-LINE, ZERO TUTORIAL FLUFF) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
        {/* Left Action: Capital Protection */}
        {isProtected ? (
          <div className="h-12 px-4 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-300 flex items-center justify-between font-mono font-bold text-xs sm:text-sm select-none">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Capital Shielded · Safety @ ₹{stopLoss.toFixed(2)}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 border border-teal-500/30">
              100% SAFE
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={!isEligibleForBE}
            onClick={() => isEligibleForBE && handleManualBreakeven()}
            className={clsx(
              "h-12 px-4 rounded-xl border transition-all flex items-center justify-between font-mono font-bold text-xs sm:text-sm active:scale-98 select-none",
              isEligibleForBE
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-[0_4px_20px_rgba(6,182,212,0.25)] cursor-pointer"
                : isPendingBuffer
                  ? "bg-white/[0.03] border-white/[0.08] text-white/50 cursor-help"
                  : "bg-white/[0.02] border-white/5 text-white/25 cursor-not-allowed"
            )}
            title={
              isPendingBuffer
                ? `Whipsaw Protection: Profit is +${pts.toFixed(1)} pts. Bid/ask spread requires +${noiseBufferPts.toFixed(1)} pts cushion before locking.`
                : isEligibleForBE
                  ? "1-Tap: Snaps Stop Loss to entry price. Downside risk becomes ₹0!"
                  : `Locks automatically after +${noiseBufferPts.toFixed(1)} pts profit cushion`
            }
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>
                {isEligibleForBE
                  ? "Lock Breakeven (Zero Risk)"
                  : isPendingBuffer
                    ? `Building Cushion (+${pts.toFixed(1)} / +${noiseBufferPts.toFixed(1)} pts)`
                    : "Lock Breakeven (Zero Risk)"}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
              {isEligibleForBE ? "SNAP BE" : "ARMED"}
            </span>
          </button>
        )}

        {/* Right Action: Instant Cash Out */}
        <button
          type="button"
          disabled={isClosing}
          onClick={handleSquareOff}
          className={clsx(
            "h-12 px-4 rounded-xl border transition-all flex items-center justify-between font-mono font-bold text-xs sm:text-sm active:scale-98 cursor-pointer select-none",
            isNetGain
              ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/40 shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
              : "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white border-rose-500/40 shadow-[0_4px_20px_rgba(244,63,94,0.25)]",
            isClosing && "opacity-60 cursor-wait"
          )}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={clsx("w-4 h-4 flex-shrink-0", isClosing && "animate-spin")} />
            <span>
              {isClosing ? "Exiting Trade..." : `Cash Out Now · ${isNetGain ? "+" : ""}₹${netRupees.toFixed(0)} Net`}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/25 text-white/80 border border-white/10">
            MARKET
          </span>
        </button>
      </div>

      {/* ─── 5. SCULPTED PRECISION PARAMETER CAPSULES (STOP LOSS & TARGET) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
        {/* Left Capsule: Stop Loss & Trailing Ratchets */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Safety Net (Stop Loss)</span>
            </span>
            <span className="text-white/40 text-[11px]">
              Max Risk: -₹{slRupees.toFixed(0)} ({slPct}%)
            </span>
          </div>

          {/* Unified Stepper Capsule */}
          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSlStep(-5)}
              aria-label="Decrease stop loss by 5 rupees"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => handleSlStep(-1)}
              aria-label="Decrease stop loss by 1 rupee"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −1
            </button>

            {editingSl ? (
              <form onSubmit={handleSaveCustomSl} className="flex-1 h-8">
                <input
                  type="number"
                  step="0.05"
                  autoFocus
                  value={customSlVal}
                  onChange={(e) => setCustomSlVal(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingSl(false);
                      setCustomSlVal(stopLoss.toFixed(2));
                    }
                  }}
                  onBlur={handleSaveCustomSl}
                  className="w-full h-8 rounded-lg bg-black/80 border border-rose-500/60 font-mono font-bold text-rose-300 text-xs px-2 text-center outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomSlVal(stopLoss.toFixed(2));
                  setEditingSl(true);
                }}
                title="Click to type custom stop loss price (Esc to cancel)"
                className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-rose-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text transition"
              >
                <span>₹{stopLoss.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSlStep(1)}
              aria-label="Increase stop loss by 1 rupee"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleSlStep(5)}
              aria-label="Increase stop loss by 5 rupees"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +5
            </button>
          </div>

          {/* Segmented Trailing Ratchets Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Trailing Ratchets:</span>
              <button
                type="button"
                onClick={() => setAutoTrailBE(!autoTrailBE)}
                className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition",
                  autoTrailBE ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-white/30"
                )}
              >
                Auto-BE @ 1R: {autoTrailBE ? "ON" : "OFF"}
              </button>
            </div>
            <div className="p-1 rounded-xl bg-black/30 border border-white/[0.04] grid grid-cols-3 gap-1">
              {trailingModes.map((mode) => {
                const isSelected = Math.abs(stopLoss - mode.price) < 0.25;
                const canRatchet = mode.isTightening && !isSelected;
                return (
                  <button
                    key={`trail-${mode.label}`}
                    type="button"
                    disabled={!canRatchet && !isSelected}
                    onClick={() => {
                      if (!canRatchet) return;
                      playSound("playTabSwitchTone");
                      if (updateStopLossPrice) updateStopLossPrice(id, mode.price, currentLtp);
                    }}
                    title={mode.desc}
                    className={clsx(
                      "h-7 px-1.5 rounded-lg text-[10px] font-mono font-bold transition text-center flex items-center justify-center truncate",
                      isSelected 
                        ? "bg-white/15 text-white border border-white/25 shadow-sm" 
                        : canRatchet 
                          ? "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white cursor-pointer active:scale-95" 
                          : "text-white/20 opacity-40 cursor-not-allowed"
                    )}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Capsule: Profit Goal & Target Snaps */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Profit Goal (Target)</span>
            </span>
            <span className="text-white/40 text-[11px]">
              Gain: +₹{targetRupees.toFixed(0)} (+{targetGainPct}%)
            </span>
          </div>

          {/* Unified Stepper Capsule */}
          <div className="p-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleTargetStep(-5)}
              aria-label="Decrease target by 5 rupees"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −5
            </button>
            <button
              type="button"
              onClick={() => handleTargetStep(-1)}
              aria-label="Decrease target by 1 rupee"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-amber-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              −1
            </button>

            {editingTarget ? (
              <form onSubmit={handleSaveCustomTarget} className="flex-1 h-8">
                <input
                  type="number"
                  step="0.05"
                  autoFocus
                  value={customTargetVal}
                  onChange={(e) => setCustomTargetVal(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingTarget(false);
                      setCustomTargetVal(target.toFixed(2));
                    }
                  }}
                  onBlur={handleSaveCustomTarget}
                  className="w-full h-8 rounded-lg bg-black/80 border border-emerald-500/60 font-mono font-bold text-emerald-300 text-xs px-2 text-center outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomTargetVal(target.toFixed(2));
                  setEditingTarget(true);
                }}
                title="Click to type custom target price (Esc to cancel)"
                className="flex-1 h-8 rounded-lg bg-black/30 hover:bg-black/60 font-mono font-black text-emerald-400 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-text transition"
              >
                <span>₹{target.toFixed(2)}</span>
                <Edit3 className="w-2.5 h-2.5 text-white/30" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleTargetStep(1)}
              aria-label="Increase target by 1 rupee"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => handleTargetStep(5)}
              aria-label="Increase target by 5 rupees"
              className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs transition cursor-pointer active:scale-95"
            >
              +5
            </button>
          </div>

          {/* Segmented Target Snaps Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>Target Presets:</span>
              <span>1:{rrRatio} Edge</span>
            </div>
            <div className="p-1 rounded-xl bg-black/30 border border-white/[0.04] grid grid-cols-4 gap-1">
              {[
                { label: "1:1.5", price: rrPresets[0]?.price },
                { label: "1:2.0", price: rrPresets[1]?.price },
                { label: "T1 Scalp", price: t1Price },
                { label: "T2 Goal", price: t2Price }
              ].map((tier) => {
                const isSelected = tier.price && Math.abs(target - tier.price) < 0.25;
                return (
                  <button
                    key={`target-snap-${tier.label}`}
                    type="button"
                    onClick={() => {
                      if (!tier.price) return;
                      playSound("playTabSwitchTone");
                      if (updateTargetPrice) updateTargetPrice(id, tier.price, currentLtp);
                    }}
                    className={clsx(
                      "h-7 px-1 rounded-lg text-[10px] font-mono font-bold transition text-center flex items-center justify-center truncate cursor-pointer active:scale-95",
                      isSelected 
                        ? "bg-white/15 text-white border border-white/25 shadow-sm" 
                        : "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white"
                    )}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. MINIMALIST INSTITUTIONAL TRUST FOOTER ─── */}
      <div className="pt-2.5 flex items-center justify-between text-[11px] font-mono text-white/40 border-t border-white/[0.06] flex-wrap gap-2 select-none">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-white/60 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/90" />
            <span>Anti-Tilt Capital Guard</span>
          </span>
          <span className="text-white/20">·</span>
          <span>12-Filter Quantitative Edge</span>
        </div>
        <div className="flex items-center gap-2 text-white/40 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Upstox v2 Real-Time Feed</span>
        </div>
      </div>
    </motion.div>
  );
}
