import React, { useRef, useState, useMemo } from "react";
import { computePayoffSvgData } from "./payoffSvgCoordinates";
import { PayoffSvgDefs } from "./PayoffSvgDefs";

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 160;
const ZERO_Y = 88;

export const PayoffSvgCanvas = React.memo(function PayoffSvgCanvas({
  viewMode,
  domain,
  calculatePayoffAtExpiry,
  breakevenSpot,
  isCall,
  effectiveSpot,
  spotRatio,
  scrubRatio,
  onScrubChange,
  sl,
  tp,
  entry,
  approxDelta,
  simulatedOutcome,
  riskAmount,
}) {
  const containerRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const { points, profitPolygon, lossPolygon, maxPnl, minPnl, beCoordX, mainLinePath } = useMemo(
    () => computePayoffSvgData({ domain, calculatePayoffAtExpiry, breakevenSpot, isCall, canvasWidth: CANVAS_WIDTH, zeroY: ZERO_Y }),
    [domain, calculatePayoffAtExpiry, breakevenSpot, isCall]
  );

  const spotX = useMemo(() => {
    const raw = (spotRatio ?? 0.5) * CANVAS_WIDTH;
    return Number.isFinite(raw) ? Math.max(10, Math.min(CANVAS_WIDTH - 10, raw)) : CANVAS_WIDTH / 2;
  }, [spotRatio]);

  const cursorPixelX = useMemo(() => {
    const raw = (scrubRatio ?? 0.5) * CANVAS_WIDTH;
    return Number.isFinite(raw) ? Math.max(8, Math.min(CANVAS_WIDTH - 8, raw)) : CANVAS_WIDTH / 2;
  }, [scrubRatio]);

  const slCoordX = useMemo(() => {
    const delta = isCall ? Math.max(0.15, approxDelta || 0.48) : Math.min(-0.15, approxDelta || -0.48);
    const spotOffset = (Number(sl || 0) - Number(entry || 0)) / delta;
    const spotAtSL = Number(effectiveSpot || 0) + spotOffset;
    const span = (domain.max - domain.min);
    if (!Number.isFinite(span) || span <= 0) return 20;
    const ratio = (spotAtSL - domain.min) / span;
    return Number.isFinite(ratio) ? Math.max(16, Math.min(CANVAS_WIDTH - 16, ratio * CANVAS_WIDTH)) : 20;
  }, [sl, entry, approxDelta, effectiveSpot, domain, isCall]);

  const tpCoordX = useMemo(() => {
    const delta = isCall ? Math.max(0.15, approxDelta || 0.48) : Math.min(-0.15, approxDelta || -0.48);
    const spotOffset = (Number(tp || 0) - Number(entry || 0)) / delta;
    const spotAtTP = Number(effectiveSpot || 0) + spotOffset;
    const span = (domain.max - domain.min);
    if (!Number.isFinite(span) || span <= 0) return CANVAS_WIDTH - 20;
    const ratio = (spotAtTP - domain.min) / span;
    return Number.isFinite(ratio) ? Math.max(16, Math.min(CANVAS_WIDTH - 16, ratio * CANVAS_WIDTH)) : CANVAS_WIDTH - 20;
  }, [tp, entry, approxDelta, effectiveSpot, domain, isCall]);

  const cursorY = useMemo(() => {
    const yRange = Math.max(Math.abs(maxPnl || 0), Math.abs(minPnl || 0), 100);
    const scaleY = (ZERO_Y - 20) / yRange;
    const pnl = Number(simulatedOutcome?.estPnl ?? simulatedOutcome?.expiryPnl ?? 0);
    const calculatedY = ZERO_Y - pnl * scaleY;
    return Number.isFinite(calculatedY) ? calculatedY : ZERO_Y;
  }, [maxPnl, minPnl, simulatedOutcome]);

  const tooltipLabel = useMemo(() => {
    const optPrice = Number(simulatedOutcome?.estOptPrice || 0).toFixed(1);
    const pnlVal = Math.round(Number(simulatedOutcome?.estPnl || 0));
    const sign = pnlVal >= 0 ? "+" : "";
    return `₹${optPrice} (${sign}₹${pnlVal.toLocaleString("en-IN")})`;
  }, [simulatedOutcome]);

  const pillWidth = useMemo(() => {
    return Math.max(98, Math.round(tooltipLabel.length * 6.8 + 16));
  }, [tooltipLabel]);

  const pillHalf = pillWidth / 2;
  const tooltipX = Math.max(pillHalf + 6, Math.min(CANVAS_WIDTH - pillHalf - 6, cursorPixelX));
  const tooltipY = Math.max(22, cursorY - 14);

  const handlePointerScrub = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX == null) return;
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    onScrubChange(relX / rect.width);
  };

  const handlePointerDown = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    setIsScrubbing(true);
    handlePointerScrub(e);
  };

  const handlePointerUp = (e) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    setIsScrubbing(false);
  };

  if (viewMode !== "chart") return null;

  return (
    <div 
      ref={containerRef}
      className="w-full h-36 relative select-none cursor-crosshair touch-none rounded-2xl bg-[#050608]/90 border border-white/[0.06] p-1 overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => { if (isScrubbing || e.buttons === 1) handlePointerScrub(e); }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="none">
        <PayoffSvgDefs />
        <line x1="0" y1={ZERO_Y} x2={CANVAS_WIDTH} y2={ZERO_Y} stroke="rgba(255,255,255,0.22)" strokeDasharray="4,4" strokeWidth="1.2" />
        <text x="12" y={ZERO_Y - 5} fill="rgba(255,255,255,0.45)" fontSize="9.5" fontFamily="sans-serif" fontWeight="bold">
          ₹0.00 Breakeven Baseline
        </text>

        {profitPolygon && <path d={profitPolygon} fill="url(#profitEmeraldGlow)" />}
        {lossPolygon && <path d={lossPolygon} fill="url(#lossRoseGlow)" />}

        <text x={isCall ? CANVAS_WIDTH - 14 : 14} y="28" textAnchor={isCall ? "end" : "start"} fill="rgba(16,185,129,0.5)" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
          ▲ PROFIT ZONE (Unlimited Upside)
        </text>
        <text x={isCall ? 14 : CANVAS_WIDTH - 14} y={CANVAS_HEIGHT - 16} textAnchor={isCall ? "start" : "end"} fill="rgba(244,63,94,0.5)" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
          ▼ PROTECTED LOSS (Loss strictly capped at -₹{Number(riskAmount || 0).toLocaleString("en-IN")})
        </text>

        {mainLinePath && <path d={mainLinePath} fill="none" stroke="#00f5c4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonPayoffGlow)" />}

        {/* SL Marker */}
        <g>
          <line x1={slCoordX} y1="18" x2={slCoordX} y2={CANVAS_HEIGHT - 12} stroke="#f43f5e" strokeDasharray="3,3" strokeWidth="1.2" strokeOpacity="0.8" />
          <rect x={slCoordX - 26} y={CANVAS_HEIGHT - 20} width="52" height="14" rx="3.5" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
          <text x={slCoordX} y={CANVAS_HEIGHT - 10} textAnchor="middle" fill="#fecdd3" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
            SL ₹{Number(sl || 0).toFixed(1)}
          </text>
        </g>

        {/* Target Marker */}
        <g>
          <line x1={tpCoordX} y1="18" x2={tpCoordX} y2={CANVAS_HEIGHT - 12} stroke="#10b981" strokeDasharray="3,3" strokeWidth="1.2" strokeOpacity="0.8" />
          <rect x={tpCoordX - 26} y="5" width="52" height="14" rx="3.5" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          <text x={tpCoordX} y={15} textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
            TP ₹{Number(tp || 0).toFixed(1)}
          </text>
        </g>

        {/* Spot Marker */}
        <line x1={spotX} y1="10" x2={spotX} y2={CANVAS_HEIGHT - 10} stroke="#fbbf24" strokeDasharray="3,3" strokeWidth="1.5" strokeOpacity="0.7" />
        <circle cx={spotX} cy={ZERO_Y} r="3.5" fill="#fbbf24" stroke="#000" strokeWidth="1" />
        <text x={spotX} y="14" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="sans-serif">CURRENT PRICE</text>

        {/* Breakeven Node */}
        <g transform={`translate(${beCoordX}, ${ZERO_Y})`}>
          <circle r="7" fill="#00f5c4" fillOpacity="0.25" className="animate-ping" />
          <circle r="4.5" fill="#ffffff" stroke="#00f5c4" strokeWidth="2.5" />
        </g>

        {/* Cursor & Tooltip */}
        <g>
          <line x1={cursorPixelX} y1="5" x2={cursorPixelX} y2={CANVAS_HEIGHT - 8} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4" />
          <circle cx={cursorPixelX} cy={cursorY} r="6" fill={simulatedOutcome?.isProfit ? "#10b981" : "#f43f5e"} stroke="#ffffff" strokeWidth="2.5" />
          <g transform={`translate(${tooltipX}, ${tooltipY})`}>
            <rect x={-pillHalf} y="-14" width={pillWidth} height="17" rx="4.5" fill="#090b10" stroke={simulatedOutcome?.isProfit ? "#10b981" : "#f43f5e"} strokeWidth="1.2" fillOpacity="0.96" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))" />
            <text x="0" y="-2.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              {tooltipLabel}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
});
