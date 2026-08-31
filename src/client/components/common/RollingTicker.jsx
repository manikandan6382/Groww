import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTradingStore } from "../../stores/useTradingStore";
import clsx from "clsx";

/**
 * Single Digit Column that rolls vertically from 0 to 9 with staggered wave physics
 */
function DigitColumn({ digit, delay = 0 }) {
  const num = parseInt(digit, 10);
  const isNumber = !isNaN(num);

  if (!isNumber) {
    return <span className="inline-block">{digit}</span>;
  }

  return (
    <span className="inline-block relative overflow-hidden h-[1.15em] align-baseline select-none pointer-events-none">
      <motion.span
        className="flex flex-col"
        initial={false}
        animate={{ y: `-${num * 10}%` }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 24,
          mass: 0.55,
          delay: delay,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="h-[1.15em] flex items-center justify-center font-mono leading-none"
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * Apple Luxury Spatial Rolling Odometer Ticker
 * 
 * Smoothly scrolls individual digits vertically like an Apple Watch counter or mechanical odometer clock.
 * Features a cascaded wave spring delay across digit columns.
 * Enforces tabular-nums font-mono for zero horizontal jitter.
 * Integrated with Streamer Privacy Mode (auto-blurs currency values with hover-to-peek).
 */
export function RollingTicker({
  value = 0,
  prefix = "",
  suffix = "",
  decimalPlaces = 2,
  showSign = false,
  formatIndian = true,
  isSensitive = false,
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();
  const isPrivacyMode = useTradingStore((s) => s.isPrivacyMode);

  const numVal = typeof value === "number" ? value : parseFloat(value) || 0;
  const isNegative = numVal < 0;
  const absVal = Math.abs(numVal);

  // Auto-flag currency amounts as privacy-sensitive
  const shouldMask = isPrivacyMode && (isSensitive || prefix === "₹" || prefix === "$");

  // Format string with decimals
  let formattedNumberString = absVal.toFixed(decimalPlaces);
  
  if (formatIndian) {
    const parts = formattedNumberString.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? `.${parts[1]}` : "";
    
    // Indian currency comma formatting (e.g. 1,50,000)
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedInteger = otherNumbers !== "" 
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree 
      : lastThree;

    formattedNumberString = `${formattedInteger}${decimalPart}`;
  }

  // Determine sign prefix
  let signStr = "";
  if (isNegative) {
    signStr = "-";
  } else if (showSign && numVal > 0) {
    signStr = "+";
  }

  // Combined character tokens array
  const fullString = `${signStr}${prefix}${formattedNumberString}${suffix}`;
  const charTokens = fullString.split("");

  const privacyClasses = shouldMask
    ? "filter blur-[7px] select-none hover:blur-none transition-all duration-200 cursor-pointer"
    : "";

  if (shouldReduceMotion) {
    return (
      <span 
        className={clsx("inline-flex items-baseline font-mono tabular-nums", privacyClasses, className)}
        title={shouldMask ? "Privacy Mode Active (Hover to view)" : undefined}
      >
        {fullString}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-baseline font-mono tabular-nums leading-none",
        privacyClasses,
        className
      )}
      aria-label={fullString}
      title={shouldMask ? "Privacy Mode Active (Hover to view)" : undefined}
    >
      {charTokens.map((char, index) => {
        const isDigit = /\d/.test(char);
        // Staggered micro-wave delay (15ms cascade per digit)
        const delay = isDigit ? (charTokens.length - 1 - index) * 0.015 : 0;
        return isDigit ? (
          <DigitColumn key={`digit-${index}-${charTokens.length}`} digit={char} delay={delay} />
        ) : (
          <span key={`char-${index}-${char}`} className="inline-block select-none">
            {char}
          </span>
        );
      })}
    </span>
  );
}

export default RollingTicker;
