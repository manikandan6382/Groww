import React, { useRef, useState } from "react";
import clsx from "clsx";
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Clock 
} from "lucide-react";
import { evaluateTradeIntegrity } from "./tradeIntegrityEngine";
import { diagnoseTradeBiases } from "./behavioralBiasEngine";
import { formatLocalDateTime, calculateTradeDuration } from "../../../utils/dateUtils";
import { resolveIndexLotSize } from "../../../stores/slices/tradeHelpers";

export function TradeShareModal({ isOpen, onClose, trade }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen || !trade) return null;

  const isGain = (trade.netPnl ?? 0) >= 0;
  const sym = String(trade.symbol || "NIFTY OPTION");
  const isCE = trade.optionType === "CALL" || sym.includes("CE");
  const effectiveLotSize = resolveIndexLotSize(trade.symbol, trade.lotSize);
  const rawQty = Number(trade.quantity || 1);
  const qty = Number(trade.totalQty || (rawQty >= effectiveLotSize ? rawQty : rawQty * effectiveLotSize));

  const entry = Number(trade.entryPrice || 0);
  const exit = Number(trade.exitPrice || 0);
  const pts = exit - entry;
  const pnlPercent = entry > 0 ? (pts / entry) * 100 : 0;
  const netPnl = Number(trade.netPnl !== undefined ? trade.netPnl : pts * qty - 55.20);

  const defaultSlPts = Number((250 / Math.max(1, qty)).toFixed(2));
  const defaultTpPts = Number((defaultSlPts * 2.0).toFixed(2));
  const sl = Number(trade.stopLoss || (entry > defaultSlPts ? entry - defaultSlPts : entry * 0.95));
  const tp = Number(trade.targetPrice || (entry + defaultTpPts));

  const maePts = Number(trade.maePts ?? (isGain ? 1.2 : 3.8));
  const mfePts = Number(trade.mfePts ?? (isGain ? Math.abs(pts) + 1.5 : 1.0));

  const audit = evaluateTradeIntegrity(trade);
  const diag = diagnoseTradeBiases(trade);
  const stratName = Array.isArray(trade.strategyTags) 
    ? (trade.strategyTags[0] || trade.strategyTag || "Intraday Momentum") 
    : (trade.strategyTags || trade.strategyTag || "Intraday Momentum");

  // Generate crisp 2x Retina (2400x1260) canvas image
  const renderCanvasImage = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = 1200 * scale;
    canvas.height = 630 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Vector-grade supersampling
    ctx.scale(scale, scale);

    // Background Luxury Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#080c14");
    bgGrad.addColorStop(0.5, "#0d1322");
    bgGrad.addColorStop(1, "#05080f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Glowing corner aura
    const auraGrad = ctx.createRadialGradient(isGain ? 1000 : 200, 150, 10, isGain ? 1000 : 200, 150, 450);
    auraGrad.addColorStop(0, isGain ? "rgba(16,185,129,0.18)" : "rgba(244,63,94,0.18)");
    auraGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Outer Luxury Frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 1140, 570);

    // Header Bar
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText("ANTIGRAVITY QUANT TRADING LAB  •  VERIFIED AUTOPSY", 70, 80);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px monospace";
    ctx.fillText(formatLocalDateTime(trade.entryDatetime || trade.datetime), 880, 80);

    // Horizontal Rule
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(70, 105);
    ctx.lineTo(1130, 105);
    ctx.stroke();

    // Symbol & Instrument with dynamic font downscaling to prevent collision with Big P&L Box at x=750
    let symbolFontSize = 38;
    ctx.font = `bold ${symbolFontSize}px Inter, sans-serif`;
    const measuredWidth = ctx.measureText(sym).width;
    if (measuredWidth > 640) {
      symbolFontSize = Math.max(22, Math.floor((640 / measuredWidth) * symbolFontSize));
      ctx.font = `bold ${symbolFontSize}px Inter, sans-serif`;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText(sym, 70, 160);

    // Option Tag pill
    ctx.fillStyle = isCE ? "rgba(6, 182, 212, 0.2)" : "rgba(244, 63, 94, 0.2)";
    ctx.strokeStyle = isCE ? "#06b6d4" : "#f43f5e";
    ctx.lineWidth = 1.5;
    const tagText = isCE ? "CALL (CE)" : "PUT (PE)";
    ctx.strokeRect(70, 185, 110, 32);
    ctx.fillRect(70, 185, 110, 32);
    ctx.fillStyle = isCE ? "#38bdf8" : "#fb7185";
    ctx.font = "bold 14px monospace";
    ctx.fillText(tagText, 85, 206);

    // Strategy pill
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.strokeRect(190, 185, 180, 32);
    ctx.fillRect(190, 185, 180, 32);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText(stratName, 205, 206);

    // Big Outcome P&L Box (Right Side)
    const pnlBoxX = 750;
    const pnlBoxY = 135;
    ctx.fillStyle = isGain ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)";
    ctx.strokeStyle = isGain ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)";
    ctx.lineWidth = 2;
    ctx.fillRect(pnlBoxX, pnlBoxY, 380, 120);
    ctx.strokeRect(pnlBoxX, pnlBoxY, 380, 120);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("NET REALIZED RESULT", pnlBoxX + 25, pnlBoxY + 35);

    ctx.fillStyle = isGain ? "#34d399" : "#fb7185";
    ctx.font = "bold 44px monospace";
    const pnlStr = `${netPnl >= 0 ? "+" : ""}₹${Math.round(netPnl).toLocaleString()}`;
    ctx.fillText(pnlStr, pnlBoxX + 25, pnlBoxY + 85);

    ctx.font = "bold 18px monospace";
    const ptsStr = `(${pts >= 0 ? "+" : ""}${pts.toFixed(1)} pt  •  ${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(1)}%)`;
    ctx.fillText(ptsStr, pnlBoxX + 210, pnlBoxY + 83);

    // Metrics Grid Container
    ctx.fillStyle = "rgba(15, 20, 32, 0.6)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(70, 290, 1060, 180);
    ctx.fillRect(70, 290, 1060, 180);

    const metrics = [
      { label: "FILL / ENTRY", val: `₹${entry.toFixed(2)}`, sub: `${qty} Qty (${trade.quantity || 1}L)` },
      { label: "STOP LOSS", val: `₹${sl.toFixed(2)}`, sub: `Risk: ₹${Math.round(audit.totalRiskRupees || 250)}` },
      { label: "TARGET PRICE", val: `₹${tp.toFixed(2)}`, sub: `1:${audit.rrRatio || 2.0} RR` },
      { label: "MAX ADVERSE (MAE)", val: `-${maePts.toFixed(1)} pt`, sub: `-₹${Math.round(maePts * qty)}` },
      { label: "MAX ALPHA (MFE)", val: `+${mfePts.toFixed(1)} pt`, sub: `+₹${Math.round(mfePts * qty)}` },
      { label: "EXIT RESOLUTION", val: `₹${exit.toFixed(2)}`, sub: trade.closeReason || "MANUAL_EXIT" }
    ];

    const colWidth = 1060 / 6;
    metrics.forEach((m, idx) => {
      const mx = 70 + idx * colWidth;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillText(m.label, mx + 15, 330);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 20px monospace";
      ctx.fillText(m.val, mx + 15, 365);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px monospace";
      ctx.fillText(m.sub, mx + 15, 400);

      if (idx < 5) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        ctx.moveTo(mx + colWidth, 310);
        ctx.lineTo(mx + colWidth, 450);
        ctx.stroke();
      }
    });

    // Integrity & Bias Forensic Summary Bar
    ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
    ctx.strokeRect(70, 495, 1060, 60);
    ctx.fillRect(70, 495, 1060, 60);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText(`SETUP INTEGRITY SCORE: ${audit.score}% (${audit.grade})`, 95, 532);

    ctx.fillStyle = diag.hasBiases ? "#fb7185" : "#34d399";
    const biasNote = diag.hasBiases 
      ? `LEAKAGE: -₹${diag.leakedRupees} (${diag.biases.map(b => b.name).join(" • ")})`
      : "✓ 100% DISCIPLINE COMPLIANCE — ZERO COGNITIVE BIAS LEAKS";
    ctx.fillText(biasNote, 520, 532);

    // Footer Watermark
    ctx.fillStyle = "#475569";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText("Automated Forensic Autopsy • Groww Scalping Station", 70, 585);
    ctx.fillText("Manikandan Capital Shield: Max Loss ₹250-₹300 Cap", 780, 585);

    return canvas;
  };

  const handleCopyImage = async () => {
    setExporting(true);
    try {
      const canvas = renderCanvasImage();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          if (typeof window !== "undefined" && window.ClipboardItem && navigator?.clipboard?.write) {
            await navigator.clipboard.write([
              new window.ClipboardItem({ "image/png": blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } else {
            handleDownloadImage();
          }
        } catch {
          // Fallback to download if clipboard API is restricted
          handleDownloadImage();
        }
        setExporting(false);
      });
    } catch {
      setExporting(false);
    }
  };

  const handleDownloadImage = () => {
    setExporting(true);
    try {
      const canvas = renderCanvasImage();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `autopsy-${sym.replace(/\s+/g, "_")}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#0a0e1a] border border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Shareable Trade Autopsy Card
              </h3>
              <p className="text-xs text-slate-400">
                Institutional 1200x630 Apple Luxury Card for social accountability &amp; journal archives.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Visual Card Preview */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#060911]">
          <div 
            className={clsx(
              "p-6 rounded-2xl border relative overflow-hidden backdrop-blur-2xl space-y-4 shadow-2xl",
              isGain 
                ? "bg-gradient-to-br from-[#0c1622] via-[#09111c] to-[#060a12] border-emerald-500/30" 
                : "bg-gradient-to-br from-[#1c0c14] via-[#140910] to-[#080509] border-rose-500/30"
            )}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-3 border-b border-white/[0.08] flex-wrap gap-2">
              <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ANTIGRAVITY QUANT FORENSICS</span>
              </span>
              <span className="font-mono text-slate-400">
                {formatLocalDateTime(trade.entryDatetime || trade.datetime)}
              </span>
            </div>

            {/* Instrument & Big PnL */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-2xl font-black text-white tracking-tight font-mono">
                  {sym}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                    isCE ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  )}>
                    {isCE ? "CALL (CE)" : "PUT (PE)"}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                    {stratName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {qty} Qty ({trade.quantity || 1}L)
                  </span>
                </div>
              </div>

              <div className={clsx(
                "px-5 py-3 rounded-2xl border text-right shadow-lg font-mono",
                isGain 
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" 
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
              )}>
                <span className="text-[10px] uppercase font-sans font-bold text-slate-400 block">Net Realized</span>
                <span className="text-2xl font-black block">
                  {netPnl >= 0 ? "+" : ""}₹{Math.round(netPnl).toLocaleString()}
                </span>
                <span className="text-xs font-bold block">
                  {pts >= 0 ? "+" : ""}{pts.toFixed(1)} pt ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px]">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Fill Entry</span>
                <span className="text-white font-bold">₹{entry.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Stop Loss</span>
                <span className="text-rose-400 font-bold">₹{sl.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Target Price</span>
                <span className="text-emerald-400 font-bold">₹{tp.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Max Adverse</span>
                <span className="text-rose-300 font-bold">-{maePts.toFixed(1)} pt</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Max Alpha</span>
                <span className="text-emerald-300 font-bold">+{mfePts.toFixed(1)} pt</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-sans">Exit Price</span>
                <span className="text-white font-bold">₹{exit.toFixed(2)}</span>
              </div>
            </div>

            {/* Integrity Pill */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Setup Integrity: {audit.score}% ({audit.grade})</span>
              </span>
              <span className={clsx("font-bold text-[11px]", diag.hasBiases ? "text-rose-400" : "text-emerald-400")}>
                {diag.hasBiases ? `Leakage: -₹${diag.leakedRupees}` : "100% Risk Invariant Compliance"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between bg-[#080c16] flex-wrap gap-3">
          <span className="text-xs text-slate-400">
            Export directly to PNG or copy image binary to clipboard.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleCopyImage}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Image to Clipboard"}</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadImage}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
