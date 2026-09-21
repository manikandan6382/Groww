import assert from 'node:assert';
import { resolveFlightScopeWindow } from '../src/client/components/trading/timeline/flightTimeUtils.js';
import { synthesizeMarketFlightPath } from '../src/client/components/trading/timeline/flightSynthesis.js';
import { computeTimelinePoints } from '../src/client/components/trading/timeline/timelineCoordHelpers.js';
import { buildTimelineQueryParams } from '../src/client/components/trading/timeline/timelineDataHelpers.js';

console.log('🧪 Starting Timeline Scopes & Anchoring Verification...\n');

// Mock trade taken today at 11:30 AM, exited at 11:45 AM
const tradeDate = new Date();
const istDateStr = tradeDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const mockTrade = {
  symbol: 'NIFTY 25000 CE',
  entryPrice: 150.0,
  exitPrice: 165.0,
  targetPrice: 170.0,
  stopLoss: 140.0,
  quantity: 50,
  entryDatetime: `${istDateStr}T11:30:00+05:30`,
  exitDatetime: `${istDateStr}T11:45:00+05:30`,
  closeReason: 'TARGET_HIT',
  netPnl: 750
};

// 1. Test resolveFlightScopeWindow for Day
console.log('1. Testing resolveFlightScopeWindow("day")...');
const dayWindow = resolveFlightScopeWindow(mockTrade.entryDatetime, mockTrade.exitDatetime, 'day', mockTrade);
const dayStart = new Date(dayWindow.fromTime);
const dayStartIstTime = dayStart.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
console.log(`   Day fromTime: ${dayStartIstTime} (expected 09:15:00)`);
assert(dayStartIstTime.startsWith('09:15'), `Expected 09:15 AM, got ${dayStartIstTime}`);
assert(dayWindow.toTime > dayWindow.fromTime, 'Expected toTime > fromTime');
console.log('   ✅ Day window anchored to 09:15 AM market open!\n');

// 2. Test resolveFlightScopeWindow for Week
console.log('2. Testing resolveFlightScopeWindow("week")...');
const weekWindow = resolveFlightScopeWindow(mockTrade.entryDatetime, mockTrade.exitDatetime, 'week', mockTrade);
const weekDiffDays = Math.round((weekWindow.toTime - weekWindow.fromTime) / (86400 * 1000));
console.log(`   Week window span: ${weekDiffDays} days (expected ~7 days)`);
assert(weekDiffDays >= 6 && weekDiffDays <= 8, `Expected ~7 days, got ${weekDiffDays}`);
console.log('   ✅ Week window spans last 1 week!\n');

// 3. Test resolveFlightScopeWindow for Month
console.log('3. Testing resolveFlightScopeWindow("month")...');
const monthWindow = resolveFlightScopeWindow(mockTrade.entryDatetime, mockTrade.exitDatetime, 'month', mockTrade);
const monthDiffDays = Math.round((monthWindow.toTime - monthWindow.fromTime) / (86400 * 1000));
console.log(`   Month window span: ${monthDiffDays} days (expected ~30 days)`);
assert(monthDiffDays >= 28 && monthDiffDays <= 32, `Expected ~30 days, got ${monthDiffDays}`);
console.log('   ✅ Month window spans last 1 month!\n');

// 4. Test synthesizeMarketFlightPath for Day
console.log('4. Testing synthesizeMarketFlightPath("day")...');
const dayCandles = synthesizeMarketFlightPath(mockTrade, 'target', 'day');
assert(dayCandles.length > 20, 'Expected at least 20 candles');
const entryCandle = dayCandles.find(c => c.isEntryPoint);
const exitCandle = dayCandles.find(c => c.isExitPoint);
assert(entryCandle, 'Must have isEntryPoint marked candle');
assert(exitCandle, 'Must have isExitPoint marked candle');
const firstCandleTime = new Date(dayCandles[0].timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
console.log(`   First candle time: ${firstCandleTime}`);
console.log(`   Entry candle time: ${new Date(entryCandle.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}`);
console.log(`   Exit candle time:  ${new Date(exitCandle.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}`);
assert(firstCandleTime.startsWith('09:15'), 'First candle must start at 09:15 AM market open');
assert(entryCandle.timestamp > dayCandles[0].timestamp, 'Entry candle must be after 09:15 AM market open');
console.log('   ✅ Day candles properly span 09:15 AM with true entry/exit positions!\n');

// 5. Test computeTimelinePoints
console.log('5. Testing computeTimelinePoints coordinate resolution...');
const coordsRes = computeTimelinePoints({
  displayCandles: dayCandles,
  scaleY: (p) => 100,
  padding: { left: 20, right: 20, top: 30, bottom: 30 },
  graphWidth: 800,
  flightScope: 'day',
  isShort: false,
  entryTime: mockTrade.entryDatetime,
  exitTime: mockTrade.exitDatetime
});
assert(coordsRes.entryPoint, 'Must return entryPoint');
assert(coordsRes.exitPoint, 'Must return exitPoint');
assert(coordsRes.entryPoint.x > coordsRes.pts[0].x, `Entry marker x (${coordsRes.entryPoint.x}) must be after 09:15 AM x (${coordsRes.pts[0].x})`);
console.log(`   Start of Day X: ${coordsRes.pts[0].x.toFixed(1)}px`);
console.log(`   Entry Point X:  ${coordsRes.entryPoint.x.toFixed(1)}px`);
console.log(`   Exit Point X:   ${coordsRes.exitPoint.x.toFixed(1)}px`);
console.log(`   End of Day X:   ${coordsRes.pts[coordsRes.pts.length - 1].x.toFixed(1)}px`);
console.log('   ✅ Milestone markers correctly anchored at true trade times inside the day!\n');

// 6. Test buildTimelineQueryParams
console.log('6. Testing buildTimelineQueryParams...');
const queryParams = buildTimelineQueryParams({
  symbol: mockTrade.symbol,
  entryPrice: mockTrade.entryPrice,
  exitPrice: mockTrade.exitPrice,
  closeReason: mockTrade.closeReason,
  flightScope: 'day',
  trade: mockTrade,
  targetPrice: mockTrade.targetPrice,
  stopLoss: mockTrade.stopLoss,
  entryTime: mockTrade.entryDatetime,
  exitTime: mockTrade.exitDatetime,
  fromTime: dayWindow.fromTime,
  toTime: dayWindow.toTime
});
assert(queryParams.get('from'), 'Must include from param');
assert(queryParams.get('to'), 'Must include to param');
assert.strictEqual(queryParams.get('flightScope'), 'day');
console.log(`   Query params: ${queryParams.toString().substring(0, 80)}...`);
console.log('   ✅ Query params properly formatted with session bounds!\n');

console.log('🎉 ALL TIMELINE VERIFICATION TESTS PASSED SUCCESSFULLY!');
