export function evaluateExecutionDiscipline({
  isTargetHit,
  isStopHit,
  targetPrice,
  entryPrice,
  exitPrice,
  stopDisciplineDelta,
  grossPts
}) {
  if (isTargetHit) {
    return {
      grade: 'A+',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
      label: 'Target Captured 100%',
      detail: targetPrice ? `Filled @ ₹${entryPrice.toFixed(1)} ➔ Scalp secured @ ₹${exitPrice.toFixed(1)} (Target: ₹${targetPrice.toFixed(1)}).` : 'Planned target reached cleanly.'
    };
  }
  if (isStopHit) {
    const isCleanCut = Math.abs(stopDisciplineDelta) <= 1.5;
    return {
      grade: isCleanCut ? 'A' : 'B-',
      badgeClass: isCleanCut ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: isCleanCut ? 'Disciplined Stop Cut' : 'Slippage on Cut',
      detail: isCleanCut ? 'Cut cleanly at predefined risk boundary. Capital protected.' : `Exited with ${Math.abs(stopDisciplineDelta).toFixed(1)} pts slippage.`
    };
  }
  if (grossPts > 0) {
    return {
      grade: 'B+',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Discretionary Take-Profit',
      detail: `Secured profit of +${grossPts.toFixed(1)} pts before target was reached.`
    };
  }
  return {
    grade: 'C',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    label: 'Discretionary Early Exit',
    detail: 'Exited position before reaching target or stop.'
  };
}
