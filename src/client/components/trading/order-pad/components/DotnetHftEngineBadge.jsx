import React, { useState, useEffect } from "react";
import { Zap, ShieldCheck, RefreshCw } from "lucide-react";
import { checkDotnetHealth } from "../../../../services/dotnetTradingService";

export function DotnetHftEngineBadge() {
  const [status, setStatus] = useState({ healthy: false, broker: "Checking..." });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const data = await checkDotnetHealth();
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  const isConnected = status.brokerSessionValid === true;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-md text-[11px] text-zinc-300 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"}`} />
        <span className="font-semibold tracking-wide text-zinc-200">.NET 8 HFT:</span>
        <span className="text-indigo-300 font-mono">SHADOW (5001)</span>
      </div>

      <span className="text-zinc-600">|</span>

      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>Upstox {isConnected ? "Active" : "Ready"}</span>
      </div>

      <button
        onClick={fetchStatus}
        disabled={loading}
        title="Ping .NET 8 Engine"
        className="text-zinc-500 hover:text-zinc-300 transition"
      >
        <RefreshCw className={`w-2.5 h-2.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
      </button>
    </div>
  );
}
