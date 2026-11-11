/**
 * Historical Market Liquidity & Tradeability Classifier
 * Research Data Foundation - Phase 5.1
 * 
 * Prevents treating all historical OHLC bars as executable.
 * Classifies observations by verifiable market volume evidence.
 */

export const LIQUIDITY_STATES = {
  TRADEABLE: "TRADEABLE",
  ZERO_VOLUME: "ZERO_VOLUME",
  POST_MARKET: "POST_MARKET",
  MISSING: "MISSING",
  AMBIGUOUS: "AMBIGUOUS"
};

/**
 * Classify a candle record based on timing and volume evidence.
 * 
 * @param {Object} candle - 1-minute candle record
 * @param {Object} options
 * @param {boolean} options.has_intrabar_touch - Whether both SL & TP touched in this bar
 * @param {number} options.min_tradeable_volume - Minimum contracts needed for fill (default: 65)
 */
export function classifyCandleLiquidity(candle, options = {}) {
  const { has_intrabar_touch = false, min_tradeable_volume = 65 } = options;

  if (!candle || typeof candle !== "object") {
    return {
      state: LIQUIDITY_STATES.MISSING,
      is_tradeable: false,
      reason: "Missing or null candle record"
    };
  }

  // 1. Session boundary check (NSE standard: 09:15 - 15:30 IST)
  const timeMatch = String(candle.timestamp).match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    const hh = parseInt(timeMatch[1], 10);
    const mm = parseInt(timeMatch[2], 10);
    const minuteOfDay = hh * 60 + mm;
    // 09:15 = 555, 15:30 = 930
    if (minuteOfDay < 555 || minuteOfDay > 930) {
      return {
        state: LIQUIDITY_STATES.POST_MARKET,
        is_tradeable: false,
        reason: `Timestamp ${candle.timestamp} is outside regular market hours (09:15 - 15:30 IST)`
      };
    }
  }

  // 2. Intrabar ambiguity
  if (has_intrabar_touch) {
    return {
      state: LIQUIDITY_STATES.AMBIGUOUS,
      is_tradeable: false,
      reason: "Both SL and Target crossed inside the same 1-minute bar; sequence cannot be established"
    };
  }

  // 3. Zero volume check
  const volume = Number(candle.volume || 0);
  if (volume === 0) {
    return {
      state: LIQUIDITY_STATES.ZERO_VOLUME,
      is_tradeable: false,
      reason: "Zero volume on bar (frozen/illiquid quote); cannot guarantee execution fill"
    };
  }

  // 4. Low volume ambiguity (< minimum lot contracts)
  if (volume < min_tradeable_volume) {
    return {
      state: LIQUIDITY_STATES.AMBIGUOUS,
      is_tradeable: false,
      reason: `Bar volume (${volume}) is less than required lot size (${min_tradeable_volume}); partial fill risk`
    };
  }

  // 5. Valid tradeable bar
  return {
    state: LIQUIDITY_STATES.TRADEABLE,
    is_tradeable: true,
    reason: `Regular session bar with observable volume (${volume} units)`
  };
}

export function auditDatasetLiquidityProfile(candles, min_lot_size = 65) {
  if (!Array.isArray(candles)) {
    return { total_bars: 0, states: {} };
  }

  let totalZeroVolumeAll = 0;
  let regularSessionBars = 0;
  let regularSessionTradeable = 0;
  let regularSessionZeroVolume = 0;
  let postMarketBars = 0;
  let postMarketZeroVolume = 0;
  let postMarketNonZeroVolume = 0;
  let lowVolumeAmbiguous = 0;

  for (const c of candles) {
    const vol = Number(c.volume || 0);
    if (vol === 0) totalZeroVolumeAll++;

    // Timing check
    const timeMatch = String(c.timestamp).match(/T(\d{2}):(\d{2}):(\d{2})/);
    let isPostMarket = false;
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2], 10);
      const minuteOfDay = hh * 60 + mm;
      if (minuteOfDay < 555 || minuteOfDay > 930) {
        isPostMarket = true;
      }
    }

    if (isPostMarket) {
      postMarketBars++;
      if (vol === 0) postMarketZeroVolume++;
      else postMarketNonZeroVolume++;
    } else {
      regularSessionBars++;
      if (vol === 0) {
        regularSessionZeroVolume++;
      } else if (vol < min_lot_size) {
        lowVolumeAmbiguous++;
      } else {
        regularSessionTradeable++;
      }
    }
  }

  const total = candles.length;
  return {
    total_bars: total,
    // Phase 5.0 Global Aggregate Metrics (All 1,527 bars)
    global_metrics: {
      total_bars: total,
      total_zero_volume_bars: totalZeroVolumeAll,
      total_zero_volume_percentage: total > 0 ? ((totalZeroVolumeAll / total) * 100).toFixed(2) + "%" : "0.00%",
      total_non_zero_volume_bars: total - totalZeroVolumeAll,
      total_non_zero_volume_percentage: total > 0 ? (((total - totalZeroVolumeAll) / total) * 100).toFixed(2) + "%" : "0.00%"
    },
    // Phase 5.1 Session-Partitioned Metrics
    session_partitioned_metrics: {
      regular_session: {
        total_bars: regularSessionBars,
        percentage_of_total_dataset: total > 0 ? ((regularSessionBars / total) * 100).toFixed(2) + "%" : "0.00%",
        tradeable_bars: regularSessionTradeable,
        tradeable_percentage_of_total: total > 0 ? ((regularSessionTradeable / total) * 100).toFixed(2) + "%" : "0.00%",
        tradeable_percentage_of_session: regularSessionBars > 0 ? ((regularSessionTradeable / regularSessionBars) * 100).toFixed(2) + "%" : "0.00%",
        zero_volume_bars: regularSessionZeroVolume,
        zero_volume_percentage_of_total: total > 0 ? ((regularSessionZeroVolume / total) * 100).toFixed(2) + "%" : "0.00%",
        zero_volume_percentage_of_session: regularSessionBars > 0 ? ((regularSessionZeroVolume / regularSessionBars) * 100).toFixed(2) + "%" : "0.00%",
        low_volume_ambiguous_bars: lowVolumeAmbiguous
      },
      post_market_settlement: {
        total_bars: postMarketBars,
        percentage_of_total_dataset: total > 0 ? ((postMarketBars / total) * 100).toFixed(2) + "%" : "0.00%",
        zero_volume_bars: postMarketZeroVolume,
        non_zero_volume_bars: postMarketNonZeroVolume
      }
    },
    reconciliation_proof: {
      reconciled: totalZeroVolumeAll === (regularSessionZeroVolume + postMarketZeroVolume),
      formula: `Total Zero-Volume (${totalZeroVolumeAll}) = Regular-Session Zero-Volume (${regularSessionZeroVolume}) + Post-Market Zero-Volume (${postMarketZeroVolume})`,
      phase50_match: `${totalZeroVolumeAll} / ${total} = ${((totalZeroVolumeAll / total) * 100).toFixed(2)}%`,
      phase51_match: `In-session: ${regularSessionZeroVolume} / ${total} = ${((regularSessionZeroVolume / total) * 100).toFixed(2)}% | Post-market: ${postMarketBars} / ${total} = ${((postMarketBars / total) * 100).toFixed(2)}%`
    },
    liquidity_data_warning: "Level 2 / Level 3 market depth is unavailable. Executability is estimated from 1-min aggregated bar volume only."
  };
}
