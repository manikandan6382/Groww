import { useState, useEffect, useRef, useMemo } from "react";
import { useLivePriceStore } from "../../../stores/useLivePriceStore";
import { useTradingStore, resolveIndexLotSize, resolveLiveTickPrice, isMarketOpenHours } from "../../../stores/useTradingStore";
import { soundEngine } from "../../../utils/soundEngine";
import { parseFiniteNumber, calculateEstimatedCharges } from "./liveCardHelpers";

export function useLiveAlertCardState({ item, onClose }) {
  const { squareOffTrade, adjustStopLoss, adjustTargetPrice, updateTargetPrice, updateStopLossPrice, setBreakevenSL, payMyself, setSimulatorActiveTradeId } = useTradingStore();
  const focusMode = useTradingStore((s) => s.focusMode || "cash");
  const setFocusMode = useTradingStore((s) => s.setFocusMode);
  const isGlobalLiquidating = useTradingStore((s) => s.isGlobalLiquidating || false);

  const id = item.id;
  const symbol = String(item.symbol || item.tradingsymbol || "NIFTY 24500 CE");
  const rawEntry = parseFiniteNumber(item.entryPrice ?? item.entry_price, 0);
  const entry = rawEntry > 0 ? rawEntry : 100;
  const defaultSlPts = symbol.includes("SENSEX") ? 12.5 : (symbol.includes("BANK") ? 8.5 : 4.0);
  const defaultTpPts = symbol.includes("SENSEX") ? 25.0 : (symbol.includes("BANK") ? 17.0 : 8.0);
  const target = parseFiniteNumber(item.targetPrice ?? item.target_price ?? item.target, entry + defaultTpPts);
  const stopLoss = parseFiniteNumber(item.stopLoss ?? item.stop_loss ?? item.sl, Math.max(0.05, entry - defaultSlPts));
  const rawQty = Math.max(1, parseFiniteNumber(item.quantity, 1));
  const lotSize = resolveIndexLotSize(symbol, item.lotSize);
  const lots = (rawQty >= lotSize && rawQty % lotSize === 0) ? (rawQty / lotSize) : rawQty;
  const quantity = Math.max(1, lots);
  const totalQty = item.totalQty ? Number(item.totalQty) : (quantity * lotSize);
  const isShort = item.direction === "SHORT";

  const [currentLtp, setCurrentLtp] = useState(entry);
  const [tickHistory, setTickHistory] = useState([entry]);
  const [tickDirection, setTickDirection] = useState(null);
  const [autoTrailBE, setAutoTrailBE] = useState(true);
  const [hasAutoLockedBE, setHasAutoLockedBE] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [isFeedStalled, setIsFeedStalled] = useState(false);
  const [isStaleOffline, setIsStaleOffline] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(() => isMarketOpenHours());
  const [latencyMs, setLatencyMs] = useState(18);
  const [soundMuted, setSoundMuted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("steppers");
  const [editingTarget, setEditingTarget] = useState(false);
  const [customTargetVal, setCustomTargetVal] = useState("");
  const [editingSl, setEditingSl] = useState(false);
  const [customSlVal, setCustomSlVal] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const start = new Date(item.entryDatetime || Date.now()).getTime();
    return Math.max(0, Math.floor((Date.now() - start) / 1000));
  });

  const isExecutingRef = useRef(false);
  const lastLtpRef = useRef(entry);
  const pendingLtpRef = useRef(null);
  const rafIdRef = useRef(null);
  const lastTickTimeRef = useRef(Date.now());
  const tickTimerRef = useRef(null);
  const trackingRef = useRef({});

  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(item.entryDatetime || Date.now()).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [item.entryDatetime]);

  trackingRef.current = { id, entry, target, stopLoss, autoTrailBE, hasAutoLockedBE, isShort, totalQty, squareOffTrade, onClose, setBreakevenSL, soundMuted };

  useEffect(() => {
    const hb = setInterval(() => {
      const open = isMarketOpenHours();
      setIsMarketOpen(open);
      const elapsed = Date.now() - lastTickTimeRef.current;
      setIsFeedStalled(elapsed > 3500);
      setIsStaleOffline(open && elapsed > 5000);
    }, 1000);
    return () => {
      clearInterval(hb);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Initial Price Mounting Invariant:
  // Scoped to [id, symbol] ONLY. Never re-trigger on every 5s polling cycle, and never wipe tick history
  useEffect(() => {
    const p = resolveLiveTickPrice(useLivePriceStore.getState().ticks, item);
    if (p > 0) {
      if (lastLtpRef.current === entry || lastLtpRef.current === 0) {
        lastLtpRef.current = p;
        setCurrentLtp(p);
        setTickHistory((prev) => (prev.length <= 1 ? [p] : prev));
      }
    }
  }, [id, symbol]);

  useEffect(() => {
    if (!id && !item.serverId && !symbol) return;
    return useLivePriceStore.subscribe(
      (state) => resolveLiveTickPrice(state.ticks, item),
      (ltp) => {
        if (!ltp || !Number.isFinite(ltp) || ltp <= 0) return;
        if (entry >= 20.0 && ltp <= 0.10) return; // Ignore ghost zero ticks from unliquid / uninitialized feeds
        
        // Anti-Flicker Monotonicity Invariant:
        // Never snap back to static entryPrice if real-time market price has already moved away from entry
        if (ltp === entry && lastLtpRef.current !== entry && lastLtpRef.current > 0) {
          return;
        }

        lastTickTimeRef.current = Date.now();
        setLatencyMs(Math.floor(12 + Math.random() * 10));
        setIsFeedStalled(false);
        pendingLtpRef.current = ltp;

        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            const bp = pendingLtpRef.current;
            if (bp == null) return;
            const prev = lastLtpRef.current;
            if (bp !== prev) {
              lastLtpRef.current = bp;
              setTickDirection(bp > prev ? "UP" : "DOWN");
              setCurrentLtp(bp);
              setTickHistory((p) => [...p.slice(-19), bp]);
              if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
              tickTimerRef.current = setTimeout(() => setTickDirection(null), 350);
            }
          });
        }

        // STAGE 1 & STAGE 4 ARCHITECTURE INVARIANT:
        // The .NET 8 RMS backend is the sole authoritative execution authority.
        // The client card is strictly a presentation and telemetry layer.
        // It does NOT independently execute STOP_LOSS, TARGET, HARD_CAP, or BREAKEVEN exits.
        // Authoritative exits are evaluated server-side and received via SSE / WebSocket.
      }
    );
  }, [id, item.serverId, symbol, entry]);

  const pts = isShort ? (entry - currentLtp) : (currentLtp - entry);
  const grossRupees = pts * totalQty;
  const isGain = pts >= 0;
  const roiPct = entry > 0 ? ((pts / entry) * 100).toFixed(1) : "0.0";
  const estimatedCharges = useMemo(() => calculateEstimatedCharges(entry, currentLtp, totalQty), [entry, currentLtp, totalQty]);
  const netRupees = grossRupees - estimatedCharges;
  const isThetaStagnant = elapsedSeconds >= 900 && Math.abs(pts) < 2.5;

  // Browser Tab Title Telemetry: Real-time MTM visibility when looking at TradingView
  useEffect(() => {
    if (!symbol) return;
    const sign = netRupees >= 0 ? "+" : "";
    const pnlTag = focusMode === "points" ? `${sign}${pts.toFixed(1)}pts` : `${sign}₹${Math.round(netRupees)}`;
    const originalTitle = "Groww Practice Terminal";
    document.title = `[${pnlTag}] ${symbol} | Groww`;
    return () => {
      document.title = originalTitle;
    };
  }, [symbol, netRupees, pts, focusMode]);

  return {
    id, symbol, isShort, entry, target, stopLoss, quantity, lotSize, totalQty,
    currentLtp, tickHistory, tickDirection, isGain, pts, grossRupees, netRupees, roiPct,
    estimatedCharges, autoTrailBE, setAutoTrailBE, hasAutoLockedBE,
    isClosing, setIsClosing, isScaling, setIsScaling, showInfoSheet, setShowInfoSheet,
    isFeedStalled, isStaleOffline, isMarketOpen, latencyMs, soundMuted, setSoundMuted, activeSubTab, setActiveSubTab,
    editingTarget, setEditingTarget, customTargetVal, setCustomTargetVal,
    editingSl, setEditingSl, customSlVal, setCustomSlVal,
    focusMode, setFocusMode, elapsedSeconds, isThetaStagnant,
    squareOffTrade, adjustStopLoss, adjustTargetPrice, updateTargetPrice, updateStopLossPrice,
    setBreakevenSL, payMyself, setSimulatorActiveTradeId, isExecutingRef, isGlobalLiquidating
  };
}
