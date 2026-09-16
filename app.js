/**
 * OB Scanner front-end
 * - Fetches OHLC via local /api/candles proxy
 * - Detects ICT-style Order Blocks + Kasper-style 0–5★ confluence scoring
 * - Renders list + Lightweight Charts with click-to-draw zones
 */
(function () {
  "use strict";

  const WATCHLIST = [
    { id: "BTCUSD", label: "BTCUSD (Coinbase)" },
    { id: "XAUUSD", label: "XAUUSD → PAXG (gold proxy)" },
    { id: "XAUUSD_FUT", label: "XAUUSD → GC=F futures" },
    { id: "EURUSD", label: "EURUSD" },
    { id: "NAS100", label: "NAS100 → NQ=F" },
  ];

  const MAX_OBS = 20;
  const BODY_LOOKBACK = 20;
  const BREAK_LOOKBACK = 10;
  const BOS_LOOKBACK = 20; // stricter lookback for BOS★ (break of structure)
  const BODY_MULT = 1.5;

  const state = {
    symbol: "BTCUSD",
    tf: "M15",
    candles: [],
    obs: [],
    selectedId: null,
    showMitigated: true,
    minStars: 4,
    sourceNote: "",
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
    btnRefresh: document.getElementById("btnRefresh"),
    showMitigated: document.getElementById("showMitigated"),
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
    return state.obs.filter(
      (o) =>
        !o.mitigated &&
        o.stars >= state.minStars
    );
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
        symbol: state.symbol,
        tf: state.tf,
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
      if (picked.length >= MAX_OBS) break;
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
      li.innerHTML = `
        <div class="row">
          <span class="side">${ob.side === "bullish" ? "BULLISH OB" : "BEARISH OB"}
            <span class="tag ${ob.mitigated ? "dead" : "live"}">${ob.mitigated ? "mitigated" : "active"}</span>
          </span>
          <span class="meta">${ob.tf}</span>
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
        state.selectedId = ob.id;
        renderList();
        drawObOnChart(ob);
        setStatus(
          `Drawing ${ob.side} ${ob.stars}★ OB @ ${fmtPrice(ob.low)}–${fmtPrice(ob.high)}`
        );
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

  async function loadData() {
    showError("");
    setStatus(`Loading ${state.symbol} ${state.tf}…`);
    el.chartTitle.textContent = `${state.symbol} · ${state.tf}`;
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
      selectedObForDraw = null;

      state.obs = detectOrderBlocks(state.candles);
      state.selectedId = null;
      renderList();
      chart.timeScale().fitContent();
      const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
      const activeGe = state.obs.filter((o) => !o.mitigated && o.stars >= state.minStars).length;
      setStatus(
        `${geMin} OB ≥${state.minStars}★ (${activeGe} active) · ${state.obs.length} capped`
      );
    } catch (err) {
      console.error(err);
      showError(
        `Failed to load candles for ${state.symbol} ${state.tf}: ${err.message}. ` +
          `Is the local server running (python3 server.py)? Check network / API limits.`
      );
      setStatus("Error — see banner");
    }
  }

  function wireUi() {
    WATCHLIST.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
      el.symbolSelect.appendChild(opt);
    });
    el.symbolSelect.value = state.symbol;
    el.symbolSelect.addEventListener("change", () => {
      state.symbol = el.symbolSelect.value;
      loadData();
    });
    document.querySelectorAll(".tf-group button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tf-group button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.tf = btn.getAttribute("data-tf");
        loadData();
      });
    });
    el.btnRefresh.addEventListener("click", () => loadData());
    el.showMitigated.addEventListener("change", () => {
      state.showMitigated = el.showMitigated.checked;
      renderList();
      const geMin = state.obs.filter((o) => o.stars >= state.minStars).length;
      const shown = filteredObs().length;
      setStatus(`${shown} shown · ${geMin} OB ≥${state.minStars}★`);
    });
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
  window.__OB = { detectOrderBlocks, scoreOb, computeSlTp, state };

  // boot
  wireUi();
  initChart();
  loadData();
})();
