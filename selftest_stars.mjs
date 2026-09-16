/**
 * Offline sanity check: load cache/*.json, run OB detect + 5★ scoring, print counts.
 * Mirrors scoring rules in app.js (keep in sync when changing heuristics).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, "cache");

const MAX_OBS = 20;
const BODY_LOOKBACK = 20;
const BREAK_LOOKBACK = 10;
const BOS_LOOKBACK = 20;
const BODY_MULT = 1.5;

function scoreFvg(candles, i, bullish) {
  const checks = [i, i - 1, i + 1].filter((m) => m >= 1 && m + 1 < candles.length);
  for (const m of checks) {
    const left = candles[m - 1];
    const right = candles[m + 1];
    if (bullish && right.low > left.high) return true;
    if (!bullish && right.high < left.low) return true;
  }
  for (let a = i + 1; a <= Math.min(candles.length - 1, i + 3); a++) {
    if (bullish && candles[a].low > candles[i].high) return true;
    if (!bullish && candles[a].high < candles[i].low) return true;
  }
  return false;
}

function scoreBos(candles, i, bullish) {
  const start = Math.max(0, i - BOS_LOOKBACK);
  let priorHigh = -Infinity;
  let priorLow = Infinity;
  for (let j = start; j < i; j++) {
    priorHigh = Math.max(priorHigh, candles[j].high);
    priorLow = Math.min(priorLow, candles[j].low);
  }
  const c = candles[i];
  return bullish ? c.close > priorHigh : c.close < priorLow;
}

function scoreSweep(candles, i, bullish) {
  if (i < 15) return false;
  if (bullish) {
    let raidLow = Infinity;
    let priorLow = Infinity;
    for (let j = i - 5; j <= i; j++) raidLow = Math.min(raidLow, candles[j].low);
    for (let j = i - 15; j <= i - 6; j++) priorLow = Math.min(priorLow, candles[j].low);
    return raidLow < priorLow;
  }
  let raidHigh = -Infinity;
  let priorHigh = -Infinity;
  for (let j = i - 5; j <= i; j++) raidHigh = Math.max(raidHigh, candles[j].high);
  for (let j = i - 15; j <= i - 6; j++) priorHigh = Math.max(priorHigh, candles[j].high);
  return raidHigh > priorHigh;
}

function scorePremiumDiscount(candles, i, obIdx, mid, bullish) {
  const lookStart = Math.max(0, i - 50);
  let swingLow = Infinity;
  for (let j = lookStart; j < i; j++) swingLow = Math.min(swingLow, candles[j].low);
  const end = Math.min(candles.length - 1, i + 5);
  let swingHigh = -Infinity;
  const from = Math.min(obIdx, i);
  for (let j = from; j <= end; j++) swingHigh = Math.max(swingHigh, candles[j].high);
  if (!(swingHigh > swingLow)) return false;
  const half = swingLow + 0.5 * (swingHigh - swingLow);
  return bullish ? mid <= half : mid >= half;
}

function scoreOb(candles, i, obIdx, side, mitigated) {
  const bullish = side === "bullish";
  const mid = (candles[obIdx].high + candles[obIdx].low) / 2;
  const flags = {
    fvg: scoreFvg(candles, i, bullish),
    bos: scoreBos(candles, i, bullish),
    sweep: scoreSweep(candles, i, bullish),
    fresh: !mitigated,
    pd: scorePremiumDiscount(candles, i, obIdx, mid, bullish),
  };
  const stars =
    (flags.fvg ? 1 : 0) +
    (flags.bos ? 1 : 0) +
    (flags.sweep ? 1 : 0) +
    (flags.fresh ? 1 : 0) +
    (flags.pd ? 1 : 0);
  return { stars, starFlags: flags };
}

function detectOrderBlocks(candles) {
  const obs = [];
  if (!candles || candles.length < BODY_LOOKBACK + BREAK_LOOKBACK + 3) return obs;

  for (let i = BODY_LOOKBACK; i < candles.length; i++) {
    const c = candles[i];
    const body = Math.abs(c.close - c.open);
    let sum = 0;
    for (let j = i - BODY_LOOKBACK; j < i; j++) {
      sum += Math.abs(candles[j].close - candles[j].open);
    }
    const avgBody = sum / BODY_LOOKBACK;
    const strongBody = avgBody > 0 && body >= BODY_MULT * avgBody;

    let priorHigh = -Infinity;
    let priorLow = Infinity;
    const start = Math.max(0, i - BREAK_LOOKBACK);
    for (let j = start; j < i; j++) {
      priorHigh = Math.max(priorHigh, candles[j].high);
      priorLow = Math.min(priorLow, candles[j].low);
    }
    const bullDisp = c.close > c.open && (strongBody || c.close > priorHigh);
    const bearDisp = c.close < c.open && (strongBody || c.close < priorLow);
    if (!bullDisp && !bearDisp) continue;

    let obCandle = null;
    let obIdx = -1;
    if (bullDisp) {
      for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
        if (candles[k].close < candles[k].open) {
          obCandle = candles[k];
          obIdx = k;
          break;
        }
      }
    } else {
      for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
        if (candles[k].close > candles[k].open) {
          obCandle = candles[k];
          obIdx = k;
          break;
        }
      }
    }
    if (!obCandle) continue;

    const side = bullDisp ? "bullish" : "bearish";
    const high = obCandle.high;
    const low = obCandle.low;
    const mid = (high + low) / 2;

    let mitigated = false;
    for (let m = i + 1; m < candles.length; m++) {
      const cl = candles[m].close;
      if (side === "bullish" && cl < mid) {
        mitigated = true;
        break;
      }
      if (side === "bearish" && cl > mid) {
        mitigated = true;
        break;
      }
    }

    if (obs.some((o) => o.time === obCandle.time && o.side === side)) continue;

    const scored = scoreOb(candles, i, obIdx, side, mitigated);
    obs.push({
      side,
      time: obCandle.time,
      mitigated,
      stars: scored.stars,
      starFlags: scored.starFlags,
    });
  }

  obs.sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    if (a.mitigated !== b.mitigated) return a.mitigated ? 1 : -1;
    return b.time - a.time;
  });

  const picked = [];
  for (const o of obs) {
    if (picked.length >= MAX_OBS) break;
    if (picked.some((p) => p.time === o.time && p.side === o.side)) continue;
    picked.push(o);
  }
  return picked;
}

function hist(obs) {
  const h = [0, 0, 0, 0, 0, 0];
  for (const o of obs) h[o.stars]++;
  return h;
}

const files = fs.readdirSync(CACHE).filter((f) => f.endsWith(".json")).sort();
if (!files.length) {
  console.error("No cache/*.json found");
  process.exit(1);
}

let anyGe4 = false;
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8"));
  const candles = data.candles || [];
  const obs = detectOrderBlocks(candles);
  const h = hist(obs);
  const ge4 = obs.filter((o) => o.stars >= 4);
  if (ge4.length) anyGe4 = true;
  console.log(`\n=== ${f} (${candles.length} bars) → ${obs.length} capped OBs ===`);
  console.log(`  star hist [0..5]: ${h.join(", ")}`);
  console.log(`  ≥4★: ${ge4.length}  (unmitigated ≥4★: ${ge4.filter((o) => !o.mitigated).length})`);
  for (const o of ge4.slice(0, 5)) {
    const flags = Object.entries(o.starFlags)
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase())
      .join(",");
    console.log(
      `    ${o.stars}★ ${o.side} ${o.mitigated ? "mit" : "fresh"} flags=[${flags}]`
    );
  }
}

console.log("\nSelftest done." + (anyGe4 ? " Found ≥4★ OBs on at least one cache file." : " Warning: no ≥4★ OBs in any cache (heuristics may be strict)."));
