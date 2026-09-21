export function buildTimelineQueryParams({
  symbol,
  entryPrice,
  exitPrice,
  closeReason,
  flightScope,
  trade,
  targetPrice,
  stopLoss,
  entryTime,
  exitTime,
  fromTime,
  toTime
}) {
  const params = new URLSearchParams({
    symbol,
    entryPrice: String(entryPrice),
    exitPrice: String(exitPrice),
    closeReason,
  });
  if (flightScope !== 'scalp') {
    params.set('toExpiry', 'true');
    params.set('flightScope', flightScope);
    if (trade?.expiryDatetime) params.set('expiryTime', trade.expiryDatetime);
  }
  if (targetPrice) params.set('targetPrice', String(targetPrice));
  if (stopLoss) params.set('stopLoss', String(stopLoss));

  const resolvedFrom = fromTime ? new Date(fromTime).toISOString() : entryTime;
  const resolvedTo = toTime ? new Date(toTime).toISOString() : exitTime;
  if (resolvedFrom) params.set('from', resolvedFrom);
  if (resolvedTo) params.set('to', resolvedTo);
  if (entryTime) params.set('tradeEntryTime', entryTime);
  if (exitTime) params.set('tradeExitTime', exitTime);

  if (trade?.tokenKey) params.set('tokenKey', trade.tokenKey);
  if (trade?.expiryDate || trade?.expiry) params.set('expiryDate', trade.expiryDate || trade.expiry);
  if (trade?.strikePrice) params.set('strikePrice', String(trade.strikePrice));
  if (trade?.optionType) params.set('optionType', trade.optionType);

  return params;
}
