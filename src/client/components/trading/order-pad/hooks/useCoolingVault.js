import { useState, useEffect } from "react";

export function useCoolingVault(coolingVaultUnlockTime) {
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    if (!coolingVaultUnlockTime) return;
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [coolingVaultUnlockTime]);

  const vaultMsRemaining = coolingVaultUnlockTime ? Math.max(0, coolingVaultUnlockTime - nowTime) : 0;
  const vaultSecRemaining = Math.floor(vaultMsRemaining / 1000);
  const vaultMins = Math.floor(vaultSecRemaining / 60);
  const vaultSecs = vaultSecRemaining % 60;
  const vaultFormattedTime = `${String(vaultMins).padStart(2, "0")}:${String(vaultSecs).padStart(2, "0")}`;
  const isVaultRunning = Boolean(coolingVaultUnlockTime && vaultMsRemaining > 0);
  const isVaultReadyToClaim = Boolean(coolingVaultUnlockTime && vaultMsRemaining <= 0);

  return {
    vaultMsRemaining,
    vaultFormattedTime,
    isVaultRunning,
    isVaultReadyToClaim
  };
}
