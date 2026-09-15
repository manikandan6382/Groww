import React, { useState } from "react";
import clsx from "clsx";
import { 
  Eye, 
  EyeOff, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck 
} from "lucide-react";
import { soundEngine } from "../../../utils/soundEngine";
import { openBrokerAuthPopup } from "../../../utils/brokerPopupAuth";

export function BrokerTokenForm({ onTokenSaved }) {
  const [tokenInput, setTokenInput] = useState("");
  const [isTokenMasked, setIsTokenMasked] = useState(true);
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [tokenStatusMsg, setTokenStatusMsg] = useState(null);

  const handleSaveToken = async (e) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith("eyJ") || trimmed.length < 50) {
      soundEngine.playStopHitTone();
      setTokenStatusMsg({ 
        type: "error", 
        text: "Invalid Upstox JWT token format. Must start with 'eyJ...' (50+ chars)." 
      });
      return;
    }

    setIsSubmittingToken(true);
    try {
      const res = await fetch("/api/upstox/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        soundEngine.playTargetChime();
        setTokenStatusMsg({ type: "success", text: "Upstox token saved! Live market feed reconnected." });
        setTokenInput("");
        setTimeout(() => {
          onTokenSaved?.();
          setTokenStatusMsg(null);
        }, 2000);
      } else {
        soundEngine.playStopHitTone();
        setTokenStatusMsg({ type: "error", text: data.error || "Failed to update token." });
      }
    } catch (err) {
      soundEngine.playStopHitTone();
      setTokenStatusMsg({ type: "error", text: err.message });
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const upstoxAuthUrl = "https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=61557114-951e-4b68-af88-e5121939f2e4&redirect_uri=http://127.0.0.1:3003/upstox/callback";

  return (
    <div className="space-y-4">
      {/* 🌟 1-Click Fast OAuth Dialog */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-purple-200">
          <span>⚡ Fast 1-Click Authentication:</span>
          <span className="text-[9px] font-mono text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">03:30 AM Safe</span>
        </div>
        <button
          type="button"
          onClick={() => {
            openBrokerAuthPopup("upstox", () => {
              setTokenStatusMsg({ type: "success", text: "Upstox authenticated successfully via popup!" });
              setTimeout(() => onTokenSaved?.(), 1000);
            });
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20 cursor-pointer"
        >
          <span>Login via Upstox Popup</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/10 w-full" />
        <span className="bg-[#121424] px-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest absolute">Or Manual JWT</span>
      </div>

      <form onSubmit={handleSaveToken} className="space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Paste Fresh Upstox Token:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playTabSwitchTone();
                setIsTokenMasked(!isTokenMasked);
              }}
              className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
            >
              {isTokenMasked ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3 text-cyan-400" />}
              <span>{isTokenMasked ? "Masked" : "Revealed"}</span>
            </button>
            <span className="text-slate-600">·</span>
            <a 
              href="https://service.upstox.com/index.html" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <span>Portal</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
        <div className="relative">
          <textarea
            rows={3}
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value);
              if (tokenStatusMsg) setTokenStatusMsg(null);
            }}
            placeholder="Paste Upstox JWT token (eyJhbGciOiJSUzI1NiIsImtpZCI...)"
            style={isTokenMasked ? { WebkitTextSecurity: "disc" } : {}}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition placeholder:text-slate-600 resize-none shadow-inner"
          />
          {tokenInput.trim() && (
            <div className="absolute bottom-2 right-2.5 text-[9px] font-mono font-bold text-slate-400 bg-black/70 px-1.5 py-0.5 rounded border border-white/10">
              {tokenInput.length} chars
            </div>
          )}
        </div>
      </div>

      {tokenStatusMsg && (
        <div className={clsx("p-3 rounded-2xl border text-xs font-mono flex items-center gap-2 animate-in fade-in", tokenStatusMsg.type === "success" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border-rose-500/30")}>
          {tokenStatusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span>{tokenStatusMsg.text}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmittingToken || !tokenInput.trim()}
        className={clsx(
          "w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg",
          isSubmittingToken || !tokenInput.trim()
            ? "bg-white/10 text-slate-500 border border-white/5 cursor-not-allowed"
            : "bg-gradient-to-r from-cyan-500 to-sky-500 text-black font-extrabold shadow-cyan-500/25 hover:from-cyan-400 cursor-pointer"
        )}
      >
        {isSubmittingToken ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Validating & Connecting...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            <span>Save Token & Stream Live Data</span>
          </>
        )}
      </button>
    </form>
  </div>
  );
}
