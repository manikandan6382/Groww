import fs from 'fs';

const sess = JSON.parse(fs.readFileSync('data/upstox-session.json', 'utf8'));
const token = sess.access_token;
const headers = { 'Accept': 'application/json', 'Authorization': 'Bearer ' + token };

async function analyze() {
  const niftyKey = encodeURIComponent('NSE_INDEX|Nifty 50');
  const peKey = encodeURIComponent('NSE_FO|64440');
  
  const [resN, resP] = await Promise.all([
    fetch('https://api.upstox.com/v2/historical-candle/intraday/' + niftyKey + '/1minute', { headers }).then(r => r.json()),
    fetch('https://api.upstox.com/v2/historical-candle/intraday/' + peKey + '/1minute', { headers }).then(r => r.json())
  ]);

  const nCandles = (resN.data?.candles || []).slice().reverse();
  const pCandles = (resP.data?.candles || []).slice().reverse();

  const mapP = new Map();
  pCandles.forEach(c => mapP.set(c[0].slice(11, 16), c));

  console.log('TIME  | NIFTY (O -> C [L, H])               | 25000 PE 23-NOV (O -> C [L, H])');
  console.log('---------------------------------------------------------------------------------');

  nCandles.forEach(nc => {
    const t = nc[0].slice(11, 16);
    if (t >= '12:20' && t <= '14:20') {
      const pc = mapP.get(t);
      const nStr = `${nc[1].toFixed(1)} -> ${nc[4].toFixed(1)} [L:${nc[3].toFixed(1)}, H:${nc[2].toFixed(1)}]`;
      const pStr = pc ? `${pc[1].toFixed(2)} -> ${pc[4].toFixed(2)} [L:${pc[3].toFixed(2)}, H:${pc[2].toFixed(2)}]` : 'N/A';
      if (t.endsWith('0') || t.endsWith('5') || (t >= '12:28' && t <= '12:38') || (t >= '13:00' && t <= '13:15') || (t >= '13:30' && t <= '13:45') || (t >= '13:55' && t <= '14:20')) {
        console.log(`${t} | N: ${nStr.padEnd(36)} | PE: ${pStr}`);
      }
    }
  });
}

analyze().catch(console.error);
