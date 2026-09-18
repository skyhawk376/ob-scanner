/**
 * OB Scanner front-end
 * - Fetches OHLC via local /api/candles proxy
 * - Detects ICT-style Order Blocks + Kasper-style 0–5★ confluence scoring
 * - Renders list + Lightweight Charts with click-to-draw zones
 */
(function () {
  "use strict";

  const WATCHLIST = [
    { id: "XAUUSD", label: "XAUUSD → PAXG (gold proxy)" },
    { id: "NAS100", label: "NAS100 → NQ=F" },
    { id: "SP500", label: "SP500 → ES=F" },
    { id: "BTCUSD", label: "BTCUSD (Coinbase)" },
    { id: "EURUSD", label: "EURUSD" },
    { id: "GBPUSD", label: "GBPUSD" },
    { id: "XAUUSD_FUT", label: "XAUUSD_FUT → GC=F" },
    { id: "USDJPY", label: "USDJPY" },
    { id: "AUDUSD", label: "AUDUSD" },
    { id: "US30", label: "US30 → YM=F" },
    { id: "ETHUSD", label: "ETHUSD (Coinbase)" },
  ];

  const MAX_OBS = 40;
  const BODY_LOOKBACK = 20;
  const BREAK_LOOKBACK = 10;
  const BOS_LOOKBACK = 20; // stricter lookback for BOS★ (break of structure)
  const BODY_MULT = 1.5;

  const state = {
    symbol: "XAUUSD",
    tf: "M15",
    candles: [],
    obs: [],
    selectedId: null,
    showMitigated: false,
    minStars: 5,
    sourceNote: "",
    // "multi" = Scan all 5★ list; keep it when clicking a row to open a chart
    listMode: "single",
    multiObs: [],
  };

  // --- DOM ---
  const el = {
    symbolSelect: document.getElementById("symbolSelect"),
    obList: document.getElementById("obList"),
    obCount: document.getElementById("obCount"),
    status: document.getElementById("status"),
    chartTitle: document.getElementById("chartTitle"),
    sourceNote: document.getElementById("sourceNote"),
    errorBanner: document.getElementById("errorBanner"),
    btnPrimary: document.getElementById("btnPrimary"),
    btnScanWorld: document.getElementById("btnScanWorld"),
    actifsOnly: document.getElementById("actifsOnly"),
    minStars: document.getElementById("minStars"),
    filterText: document.getElementById("filterText"),
    chart: document.getElementById("chart"),
  };

  // --- Chart ---
  let chart, candleSeries, zonePrimitives = [];

  function initChart() {
    chart = LightweightCharts.createChart(el.chart, {
      layout: {
        background: { type: "solid", color: "#0b0f14" },
        textColor: "#8b9bb4",
      },
      grid: {
        vertLines: { color: "#1a222e" },
        horzLines: { color: "#1a222e" },
      },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e2836" },
      timeScale: { borderColor: "#1e2836", timeVisible: true, secondsVisible: false },
    });
    candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.chart.clientWidth, height: el.chart.clientHeight });
    });
    ro.observe(el.chart);
    chart.applyOptions({ width: el.chart.clientWidth, height: el.chart.clientHeight });
  }

  function clearZones() {
    if (candleSeries && zonePrimitives.priceLines) {
      zonePrimitives.priceLines.forEach((pl) => candleSeries.removePriceLine(pl));
    }
    zonePrimitives = { priceLines: [], boxes: [] };
    drawOverlayBoxes([]);
  }

  /** Simple absolute-position overlay for OB rectangles (LWC has no built-in box). */
  let overlayCanvas;
  function ensureOverlay() {
    if (overlayCanvas) return overlayCanvas;
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;";
    el.chart.style.position = "relative";
    el.chart.appendChild(overlayCanvas);
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => redrawOverlay());
    chart.subscribeCrosshairMove(() => redrawOverlay());
    window.addEventListener("resize", () => redrawOverlay());
    return overlayCanvas;
  }

  function drawOverlayBoxes(boxes) {
    const canvas = ensureOverlay();
    const w = el.chart.clientWidth;
    const h = el.chart.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    boxes.forEach((b) => {
      const x1 = chart.timeScale().timeToCoordinate(b.timeFrom);
      const x2 = chart.timeScale().timeToCoordinate(b.timeTo);
      const y1 = candleSeries.priceToCoordinate(b.priceHigh);
      const y2 = candleSeries.priceToCoordinate(b.priceLow);
      if (x1 == null || y1 == null || y2 == null) return;
      const left = x1;
      const right = x2 == null ? w - 8 : Math.max(x2, left + 4);
      const top = Math.min(y1, y2);
      const height = Math.abs(y2 - y1);
      const fillA = b.dim ? (b.bull ? "rgba(38,166,154,0.08)" : "rgba(239,83,80,0.08)")
                         : (b.bull ? "rgba(38,166,154,0.18)" : "rgba(239,83,80,0.18)");
      const strokeA = b.dim ? (b.bull ? "rgba(38,166,154,0.35)" : "rgba(239,83,80,0.35)")
                           : (b.bull ? "rgba(38,166,154,0.85)" : "rgba(239,83,80,0.85)");
      ctx.fillStyle = fillA;
      ctx.strokeStyle = strokeA;
      ctx.lineWidth = b.dim ? 1 : 1.5;
      ctx.fillRect(left, top, Math.max(right - left, 6), Math.max(height, 2));
      ctx.strokeRect(left, top, Math.max(right - left, 6), Math.max(height, 2));
      if (!b.dim) {
        const midY = candleSeries.priceToCoordinate((b.priceHigh + b.priceLow) / 2);
        if (midY != null) {
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(left, midY);
          ctx.lineTo(Math.max(right, left + 6), midY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });
  }

  let selectedObForDraw = null;

  function qualifyingObsForOverlay() {
    return state.obs.filter((o) => {
      if (o.mitigated || o.stars < state.minStars) return false;
      // Multi-scan list mixes symbols — only box zones for the chart on screen
      if (o.symbol && o.symbol !== state.symbol) return false;
      if (o.tf && o.tf !== state.tf) return false;
      return true;
    });
  }

  function redrawOverlay() {
    const lastT = state.candles.length
      ? state.candles[state.candles.length - 1].time
      : null;
    if (!lastT) {
      drawOverlayBoxes([]);
      return;
    }
    const boxes = [];
    const selectedId = selectedObForDraw ? selectedObForDraw.id : null;
    qualifyingObsForOverlay().forEach((ob) => {
      if (ob.id === selectedId) return; // draw selected last / full
      boxes.push({
        timeFrom: ob.time,
        timeTo: lastT,
        priceHigh: ob.high,
        priceLow: ob.low,
        bull: ob.side === "bullish",
        dim: true,
      });
    });
    if (selectedObForDraw) {
      boxes.push({
        timeFrom: selectedObForDraw.time,
        timeTo: lastT,
        priceHigh: selectedObForDraw.high,
        priceLow: selectedObForDraw.low,
        bull: selectedObForDraw.side === "bullish",
        dim: false,
      });
    }
    drawOverlayBoxes(boxes);
  }

  function drawObOnChart(ob) {
    // clear price lines only; overlay redrawn below
    if (candleSeries && zonePrimitives.priceLines) {
      zonePrimitives.priceLines.forEach((pl) => candleSeries.removePriceLine(pl));
    }
    zonePrimitives = { priceLines: [], boxes: [] };
    selectedObForDraw = ob;
    const color = ob.side === "bullish" ? "#26a69a" : "#ef5350";
    const plHigh = candleSeries.createPriceLine({
      price: ob.high,
      color,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: ob.side === "bullish" ? "Bull OB H" : "Bear OB H",
    });
    const plLow = candleSeries.createPriceLine({
      price: ob.low,
      color,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Solid,
      axisLabelVisible: true,
      title: ob.side === "bullish" ? "Bull OB L" : "Bear OB L",
    });
    const mid = ob.entry != null ? ob.entry : (ob.high + ob.low) / 2;
    const plMid = candleSeries.createPriceLine({
      price: mid,
      color: "#f0b429",
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Entry 50%",
    });
    const lines = [plHigh, plLow, plMid];
    if (ob.sl != null) {
      lines.push(
        candleSeries.createPriceLine({
          price: ob.sl,
          color: "#ff8a65",
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: "SL",
        })
      );
    }
    if (ob.tp != null) {
      lines.push(
        candleSeries.createPriceLine({
          price: ob.tp,
          color: "#66bb6a",
          lineWidth: 1,
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: "TP 1.5R",
        })
      );
    }
    zonePrimitives.priceLines = lines;

    const starTxt = "★".repeat(ob.stars) + "☆".repeat(5 - ob.stars);
    candleSeries.setMarkers([
      {
        time: ob.time,
        position: ob.side === "bullish" ? "belowBar" : "aboveBar",
        color,
        shape: ob.side === "bullish" ? "arrowUp" : "arrowDown",
        text: (ob.side === "bullish" ? "Bull" : "Bear") + " " + starTxt,
      },
      {
        time: ob.dispTime,
        position: "inBar",
        color: "#3d8bfd",
        shape: "circle",
        text: "Disp",
      },
    ]);

    const idx = state.candles.findIndex((c) => c.time === ob.time);
    if (idx >= 0) {
      const from = Math.max(0, idx - 30);
      const to = Math.min(state.candles.length - 1, idx + 80);
      chart.timeScale().setVisibleLogicalRange({ from, to });
    }
    redrawOverlay();
  }

  // --- Scoring helpers ---

  /**
   * FVG / imbalance involving displacement bar i as middle candle.
   * Bull: candles[i+1].low > candles[i-1].high
   * Bear: candles[i+1].high < candles[i-1].low
   * Also checks i-1 / i / i+1 shifts nearby (±1) if classic miss.
   */
  function scoreFvg(candles, i, bullish) {
    const checks = [i, i - 1, i + 1].filter(
      (m) => m >= 1 && m + 1 < candles.length
    );
    for (const m of checks) {
      const left = candles[m - 1];
      const right = candles[m + 1];
      if (bullish && right.low > left.high) return true;
      if (!bullish && right.high < left.low) return true;
    }
    // clear gap in 1–3 bars after i in direction
    for (let a = i + 1; a <= Math.min(candles.length - 1, i + 3); a++) {
      if (bullish && candles[a].low > candles[i].high) return true;
      if (!bullish && candles[a].high < candles[i].low) return true;
    }
    return false;
  }

  /**
   * BOS★ — displacement close breaks prior BOS_LOOKBACK extreme (not body-only).
   */
  function scoreBos(candles, i, bullish) {
    const start = Math.max(0, i - BOS_LOOKBACK);
    let priorHigh = -Infinity;
    let priorLow = Infinity;
    for (let j = start; j < i; j++) {
      priorHigh = Math.max(priorHigh, candles[j].high);
      priorLow = Math.min(priorLow, candles[j].low);
    }
    const c = candles[i];
    if (bullish) return c.close > priorHigh;
    return c.close < priorLow;
  }

  /**
   * Sweep / liquidity raid heuristic:
   * Bull: min(low i-5..i) < min(low i-15..i-6) then bullish displacement
   * Bear: max(high i-5..i) > max(high i-15..i-6) then bearish displacement
   */
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

  /**
   * Premium / Discount vs local swing range.
   * Range: swingLow = min low of last 50 bars before disp;
   *        swingHigh = max high from OB index through disp+5.
   * Bullish ★ if OB.mid in lower half (discount); bearish ★ if OB.mid in upper half (premium).
   */
  function scorePremiumDiscount(candles, i, obIdx, mid, bullish) {
    const lookStart = Math.max(0, i - 50);
    let swingLow = Infinity;
    for (let j = lookStart; j < i; j++) {
      swingLow = Math.min(swingLow, candles[j].low);
    }
    const end = Math.min(candles.length - 1, i + 5);
    let swingHigh = -Infinity;
    const from = Math.min(obIdx, i);
    for (let j = from; j <= end; j++) {
      swingHigh = Math.max(swingHigh, candles[j].high);
    }
    if (!(swingHigh > swingLow)) return false;
    const half = swingLow + 0.5 * (swingHigh - swingLow);
    if (bullish) return mid <= half; // discount
    return mid >= half; // premium
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


  /**
   * Recommended SL/TP (scan-only, Kasper/ICT + Oscar paper style).
   * Entry = distal edge (bull=low / bear=high). SL beyond that extreme + wider buffer (7.5%).
   * TP = entry ± 1.5R where R = |entry - SL|.
   */
  function computeSlTp(high, low, side) {
    const entry = side === "bullish" ? low : high;
    const range = Math.max(0, high - low);
    const buffer = Math.max(range * 0.075, Math.abs(entry) * 1.5e-5);
    let sl, tp, r;
    if (side === "bullish") {
      sl = low - buffer;
      r = entry - sl;
      tp = entry + 1.5 * r;
    } else {
      sl = high + buffer;
      r = sl - entry;
      tp = entry - 1.5 * r;
    }
    return { entry, sl, tp, r };
  }

  // --- OB detection ---
  /**
   * ICT-style Order Block detection + Kasper-style 0–5★ confluence.
   *
   * Displacement (candidate find):
   *   body >= 1.5 × avg body of prior 20, OR close breaks prior 10-bar H/L.
   * OB candle = last opposing candle within 8 bars before displacement.
   * Mitigated = later close through 50% mid.
   *
   * Stars (1 each, max 5): FVG, BOS (break of 20-bar extreme), Sweep, Fresh, P/D.
   * Sorted by stars desc, then unmitigated, then recent; cap MAX_OBS.
   */
  function detectOrderBlocks(candles, opts) {
    opts = opts || {};
    const sym = opts.symbol != null ? opts.symbol : state.symbol;
    const timeframe = opts.tf != null ? opts.tf : state.tf;
    const maxObs = opts.maxObs != null ? opts.maxObs : MAX_OBS;
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
      let mitigatedAt = null;
      for (let m = i + 1; m < candles.length; m++) {
        const cl = candles[m].close;
        if (side === "bullish" && cl < mid) {
          mitigated = true;
          mitigatedAt = candles[m].time;
          break;
        }
        if (side === "bearish" && cl > mid) {
          mitigated = true;
          mitigatedAt = candles[m].time;
          break;
        }
      }

      if (obs.some((o) => o.time === obCandle.time && o.side === side)) continue;

      const scored = scoreOb(candles, i, obIdx, side, mitigated);

      const sltp = computeSlTp(high, low, side);

      obs.push({
        id: `${side}-${obCandle.time}-${i}`,
        side,
        time: obCandle.time,
        dispTime: c.time,
        dispIndex: i,
        obIndex: obIdx,
        high,
        low,
        mid,
        entry: sltp.entry,
        sl: sltp.sl,
        tp: sltp.tp,
        r: sltp.r,
        mitigated,
        mitigatedAt,
        symbol: sym,
        tf: timeframe,
        dispBody: body,
        avgBody,
        stars: scored.stars,
        starFlags: scored.starFlags,
      });
    }

    // Sort: stars desc, unmitigated first, then most recent (higher time)
    obs.sort((a, b) => {
      if (b.stars !== a.stars) return b.stars - a.stars;
      if (a.mitigated !== b.mitigated) return a.mitigated ? 1 : -1;
      return b.time - a.time;
    });

    const picked = [];
    for (const o of obs) {
      if (picked.length >= maxObs) break;
      if (picked.some((p) => p.time === o.time && p.side === o.side)) continue;
      picked.push(o);
    }
    return picked;
  }

  // --- UI helpers ---
  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function showError(msg) {
    if (!msg) {
      el.errorBanner.classList.add("hidden");
      el.errorBanner.textContent = "";
      return;
    }
    el.errorBanner.textContent = msg;
    el.errorBanner.classList.remove("hidden");
  }

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    const digits = abs >= 1000 ? 2 : abs >= 10 ? 3 : abs >= 1 ? 5 : 6;
    return n.toFixed(digits);
  }

  function fmtTime(t) {
    try {
      return new Date(t * 1000).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }) + " PT";
    } catch {
      return String(t);
    }
  }

  function starsHtml(n) {
    return `<span class="stars" title="${n}/5">` +
      "★".repeat(n) + "☆".repeat(5 - n) +
      `</span>`;
  }

  function flagsHtml(flags) {
    const tags = [
      ["fvg", "FVG"],
      ["bos", "BOS"],
      ["sweep", "SWP"],
      ["fresh", "FR"],
      ["pd", "PD"],
    ];
    return (
      '<span class="flag-row">' +
      tags
        .map(([k, label]) => {
          const on = flags && flags[k];
          return `<span class="flag ${on ? "on" : "off"}">${label}</span>`;
        })
        .join("") +
      "</span>"
    );
  }

  function filteredObs() {
    const q = (el.filterText.value || "").trim().toLowerCase();
    let items = state.obs.slice();
    items = items.filter((o) => o.stars >= state.minStars);
    if (!state.showMitigated) items = items.filter((o) => !o.mitigated);
    if (q) {
      items = items.filter(
        (o) =>
          o.side.includes(q) ||
          (o.symbol && o.symbol.toLowerCase().includes(q)) ||
          o.tf.toLowerCase().includes(q) ||
          String(o.high).includes(q) ||
          String(o.stars).includes(q) ||
          (o.mitigated ? "mitigated" : "fresh").includes(q) ||
          (o.starFlags &&
            Object.keys(o.starFlags).some(
              (k) => o.starFlags[k] && k.includes(q)
            ))
      );
    }
    return items;
  }

  function renderList() {
    const items = filteredObs();
    const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
    el.obCount.textContent = String(items.length);
    el.obList.innerHTML = "";
    if (!items.length) {
      el.obList.innerHTML =
        `<li class="ob-item" style="cursor:default;opacity:0.7">No OBs with ≥${state.minStars}★ for this filter.</li>`;
      redrawOverlay();
      return;
    }
    items.forEach((ob) => {
      const li = document.createElement("li");
      li.className =
        "ob-item " +
        (ob.side === "bullish" ? "bull" : "bear") +
        (ob.mitigated ? " mitigated" : "") +
        (state.selectedId === ob.id ? " active" : "");
      const symLabel = ob.symbol
        ? `<span class="sym-tag">${ob.symbol}</span>`
        : `<span class="sym-tag">${state.symbol}</span>`;
      const tfLabel = `<span class="tf-tag">${ob.tf || state.tf}</span>`;
      li.innerHTML = `
        <div class="row">
          <span class="side">${symLabel}${tfLabel}${ob.side === "bullish" ? "BULLISH OB" : "BEARISH OB"}
            <span class="tag ${ob.mitigated ? "dead" : "live"}">${ob.mitigated ? "mitigated" : "active"}</span>
          </span>
        </div>
        <div class="row stars-row">
          ${starsHtml(ob.stars)}
          ${flagsHtml(ob.starFlags)}
        </div>
        <div class="zone">${fmtPrice(ob.low)} — ${fmtPrice(ob.high)}</div>
        <div class="sltp">SL ${fmtPrice(ob.sl)} · TP ${fmtPrice(ob.tp)} · 1.5R</div>
        <div class="meta">OB ${fmtTime(ob.time)} · Disp ${fmtTime(ob.dispTime)}</div>
      `;
      li.addEventListener("click", () => {
        focusObFromList(ob);
      });
      el.obList.appendChild(li);
    });
    // keep overlay in sync when list refilters
    if (!selectedObForDraw || !items.some((o) => o.id === selectedObForDraw.id)) {
      // selection may be filtered out — clear focus lines but keep dim overlays
      if (selectedObForDraw && !items.some((o) => o.id === selectedObForDraw.id)) {
        if (candleSeries && zonePrimitives.priceLines) {
          zonePrimitives.priceLines.forEach((pl) => candleSeries.removePriceLine(pl));
        }
        zonePrimitives.priceLines = [];
        selectedObForDraw = null;
        candleSeries.setMarkers([]);
      }
    }
    redrawOverlay();
  }


  function isScanAllMode() {
    return (
      (el.symbolSelect && el.symbolSelect.value === "__ALL__") ||
      state.listMode === "multi"
    );
  }

  function updatePrimaryCta() {
    if (!el.btnPrimary) return;
    const scan = isScanAllMode();
    el.btnPrimary.textContent = scan ? "Scan all 5★" : "Refresh";
    el.btnPrimary.classList.toggle("scan-all", scan);
    el.btnPrimary.title = scan
      ? "Scan every watchlist symbol for 5★ OBs at the current TF"
      : "Reload candles and OBs for the selected symbol";
  }

  function setPrimaryDisabled(disabled) {
    const d = !!disabled;
    if (el.btnPrimary) el.btnPrimary.disabled = d;
    if (el.btnScanWorld) el.btnScanWorld.disabled = d;
  }

  async function loadData(opts) {
    opts = opts || {};
    const chartOnly = !!opts.chartOnly; // keep multi-scan list; only refresh candles/chart
    showError("");
    setStatus(`Loading ${state.symbol} ${state.tf}…`);
    if (!chartOnly) {
      el.chartTitle.textContent = `${state.symbol} · ${state.tf}`;
    }
    try {
      const url = `/api/candles?symbol=${encodeURIComponent(state.symbol)}&tf=${encodeURIComponent(state.tf)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.candles || !data.candles.length) {
        throw new Error("No candles returned");
      }
      state.candles = data.candles;
      const stale = data.from_disk ? " · STALE CACHE" : "";
      state.sourceNote = `${data.source || ""} · ${data.count} bars${stale}`;
      if (data.note) state.sourceNote += ` · ${data.note}`;
      el.sourceNote.textContent = state.sourceNote;
      if (data.from_disk && data.live_error) {
        showError(`Live feed unavailable (${data.live_error}). Showing last cached candles.`);
      }

      candleSeries.setData(
        state.candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      candleSeries.setMarkers([]);
      clearZones();
      if (!chartOnly) {
        selectedObForDraw = null;
        state.obs = detectOrderBlocks(state.candles);
        state.selectedId = null;
        state.listMode = "single";
        state.multiObs = [];
        renderList();
        chart.timeScale().fitContent();
        const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
        const activeGe = state.obs.filter((o) => !o.mitigated && o.stars >= state.minStars).length;
        setStatus(
          `${geMin} OB ≥${state.minStars}★ (${activeGe} active) · ${state.obs.length} capped`
        );
      } else {
        chart.timeScale().fitContent();
      }
      updatePrimaryCta();
    } catch (err) {
      console.error(err);
      showError(
        `Failed to load candles for ${state.symbol} ${state.tf}: ${err.message}. ` +
          `Is the local server running (python3 server.py)? Check network / API limits.`
      );
      setStatus("Error — see banner");
      updatePrimaryCta();
    }
  }


  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setTfButtons(tf) {
    document.querySelectorAll(".tf-group button").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tf") === tf);
    });
  }

  /** Click a list row: switch symbol/TF if needed, load chart, select that OB. */
  async function focusObFromList(ob) {
    const keepMulti = state.listMode === "multi";
    const multiSnapshot = keepMulti
      ? (state.multiObs.length ? state.multiObs.slice() : state.obs.slice())
      : null;
    const targetSym = ob.symbol || state.symbol;
    const targetTf = ob.tf || state.tf;
    const needReload =
      targetSym !== state.symbol ||
      targetTf !== state.tf ||
      !state.candles.length;

    if (needReload) {
      state.symbol = targetSym;
      state.tf = targetTf;
      if (el.symbolSelect) el.symbolSelect.value = targetSym;
      setTfButtons(targetTf);
      setStatus(`Loading ${targetSym} ${targetTf} for selected OB…`);
      // chartOnly when multi-scan so we don't wipe the merged 5★ list
      await loadData({ chartOnly: keepMulti });
    }

    if (keepMulti && multiSnapshot) {
      state.listMode = "multi";
      state.multiObs = multiSnapshot;
      state.obs = multiSnapshot;
    }

    const match =
      state.obs.find((o) => o.id === ob.id) ||
      state.obs.find(
        (o) =>
          o.time === ob.time &&
          o.side === ob.side &&
          o.stars === ob.stars &&
          (!ob.symbol || o.symbol === ob.symbol)
      ) ||
      state.obs.find(
        (o) =>
          o.time === ob.time &&
          o.side === ob.side &&
          (!ob.symbol || o.symbol === ob.symbol)
      ) ||
      ob;

    state.selectedId = match.id;
    renderList();
    drawObOnChart(match);
    const multiNote = keepMulti
      ? ` · liste multi ${state.obs.length} OB conservée`
      : "";
    setStatus(
      `Drawing ${match.symbol || state.symbol} ${match.side} ${match.stars}★ OB @ ${fmtPrice(match.low)}–${fmtPrice(match.high)}` +
        multiNote
    );
    if (keepMulti) {
      el.chartTitle.textContent = `${state.symbol} · ${state.tf} (multi 5★)`;
      el.sourceNote.textContent =
        `Multi-scan list kept · ${state.obs.length} OB · click another row to switch chart`;
    }
    updatePrimaryCta();
  }

  async function fetchCandlesRaw(symbol, tf) {
    const url = `/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    if (!data.candles || !data.candles.length) {
      throw new Error("No candles returned");
    }
    return data;
  }

  /**
   * Multi-asset hunt at the currently selected TF only (state.tf).
   * Sequential fetch (avoid Yahoo 429), collect stars===5. Cap ~80.
   * TF badge kept on each list row (useful when opening charts).
   */
  async function scanAllFiveStars() {
    const symbols = WATCHLIST.map((s) => s.id);
    const tf = state.tf;
    const showMit = state.showMitigated;
    const collected = [];
    const MULTI_CAP = 80;
    const SCAN_DELAY_MS = 350;

    setPrimaryDisabled(true);
    showError("");

    try {
      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        setStatus(`Scanning ${sym} ${tf}… ${i + 1}/${symbols.length}`);
        try {
          const data = await fetchCandlesRaw(sym, tf);
          const obs = detectOrderBlocks(data.candles, { symbol: sym, tf });
          let five = obs.filter((o) => o.stars === 5);
          if (!showMit) five = five.filter((o) => !o.mitigated);
          collected.push(...five);
        } catch (err) {
          console.warn(`Scan ${sym} ${tf} failed:`, err);
        }
        if (i < symbols.length - 1) await sleep(SCAN_DELAY_MS);
      }

      collected.sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        if (a.mitigated !== b.mitigated) return a.mitigated ? 1 : -1;
        return b.time - a.time;
      });

      // Dedupe by symbol+tf+side+time
      const seen = new Set();
      const merged = [];
      for (const o of collected) {
        const key = `${o.symbol}|${o.tf}|${o.side}|${o.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(o);
        if (merged.length >= MULTI_CAP) break;
      }

      state.listMode = "multi";
      state.multiObs = merged;
      state.obs = merged;
      state.selectedId = null;
      selectedObForDraw = null;
      clearZones();
      if (candleSeries) candleSeries.setMarkers([]);

      // Ensure list filter shows 5★ results
      if (state.minStars > 5) state.minStars = 5;
      if (el.minStars) el.minStars.value = String(state.minStars);

      renderList();
      const active = merged.filter((o) => !o.mitigated).length;
      setStatus(
        `Scan all 5★: ${merged.length} found (${active} active) · ${symbols.length} symbols @ ${tf}`
      );
      el.chartTitle.textContent = `Multi-scan 5★ · ${tf}`;
      el.sourceNote.textContent =
        `Merged from ${symbols.length} symbols @ ${tf} · each row shows symbole + TF · click to open chart`;
    } catch (err) {
      console.error(err);
      showError(`Scan all 5★ failed: ${err.message}`);
      setStatus("Scan all 5★ error — see banner");
    } finally {
      setPrimaryDisabled(false);
      updatePrimaryCta();
    }
  }

  /**
   * World hunt: every watchlist symbol × M5 + M15 + H1.
   * Sequential (~350ms delay), stars===5, Actifs only / showMitigated.
   * Dedupe symbol|tf|side|time; sort stars → TF H1>M15>M5 → recent; cap ~100.
   */
  async function scanWorldFiveStars() {
    const symbols = WATCHLIST.map((s) => s.id);
    const tfs = ["M5", "M15", "H1"];
    const TF_RANK = { H1: 3, M15: 2, M5: 1 };
    const showMit = state.showMitigated;
    const collected = [];
    const WORLD_CAP = 100;
    const SCAN_DELAY_MS = 350;
    const jobs = [];
    for (const sym of symbols) {
      for (const tf of tfs) jobs.push({ sym, tf });
    }
    const total = jobs.length;

    setPrimaryDisabled(true);
    showError("");

    try {
      for (let i = 0; i < jobs.length; i++) {
        const { sym, tf } = jobs[i];
        setStatus(`Scanning ${sym} ${tf}… ${i + 1}/${total}`);
        try {
          const data = await fetchCandlesRaw(sym, tf);
          const obs = detectOrderBlocks(data.candles, { symbol: sym, tf });
          let five = obs.filter((o) => o.stars === 5);
          if (!showMit) five = five.filter((o) => !o.mitigated);
          collected.push(...five);
        } catch (err) {
          console.warn(`Scan monde ${sym} ${tf} failed:`, err);
        }
        if (i < jobs.length - 1) await sleep(SCAN_DELAY_MS);
      }

      collected.sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        const ra = TF_RANK[a.tf] || 0;
        const rb = TF_RANK[b.tf] || 0;
        if (rb !== ra) return rb - ra;
        if (a.mitigated !== b.mitigated) return a.mitigated ? 1 : -1;
        return b.time - a.time;
      });

      const seen = new Set();
      const merged = [];
      for (const o of collected) {
        const key = `${o.symbol}|${o.tf}|${o.side}|${o.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(o);
        if (merged.length >= WORLD_CAP) break;
      }

      state.listMode = "multi";
      state.multiObs = merged;
      state.obs = merged;
      state.selectedId = null;
      selectedObForDraw = null;
      clearZones();
      if (candleSeries) candleSeries.setMarkers([]);

      if (state.minStars > 5) state.minStars = 5;
      if (el.minStars) el.minStars.value = String(state.minStars);

      renderList();
      const active = merged.filter((o) => !o.mitigated).length;
      const byTf = { M5: 0, M15: 0, H1: 0 };
      for (const o of merged) {
        if (byTf[o.tf] != null) byTf[o.tf]++;
      }
      setStatus(
        `Scan monde 5★: ${merged.length} found (${active} active) · H1 ${byTf.H1} · M15 ${byTf.M15} · M5 ${byTf.M5} · ${symbols.length}×3 TF`
      );
      el.chartTitle.textContent = `Scan monde 5★ · M5+M15+H1`;
      el.sourceNote.textContent =
        `Merged from ${symbols.length} symbols × 3 TF · each row shows symbole + TF · click to open chart`;
    } catch (err) {
      console.error(err);
      showError(`Scan monde failed: ${err.message}`);
      setStatus("Scan monde error — see banner");
    } finally {
      setPrimaryDisabled(false);
      updatePrimaryCta();
    }
  }

  function wireUi() {
    // Top option: scan every watchlist symbol at the current TF
    const allOpt = document.createElement("option");
    allOpt.value = "__ALL__";
    allOpt.textContent = "Tous les actifs (Scan all)";
    el.symbolSelect.appendChild(allOpt);

    WATCHLIST.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      el.symbolSelect.appendChild(opt);
    });
    el.symbolSelect.value = state.symbol;
    el.symbolSelect.addEventListener("change", () => {
      const v = el.symbolSelect.value;
      updatePrimaryCta();
      if (v === "__ALL__") {
        // Do not fetch /api/candles?symbol=__ALL__ — run multi-asset scan at state.tf
        scanAllFiveStars();
        return;
      }
      state.symbol = v;
      loadData();
    });
    document.querySelectorAll(".tf-group button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tf-group button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.tf = btn.getAttribute("data-tf");
        if (el.symbolSelect && el.symbolSelect.value === "__ALL__") {
          scanAllFiveStars();
        } else {
          loadData();
        }
      });
    });
    if (el.btnPrimary) {
      el.btnPrimary.addEventListener("click", () => {
        if (isScanAllMode()) {
          scanAllFiveStars();
        } else {
          loadData();
        }
      });
    }
    if (el.btnScanWorld) {
      el.btnScanWorld.addEventListener("click", () => {
        scanWorldFiveStars();
      });
    }
    if (el.actifsOnly) {
      // Checked = Actifs only = hide mitigated
      state.showMitigated = !el.actifsOnly.checked;
      el.actifsOnly.addEventListener("change", () => {
        state.showMitigated = !el.actifsOnly.checked;
        renderList();
        const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
        const shown = filteredObs().length;
        setStatus(`${shown} shown · ${geMin} OB ≥${state.minStars}★`);
      });
    }
    if (el.minStars) {
      el.minStars.value = String(state.minStars);
      el.minStars.addEventListener("change", () => {
        state.minStars = parseInt(el.minStars.value, 10) || 0;
        renderList();
        const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
        const shown = filteredObs().length;
        setStatus(`${shown} shown · ${geMin} OB ≥${state.minStars}★`);
      });
    }
    el.filterText.addEventListener("input", () => renderList());
  }

  // Expose for selftest / console
  window.__OB = { detectOrderBlocks, scoreOb, computeSlTp, scanAllFiveStars, scanWorldFiveStars, state, WATCHLIST };

  // boot
  wireUi();
  updatePrimaryCta();
  initChart();
  loadData();
})();
