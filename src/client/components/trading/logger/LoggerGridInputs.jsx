import React from "react";
import { LoggerPrimaryInputs } from "./LoggerPrimaryInputs";
import { LoggerRiskInputs } from "./LoggerRiskInputs";

export function LoggerGridInputs({
  symbol,
  setSymbol,
  side,
  setSide,
  quantity,
  setQuantity,
  entryPrice,
  setEntryPrice,
  exitPrice,
  setExitPrice,
  stopLoss,
  setStopLoss,
  targetPrice,
  setTargetPrice,
  setupTag,
  setSetupTag,
  notes,
  setNotes,
  onOpenTopic,
  plannedRiskCash,
  isRiskBreached,
  plannedTargetCash,
  plannedRR,
  autoPegRisk,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <LoggerPrimaryInputs
        symbol={symbol}
        setSymbol={setSymbol}
        side={side}
        setSide={setSide}
        quantity={quantity}
        setQuantity={setQuantity}
        entryPrice={entryPrice}
        setEntryPrice={setEntryPrice}
        exitPrice={exitPrice}
        setExitPrice={setExitPrice}
        onOpenTopic={onOpenTopic}
      />

      <LoggerRiskInputs
        entryPrice={entryPrice}
        stopLoss={stopLoss}
        setStopLoss={setStopLoss}
        targetPrice={targetPrice}
        setTargetPrice={setTargetPrice}
        setupTag={setupTag}
        setSetupTag={setSetupTag}
        notes={notes}
        setNotes={setNotes}
        onOpenTopic={onOpenTopic}
        plannedRiskCash={plannedRiskCash}
        isRiskBreached={isRiskBreached}
        plannedTargetCash={plannedTargetCash}
        plannedRR={plannedRR}
        autoPegRisk={autoPegRisk}
      />
    </div>
  );
}

export default LoggerGridInputs;

