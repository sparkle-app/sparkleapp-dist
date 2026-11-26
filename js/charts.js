/**
 * Sparkle Plotly.js Chart Adapter
 * Renders all 8 analytical visualizations with theme support and high fidelity.
 * Optimized for minimal visual noise, clean B2B styling, and responsive layout.
 */

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: 'hover',
  displaylogo: false,
  modeBarButtonsToRemove: [
    'lasso2d',
    'select2d',
    'toggleSpikelines',
    'hoverClosestCartesian',
    'hoverCompareCartesian',
    'zoomIn2d',
    'zoomOut2d',
    'autoScale2d'
  ],
  toImageButtonOptions: {
    format: 'png',
    filename: 'sparkle_chart',
    height: 700,
    width: 1100,
    scale: 2
  }
};

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtRubScale(v, scaleMode = 'auto') {
  if (!Number.isFinite(v)) return '—';
  if (scaleMode === 'rub') return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)} млрд ₽`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} млн ₽`;
  if (a >= 1e3) return `${Math.round(v / 1e3)} тыс ₽`;
  return `${Math.round(v)} ₽`;
}

function hideSparkleChartTip() {
  const tip = document.getElementById('wf-tip');
  if (tip) tip.hidden = true;
}

function positionSparkleChartTip(tip, clientX, clientY) {
  const pad = 12;
  const w = tip.offsetWidth || 230;
  const h = tip.offsetHeight || 84;
  let left = clientX + 14;
  let top = clientY - h - 10;
  if (left + w + pad > window.innerWidth) left = Math.max(pad, clientX - w - 14);
  if (top < pad) top = clientY + 18;
  if (top + h + pad > window.innerHeight) top = Math.max(pad, window.innerHeight - h - pad);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function bindSparklePlotlyHover(el, formatFn) {
  if (!el) return;
  if (typeof el.removeAllListeners === 'function') {
    el.removeAllListeners('plotly_hover');
    el.removeAllListeners('plotly_unhover');
  }
  el.on('plotly_hover', (ev) => {
    const tip = document.getElementById('wf-tip');
    const pt = ev?.points?.[0];
    if (!tip || !pt) return;
    const html = formatFn(pt);
    if (!html) return;
    tip.innerHTML = html;
    tip.hidden = false;
    const srcEv = ev.event;
    if (srcEv && Number.isFinite(srcEv.clientX) && srcEv.clientX > 0) {
      positionSparkleChartTip(tip, srcEv.clientX, srcEv.clientY);
    } else {
      const r = el.getBoundingClientRect();
      positionSparkleChartTip(tip, r.left + r.width / 2, r.top + 40);
    }
  });
  el.on('plotly_unhover', hideSparkleChartTip);
  if (!el.dataset.tipLeaveBound) {
    el.dataset.tipLeaveBound = '1';
    el.addEventListener('pointerleave', hideSparkleChartTip);
  }
}

function getAxisTitleFont(isDark) {
  return {
    family: 'Inter, system-ui, -apple-system, sans-serif',
    color: isDark ? '#A3A199' : '#625F57',
    size: 11
  };
}

function getAxisTickFont(isDark) {
  return {
    family: 'Inter, system-ui, -apple-system, sans-serif',
    color: isDark ? '#A3A199' : '#625F57',
    size: 10.5
  };
}

function getThemeLayout(isDark) {
  const tickFont = getAxisTickFont(isDark);
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'Inter, system-ui, -apple-system, sans-serif',
      color: isDark ? '#F1F0EB' : '#14161A',
      size: 12
    },
    hoverlabel: {
      bgcolor: isDark ? '#1B1D22' : '#FFFFFF',
      bordercolor: isDark ? '#32353D' : '#DEDAD0',
      font: {
        family: 'Inter, system-ui, -apple-system, sans-serif',
        color: isDark ? '#F1F0EB' : '#14161A',
        size: 12
      },
      align: 'left'
    },
    xaxis: {
      gridcolor: isDark ? '#2C2E33' : '#E0DDD3',
      zerolinecolor: isDark ? '#60636E' : '#918D81',
      tickfont: tickFont,
      automargin: true
    },
    yaxis: {
      gridcolor: isDark ? '#2C2E33' : '#E0DDD3',
      zerolinecolor: isDark ? '#60636E' : '#918D81',
      tickfont: tickFont,
      automargin: true
    }
  };
}

function ensurePlotly() {
  if (typeof window.Plotly === 'undefined') {
    throw new Error('Plotly.js library is not loaded. Ensure vendor/plotly.min.js is included.');
  }
  return window.Plotly;
}

export function renderPlotlyFigure(containerId, figure, isDark = false) {
  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el) return;

  const themeLayout = getThemeLayout(isDark);
  const layout = {
    ...figure.layout,
    ...themeLayout,
    title: '', // Titles are handled cleanly in HTML card headers to eliminate duplication
    xaxis: { ...figure.layout?.xaxis, ...themeLayout.xaxis },
    yaxis: { ...figure.layout?.yaxis, ...themeLayout.yaxis },
    margin: figure.layout?.margin || { l: 50, r: 24, t: 24, b: 40 }
  };

  return Plotly.react(el, figure.data || [], layout, PLOTLY_CONFIG);
}

/**
 * 1. Waterfall Chart: VMPC-INO profit factors
 */
export function renderVmpcWaterfall(containerId, vmpcData, isDark = false) {
  if (vmpcData && vmpcData.data) {
    return renderPlotlyFigure(containerId, vmpcData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !vmpcData) return;

  const items = vmpcData.waterfall_items || [];
  const x = items.map(it => it.label);
  const y = items.map(it => it.value);
  const measure = items.map(it => it.measure);
  const text = y.map(v => Math.round(v).toLocaleString('ru-RU'));

  const trace = {
    type: "waterfall",
    measure,
    x,
    y,
    text,
    textposition: "outside",
    hovertemplate: "<b>Фактор:</b> %{x}<br><b>Изменение:</b> %{delta:,.0f} руб.<extra></extra>",
    connector: { line: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.2)", width: 1 } },
    decreasing: { marker: { color: "#ef4444" } },
    increasing: { marker: { color: "#10b981" } },
    totals: { marker: { color: isDark ? "#3b82f6" : "#2563eb" } }
  };

  const layout = {
    ...getThemeLayout(isDark),
    margin: { l: 50, r: 20, t: 20, b: 60 },
    yaxis: { title: "Рубли", tickfont: { size: 11 } },
    xaxis: { tickfont: { size: 11 } },
    showlegend: false
  };

  return Plotly.react(el, [trace], layout, PLOTLY_CONFIG);
}

/**
 * 2. Profit Bars: Category dynamics waterfall + stacked bars
 */
export function renderProfitBars(containerId, profitData, isDark = false) {
  if (profitData && profitData.data) {
    return renderPlotlyFigure(containerId, profitData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !profitData) return;

  const traces = [];

  // Waterfall Trace (Totals & Category transition diffs)
  const wfTexts = (profitData.measures || []).map((m, i) => {
    return m === "relative" ? Math.round(profitData.waterfall_totals[i]).toLocaleString('ru-RU') : "";
  });
  const hoverLogic = (profitData.measures || []).map(m => m === "relative" ? "all" : "skip");
  const hoverTemplates = (profitData.measures || []).map(m => {
    return m === "relative"
      ? "<b>Категория/товар:</b> %{x}<br><b>Изменение:</b> %{delta:,.0f} руб.<extra></extra>"
      : "";
  });

  traces.push({
    type: "waterfall",
    measure: profitData.measures || [],
    x: profitData.x_labels || [],
    y: profitData.waterfall_totals || [],
    text: wfTexts,
    textposition: "outside",
    hoverinfo: hoverLogic,
    hovertemplate: hoverTemplates,
    connector: { line: { color: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.2)", width: 1 } },
    decreasing: { marker: { color: "#ef4444" } },
    increasing: { marker: { color: "#10b981" } },
    totals: { marker: { color: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)" } }
  });

  // Category Bar Traces
  const catBars = profitData.category_bars || [];
  catBars.forEach((bar, catIdx) => {
    const isLast = (catIdx === catBars.length - 1);
    const colors = bar.values.map(v => (v !== null && v < 0) ? '#ef4444' : '#64748b');
    const barTexts = isLast
      ? (profitData.x_labels || []).map((lbl, idx) => {
          if (profitData.measures[idx] === 'absolute' && profitData.waterfall_totals[idx] != null) {
            return Math.round(profitData.waterfall_totals[idx]).toLocaleString('ru-RU');
          }
          return '';
        })
      : null;

    const trace = {
      type: "bar",
      name: bar.category,
      x: profitData.x_labels || [],
      y: bar.values.map(v => v === null ? 0 : v), // Replace null with 0 so Plotly never calculates NaN text coordinates
      opacity: 1,
      marker: { color: colors },
      hovertemplate: "<b>Категория:</b> %{fullData.name}<br><b>Год:</b> %{x}<br><b>Прибыль:</b> %{y:,.0f} руб.<extra></extra>"
    };

    if (barTexts && barTexts.some(t => t !== '')) {
      trace.text = barTexts;
      trace.textposition = "outside";
    }

    traces.push(trace);
  });

  const layout = {
    ...getThemeLayout(isDark),
    margin: { l: 50, r: 20, t: 20, b: 60 },
    barmode: 'relative',
    yaxis: { title: "Рубли" },
    showlegend: false
  };

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * 3. Margin Map: 4-Quadrant Strategic Scatter Plot
 */
const QUADRANT_LABELS = {
  top_right: 'Звёзды (Топ товары)',
  top_left: 'Повысить маржу',
  bottom_right: 'Растить продажи',
  bottom_left: 'Отстающие товары',
  'Топ товары': 'Звёзды (Топ товары)',
  'Рассмотреть пути повышения маржинальности': 'Повысить маржу',
  'Рассмотреть пути повышения продаж': 'Растить продажи',
  'Отстающие товары': 'Отстающие товары'
};

const QUADRANT_ALIASES = {
  'Топ товары': new Set(['Топ товары', 'top_right']),
  'Рассмотреть пути повышения маржинальности': new Set(['Рассмотреть пути повышения маржинальности', 'top_left']),
  'Рассмотреть пути повышения продаж': new Set(['Рассмотреть пути повышения продаж', 'bottom_right']),
  'Отстающие товары': new Set(['Отстающие товары', 'bottom_left'])
};

function formatQuadrantRu(q) {
  return QUADRANT_LABELS[q] || q || '—';
}

function matchesQuadrant(quadFilter, itemQuad) {
  if (!quadFilter || quadFilter === 'all') return true;
  if (itemQuad === quadFilter) return true;
  const set = QUADRANT_ALIASES[quadFilter];
  return set ? set.has(itemQuad) : false;
}

function matchesFilterSet(filter, val) {
  if (!filter || filter === 'all') return true;
  if (filter instanceof Set) return filter.has(val);
  return val === filter;
}

export function renderMarginMap(containerId, marginData, isDark = false, categoryFilter = 'all', onPointSelect = null, quadrantFilter = 'all', scaleMode = 'auto', skuFilter = 'all') {
  if (marginData && marginData.data) {
    return renderPlotlyFigure(containerId, marginData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !marginData) return;

  // Filter items by selected category, SKU, and quadrant
  const filteredItems = (marginData.items || []).filter((it) => {
    const catOk = matchesFilterSet(categoryFilter, it.category);
    const skuKey = `${it.category}_${it.product}`;
    const skuOk = matchesFilterSet(skuFilter, skuKey) || matchesFilterSet(skuFilter, it.product);
    const quadOk = matchesQuadrant(quadrantFilter, it.quadrant);
    return catOk && skuOk && quadOk;
  });

  // Group items by category
  const catGroups = Object.groupBy(filteredItems, (item) => item.category);
  const palette = ['#4F46E5', '#F26A3D', '#0D9488', '#D97706', '#E11D74', '#2563EB'];

  const traces = Object.keys(catGroups).sort((a, b) => a.localeCompare(b, 'ru')).map((catName, idx) => {
    const items = catGroups[catName];
    return {
      type: 'scatter',
      mode: 'markers',
      name: catName,
      text: items.map(it => it.product),
      customdata: items.map(it => ({ ...it, profit_rub: (it.sales_rub || 0) - (it.costs_rub || 0) })),
      x: items.map(it => it.margin_pct),
      y: items.map(it => it.sales_rub),
      marker: {
        size: 11,
        color: palette[idx % palette.length],
        opacity: 0.9,
        line: { width: 1.4, color: isDark ? '#121316' : '#FFFFFF' }
      },
      hoverinfo: 'none'
    };
  });

  const shapes = [
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0, y0: 0.5, x1: 0.5, y1: 1, fillcolor: '#64748b', opacity: 0.07, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0.5, y0: 0.5, x1: 1, y1: 1, fillcolor: '#10b981', opacity: 0.08, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0, y0: 0, x1: 0.5, y1: 0.5, fillcolor: '#ef4444', opacity: 0.07, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0.5, y0: 0, x1: 1, y1: 0.5, fillcolor: '#3b82f6', opacity: 0.07, layer: 'below', line: { width: 0 } }
  ];

  const annotations = [
    { xref: 'paper', yref: 'paper', x: 0.02, y: 0.96, text: '<b>Повысить маржу</b>', showarrow: false, xanchor: 'left', yanchor: 'top', font: { color: isDark ? '#A3A199' : '#625F57', size: 11 } },
    { xref: 'paper', yref: 'paper', x: 0.98, y: 0.96, text: '<b>Звёзды</b>', showarrow: false, xanchor: 'right', yanchor: 'top', font: { color: '#10b981', size: 11 } },
    { xref: 'paper', yref: 'paper', x: 0.02, y: 0.04, text: '<b>Отстающие</b>', showarrow: false, xanchor: 'left', yanchor: 'bottom', font: { color: '#ef4444', size: 11 } },
    { xref: 'paper', yref: 'paper', x: 0.98, y: 0.04, text: '<b>Растить продажи</b>', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { color: '#3b82f6', size: 11 } }
  ];

  const theme = getThemeLayout(isDark);
  const titleFont = getAxisTitleFont(isDark);
  const layout = {
    ...theme,
    margin: { l: 64, r: 16, t: 12, b: 56 },
    height: 360,
    xaxis: { ...theme.xaxis, title: { text: "Маржинальность (%)", font: titleFont, standoff: 8 } },
    yaxis: { ...theme.yaxis, title: { text: "Выручка (₽)", font: titleFont, standoff: 8 }, tickformat: scaleMode === 'rub' ? ',.0f' : '~s' },
    hovermode: "closest",
    legend: {
      orientation: 'h',
      x: 0,
      y: -0.26,
      font: { size: 11 }
    },
    shapes,
    annotations
  };

  const p = Plotly.react(el, traces, layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const d = pt.customdata;
    if (!d) return '';
    return `<div class="wf-tip-title">${escHtml(d.product)} · ${escHtml(d.category)}</div>` +
      `<div class="wf-tip-val">Выручка: ${fmtRubScale(d.sales_rub, scaleMode)}</div>` +
      `<div class="wf-tip-row">Прибыль: ${fmtRubScale(d.profit_rub, scaleMode)} · Маржа: ${(d.margin_pct || 0).toFixed(1)}%</div>` +
      `<div class="wf-tip-row">Квадрант: ${escHtml(formatQuadrantRu(d.quadrant))}</div>` +
      `<div class="wf-tip-hint">Клик для карточки SKU</div>`;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const pt = ev?.points?.[0]?.customdata;
      if (pt) onPointSelect(pt);
    });
  }
  return p;
}

function aggregateTimeSeriesByCategory(allSeries) {
  const byCat = new Map();
  for (const s of allSeries) {
    const cat = s.category || String(s.series_name || '').split('_')[0] || 'Категория';
    if (!byCat.has(cat)) byCat.set(cat, new Map());
    const periodMap = byCat.get(cat);
    for (const p of (s.points || [])) {
      const key = p.date_text;
      if (!periodMap.has(key)) {
        periodMap.set(key, { date_text: key, sales: 0, profit: 0, hasSales: false });
      }
      const acc = periodMap.get(key);
      if (Number.isFinite(p.sales_rub)) {
        acc.sales += p.sales_rub;
        acc.hasSales = true;
        if (Number.isFinite(p.margin_pct)) {
          acc.profit += p.sales_rub * (p.margin_pct / 100);
        }
      }
    }
  }
  return [...byCat.entries()].map(([cat, pMap]) => ({
    series_name: cat,
    category: cat,
    points: [...pMap.values()].map((a) => ({
      date_text: a.date_text,
      sales_rub: a.hasSales ? a.sales : null,
      margin_pct: a.hasSales && a.sales > 0 ? (a.profit / a.sales) * 100 : null
    }))
  }));
}

/**
 * 4. Monthly Sales Dynamics (with category filter, aggregation & scale support)
 */
export function renderSalesChange(containerId, salesData, isDark = false, categoryFilter = 'all', aggMode = 'sku', heightPx = 175, scaleMode = 'auto', skuFilter = 'all', onPointSelect = null, yearFilter = 'all') {
  if (salesData && salesData.data) {
    return renderPlotlyFigure(containerId, salesData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !salesData) return;

  let allSeries = (salesData.series || []).filter((s) => {
    const cat = s.category || String(s.series_name || '').split('_')[0];
    return matchesFilterSet(categoryFilter, cat) && matchesFilterSet(skuFilter, s.series_name);
  }).map((s) => ({
    ...s,
    points: (s.points || []).filter((p) => matchesFilterSet(yearFilter, p.year))
  })).filter((s) => s.points.length > 0);
  if (aggMode === 'cat') {
    allSeries = aggregateTimeSeriesByCategory(allSeries);
  }

  const traces = allSeries.map(s => {
    const cat = s.category || String(s.series_name || '').split('_')[0] || '';
    const prod = aggMode === 'cat' ? '' : (s.product || String(s.series_name || '').split('_').slice(1).join('_') || '');
    return {
      type: 'scatter',
      mode: 'lines',
      name: s.series_name,
      x: s.points.map(p => p.date_text),
      y: s.points.map(p => p.sales_rub),
      customdata: s.points.map(p => [cat, prod, p.date_text]),
      line: { width: aggMode === 'cat' ? 2.4 : 1.7 },
      hoverinfo: 'none'
    };
  });

  const showLeg = traces.length <= 6;
  const theme = getThemeLayout(isDark);
  const titleFont = getAxisTitleFont(isDark);
  const layout = {
    ...theme,
    margin: { l: 64, r: 14, t: showLeg ? 26 : 10, b: 44 },
    xaxis: { ...theme.xaxis, title: { text: 'Месяц', font: titleFont, standoff: 6 }, nticks: 6 },
    yaxis: { ...theme.yaxis, title: { text: 'Выручка (₽)', font: titleFont, standoff: 8 }, tickformat: scaleMode === 'rub' ? ',.0f' : '~s' },
    height: heightPx,
    hovermode: 'closest',
    showlegend: showLeg,
    legend: { font: { size: 9.5 }, orientation: 'h', y: 1.18, x: 0 }
  };

  const p = Plotly.react(el, traces, layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const name = pt.fullData?.name || '';
    const cd = Array.isArray(pt.customdata) ? pt.customdata : ['', '', pt.x || ''];
    const hint = aggMode === 'sku' ? '<div class="wf-tip-hint">Клик для карточки SKU</div>' : '<div class="wf-tip-hint">Клик для фильтра по категории</div>';
    return `<div class="wf-tip-title">${escHtml(name)}</div>` +
      `<div class="wf-tip-val">Выручка: ${fmtRubScale(pt.y, scaleMode)}</div>` +
      `<div class="wf-tip-row">Период: ${escHtml(cd[2] || pt.x || '')}</div>` + hint;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const cd = ev?.points?.[0]?.customdata;
      if (Array.isArray(cd) && cd.length >= 2) onPointSelect(cd[0], cd[1]);
    });
  }
  return p;
}

/**
 * 5. Monthly Margin Dynamics (with category filter & aggregation support)
 */
export function renderMargChange(containerId, margData, isDark = false, categoryFilter = 'all', aggMode = 'sku', heightPx = 175, skuFilter = 'all', onPointSelect = null, yearFilter = 'all') {
  if (margData && margData.data) {
    return renderPlotlyFigure(containerId, margData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !margData) return;

  let allSeries = (margData.series || []).filter((s) => {
    const cat = s.category || String(s.series_name || '').split('_')[0];
    return matchesFilterSet(categoryFilter, cat) && matchesFilterSet(skuFilter, s.series_name);
  }).map((s) => ({
    ...s,
    points: (s.points || []).filter((p) => matchesFilterSet(yearFilter, p.year))
  })).filter((s) => s.points.length > 0);
  if (aggMode === 'cat') {
    allSeries = aggregateTimeSeriesByCategory(allSeries);
  }

  const traces = allSeries.map(s => {
    const cat = s.category || String(s.series_name || '').split('_')[0] || '';
    const prod = aggMode === 'cat' ? '' : (s.product || String(s.series_name || '').split('_').slice(1).join('_') || '');
    return {
      type: 'scatter',
      mode: 'lines',
      name: s.series_name,
      x: s.points.map(p => p.date_text),
      y: s.points.map(p => p.margin_pct),
      customdata: s.points.map(p => [cat, prod, p.date_text]),
      line: { width: aggMode === 'cat' ? 2.4 : 1.7 },
      hoverinfo: 'none'
    };
  });

  const showLeg = traces.length <= 6;
  const theme = getThemeLayout(isDark);
  const titleFont = getAxisTitleFont(isDark);
  const layout = {
    ...theme,
    margin: { l: 64, r: 14, t: showLeg ? 26 : 10, b: 44 },
    xaxis: { ...theme.xaxis, title: { text: 'Месяц', font: titleFont, standoff: 6 }, nticks: 6 },
    yaxis: { ...theme.yaxis, title: { text: 'Маржа (%)', font: titleFont, standoff: 8 } },
    height: heightPx,
    hovermode: 'closest',
    showlegend: showLeg,
    legend: { font: { size: 9.5 }, orientation: 'h', y: 1.18, x: 0 }
  };

  const p = Plotly.react(el, traces, layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const name = pt.fullData?.name || '';
    const cd = Array.isArray(pt.customdata) ? pt.customdata : ['', '', pt.x || ''];
    const val = Number.isFinite(pt.y) ? `${pt.y.toFixed(1)}%` : '—';
    const hint = aggMode === 'sku' ? '<div class="wf-tip-hint">Клик для карточки SKU</div>' : '<div class="wf-tip-hint">Клик для фильтра по категории</div>';
    return `<div class="wf-tip-title">${escHtml(name)}</div>` +
      `<div class="wf-tip-val">Маржинальность: ${val}</div>` +
      `<div class="wf-tip-row">Период: ${escHtml(cd[2] || pt.x || '')}</div>` + hint;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const cd = ev?.points?.[0]?.customdata;
      if (Array.isArray(cd) && cd.length >= 2) onPointSelect(cd[0], cd[1]);
    });
  }
  return p;
}

/**
 * 6. Sales Seasonality Heatmap (12 months)
 */
export function renderSalesHeatmap(containerId, heatData, isDark = false, categoryFilter = 'all', heightPx = 220, skuFilter = 'all', onPointSelect = null) {
  if (heatData && heatData.data) {
    return renderPlotlyFigure(containerId, heatData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !heatData) return;

  const cats = heatData.categories || [];
  const prods = heatData.products || [];
  const months = heatData.months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const keepIdx = prods.map((_, i) => i).filter((i) => {
    const key = `${cats[i] || ''}_${prods[i]}`;
    return matchesFilterSet(categoryFilter, cats[i]) && matchesFilterSet(skuFilter, key);
  });

  const z = keepIdx.map(i => heatData.matrix[i]);
  const yLabels = keepIdx.map(i => `${cats[i] || ''} · ${prods[i]}`.trim());
  const customMatrix = keepIdx.map(i => months.map(() => [cats[i] || '', prods[i]]));

  const neutralBg = isDark ? '#242730' : '#F8F7F4';
  const trace = {
    type: 'heatmap',
    z,
    zmid: 1.0,
    x: months,
    y: yLabels,
    xgap: 2,
    ygap: 2,
    colorscale: [
      [0, '#D96B52'],
      [0.25, '#F2B8A6'],
      [0.5, neutralBg],
      [0.75, '#9CE0C2'],
      [1, '#15803D']
    ],
    colorbar: { thickness: 12, len: 0.85, outlinewidth: 0, tickfont: { size: 10 } },
    customdata: customMatrix,
    text: z,
    texttemplate: "%{text:.2f}",
    textfont: { size: 9.5, color: isDark ? '#F1F0EB' : '#14161A' },
    hoverinfo: 'none'
  };

  const theme = getThemeLayout(isDark);
  const dynH = Math.max(heightPx, keepIdx.length * 22 + 58);
  const layout = {
    ...theme,
    margin: { l: 8, r: 16, t: 8, b: 36 },
    height: dynH,
    xaxis: { ...theme.xaxis, title: { text: "Месяц", font: getAxisTitleFont(isDark), standoff: 6 }, dtick: 1 },
    yaxis: { ...theme.yaxis, title: { text: "Товар (SKU)", font: getAxisTitleFont(isDark), standoff: 8 }, automargin: true, dtick: 1 }
  };

  const p = Plotly.react(el, [trace], layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const cd = Array.isArray(pt.customdata) ? pt.customdata : ['', ''];
    const zVal = Number.isFinite(pt.z) ? pt.z : null;
    const pctDelta = zVal != null ? Math.round((zVal - 1) * 100) : null;
    const deltaText = pctDelta == null ? '' : (pctDelta > 0 ? ` (+${pctDelta}% к норме)` : pctDelta < 0 ? ` (${pctDelta}% к норме)` : ' (норма)');
    return `<div class="wf-tip-title">${escHtml(cd[1])} · ${escHtml(cd[0])}</div>` +
      `<div class="wf-tip-val">Индекс продаж: ${zVal != null ? zVal.toFixed(2) : '—'}${deltaText}</div>` +
      `<div class="wf-tip-row">Месяц: ${escHtml(pt.x)}</div>` +
      `<div class="wf-tip-hint">Клик для карточки SKU</div>`;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const cd = ev?.points?.[0]?.customdata;
      if (Array.isArray(cd) && cd.length >= 2) onPointSelect(cd[0], cd[1]);
    });
  }
  return p;
}

/**
 * 7. Price Seasonality Heatmap (12 months)
 */
export function renderPricesHeatmap(containerId, priceHeatData, isDark = false, categoryFilter = 'all', heightPx = 220, skuFilter = 'all', onPointSelect = null) {
  if (priceHeatData && priceHeatData.data) {
    return renderPlotlyFigure(containerId, priceHeatData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !priceHeatData) return;

  const cats = priceHeatData.categories || [];
  const prods = priceHeatData.products || [];
  const months = priceHeatData.months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const keepIdx = prods.map((_, i) => i).filter((i) => {
    const key = `${cats[i] || ''}_${prods[i]}`;
    return matchesFilterSet(categoryFilter, cats[i]) && matchesFilterSet(skuFilter, key);
  });

  const z = keepIdx.map(i => priceHeatData.matrix[i]);
  const yLabels = keepIdx.map(i => `${cats[i] || ''} · ${prods[i]}`.trim());
  const customMatrix = keepIdx.map(i => months.map(() => [cats[i] || '', prods[i]]));

  const neutralBg = isDark ? '#242730' : '#F8F7F4';
  const trace = {
    type: 'heatmap',
    z,
    zmid: 1.0,
    x: months,
    y: yLabels,
    xgap: 2,
    ygap: 2,
    colorscale: [
      [0, '#2563EB'],
      [0.25, '#93C5FD'],
      [0.5, neutralBg],
      [0.75, '#FCD34D'],
      [1, '#D97706']
    ],
    colorbar: { thickness: 12, len: 0.85, outlinewidth: 0, tickfont: { size: 10 } },
    customdata: customMatrix,
    text: z,
    texttemplate: "%{text:.2f}",
    textfont: { size: 9.5, color: isDark ? '#F1F0EB' : '#14161A' },
    hoverinfo: 'none'
  };

  const theme = getThemeLayout(isDark);
  const dynH = Math.max(heightPx, keepIdx.length * 22 + 58);
  const layout = {
    ...theme,
    margin: { l: 8, r: 16, t: 8, b: 36 },
    height: dynH,
    xaxis: { ...theme.xaxis, title: { text: "Месяц", font: getAxisTitleFont(isDark), standoff: 6 }, dtick: 1 },
    yaxis: { ...theme.yaxis, title: { text: "Товар (SKU)", font: getAxisTitleFont(isDark), standoff: 8 }, automargin: true, dtick: 1 }
  };

  const p = Plotly.react(el, [trace], layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const cd = Array.isArray(pt.customdata) ? pt.customdata : ['', ''];
    const zVal = Number.isFinite(pt.z) ? pt.z : null;
    const pctDelta = zVal != null ? Math.round((zVal - 1) * 100) : null;
    const deltaText = pctDelta == null ? '' : (pctDelta > 0 ? ` (+${pctDelta}% к средней)` : pctDelta < 0 ? ` (${pctDelta}% к средней)` : ' (средняя)');
    return `<div class="wf-tip-title">${escHtml(cd[1])} · ${escHtml(cd[0])}</div>` +
      `<div class="wf-tip-val">Индекс цены: ${zVal != null ? zVal.toFixed(2) : '—'}${deltaText}</div>` +
      `<div class="wf-tip-row">Месяц: ${escHtml(pt.x)}</div>` +
      `<div class="wf-tip-hint">Клик для карточки SKU</div>`;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const cd = ev?.points?.[0]?.customdata;
      if (Array.isArray(cd) && cd.length >= 2) onPointSelect(cd[0], cd[1]);
    });
  }
  return p;
}

function computeOlsLine(xs, ys) {
  const pts = [];
  for (let i = 0; i < xs.length; i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) pts.push([xs[i], ys[i]]);
  }
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[1], 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of pts) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  if (Math.abs(den) < 1e-9) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  const minX = Math.min(...pts.map(p => p[0]));
  const maxX = Math.max(...pts.map(p => p[0]));
  const elast = my !== 0 ? slope * (mx / my) : null;
  return { x: [minX, maxX], y: [slope * minX + intercept, slope * maxX + intercept], elast };
}

/**
 * 8. Price Elasticity Subplots (with SKU filter & OLS trendlines)
 */
export function renderPriceElasticity(containerId, elasticityData, isDark = false, categoryFilter = 'all', skuFilter = 'all', onPointSelect = null) {
  if (elasticityData && elasticityData.data) {
    return renderPlotlyFigure(containerId, elasticityData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !elasticityData) return;

  let prods = (elasticityData.products || []).filter((p) => {
    const cat = p.category || String(p.series_name || '').split('_')[0];
    return matchesFilterSet(categoryFilter, cat) && matchesFilterSet(skuFilter, p.series_name);
  });
  if (!prods.length) {
    return Plotly.react(el, [], { ...getThemeLayout(isDark), height: 220 }, PLOTLY_CONFIG);
  }

  const N = prods.length;
  const columns = N === 1 ? 1 : (N > 6 ? 3 : Math.min(2, N));
  const rows = Math.max(1, Math.ceil(N / columns));
  const traces = [];
  const themeLayout = getThemeLayout(isDark);

  const xgap = columns > 1 ? 0.08 : 0;
  const ygap = rows > 1 ? Math.min(0.085, 0.36 / rows) : 0;
  const colW = (1 - xgap * (columns - 1)) / columns;
  const rowH = (1 - ygap * (rows - 1)) / rows;

  const layout = {
    ...themeLayout,
    margin: { l: 48, r: 12, t: 46, b: 50 },
    height: N === 1 ? 385 : Math.min(540, Math.max(345, rows * 104)),
    showlegend: false,
    annotations: []
  };

  // Top horizontal axis caption above each column so "Цена (₽)" is visible both at top and bottom
  for (let c = 0; c < columns; c++) {
    const cx0 = c * (colW + xgap);
    const cx1 = cx0 + colW;
    layout.annotations.push({
      text: 'Цена (₽)',
      showarrow: false,
      xref: 'paper',
      yref: 'paper',
      x: (cx0 + cx1) / 2,
      y: 1.075,
      yanchor: 'bottom',
      font: { size: 10, color: isDark ? '#A3A199' : '#625F57' }
    });
  }

  prods.forEach((prod, i) => {
    const axisSuffix = i === 0 ? '' : (i + 1);
    const x_vals = (prod.points || []).map(pt => pt.price);
    const y_vals = (prod.points || []).map(pt => pt.volume);

    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: prod.series_name,
      x: x_vals,
      y: y_vals,
      xaxis: 'x' + axisSuffix,
      yaxis: 'y' + axisSuffix,
      marker: { color: '#4F46E5', size: N === 1 ? 7 : 4.5, opacity: 0.78 },
      customdata: (prod.points || []).map(() => [prod.category || String(prod.series_name || '').split('_')[0], prod.product || String(prod.series_name || '').split('_').slice(1).join('_'), prod.series_name]),
      hoverinfo: 'none'
    });

    const ols = computeOlsLine(x_vals, y_vals);
    if (ols) {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: `${prod.series_name} (тренд)`,
        x: ols.x,
        y: ols.y,
        xaxis: 'x' + axisSuffix,
        yaxis: 'y' + axisSuffix,
        line: { color: '#F26A3D', width: N === 1 ? 2.2 : 1.5, dash: 'dash' },
        hoverinfo: 'skip'
      });
    }

    const rowIdx = Math.floor(i / columns);
    const colIdx = i % columns;
    const x0 = colIdx * (colW + xgap);
    const x1 = x0 + colW;
    const y1 = 1 - rowIdx * (rowH + ygap);
    const y0 = Math.max(0, y1 - rowH);

    layout['xaxis' + axisSuffix] = {
      ...themeLayout.xaxis,
      domain: [x0, x1],
      anchor: 'y' + axisSuffix,
      title: rowIdx === rows - 1 ? { text: 'Цена (₽)', font: getAxisTitleFont(isDark), standoff: 6 } : '',
      tickfont: { ...getAxisTickFont(isDark), size: 9 },
      nticks: N === 1 ? 6 : 3
    };
    layout['yaxis' + axisSuffix] = {
      ...themeLayout.yaxis,
      domain: [y0, y1],
      anchor: 'x' + axisSuffix,
      title: colIdx === 0 ? { text: 'Объём (шт)', font: getAxisTitleFont(isDark), standoff: 6 } : '',
      tickfont: { ...getAxisTickFont(isDark), size: 9 },
      nticks: N === 1 ? 6 : 3
    };

    const eNum = ols && Number.isFinite(ols.elast) ? (Math.abs(ols.elast) < 0.05 ? 0 : ols.elast) : null;
    const eLabel = eNum !== null ? ` (E≈${eNum.toFixed(1)})` : '';
    layout.annotations.push({
      text: `<b>${prod.series_name}</b>${eLabel}`,
      showarrow: false,
      xref: 'paper',
      yref: 'paper',
      x: (x0 + x1) / 2,
      y: y1 + 0.004,
      yanchor: 'bottom',
      font: { size: N === 1 ? 11.5 : 9.5, color: isDark ? '#f1f5f9' : '#0f172a' }
    });
  });

  const p = Plotly.react(el, traces, layout, PLOTLY_CONFIG);
  bindSparklePlotlyHover(el, (pt) => {
    const cd = Array.isArray(pt.customdata) ? pt.customdata : ['', '', pt.fullData?.name || ''];
    const priceStr = Number.isFinite(pt.x) ? `${Math.round(pt.x).toLocaleString('ru-RU')} ₽` : '—';
    const volStr = Number.isFinite(pt.y) ? `${Math.round(pt.y).toLocaleString('ru-RU')} шт` : '—';
    return `<div class="wf-tip-title">${escHtml(cd[2] || `${cd[0]} · ${cd[1]}`)}</div>` +
      `<div class="wf-tip-val">Цена: ${priceStr}</div>` +
      `<div class="wf-tip-row">Объём продаж: ${volStr}</div>` +
      `<div class="wf-tip-hint">Клик для карточки SKU</div>`;
  });
  if (typeof el.removeAllListeners === 'function') el.removeAllListeners('plotly_click');
  if (onPointSelect) {
    el.on('plotly_click', (ev) => {
      const cd = ev?.points?.[0]?.customdata;
      if (Array.isArray(cd) && cd.length >= 2) onPointSelect(cd[0], cd[1]);
    });
  }
  return p;
}

/**
 * Resize all rendered charts to adapt instantly to tab switches and window resizes
 */
export function resizeAllCharts() {
  if (typeof window.Plotly === 'undefined') return;
  const chartContainers = document.querySelectorAll('.chart-wrapper, .st-chart-container, .plotly-host');
  chartContainers.forEach(el => {
    if (el && el.offsetParent !== null && el.data) {
      try {
        window.Plotly.Plots.resize(el);
      } catch (e) {
        // ignore layout race
      }
    }
  });
}

/**
 * Render charts for Streamlit tabbed dashboard
 */
export function renderStreamlitDashboard(bundle, tabId = 'tab-dash-1') {
  if (!bundle) return;

  if (tabId === 'tab-dash-1' || !tabId) {
    const vmpcData = bundle.vmpc || bundle.fig_vmpc;
    if (vmpcData) renderVmpcWaterfall('chart-fig1', vmpcData, false);
    const pbData = bundle.profit_bars || bundle.fig_profit_bars;
    if (pbData) renderProfitBars('chart-fig2', pbData, false);
  } else if (tabId === 'tab-dash-2') {
    const mmData = bundle.marg_map || bundle.fig_marg_map;
    if (mmData) renderMarginMap('chart-fig3', mmData, false);
    const scData = bundle.time_series || bundle.fig_sales_change;
    if (scData) renderSalesChange('chart-fig4', scData, false, 'all');
    const mcData = bundle.time_series || bundle.fig_marg_change;
    if (mcData) renderMargChange('chart-fig5', mcData, false, 'all');
  } else if (tabId === 'tab-dash-3') {
    const shData = bundle.seasonality?.sales_seasonality || bundle.fig_sales_heat || bundle.fig_sales_heatmap;
    if (shData) renderSalesHeatmap('chart-fig6', shData, false);
    const phData = bundle.seasonality?.prices_seasonality || bundle.fig_prices_heat || bundle.fig_prices_heatmap;
    if (phData) renderPricesHeatmap('chart-fig7', phData, false);
    const elData = bundle.elasticity || bundle.fig_elasticity;
    if (elData) renderPriceElasticity('chart-fig8', elData, false);
  }

  setTimeout(resizeAllCharts, 60);
}

/**
 * Render charts specifically for the active tab panel (prevents NaN errors on hidden tabs)
 */
export function renderActiveTabCharts(panelId, bundle, isDark = false, categoryFilter = 'all') {
  if (!bundle) return;

  if (!panelId || panelId === 'panel-vmpc') {
    const vmpcData = bundle.vmpc || bundle.fig_vmpc;
    if (vmpcData) renderVmpcWaterfall('chart-vmpc', vmpcData, isDark);
    const pbData = bundle.profit_bars || bundle.fig_profit_bars;
    if (pbData) renderProfitBars('chart-profit-bars', pbData, isDark);
  } else if (panelId === 'panel-margins') {
    const mmData = bundle.marg_map || bundle.fig_marg_map;
    if (mmData) renderMarginMap('chart-marg-map', mmData, isDark);
    const scData = bundle.time_series || bundle.fig_sales_change;
    if (scData) renderSalesChange('chart-sales-change', scData, isDark, categoryFilter);
    const mcData = bundle.time_series || bundle.fig_marg_change;
    if (mcData) renderMargChange('chart-marg-change', mcData, isDark, categoryFilter);
  } else if (panelId === 'panel-seasonality') {
    const shData = bundle.seasonality?.sales_seasonality || bundle.fig_sales_heat || bundle.fig_sales_heatmap;
    if (shData) renderSalesHeatmap('chart-sales-heat', shData, isDark);
    const phData = bundle.seasonality?.prices_seasonality || bundle.fig_prices_heat || bundle.fig_prices_heatmap;
    if (phData) renderPricesHeatmap('chart-prices-heat', phData, isDark);
    const elData = bundle.elasticity || bundle.fig_elasticity;
    if (elData) renderPriceElasticity('chart-elasticity', elData, isDark);
  }
}

/**
 * Render all 8 dashboard charts from an analytics bundle
 */
export function renderFullDashboard(bundle, isDark = false, categoryFilter = 'all') {
  if (!bundle) return;

  // Find currently active tab panel
  const activePanel = document.querySelector('#dash-panels-container > [role="tabpanel"]:not([hidden])');
  const panelId = activePanel ? activePanel.id : 'panel-vmpc';
  renderActiveTabCharts(panelId, bundle, isDark, categoryFilter);
}
