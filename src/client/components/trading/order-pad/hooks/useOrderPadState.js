import { useState, useCallback } from "react";
import { INDEX_ASSETS } from "../constants";

export function useOrderPadState() {
  const [activeAsset, setActiveAsset] = useState(INDEX_ASSETS[0]);
  const [optionType, setOptionType] = useState(INDEX_ASSETS[0]?.defaultOption || "CALL");
  const [strike, setStrike] = useState(INDEX_ASSETS[0].defaultStrike);
  const [entryPrice, setEntryPrice] = useState(INDEX_ASSETS[0].defaultEntry.toFixed(2));
  const [stopLoss, setStopLoss] = useState(INDEX_ASSETS[0].defaultSL.toFixed(2));
  const [target, setTarget] = useState(INDEX_ASSETS[0].defaultTP.toFixed(2));
  const [quantity, setQuantity] = useState(INDEX_ASSETS[0].lot);
  const [useDotnetEngine, setUseDotnetEngine] = useState(true); // Default to fast .NET 8 HFT!
  const [isExecuting, setIsExecuting] = useState(false);

  const handleSelectAsset = useCallback((asset) => {
    setActiveAsset(asset);
    setOptionType(asset.defaultOption);
    setStrike(asset.defaultStrike);
    setEntryPrice(asset.defaultEntry.toFixed(2));
    setStopLoss(asset.defaultSL.toFixed(2));
    setTarget(asset.defaultTP.toFixed(2));
    setQuantity(asset.lot);
  }, []);

  return {
    activeAsset,
    optionType,
    setOptionType,
    strike,
    setStrike,
    entryPrice,
    setEntryPrice,
    stopLoss,
    setStopLoss,
    target,
    setTarget,
    quantity,
    setQuantity,
    lotSize: activeAsset.lot,
    useDotnetEngine,
    setUseDotnetEngine,
    isExecuting,
    setIsExecuting,
    handleSelectAsset
  };
}
