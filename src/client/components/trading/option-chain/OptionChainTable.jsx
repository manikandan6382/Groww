import React from "react";
import clsx from "clsx";
import { Zap, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { formatOi } from "./optionChainUtils";

export function OptionChainTable({
  strikes = [],
  spot = 25000,
  maxPain = 25000,
  interval = 50,
  onOpenStrikeModal
}) {
  if (!strikes || strikes.length === 0) {
    return (
      <div className="p-8 text-center font-mono text-xs text-slate-400">
        Loading Option Chain strikes...
      </div>
    );
  }

  // Find max OI across all strikes to scale the visual OI bars proportionally
  let maxOi = 1;
  strikes.forEach((s) => {
    if (s.call.oi > maxOi) maxOi = s.call.oi;
    if (s.put.oi > maxOi) maxOi = s.put.oi;
  });

  return (
    <div className="relative overflow-x-auto no-scrollbar -mx-2 sm:mx-0">
      <table className="w-full text-left border-collapse font-mono text-xs min-w-[700px]">
        <thead>
          <tr className="border-b border-white/[0.08] text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white/[0.02]">
            {/* Calls Header */}
            <th className="py-2.5 px-2 text-right w-[16%]">Call OI</th>
            <th className="py-2.5 px-2 text-right w-[11%]">Chg OI</th>
            <th className="py-2.5 px-2 text-right w-[11%]">Call LTP</th>
            <th className="py-2.5 px-2 text-center w-[8%]">Action</th>

            {/* Strike Header */}
            <th className="py-2.5 px-3 text-center w-[12%] text-white bg-white/[0.04] border-x border-white/[0.08]">
              Strike Price
            </th>

            {/* Puts Header */}
            <th className="py-2.5 px-2 text-center w-[8%]">Action</th>
            <th className="py-2.5 px-2 text-left w-[11%]">Put LTP</th>
            <th className="py-2.5 px-2 text-left w-[11%]">Chg OI</th>
            <th className="py-2.5 px-2 text-left w-[16%]">Put OI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {strikes.map((row) => {
            const isAtm = Math.abs(row.strike - spot) <= interval / 2;
            const isCallItm = row.strike < spot;
            const isPutItm = row.strike > spot;
            const isMaxPain = Math.abs(row.strike - maxPain) <= interval / 2;

            const callOiBarWidth = Math.min(100, Math.max(4, (row.call.oi / maxOi) * 100));
            const putOiBarWidth = Math.min(100, Math.max(4, (row.put.oi / maxOi) * 100));

            return (
              <tr
                key={row.strike}
                className={clsx(
                  "hover:bg-white/[0.03] transition-colors group",
                  isAtm && "bg-cyan-500/[0.06] shadow-[inset_0_1px_0_rgba(6,182,212,0.3),inset_0_-1px_0_rgba(6,182,212,0.3)]"
                )}
              >
                {/* 1. CALL OI (Bar + Number) */}
                <td className={clsx("py-2 px-2 text-right relative", isCallItm && "bg-amber-500/[0.02]")}>
                  <div
                    className="absolute right-0 top-1 bottom-1 bg-emerald-500/15 rounded-l transition-all pointer-events-none"
                    style={{ width: `${callOiBarWidth}%` }}
                  />
                  <span className="relative z-10 font-bold text-slate-200">
                    {formatOi(row.call.oi)}
                  </span>
                </td>

                {/* 2. CALL CHG OI */}
                <td className={clsx("py-2 px-2 text-right", isCallItm && "bg-amber-500/[0.02]")}>
                  <span
                    className={clsx(
                      "text-[10px] font-semibold flex items-center justify-end gap-0.5",
                      row.call.changeOi >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {row.call.changeOi >= 0 ? "+" : ""}
                    {formatOi(row.call.changeOi)}
                  </span>
                </td>

                {/* 3. CALL LTP */}
                <td className={clsx("py-2 px-2 text-right", isCallItm && "bg-amber-500/[0.02]")}>
                  <div className="font-extrabold text-white">
                    ₹{row.call.ltp.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {row.call.change >= 0 ? "+" : ""}
                    {row.call.change.toFixed(1)}
                  </div>
                </td>

                {/* 4. BUY CALL CTA */}
                <td className={clsx("py-2 px-2 text-center", isCallItm && "bg-amber-500/[0.02]")}>
                  <button
                    type="button"
                    onClick={() => onOpenStrikeModal(row, "CE")}
                    className="py-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/30 text-emerald-300 font-black text-[9px] transition-all flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                    title={`Buy ${row.strike} CE (₹250 SL Invariant)`}
                  >
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    <span>BUY</span>
                  </button>
                </td>

                {/* 5. CENTER STRIKE PRICE */}
                <td
                  className={clsx(
                    "py-2 px-3 text-center font-black text-sm border-x border-white/[0.08] relative",
                    isAtm ? "text-cyan-300 bg-cyan-500/20 font-mono" : "text-white bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{row.strike}</span>
                    {isAtm && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 shadow-sm">
                        ATM
                      </span>
                    )}
                    {isMaxPain && !isAtm && (
                      <span
                        className="text-[7px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        title="Max Pain Strike"
                      >
                        MP
                      </span>
                    )}
                  </div>
                </td>

                {/* 6. BUY PUT CTA */}
                <td className={clsx("py-2 px-2 text-center", isPutItm && "bg-amber-500/[0.02]")}>
                  <button
                    type="button"
                    onClick={() => onOpenStrikeModal(row, "PE")}
                    className="py-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 active:scale-95 border border-rose-500/30 text-rose-300 font-black text-[9px] transition-all flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
                    title={`Buy ${row.strike} PE (₹250 SL Invariant)`}
                  >
                    <Zap className="w-2.5 h-2.5 text-rose-400" />
                    <span>BUY</span>
                  </button>
                </td>

                {/* 7. PUT LTP */}
                <td className={clsx("py-2 px-2 text-left", isPutItm && "bg-amber-500/[0.02]")}>
                  <div className="font-extrabold text-white">
                    ₹{row.put.ltp.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {row.put.change >= 0 ? "+" : ""}
                    {row.put.change.toFixed(1)}
                  </div>
                </td>

                {/* 8. PUT CHG OI */}
                <td className={clsx("py-2 px-2 text-left", isPutItm && "bg-amber-500/[0.02]")}>
                  <span
                    className={clsx(
                      "text-[10px] font-semibold flex items-center gap-0.5",
                      row.put.changeOi >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {row.put.changeOi >= 0 ? "+" : ""}
                    {formatOi(row.put.changeOi)}
                  </span>
                </td>

                {/* 9. PUT OI (Number + Bar) */}
                <td className={clsx("py-2 px-2 text-left relative", isPutItm && "bg-amber-500/[0.02]")}>
                  <div
                    className="absolute left-0 top-1 bottom-1 bg-rose-500/15 rounded-r transition-all pointer-events-none"
                    style={{ width: `${putOiBarWidth}%` }}
                  />
                  <span className="relative z-10 font-bold text-slate-200">
                    {formatOi(row.put.oi)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
