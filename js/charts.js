/**
 * Sparkle Plotly.js Chart Adapter
 * Renders all 8 analytical visualizations with theme support and high fidelity.
 */

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  toImageButtonOptions: {
    format: 'png',
    filename: 'sparkle_chart',
    height: 600,
    width: 1000,
    scale: 2
  }
};

function getThemeLayout(isDark) {
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'Onest, -apple-system, sans-serif',
      color: isDark ? '#eef1f8' : '#0f1729',
      size: 13
    },
    xaxis: {
      gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 41, 0.08)',
      zerolinecolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 41, 0.15)',
      tickfont: { color: isDark ? '#98a2b8' : '#5b6478', size: 12 }
    },
    yaxis: {
      gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 41, 0.08)',
      zerolinecolor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 41, 0.15)',
      tickfont: { color: isDark ? '#98a2b8' : '#5b6478', size: 12 }
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
    xaxis: { ...figure.layout?.xaxis, ...themeLayout.xaxis },
    yaxis: { ...figure.layout?.yaxis, ...themeLayout.yaxis },
    margin: figure.layout?.margin || { l: 60, r: 40, t: 60, b: 60 }
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
    connector: { line: { color: isDark ? "rgba(255,255,255,0.3)" : "rgb(63, 63, 63)" } },
    decreasing: { marker: { color: "#EF553B" } },
    increasing: { marker: { color: "#00CC96" } },
    totals: { marker: { color: isDark ? "#4f46e5" : "#708090" } }
  };

  const layout = {
    ...getThemeLayout(isDark),
    title: {
      text: `Факторный анализ прибыли VMPC-INO<br><sup>[${vmpcData.prev_year || 'N-1'} vs ${vmpcData.curr_year || 'N'}]</sup>`,
      font: { size: 16 }
    },
    yaxis: { title: "Рубли" },
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
      ? "<b>Категория/товар_год:</b> %{x}<br><b>Изменение:</b> %{delta:,.0f} руб.<extra></extra>"
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
    connector: { line: { color: isDark ? "rgba(255,255,255,0.3)" : "rgb(63, 63, 63)" } },
    decreasing: { marker: { color: "#EF553B" } },
    increasing: { marker: { color: "#00CC96" } },
    totals: { marker: { color: isDark ? "rgba(255,255,255,0.15)" : "#FFFFFF" } }
  });

  // Category Bar Traces
  const catBars = profitData.category_bars || [];
  catBars.forEach((bar, catIdx) => {
    const isLast = (catIdx === catBars.length - 1);
    const colors = bar.values.map(v => (v !== null && v < 0) ? '#EF553B' : '#708090');
    const barTexts = isLast
      ? (profitData.x_labels || []).map((lbl, idx) => {
          if (profitData.measures[idx] === 'absolute') {
            return Math.round(profitData.waterfall_totals[idx]).toLocaleString('ru-RU');
          }
          return '';
        })
      : null;

    traces.push({
      type: "bar",
      name: bar.category,
      x: profitData.x_labels || [],
      y: bar.values,
      text: barTexts,
      textposition: "outside",
      opacity: 1,
      marker: { color: colors },
      hovertemplate: "<b>Категория/товар:</b> %{fullData.name}<br><b>Год:</b> %{x}<br><b>Прибыль:</b> %{y:,.0f} руб.<extra></extra>"
    });
  });

  const layout = {
    ...getThemeLayout(isDark),
    barmode: 'relative',
    title: { text: `Прибыль в разрезе категорий/товаров<br><sup>[${profitData.years?.join(', ')}]</sup>` },
    yaxis: { title: "Рубли" },
    showlegend: false
  };

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * 3. Margin Map: 4-Quadrant Strategic Scatter Plot
 */
export function renderMarginMap(containerId, marginData, isDark = false) {
  if (marginData && marginData.data) {
    return renderPlotlyFigure(containerId, marginData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !marginData) return;

  // Group items by category
  const catGroups = {};
  (marginData.items || []).forEach(item => {
    if (!catGroups[item.category]) catGroups[item.category] = [];
    catGroups[item.category].push(item);
  });

  const traces = Object.keys(catGroups).map(catName => {
    const items = catGroups[catName];
    return {
      type: 'scatter',
      mode: 'markers',
      name: catName,
      text: items.map(it => it.product),
      x: items.map(it => it.margin_pct),
      y: items.map(it => it.sales_rub),
      marker: {
        size: 10,
        opacity: 0.8,
        line: { width: 1, color: isDark ? '#1a2234' : 'White' }
      },
      hovertemplate: "<b>%{text}</b><br>Маржинальность: %{x:.2f}%<br>Продажи: %{y:,.0f} руб.<extra></extra>"
    };
  });

  const shapes = [
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0, y0: 0.5, x1: 0.5, y1: 1, fillcolor: '#95A5A6', opacity: 0.1, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0.5, y0: 0.5, x1: 1, y1: 1, fillcolor: '#2ECC71', opacity: 0.1, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0.5, y0: 0, x1: 0.5, y1: 0.5, fillcolor: '#E67E22', opacity: 0.1, layer: 'below', line: { width: 0 } },
    { type: 'rect', xref: 'paper', yref: 'paper', x0: 0.5, y0: 0, x1: 1, y1: 0.5, fillcolor: '#3498DB', opacity: 0.1, layer: 'below', line: { width: 0 } }
  ];

  const annotations = [
    { xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, text: '<b>Рассмотреть пути повышения маржинальности</b>', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { color: '#95A5A6', size: 10 }, opacity: 0.6 },
    { xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, text: '<b>Топ товары</b>', showarrow: false, xanchor: 'left', yanchor: 'bottom', font: { color: '#2ECC71', size: 10 }, opacity: 0.6 },
    { xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, text: '<b>Отстающие товары</b>', showarrow: false, xanchor: 'right', yanchor: 'top', font: { color: '#E67E22', size: 10 }, opacity: 0.6 },
    { xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, text: '<b>Рассмотреть пути повышения продаж</b>', showarrow: false, xanchor: 'left', yanchor: 'top', font: { color: '#3498DB', size: 10 }, opacity: 0.6 }
  ];

  const layout = {
    ...getThemeLayout(isDark),
    title: { text: `Карта маржинальности<br><sup>[${marginData.year || ''}]</sup>` },
    xaxis: { title: "Маржинальность (%)" },
    yaxis: { title: "Объем продаж (руб)" },
    hovermode: "closest",
    legend: { title: { text: "Категории" } },
    shapes,
    annotations
  };

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * 4. Monthly Sales Dynamics
 */
export function renderSalesChange(containerId, salesData, isDark = false) {
  if (salesData && salesData.data) {
    return renderPlotlyFigure(containerId, salesData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !salesData) return;

  const traces = (salesData.series || []).map(s => {
    return {
      type: 'scatter',
      mode: 'lines',
      name: s.series_name,
      x: s.points.map(p => p.date_text),
      y: s.points.map(p => p.sales_rub),
      customdata: s.points.map(p => p.date_text),
      hovertemplate: `<b>${s.series_name}</b><br>Период: %{customdata}<br>Продажи: %{y:,.0f} руб.<extra></extra>`
    };
  });

  const layout = {
    ...getThemeLayout(isDark),
    title: { text: "Динамика продаж" },
    xaxis: { title: "Период" },
    yaxis: { title: "Продажи (руб)" },
    height: 300
  };

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * 5. Monthly Margin Dynamics
 */
export function renderMargChange(containerId, margData, isDark = false) {
  if (margData && margData.data) {
    return renderPlotlyFigure(containerId, margData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !margData) return;

  const traces = (margData.series || []).map(s => {
    return {
      type: 'scatter',
      mode: 'lines',
      name: s.series_name,
      x: s.points.map(p => p.date_text),
      y: s.points.map(p => p.margin_pct),
      customdata: s.points.map(p => p.date_text),
      hovertemplate: `<b>${s.series_name}</b><br>Период: %{customdata}<br>Маржинальность: %{y:,.0f}%<extra></extra>`
    };
  });

  const layout = {
    ...getThemeLayout(isDark),
    title: { text: "Динамика маржинальности" },
    xaxis: { title: "Период" },
    yaxis: { title: "Маржинальность (%)" },
    height: 300
  };

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * 6. Sales Seasonality Heatmap (12 months)
 */
export function renderSalesHeatmap(containerId, heatData, isDark = false) {
  if (heatData && heatData.data) {
    return renderPlotlyFigure(containerId, heatData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !heatData) return;

  const cats = heatData.categories || [];
  const prods = heatData.products || [];
  const months = heatData.months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const yLabels = prods.map((p, i) => `${cats[i]} - ${p}`);
  const customMatrix = prods.map((p, i) => months.map(() => [cats[i], p]));

  const trace = {
    type: 'heatmap',
    z: heatData.matrix,
    x: months,
    y: yLabels,
    colorscale: 'RdYlGn',
    customdata: customMatrix,
    text: heatData.matrix,
    texttemplate: "%{text:.2f}",
    textfont: { size: 8, color: '#111827' },
    hovertemplate: "Категория: %{customdata[0]}<br>Товар: %{customdata[1]}<br>Месяц: %{x}<br>Коэффициент: %{z:.2f}<extra></extra>"
  };

  const layout = {
    ...getThemeLayout(isDark),
    title: { text: "Карта сезонности (продажи шт)<br><sup>[Коэффициент > 1 выше / < 1 ниже среднемесячных продаж]</sup>" },
    xaxis: { title: "Месяц", dtick: 1 },
    yaxis: { dtick: 1, tickfont: { size: 9 } }
  };

  return Plotly.react(el, [trace], layout, PLOTLY_CONFIG);
}

/**
 * 7. Price Seasonality Heatmap (12 months)
 */
export function renderPricesHeatmap(containerId, priceHeatData, isDark = false) {
  if (priceHeatData && priceHeatData.data) {
    return renderPlotlyFigure(containerId, priceHeatData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !priceHeatData) return;

  const cats = priceHeatData.categories || [];
  const prods = priceHeatData.products || [];
  const months = priceHeatData.months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const yLabels = prods.map((p, i) => `${cats[i]} - ${p}`);
  const customMatrix = prods.map((p, i) => months.map(() => [cats[i], p]));

  const trace = {
    type: 'heatmap',
    z: priceHeatData.matrix,
    x: months,
    y: yLabels,
    colorscale: 'RdYlGn',
    customdata: customMatrix,
    text: priceHeatData.matrix,
    texttemplate: "%{text:.2f}",
    textfont: { size: 8, color: '#111827' },
    hovertemplate: "Категория: %{customdata[0]}<br>Товар: %{customdata[1]}<br>Месяц: %{x}<br>Коэффициент: %{z:.2f}<extra></extra>"
  };

  const layout = {
    ...getThemeLayout(isDark),
    title: { text: "Карта сезонности (цены)<br><sup>[Коэффициент > 1 выше / < 1 ниже среднемесячных цен]</sup>" },
    xaxis: { title: "Месяц", dtick: 1 },
    yaxis: { dtick: 1, tickfont: { size: 9 } }
  };

  return Plotly.react(el, [trace], layout, PLOTLY_CONFIG);
}

/**
 * 8. Price Elasticity Subplots
 */
export function renderPriceElasticity(containerId, elasticityData, isDark = false) {
  if (elasticityData && elasticityData.data) {
    return renderPlotlyFigure(containerId, elasticityData, isDark);
  }

  const Plotly = ensurePlotly();
  const el = document.getElementById(containerId);
  if (!el || !elasticityData) return;

  const prods = elasticityData.products || [];
  const N = prods.length;
  const rows = Math.max(1, Math.ceil(N / 2));
  const traces = [];
  const themeLayout = getThemeLayout(isDark);
  const layout = {
    ...themeLayout,
    title: { text: `Эластичность спроса по цене<br><sup>[${elasticityData.year || ''}]</sup>` },
    grid: { rows, columns: 2, pattern: 'independent' },
    height: Math.max(350, rows * 220),
    showlegend: false,
    annotations: []
  };

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
      marker: { color: '#ff5a1f', size: 6, opacity: 0.8 },
      customdata: (prod.points || []).map(() => prod.series_name),
      hovertemplate: "<b>Товар:</b> %{customdata}<br><b>Цена:</b> %{x}<br><b>Продажи:</b> %{y}<extra></extra>"
    });

    const rowIdx = Math.floor(i / 2);
    const colIdx = i % 2;

    layout['xaxis' + axisSuffix] = {
      ...themeLayout.xaxis,
      title: rowIdx === rows - 1 ? 'Цена (руб)' : '',
      tickfont: { size: 9 }
    };
    layout['yaxis' + axisSuffix] = {
      ...themeLayout.yaxis,
      title: colIdx === 0 ? 'Объем (шт)' : '',
      tickfont: { size: 9 }
    };

    const xPos = colIdx === 0 ? 0.22 : 0.78;
    const yPos = 1.0 - (rowIdx / rows) + 0.02;
    layout.annotations.push({
      text: `<b>${prod.series_name}</b>`,
      showarrow: false,
      xref: 'paper',
      yref: 'paper',
      x: xPos,
      y: yPos,
      font: { size: 11, color: isDark ? '#eef1f8' : '#0f1729' }
    });
  });

  return Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}

/**
 * Render all 8 dashboard charts from an analytics bundle
 * Supports both genuine Wasm bundle structures and legacy Plotly figure dicts.
 */
export function renderFullDashboard(bundle, isDark = false) {
  if (!bundle) return;

  // 1. VMPC Waterfall
  const vmpcData = bundle.vmpc || bundle.fig_vmpc;
  if (vmpcData) renderVmpcWaterfall('chart-vmpc', vmpcData, isDark);

  // 2. Profit Bars
  const pbData = bundle.profit_bars || bundle.fig_profit_bars;
  if (pbData) renderProfitBars('chart-profit-bars', pbData, isDark);

  // 3. Margin Map
  const mmData = bundle.marg_map || bundle.fig_marg_map;
  if (mmData) renderMarginMap('chart-marg-map', mmData, isDark);

  // 4. Sales Change
  const scData = bundle.time_series || bundle.fig_sales_change;
  if (scData) renderSalesChange('chart-sales-change', scData, isDark);

  // 5. Margin Change
  const mcData = bundle.time_series || bundle.fig_marg_change;
  if (mcData) renderMargChange('chart-marg-change', mcData, isDark);

  // 6. Sales Heatmap
  const shData = bundle.seasonality?.sales_seasonality || bundle.fig_sales_heat || bundle.fig_sales_heatmap;
  if (shData) renderSalesHeatmap('chart-sales-heat', shData, isDark);

  // 7. Prices Heatmap
  const phData = bundle.seasonality?.prices_seasonality || bundle.fig_prices_heat || bundle.fig_prices_heatmap;
  if (phData) renderPricesHeatmap('chart-prices-heat', phData, isDark);

  // 8. Elasticity
  const elData = bundle.elasticity || bundle.fig_elasticity;
  if (elData) renderPriceElasticity('chart-elasticity', elData, isDark);
}
