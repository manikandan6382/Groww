---
name: trading_finance
description: Expert trading and finance skill covering stock markets, technical analysis, trading indicators, charting libraries, and building fintech dashboards for a developer who actively trades.
---

# Trading & Finance Skill

## Context
The user is an active stock trader and fintech developer. They understand trading concepts at an intermediate-to-advanced level.

## Key Trading Concepts (User Knows These)
- **Candlestick Charts**: OHLCV (Open, High, Low, Close, Volume)
- **Trend Indicators**: EMA, SMA, VWAP, Bollinger Bands
- **Momentum Indicators**: RSI, MACD, Stochastic, CCI
- **Volume Indicators**: OBV, Volume Profile, VWAP
- **Order Types**: Market, Limit, Stop-Loss, Stop-Limit, GTT
- **Portfolio Metrics**: P&L, XIRR, CAGR, Drawdown, Sharpe Ratio
- **Options**: Strike, Expiry, IV, Greeks (Delta, Gamma, Theta, Vega)

## Indian Stock Market Context
- **Exchanges**: NSE, BSE
- **Indices**: NIFTY 50, SENSEX, BANK NIFTY, NIFTY MIDCAP
- **Brokers/APIs**: Zerodha Kite Connect, Upstox API, Angel One SmartAPI, Groww
- **Market Hours**: 9:15 AM - 3:30 PM IST (weekdays)
- **Settlement**: T+1 for equity

## Charting Libraries

### TradingView Lightweight Charts (Preferred)
```js
import { createChart } from 'lightweight-charts';

const chart = createChart(container, {
  width: 800,
  height: 400,
  layout: {
    background: { color: '#0d1117' },
    textColor: '#c9d1d9',
  },
  grid: {
    vertLines: { color: '#21262d' },
    horzLines: { color: '#21262d' },
  },
});

const candleSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});
```

### Recharts (Simpler React charts)
```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
```

## Finance Dashboard Design Patterns
- Dark theme (#0d1117) for trading UIs — easier on eyes
- Green (#26a69a) for gains/bullish, Red (#ef5350) for losses/bearish
- Real-time updates via WebSocket where possible
- Show percentage change alongside absolute values
- Sparklines for quick trend visualization
- Heatmaps for sector performance

## Key Calculations
```js
// EMA Calculation
const calculateEMA = (prices, period) => {
  const k = 2 / (period + 1);
  return prices.reduce((ema, price, i) =>
    i === 0 ? price : price * k + ema * (1 - k), prices[0]);
};

// P&L
const pnl = (currentPrice - avgBuyPrice) * quantity;
const pnlPercent = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
```

## Useful APIs
- **Zerodha Kite**: kiteconnect.zerodha.com
- **Upstox**: developer.upstox.com
- **Angel One**: smartapi.angelbroking.com
- **Alpha Vantage**: alphavantage.co (free tier)
- **Yahoo Finance**: via yahoo-finance2 (Node.js)
