import React from "react";

export function CallPutStrikePicker({ optionType, setOptionType, strike, setStrike }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setOptionType("CALL")}
          className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
            optionType === "CALL" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          CALL (CE)
        </button>
        <button
          type="button"
          onClick={() => setOptionType("PUT")}
          className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
            optionType === "PUT" ? "bg-rose-600 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          PUT (PE)
        </button>
      </div>

      <div className="flex-1 flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
        <span className="text-[11px] text-zinc-400">Strike:</span>
        <input
          type="number"
          step="50"
          value={strike}
          onChange={(e) => setStrike(Number(e.target.value))}
          className="w-full bg-transparent font-mono text-sm font-bold text-zinc-100 focus:outline-none"
        />
      </div>
    </div>
  );
}
