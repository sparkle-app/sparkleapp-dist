/**
 * Sparkle — Editorial Zero-Server Analytics Application (v3.48.0)
 * Powered by Rust WebAssembly (SparkleEngine), Interactive BI Charts, Level 2 WebGPU LLM & Multi-Provider AI.
 */

import {
  initWasmEngine,
  isWasmReady,
  getWasmEngine,
  runWasmRiskMatrix
} from './wasm_loader.js?v=3.48.0';

import { createRiskWorkspaceStore } from './risk_shared.js?v=3.48.2';
import { initRiskFramework } from './risk_framework.js?v=3.48.4';
import { initRiskMap } from './risk_map_view.js?v=3.48.0';

import {
  renderMarginMap,
  renderSalesChange,
  renderMargChange,
  renderSalesHeatmap,
  renderPricesHeatmap,
  renderPriceElasticity,
  resizeAllCharts
} from './charts.js?v=3.48.0';

import {
  getCurrentDataset,
  setCurrentDataset,
  getCurrentFileName,
  fetchSampleAsUint8Array,
  fetchPrecomputedDemo,
  readFileAsUint8Array,
  processExcelData
} from './excel_handler.js?v=3.48.0';

import {
  aiService,
  PROVIDER_PRESETS,
  MODEL_CATALOG,
  LOCAL_MODELS_CATALOG,
  THINKING_LEVELS,
  THINKING_EXTRA_OUT_K,
  DEFAULT_MODEL_ID,
  getDefaultThinkingForTask,
  resolveModelIdForProvider,
  getModelCatalogEntry,
  estimateCost1000Rub,
  isShortPromptCached,
  estimateQualityWithThinking,
  estimateDashboardCostRub
} from './ai_service.js?v=3.48.0';

import {
  localLlmService,
  LOCAL_MODEL_TIERS
} from './local_llm_service.js?v=3.48.0';

import {
  datasetStore,
  formatBytes,
  formatDefaultDatasetName
} from './dataset_store.js?v=3.48.0';
import {
  initRiceTool,
  getRiceStorageStats,
  setRicePersistence,
  clearRiceData,
  rerenderRiceChart,
  upsertRiskInitiative,
  removeRiskInitiative,
  removeRiskInitiativeByRiskId,
  hasRiskInitiative,
  focusRiceInitiativeByRiskId,
  getRiceScaleMode,
  getRiceContextSummary,
  openExternalDatepicker
} from './rice_tool.js?v=3.48.2';

'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function setSafeHtml(el, html) {
  if (!el) return;
  if (!html) {
    el.replaceChildren();
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(el);
  const frag = range.createContextualFragment(String(html));
  frag.querySelectorAll('script,iframe,object,embed').forEach((n) => n.remove());
  frag.querySelectorAll('*').forEach((n) => {
    for (const attr of [...n.attributes]) {
      if (/^on/i.test(attr.name)) {
        n.removeAttribute(attr.name);
      } else if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
        n.removeAttribute(attr.name);
      }
    }
  });
  el.replaceChildren(frag);
}

let riskStore = null;

/* ==========================================================================
   Navigation Definition
   ========================================================================== */
const NAV = [
  ['', [['home', 'Главная', 'M2 7.5 8 2l6 5.5V14H2z']]],
  ['Стратегическая сессия', [
    ['framework', 'Фреймворк', 'M2 2h12v12H2zM2 6h12M6 6v8'],
    ['analytics', 'Подготовка аналитики', 'M3 13V8M8 13V3M13 13V6'],
    ['dashboard', 'Дашборд', 'M2 2h5v5H2zM9 2h5v3H9zM9 7h5v7H9zM2 9h5v5H2z', 'sub'],
    ['rice', 'Приоритизация (RICE)', 'M2 4h12M2 8h8M2 12h5M12 10l2 2-2 2']
  ]],
  ['Риск-менеджмент', [
    ['risk-framework', 'Фреймворк и аналитика', 'M3 2h10v12H3zM6 6h4M6 9h4'],
    ['risk-map', 'Карта рисков', 'M2 2h12v12H2zM6 2v12M10 2v12M2 6h12M2 10h12']
  ]],
  ['Управление ростом выручки', [
    ['market', 'Аналитика рынка', 'M2 12l4-4 3 2 5-6'],
    ['attributes', 'Выделение атрибутов', 'M2 8.5V2h6.5L14 7.5 8.5 13zM5.5 5.5h.01']
  ]]
];

const ALL = {};
NAV.forEach((g) => g[1].forEach((i) => { ALL[i[0]] = [i[1], g[0]]; }));

const ic = (d) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const subArrowIc = `<svg class="it-sub-arrow" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.5v6a2 2 0 0 0 2 2h6.5m-3-3 3 3-3 3"/></svg>`;

setSafeHtml($('#nav'), NAV.map((g, idx) =>
  `<div class="nav-group${idx > 0 ? ' nav-group-sec' : ''}">${g[0] ? `<div class="gl">${g[0]}</div>` : ''}<div class="nav-items">${g[1].map((i) => {
    const isSub = i[3] === 'sub';
    const ttl = isSub ? `${i[1]} (зависит от «Подготовка аналитики»)` : i[1];
    return `<a class="it${isSub ? ' it-sub' : ''}" href="#${i[0]}" data-id="${i[0]}" title="${ttl}">${isSub ? subArrowIc : ''}${ic(i[2])}<span>${i[1]}</span></a>`;
  }).join('')}</div></div>`
).join(''));

/* ==========================================================================
   Theme Toggle & Live Storage Sync (Light Default + Meta Color-Scheme)
   ========================================================================== */
const themeMeta = $('meta[name="color-scheme"]');
const themeBtn = $('#theme-btn');

function isDarkMode() {
  if (themeMeta && (themeMeta.content === 'dark' || themeMeta.content === 'light')) {
    return themeMeta.content === 'dark';
  }
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function syncThemeButtonUi() {
  if (!themeBtn) return;
  const dark = isDarkMode();
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
  themeBtn.title = dark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему';
}

const UI_PERSIST_KEY = 'sparkle_ui_persist';
let uiPrefsPersist = false;
try {
  uiPrefsPersist = localStorage.getItem(UI_PERSIST_KEY) === '1';
} catch {
  uiPrefsPersist = false;
}

function setUiPrefsPersistence(enabled) {
  uiPrefsPersist = Boolean(enabled);
  try {
    if (uiPrefsPersist) {
      localStorage.setItem(UI_PERSIST_KEY, '1');
      localStorage.setItem('color-scheme', isDarkMode() ? 'dark' : 'light');
      localStorage.setItem('col', app?.classList.contains('col') ? '1' : '');
    } else {
      localStorage.removeItem(UI_PERSIST_KEY);
      localStorage.removeItem('color-scheme');
      localStorage.removeItem('col');
      localStorage.removeItem('sparkle_local_mirror_url');
    }
  } catch { /* ignore */ }
}

function applyTheme(next, { persist = true, notify = false } = {}) {
  const normalized = next === 'dark' ? 'dark' : 'light';
  if (themeMeta) themeMeta.content = normalized;
  document.documentElement.setAttribute('data-theme', normalized);
  if (persist && uiPrefsPersist) {
    try { localStorage.setItem('color-scheme', normalized); } catch { /* ignore */ }
  }
  syncThemeButtonUi();
  if ($('[data-v="dashboard"]')?.classList.contains('on')) {
    renderDashboardAll(true);
  }
  if ($('[data-v="rice"]')?.classList.contains('on')) {
    rerenderRiceChart();
  }
  if (notify) {
    toast(normalized === 'dark' ? 'Включена тёмная тема' : 'Включена светлая тема');
  }
}

function toggleTheme() {
  applyTheme(isDarkMode() ? 'light' : 'dark', { persist: true, notify: true });
}

if (themeBtn) {
  syncThemeButtonUi();
  themeBtn.addEventListener('click', toggleTheme);
}

window.addEventListener('storage', (e) => {
  if (e.key === 'color-scheme') {
    const val = e.newValue === 'dark' ? 'dark' : 'light';
    applyTheme(val, { persist: false, notify: false });
  }
});

/* ==========================================================================
   Status Toast & Live Region
   ========================================================================== */
let tt;
function toast(m) {
  const t = $('#ts');
  if (!t) return;
  t.textContent = m;
  t.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => { t.hidden = true; }, 2600);
}

function announce(m) {
  const l = $('#live');
  if (!l) return;
  l.textContent = '';
  setTimeout(() => { l.textContent = m; }, 50);
}

/* ==========================================================================
   Router & Sidebar
   ========================================================================== */
const app = $('#app');

function route() {
  const id = location.hash.slice(1);
  const cur = ALL[id] ? id : 'home';
  const v = $(`[data-v="${cur}"]`) ? cur : 'stub';

  $$('[data-v]').forEach((e) => e.classList.toggle('on', e.dataset.v === v));
  $$('.it').forEach((a) => (a.dataset.id === cur ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));

  const [t, g] = ALL[cur];
  setSafeHtml($('#bc'), g ? `${g} / <b>${t}</b>` : `<b>${t}</b>`);
  if (v === 'stub') $('#stt').textContent = t;
  document.title = `${t} | Sparkle App`;

  app.classList.remove('open');
  if (window.matchMedia('(max-width: 860px)').matches) {
    $('#tg')?.setAttribute('aria-expanded', 'false');
  }
  hideWfTooltip();
  riskStore?.hideRiskHoverPop?.();
  window.scrollTo(0, 0);

  const h = $(`[data-v="${v}"] h1`);
  if (h) h.focus({ preventScroll: true });

  if (v === 'analytics') {
    syncAnalyticsView();
  }
  if (v === 'dashboard') {
    ensureDashboardDataAndRender();
  }
  if (v === 'rice') {
    rerenderRiceChart();
  }
}

window.addEventListener('hashchange', route);

function closeMobileSidebar(restoreFocus = false) {
  if (!app.classList.contains('open')) return;
  app.classList.remove('open');
  $('#tg')?.setAttribute('aria-expanded', 'false');
  if (restoreFocus) $('#tg')?.focus();
}

try {
  if (uiPrefsPersist && localStorage.getItem('col') === '1') {
    app.classList.add('col');
    $('#tg')?.setAttribute('aria-expanded', 'false');
  }
} catch { /* ignore storage errors */ }

$('#tg').addEventListener('click', () => {
  if (window.matchMedia('(max-width: 860px)').matches) {
    const isOpen = app.classList.toggle('open');
    $('#tg').setAttribute('aria-expanded', String(isOpen));
  } else {
    const isCol = app.classList.toggle('col');
    $('#tg').setAttribute('aria-expanded', String(!isCol));
    if (uiPrefsPersist) {
      try {
        localStorage.setItem('col', isCol ? '1' : '');
      } catch { /* ignore */ }
    }
  }
});

$('#nav')?.addEventListener('click', (e) => {
  if (e.target.closest('a') && window.matchMedia('(max-width: 860px)').matches) {
    closeMobileSidebar(false);
  }
});

$('.mn').addEventListener('click', () => closeMobileSidebar(false));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.classList.contains('open')) {
    closeMobileSidebar(true);
  }
});

/* ==========================================================================
   Native Modal Dialog Light-Dismiss Fallback & Command Palette
   ========================================================================== */
if (!('closedBy' in HTMLDialogElement.prototype)) {
  const outside = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => { pressedOutside = outside(e, dialog); });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e, dialog)) dialog.close();
    });
  }
}

const P = $('#pal');
const PI = $('#pi');
const PL = $('#pl');
let items = [];
let sel = 0;

const ALLI = [
  ...Object.entries(ALL).map(([id, [t, g]]) => ({
    t, m: g || 'Страница', f: () => { location.hash = id; }
  })),
  { t: 'Попробовать пример 1: подготовка аналитики', m: 'Действие', f: () => { location.hash = 'analytics'; runSample(0); } },
  { t: 'Попробовать пример: выделение атрибутов', m: 'Действие', f: () => { location.hash = 'attributes'; fillB(); runB(); } },
  { t: 'Открыть дашборд', m: 'Действие', f: () => { location.hash = 'dashboard'; } },
  { t: 'Настройка API-подключения (ProxyAPI / OpenAI / Anthropic / Google)', m: 'AI', f: () => openApiDialog() },
  { t: 'Переключить тему (Светлая / Тёмная)', m: 'Оформление', f: toggleTheme }
];

function drawPalette() {
  const q = PI.value.toLowerCase();
  items = ALLI.filter((i) => i.t.toLowerCase().includes(q));
  sel = Math.max(0, Math.min(sel, items.length - 1));
  setSafeHtml(PL, items.map((i, k) =>
    `<li role="option" id="po${k}" aria-selected="${k === sel}" data-k="${k}"><span>${esc(i.t)}</span><em>${esc(i.m)}</em></li>`
  ).join('') || '<li style="cursor:default">Ничего не найдено</li>');
  PI.setAttribute('aria-activedescendant', items.length ? `po${sel}` : '');
}

function openPalette() {
  if (!P) return;
  PI.value = '';
  sel = 0;
  drawPalette();
  if (!P.open) P.showModal();
  PI.focus();
}

function pickPalette(k) {
  const item = items[k];
  if (item) {
    P.close();
    item.f();
  }
}

$('#so').addEventListener('click', openPalette);
$('#pal-close').addEventListener('click', () => P.close());
PI.addEventListener('input', () => { sel = 0; drawPalette(); });
PL.addEventListener('click', (e) => {
  const li = e.target.closest('[data-k]');
  if (li) pickPalette(+li.dataset.k);
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
  } else if (P.open) {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      sel = (sel + 1) % items.length;
      drawPalette();
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      sel = (sel - 1 + items.length) % items.length;
      drawPalette();
    } else if (e.key === 'Enter' && items.length) {
      e.preventDefault();
      pickPalette(sel);
    }
  } else if (e.key === 'Escape') {
    hideWfTooltip();
  }
});

/* ==========================================================================
   Legal Dialog (Terms & Privacy from Sidebar Footer)
   ========================================================================== */
const LEGAL_TEXTS = {
  terms: {
    title: 'Пользовательское соглашение (Условия использования)',
    html: `
      <div class="legal-doc">
        <div class="legal-callout">
          <strong>Условия использования веб-интерфейса Sparkle App</strong>
          <span>Безвозмездный клиентский инструмент для стратегических сессий, управления рисками и роста выручки.</span>
        </div>

        <h3>1. Предмет соглашения</h3>
        <p>Настоящее Пользовательское соглашение определяет условия безвозмездного использования веб-интерфейса <strong>Sparkle App</strong> (далее — Сервис) — аналитического инструмента для подготовки и проведения стратегических сессий (методологический фреймворк, факторный анализ прибыли VMPC-INO, анализ маржинальности, сезонности и эластичности спроса, приоритизация инициатив и защитных мер по методологии RICE), риск-менеджмента (единый реестр рисков: сканирование горизонта, матрица PESTEL, интерактивная карта рисков 3×3 и перенос защитных действий в приоритизацию RICE) и управления ростом выручки (автоматическое выделение атрибутов товаров из названий). Начиная использование Сервиса, Пользователь принимает условия настоящего Соглашения.</p>

        <h3>2. Информационно-расчётный характер</h3>
        <p>Все расчёты, рейтинги инициатив и действий по рискам в RICE, визуализации, матрицы рисков, таблицы атрибутов, пометки спорных значений и текстовые выводы (полученные с помощью WebAssembly-ядра, локальных AI-моделей или внешних AI API) носят исключительно информационно-аналитический и вспомогательный характер. Результаты расчётов и AI-обработки могут содержать неточности и требуют проверки Пользователем перед принятием управленческих или коммерческих решений.</p>

        <h3>3. Условия «КАК ЕСТЬ» (AS IS) и ограничение ответственности</h3>
        <p>Сервис предоставляется на условиях <strong>«КАК ЕСТЬ» («AS IS»)</strong>, без каких-либо явных, подразумеваемых или установленных законом гарантий, включая гарантии точности, полноты, бесперебойности, совместимости с конкретным оборудованием (включая WebGPU) или пригодности для конкретных коммерческих целей.</p>
        <p>Правообладатель и разработчик ни при каких обстоятельствах не несут ответственности за любые прямые или косвенные убытки, упущенную выгоду, потерю данных, финансовые потери или последствия управленческих решений, возникшие в связи с использованием или невозможностью использования Сервиса.</p>
        <p>Сервис не имеет собственного бэкенд-сервера хранения данных и не несёт ответственности за утерю данных при обновлении страницы, закрытии вкладки, очистке хранилища браузера (RAM, <code>localStorage</code>, <code>IndexedDB</code>, Cache Storage), а также за сбои, тарифы или изменение условий работы сторонних сервисов (включая AI-провайдеров и CDN).</p>

        <h3>4. Внешние AI-сервисы и ответственность за данные</h3>
        <p>Пользователь самостоятельно гарантирует правомерность обработки загружаемых файлов и текстов. При подключении сторонних облачных AI-провайдеров через собственный API-ключ Пользователь самостоятельно несёт ответственность за расходы по ключу, соблюдение требований законодательства (включая 152-ФЗ «О персональных данных» и режим коммерческой тайны) и условия выбранного провайдера. По умолчанию API-ключ хранится только в оперативной памяти текущей сессии (RAM); управлять способом хранения и очистить любые локальные данные можно в окне «Настройки → Управление данными». Ориентировочные расценки токенов в интерфейсе носят справочный характер — актуальные тарифы устанавливаются выбранным провайдером. Рекомендуется не передавать в облачные AI персональные данные, устанавливать лимиты расходов на ключ и отключать ключ у провайдера после завершения работы.</p>

        <h3>5. Бесплатное использование и интеллектуальная собственность</h3>
        <p>Использование Сервиса предоставляется бесплатно. Исходный код, скомпилированный модуль WebAssembly, интерфейс, методологические материалы, алгоритмы и графические элементы защищены авторским правом. Копирование, декомпиляция, реверс-инжиниринг и коммерческое тиражирование <strong>без письменного согласия правообладателя запрещены</strong>. Локальные AI-модели сторонних разработчиков (например, Qwen3) распространяются под их собственными открытыми лицензиями (Apache 2.0).</p>
      </div>`
  },
  privacy: {
    title: 'Политика конфиденциальности',
    html: `
      <div class="legal-doc">
        <div class="legal-callout">
          <strong>Бессерверная архитектура (Zero-Server)</strong>
          <span>У Сервиса нет собственного бэкенд-сервера и серверной базы данных для пользовательских данных (статические файлы интерфейса раздаются через статический веб-хостинг). Разработчик не собирает, не получает, не хранит и не имеет доступа к загружаемым вами файлам, таблицам, инициативам RICE, реестру рисков, отчётам и API-ключам.</span>
        </div>

        <h3>1. Локальная обработка на устройстве</h3>
        <p>Основная работа Сервиса выполняется непосредственно в браузере Пользователя: импорт файлов (<code>.xlsx</code>, <code>.csv</code>, <code>.txt</code>), математические расчёты в WebAssembly, приоритизация инициатив RICE, ведение единого реестра рисков (PESTEL и карта 3×3) с переносом защитных действий в RICE, локальный разбор атрибутов, генерация локальным AI (WebGPU) и экспорт файлов (<code>.xlsx</code>, <code>.csv</code>, <code>.pptx</code>, <code>.txt</code>) происходят исключительно на вашем устройстве.</p>
        <p><strong>Исключение:</strong> при выборе режима <strong>«AI-агент (API)» / «API (облако)»</strong> (активируется только по инициативе Пользователя с его собственным API-ключом) анализируемые данные отправляются напрямую из браузера выбранному стороннему AI-провайдеру (подробнее — в п. 3).</p>

        <h3>2. Режимы хранения данных в браузере</h3>
        <p>По умолчанию <strong>все данные и настройки действуют только в памяти текущей сессии (RAM)</strong> и безвозвратно стираются при обновлении (F5) или закрытии вкладки. Постоянное сохранение на диске включается только вручную:</p>
        <ul>
          <li><strong>Память сессии (RAM, по умолчанию)</strong> — загруженные файлы, рабочие таблицы, инициативы RICE, единый реестр рисков и сохранённые датасеты находятся только в оперативной памяти вкладки и исчезают при F5 или закрытии.</li>
          <li><strong>Подготовка аналитики и Дашборд (<code>RAM / IndexedDB</code>, опционально)</strong> — по умолчанию загруженные <code>.xlsx</code>-файлы, рассчитанные метрики дашборда и кэш AI-выводов хранятся только в памяти сессии (режим <code>RAM</code>); постоянное сохранение в локальной БД браузера <code>IndexedDB</code> (режим <code>Disk</code>) включается вручную переключателем <code>RAM / Disk</code> на вкладке «Подготовка аналитики» или в окне «Настройки → Управление данными» и очищается кнопкой «Удалить файл и данные» / «Очистить» либо при возврате в <code>RAM</code>.</li>
          <li><strong>Приоритизация инициатив и действий по рискам RICE (<code>RAM / localStorage</code>, опционально)</strong> — по умолчанию таблица и графики RICE (включая перенесённые действия по рискам с меткой <code>-Р</code>) живут только в памяти сессии (режим <code>RAM</code>); постоянное сохранение в <code>localStorage</code> браузера (режим <code>Disk</code>) включается вручную переключателем <code>RAM / Disk</code> на панели инструмента или в окне «Настройки → Управление данными».</li>
          <li><strong>Единый реестр риск-менеджмента: Фреймворк PESTEL и Карта рисков 3×3 (<code>RAM / IndexedDB</code>, опционально)</strong> — по умолчанию единые карточки рисков (сигналы PESTEL, горизонты трендов, координаты матрицы 3×3, стратегии реагирования, сроки решений/действий, оценки RICE, пороги шкал, локальный импорт/экспорт <code>.xlsx</code> / <code>.csv</code>), результаты AI-анализа рисков (включая опциональное уточняющее интервью и выбранный пользователем контекст из дашборда и RICE) хранятся только в памяти сессии (режим <code>RAM</code>); постоянное сохранение в единой локальной БД <code>IndexedDB</code> (режим <code>Disk</code>) синхронно включается переключателем <code>RAM / Disk</code> на вкладках «Фреймворк и аналитика» или «Карта рисков» либо в окне «Настройки → Управление данными». По умолчанию AI-анализ рисков работает локально на устройстве (WebGPU); передача выбранного контекста во внешний AI API происходит только при явном выборе облачного режима и наличии API-ключа Пользователя.</li>
          <li><strong>Локальная БД браузера для атрибутов (<code>RAM / IndexedDB</code>, опционально)</strong> — сохранённые датасеты атрибутов (в том числе подключаемые локально в списке «Данные» на Дашборде при наличии совместимых столбцов) по умолчанию хранятся в RAM; сохранение на диск (<code>IndexedDB</code>) включается вручную в окне сохранения датасета или в «Настройки → Управление данными» до ручного удаления Пользователем или очистки браузером.</li>
          <li><strong>API-ключ и настройки AI API</strong> — по умолчанию хранятся <strong>только в памяти сессии (RAM)</strong> и стираются при F5 или закрытии вкладки. Опционально в «Настройки → Управление данными» можно включить сохранение в <code>localStorage</code> браузера (кроме режима инкогнито).</li>
          <li><strong>Настройки интерфейса</strong> — по умолчанию тема оформления, состояние боковой панели и зеркало WebGPU действуют <strong>только в текущей сессии (RAM)</strong>; сохранение в <code>localStorage</code> включается только вручную в «Настройки → Управление данными».</li>
          <li><strong>Кэш локальных AI-моделей (WebGPU)</strong> — по умолчанию веса модели удаляются автоматически после закрытия вкладки или отмены; постоянное кэширование на диске в браузере включается только по явному выбору Пользователя.</li>
        </ul>

        <h3>3. Взаимодействие со сторонними сервисами</h3>
        <ul>
          <li><strong>Облачные AI API (по инициативе Пользователя):</strong> при выборе режима «AI-агент (API)» / «API (облако)» и указании собственного ключа запросы с анализируемыми данными отправляются напрямую из браузера Пользователя на адрес выбранного провайдера (<code>ProxyAPI</code>, <code>OpenAI</code>, <code>Anthropic</code>, <code>Google</code> или указанный Пользователем URL) без участия серверов разработчика.</li>
          <li><strong>Внешние статические ресурсы:</strong> статические файлы приложения, шрифты (Google Fonts) и веса локальных AI-моделей (Hugging Face или указанное Пользователем зеркало) загружаются браузером напрямую без передачи пользовательских отчётов и таблиц.</li>
        </ul>

        <h3>4. Отсутствие трекеров и удаление данных</h3>
        <p>Сервис не использует рекламные трекеры, счётчики веб-аналитики, сторонние системы авторизации и следящие cookies. Управлять режимами хранения и удалить любую категорию локальных данных — или очистить все данные сразу — можно в любой момент в окне <strong>«Настройки → Управление данными»</strong> либо через очистку данных сайта в настройках браузера.</p>
      </div>`
  }
};

const legalDlg = $('#legal-dlg');
$('#legal-close').addEventListener('click', () => legalDlg.close());
$$('[data-legal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const info = LEGAL_TEXTS[btn.dataset.legal];
    if (!info) return;
    $('#legal-title').textContent = info.title;
    setSafeHtml($('#legal-content'), info.html);
    legalDlg.showModal();
  });
});

/* ==========================================================================
   WASM Core Status & Badge Synchronization
   ========================================================================== */
function updateCoreBadge(mode, workerText = '') {
  const label = mode === 'wasm'
    ? `Ядро: WebAssembly${workerText}`
    : 'Ядро: Демо-режим';
  ['core', 'core2'].forEach((id) => {
    const el = $(`#${id}`);
    if (el) {
      el.textContent = label;
      el.classList.toggle('w', mode === 'wasm');
    }
  });
}

/* ==========================================================================
   Analytics Stepper (#analytics) + Real Excel Processing via Wasm
   ========================================================================== */
const A = $('[data-v="analytics"]');
const B = $('[data-v="attributes"]');
const SAMPLES = [
  { url: 'assets/samples/test_data_fixed.xlsx', name: 'test_data_fixed.xlsx', label: 'Пример 1 · Обезличенный', reply: 'assets/samples/test_data_reply.txt' },
  { url: 'assets/samples/test_data_3.xlsx', name: 'test_data_3.xlsx', label: 'Пример 2 · Продукты', reply: 'assets/samples/test_data_3_reply.txt' }
];
const MAX_XLSX_BYTES = 200 * 1024 * 1024;
const AN_PERSIST_KEY = 'sparkle_an_persist';
const AN_IDB_NAME = 'sparkle_analytics_cache_db';
const AN_IDB_STORE = 'active_dataset';

let currentAiComment = '';
let currentDatasetKey = '0';
let customDatasetCache = null;
let lastAnalyticsMeta = { bytes: 0, elapsedMs: 0 };
let analyticsPersistDisk = false;
const dashAiInsightCache = new Map();

try {
  analyticsPersistDisk = localStorage.getItem(AN_PERSIST_KEY) === '1';
} catch {
  analyticsPersistDisk = false;
}

function openAnalyticsIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен в этом браузере.'));
      return;
    }
    const req = indexedDB.open(AN_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AN_IDB_STORE)) {
        db.createObjectStore(AN_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Не удалось открыть IndexedDB.'));
  });
}

async function saveAnalyticsToDisk(payload) {
  if (!analyticsPersistDisk || !payload?.bundle) return;
  try {
    const record = {
      ...payload,
      aiInsights: Object.fromEntries(dashAiInsightCache)
    };
    const db = await openAnalyticsIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AN_IDB_STORE, 'readwrite');
      tx.objectStore(AN_IDB_STORE).put(record, 'current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[Analytics] Failed to persist dataset in IndexedDB:', err);
  }
}

async function loadAnalyticsFromDisk() {
  if (!analyticsPersistDisk) return null;
  try {
    const db = await openAnalyticsIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(AN_IDB_STORE, 'readonly');
      const req = tx.objectStore(AN_IDB_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function clearAnalyticsDiskCache() {
  try {
    const db = await openAnalyticsIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AN_IDB_STORE, 'readwrite');
      tx.objectStore(AN_IDB_STORE).delete('current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* ignore */ }
}

function syncAnalyticsStorageToggle() {
  $$('[data-an-storage]').forEach((btn) => {
    const isDisk = btn.dataset.anStorage === 'disk';
    btn.setAttribute('aria-pressed', String(isDisk === analyticsPersistDisk));
  });
}

async function setAnalyticsStorageMode(toDisk, { confirm = true, silent = false } = {}) {
  if (toDisk && typeof indexedDB === 'undefined') {
    if (!silent) toast('IndexedDB недоступен в этом браузере — используется режим RAM.');
    analyticsPersistDisk = false;
    syncAnalyticsStorageToggle();
    return false;
  }
  if (confirm) {
    const ok = await confirmDataAction({
      title: toDisk ? 'Сохранять данные аналитики в IndexedDB?' : 'Перевести данные аналитики в память сессии (RAM)?',
      description: toDisk
        ? 'Рассчитанный набор данных дашборда будет сохраняться локально в IndexedDB браузера и переживёт перезагрузку страницы (F5). На общих компьютерах рекомендуется оставлять режим RAM.'
        : 'Сохранённый набор будет немедленно удалён из IndexedDB и останется только в оперативной памяти до закрытия или обновления вкладки.',
      confirmLabel: toDisk ? 'Включить IndexedDB' : 'Перевести в RAM'
    });
    if (!ok) return false;
  }

  analyticsPersistDisk = Boolean(toDisk);
  try {
    if (analyticsPersistDisk) {
      localStorage.setItem(AN_PERSIST_KEY, '1');
    } else {
      localStorage.removeItem(AN_PERSIST_KEY);
    }
  } catch { /* ignore */ }
  syncAnalyticsStorageToggle();

  if (analyticsPersistDisk) {
    const bundle = getCurrentDataset();
    if (bundle) {
      await saveAnalyticsToDisk({
        bundle,
        fileName: getCurrentFileName(),
        datasetKey: currentDatasetKey,
        isCustom: currentDatasetKey === 'user',
        meta: lastAnalyticsMeta
      });
    }
    if (!silent) toast('Хранение аналитики: Disk (IndexedDB браузера)');
  } else {
    await clearAnalyticsDiskCache();
    if (!silent) toast('Хранение аналитики: RAM (только текущая сессия)');
  }
  return true;
}

function setAnalyticsError(msg = '') {
  const errBox = $('#an-err');
  const errTxt = $('#an-err-text');
  if (!errBox || !errTxt) return;
  if (msg) {
    errTxt.textContent = msg;
    errBox.hidden = false;
  } else {
    errTxt.textContent = '';
    errBox.hidden = true;
  }
}

function validateExcelFile(file) {
  if (!file) {
    return 'Перетащите файл .xlsx с компьютера — ссылки и фрагменты текста не поддерживаются.';
  }
  const lower = String(file.name || '').toLowerCase();
  if (!lower.endsWith('.xlsx')) {
    return `Неподдерживаемый формат («${file.name}»). Загрузите книгу Excel в формате .xlsx.`;
  }
  if (!file.size) {
    return `Файл «${file.name}» пуст (0 байт). Проверьте исходную таблицу.`;
  }
  if (file.size > MAX_XLSX_BYTES) {
    return `Файл «${file.name}» превышает лимит 200 МБ (${formatBytes(file.size)}).`;
  }
  return '';
}

function setAnalyticsProgress(pct, label) {
  const prog = $('#an-prog');
  const pctEl = $('#an-prog-pct');
  const lblEl = $('#an-prog-lbl');
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (prog) prog.value = clamped;
  if (pctEl) pctEl.textContent = `${clamped}%`;
  if (label && lblEl) lblEl.textContent = label;
}

function formatDeltaMetric(prev, curr, invertColor = false) {
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return { text: '—', cls: '' };
  const diff = curr - prev;
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : null;
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '•';
  const sign = diff > 0 ? '+' : '';
  const absVal = Math.abs(diff);
  const valStr = absVal >= 1e6
    ? `${sign}${(diff / 1e6).toFixed(1)} млн`
    : absVal >= 1e3
      ? `${sign}${Math.round(diff / 1e3)} тыс`
      : `${sign}${Math.round(diff)}`;
  const pctStr = pct !== null && Number.isFinite(pct) ? ` (${sign}${pct.toFixed(1)}%)` : '';
  let cls = '';
  if (diff > 0) cls = invertColor ? 'is-neg' : 'is-pos';
  else if (diff < 0) cls = invertColor ? 'is-pos' : 'is-neg';
  return { text: `${arrow} ${valStr}${pctStr}`, cls };
}

function computeYoYFinancialDeltas(bundle) {
  const vmpc = bundle?.vmpc || bundle?.fig_vmpc;
  const items = vmpc?.waterfall_items;
  const prevProfit = Number.isFinite(vmpc?.prev_profit)
    ? vmpc.prev_profit
    : (Array.isArray(items) && items.length >= 2 ? Number(items[0]?.value) : NaN);
  const currProfit = Number.isFinite(vmpc?.curr_profit)
    ? vmpc.curr_profit
    : (Array.isArray(items) && items.length >= 2 ? Number(items[items.length - 1]?.value) : NaN);

  const profitDelta = formatDeltaMetric(prevProfit, currProfit, false);

  const prevYear = Number(vmpc?.prev_year);
  const currYear = Number(vmpc?.curr_year);
  const tsSeries = bundle?.time_series?.series;
  let prevRev = NaN;
  let currRev = NaN;

  if (Array.isArray(tsSeries) && Number.isFinite(prevYear) && Number.isFinite(currYear)) {
    let pSum = 0;
    let cSum = 0;
    let hasP = false;
    let hasC = false;
    for (const s of tsSeries) {
      for (const pt of (s.points || [])) {
        if (!Number.isFinite(pt.sales_rub)) continue;
        if (pt.year === prevYear) { pSum += pt.sales_rub; hasP = true; }
        else if (pt.year === currYear) { cSum += pt.sales_rub; hasC = true; }
      }
    }
    if (hasP) prevRev = pSum;
    if (hasC) currRev = cSum;
  }

  const revDelta = formatDeltaMetric(prevRev, currRev, false);
  const prevCosts = Number.isFinite(prevRev) && Number.isFinite(prevProfit) ? prevRev - prevProfit : NaN;
  const currCosts = Number.isFinite(currRev) && Number.isFinite(currProfit) ? currRev - currProfit : NaN;
  const costDelta = formatDeltaMetric(prevCosts, currCosts, true);

  return { profitDelta, revDelta, costDelta };
}

function syncAnalyticsView() {
  syncAnalyticsStorageToggle();
  const bundle = getCurrentDataset();
  const fileName = getCurrentFileName();
  const pill = $('#an-active-pill');
  const pillTxt = $('#an-active-pill-text');
  const sumTitle = $('#an-sum-title');
  const kpiPeriod = $('#an-kpi-period');
  const kpiScope = $('#an-kpi-scope');
  const kpiDelta = $('#an-kpi-delta');
  const kpiRevDelta = $('#an-kpi-rev-delta');
  const kpiCostDelta = $('#an-kpi-cost-delta');

  const sampleMeta = currentDatasetKey === 'user'
    ? null
    : SAMPLES[Number(currentDatasetKey)] || null;
  const displayName = currentDatasetKey === 'user'
    ? (customDatasetCache?.name || fileName || 'Пользовательский файл')
    : (sampleMeta?.label || fileName || 'Пример 1 · Обезличенный');

  $$('.an-sample-card[data-ex]').forEach((card) => {
    const idx = card.dataset.ex;
    const isActive = Boolean(bundle) && currentDatasetKey === idx;
    card.setAttribute('aria-pressed', String(isActive));
    const badge = card.querySelector(`[data-an-badge="${idx}"]`);
    if (badge) badge.hidden = !isActive;
  });

  if (!bundle) {
    if (pill) pill.classList.remove('is-ready');
    if (pillTxt) pillTxt.textContent = 'В дашборде: нет данных';
    if (sumTitle) sumTitle.textContent = 'Набор ещё не рассчитан';
    if (kpiPeriod) kpiPeriod.textContent = '—';
    if (kpiScope) kpiScope.textContent = '—';
    if (kpiDelta) { kpiDelta.textContent = '—'; kpiDelta.className = ''; }
    if (kpiRevDelta) { kpiRevDelta.textContent = '—'; kpiRevDelta.className = ''; }
    if (kpiCostDelta) { kpiCostDelta.textContent = '—'; kpiCostDelta.className = ''; }
    $$('#an-mod-list li').forEach((li) => {
      li.classList.remove('is-ok', 'is-miss');
      const ic = li.querySelector('.an-mod-ic');
      if (ic) ic.textContent = '○';
    });
    return;
  }

  if (pill) pill.classList.add('is-ready');
  if (pillTxt) pillTxt.textContent = `В дашборде: ${displayName}`;
  if (sumTitle) sumTitle.textContent = displayName;

  const vmpc = bundle.vmpc || bundle.fig_vmpc;
  const periodStr = (vmpc?.prev_year && vmpc?.curr_year)
    ? `${vmpc.prev_year} → ${vmpc.curr_year}`
    : '—';
  const catsCount = getBundleCategories(bundle).length;
  const skuCount = (bundle.marg_map?.items || []).length;
  const { profitDelta, revDelta, costDelta } = computeYoYFinancialDeltas(bundle);

  if (kpiPeriod) kpiPeriod.textContent = periodStr;
  if (kpiScope) {
    kpiScope.textContent = (catsCount || skuCount)
      ? `${catsCount || '—'} кат. · ${skuCount || '—'} SKU`
      : '—';
  }
  if (kpiDelta) {
    kpiDelta.textContent = profitDelta.text;
    kpiDelta.className = profitDelta.cls;
  }
  if (kpiRevDelta) {
    kpiRevDelta.textContent = revDelta.text;
    kpiRevDelta.className = revDelta.cls;
  }
  if (kpiCostDelta) {
    kpiCostDelta.textContent = costDelta.text;
    kpiCostDelta.className = costDelta.cls;
  }

  const hasSeasMatrix = Boolean(
    (bundle.seasonality?.sales_seasonality?.matrix?.length) ||
    (bundle.seasonality?.prices_seasonality?.matrix?.length) ||
    bundle.fig_sales_heat?.data?.length ||
    (bundle.elasticity?.products?.length) ||
    bundle.fig_elasticity?.data?.length
  );
  const modFlags = {
    vmpc: Boolean(vmpc?.waterfall_items?.length || vmpc?.data?.length),
    bars: Boolean(bundle.profit_bars?.categories?.length || bundle.fig_profit_bars?.data?.length),
    marg: Boolean(skuCount || bundle.fig_marg_map?.data?.length),
    seas: hasSeasMatrix
  };
  $$('#an-mod-list li[data-mod]').forEach((li) => {
    const ok = Boolean(modFlags[li.dataset.mod]);
    li.classList.toggle('is-ok', ok);
    li.classList.toggle('is-miss', !ok);
    const ic = li.querySelector('.an-mod-ic');
    if (ic) ic.textContent = ok ? '✓' : '✕';
  });
}

async function clearAnalyticsDataset({ silent = false } = {}) {
  customDatasetCache = null;
  currentAiComment = '';
  dashAiInsightCache.clear();
  const aiCard = $('#ai-insight-card');
  if (aiCard) aiCard.hidden = true;
  currentDatasetKey = '0';
  lastAnalyticsMeta = { bytes: 0, elapsedMs: 0 };
  setCurrentDataset(null, '');
  if ($('#fl')) $('#fl').value = '';
  setAnalyticsError('');
  syncDatasetSelectOptions('', '0');
  await clearAnalyticsDiskCache();
  setStepState(A, 'i');
  syncAnalyticsView();
  if (!silent) toast('Файл и рассчитанные данные удалены.');
}

function setStepState(sec, s) {
  sec.dataset.s = s;
  if (s === 'd') announce('Готово: расчёт завершён, данные доступны в дашборде');
  $$('[data-for]', sec).forEach((e) => { e.hidden = e.dataset.for !== s; });
  const st = { i: ['on', ''], r: ['dn', 'on'], d: ['dn', 'dn'] }[s];
  $$('.s', sec).forEach((e, k) => { e.className = `s ${st[k]}`; });
}

async function runAnalyticsJob(name, bytesLoader, replyUrl = null, sampleKey = 'user') {
  if (A.dataset.s === 'r') return;
  setAnalyticsError('');
  setStepState(A, 'r');

  const t0 = performance.now();
  const stageItems = $$('.stg li', A);
  stageItems.forEach((l) => { l.className = ''; });
  setAnalyticsProgress(15, 'Инициализируем WebAssembly…');

  try {
    await initWasmEngine();
    stageItems[0]?.classList.add('dn');
    setAnalyticsProgress(40, `Читаем «${name}» в памяти…`);

    const bytes = await bytesLoader();
    const byteLen = bytes?.byteLength || 0;
    stageItems[1]?.classList.add('dn');
    setAnalyticsProgress(72, 'Считаем VMPC-INO и метрики…');

    const bundle = await processExcelData(bytes, name);
    setAnalyticsProgress(90, 'Синхронизируем дашборд…');

    if (replyUrl) {
      try {
        const resp = await fetch(replyUrl);
        currentAiComment = resp.ok ? await resp.text() : '';
      } catch {
        currentAiComment = '';
      }
    } else {
      currentAiComment = buildQuickSummaryFromMarginMap(bundle);
    }

    const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
    lastAnalyticsMeta = { bytes: byteLen, elapsedMs };

    if (bundle) {
      bundle.ai_comment = currentAiComment;
      setCurrentDataset(bundle, name);
      currentDatasetKey = String(sampleKey);
      if (sampleKey === 'user') {
        customDatasetCache = { bundle, name };
      }
      syncDatasetSelectOptions(name, currentDatasetKey);
      populateCategoryFilter(bundle);
      if (analyticsPersistDisk) {
        await saveAnalyticsToDisk({
          bundle,
          fileName: name,
          datasetKey: currentDatasetKey,
          isCustom: sampleKey === 'user',
          meta: lastAnalyticsMeta
        });
      }
    }

    stageItems[2]?.classList.add('dn');
    setAnalyticsProgress(100, 'Готово');

    const infoEl = $('#loaded-file-info');
    if (infoEl) {
      const sizePart = byteLen ? ` · ${formatBytes(byteLen)}` : '';
      infoEl.textContent = `${name}${sizePart} · расчёт за ${elapsedMs} мс`;
    }

    syncAnalyticsView();
    setTimeout(() => setStepState(A, 'd'), 180);
  } catch (err) {
    console.error('[Analytics] Wasm processing failed:', err);
    const errMsg = `Не удалось обработать «${name}»: ${err.message}. Проверьте, что названия столбцов совпадают с шаблоном .xlsx.`;
    setAnalyticsError(errMsg);
    toast(`Ошибка обработки: ${err.message}`);
    setStepState(A, 'i');
    syncAnalyticsView();
  }
}

function buildQuickSummaryFromMarginMap(bundle) {
  const itemsList = bundle?.marg_map?.items || [];
  if (!itemsList.length) return '';
  const top = itemsList.toSorted((a, b) => (b.sales_rub || 0) - (a.sales_rub || 0)).slice(0, 3);
  return `Топ-3 товара по объёму продаж (${bundle.marg_map.year} г.):\n` +
    top.map((it, idx) => `${idx + 1}. **${it.category} ${it.product}** — продажи ${Math.round((it.sales_rub || 0) / 1e6)} млн ₽, маржинальность ${(it.margin_pct || 0).toFixed(1)}% (${it.quadrant || ''}).`).join('\n');
}

function runSample(idx = 0) {
  const smp = SAMPLES[idx] || SAMPLES[0];
  return runAnalyticsJob(smp.name, () => fetchSampleAsUint8Array(smp.url), smp.reply, String(idx));
}

async function handleUserExcelFile(file) {
  const validationError = validateExcelFile(file);
  if (validationError) {
    setAnalyticsError(validationError);
    toast(validationError);
    return;
  }
  if (currentDatasetKey === 'user' && customDatasetCache) {
    const ok = await confirmDataAction({
      title: 'Заменить текущий загруженный файл?',
      description: `Сейчас загружен файл «${customDatasetCache.name}». Он будет заменён новым файлом «${file.name}».`,
      confirmLabel: 'Заменить'
    });
    if (!ok) {
      if ($('#fl')) $('#fl').value = '';
      return;
    }
  }
  runAnalyticsJob(file.name, () => readFileAsUint8Array(file), null, 'user');
}

$('#pick').addEventListener('click', () => $('#fl').click());
$('#fl').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleUserExcelFile(file);
});

$$('[data-ex]').forEach((b) => {
  b.addEventListener('click', async () => {
    const idx = Number(b.dataset.ex) || 0;
    if (currentDatasetKey === 'user' && customDatasetCache) {
      const smpLabel = SAMPLES[idx]?.label || `Пример ${idx + 1}`;
      const ok = await confirmDataAction({
        title: 'Перезаписать импортированный файл?',
        description: `Сейчас загружен ваш файл «${customDatasetCache.name}». При загрузке «${smpLabel}» текущие данные будут заменены.`,
        confirmLabel: 'Перезаписать'
      });
      if (!ok) return;
    }
    runSample(idx);
  });
});

$$('[data-an-storage]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-pressed') === 'true') return;
    setAnalyticsStorageMode(btn.dataset.anStorage === 'disk');
  });
});

$('#again').addEventListener('click', async () => {
  if (getCurrentDataset()) {
    const ok = await confirmDataAction({
      title: 'Загрузить другой файл?',
      description: 'Откроется зона выбора нового Excel-файла. Текущие данные останутся в дашборде до загрузки нового набора.',
      confirmLabel: 'Продолжить'
    });
    if (!ok) return;
  }
  $('#fl').value = '';
  setAnalyticsError('');
  setStepState(A, 'i');
});

$('#an-clear-data')?.addEventListener('click', async () => {
  const ok = await confirmDataAction({
    title: 'Удалить файл и рассчитанные данные?',
    description: analyticsPersistDisk
      ? 'Загруженный набор будет удалён из памяти сессии (RAM) и из IndexedDB браузера. Сводка и дашборд очистятся.'
      : 'Загруженный набор будет удалён из памяти сессии (RAM). Сводка и дашборд очистятся.',
    confirmLabel: 'Удалить',
    danger: true
  });
  if (!ok) return;
  await clearAnalyticsDataset();
});

// Truncated status pill popover on hover/focus
(() => {
  const pill = $('#an-active-pill');
  const pillTxt = $('#an-active-pill-text');
  const pop = $('#an-status-pop');
  if (!pill || !pillTxt || !pop) return;

  const hidePop = () => {
    try {
      if (pop.matches(':popover-open')) pop.hidePopover();
    } catch {
      pop.hidden = true;
    }
  };

  const showPop = () => {
    if (pillTxt.scrollWidth <= pillTxt.clientWidth + 1) return;
    pop.textContent = pillTxt.textContent || '';
    try {
      pop.showPopover();
    } catch {
      pop.hidden = false;
    }
    const rect = pill.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - popRect.width - 8, rect.right - popRect.width));
    const top = Math.max(8, rect.top - popRect.height - 8);
    pop.style.position = 'fixed';
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };

  pill.addEventListener('mouseenter', showPop);
  pill.addEventListener('mouseleave', hidePop);
  pill.addEventListener('focus', showPop);
  pill.addEventListener('blur', hidePop);
  window.addEventListener('scroll', hidePop, { passive: true });
})();

// Restore persisted analytics dataset from IndexedDB if Disk mode was enabled
if (analyticsPersistDisk) {
  loadAnalyticsFromDisk().then((saved) => {
    if (!saved?.bundle) {
      syncAnalyticsView();
      return;
    }
    setCurrentDataset(saved.bundle, saved.fileName || '');
    currentAiComment = saved.bundle.ai_comment || '';
    currentDatasetKey = String(saved.datasetKey || '0');
    if (saved.isCustom) {
      customDatasetCache = { bundle: saved.bundle, name: saved.fileName || 'Пользовательский файл' };
    }
    if (saved.meta) lastAnalyticsMeta = saved.meta;
    if (saved.aiInsights && typeof saved.aiInsights === 'object') {
      dashAiInsightCache.clear();
      Object.entries(saved.aiInsights).forEach(([k, v]) => {
        if (typeof v === 'string' && v) dashAiInsightCache.set(k, v);
      });
    }
    syncDatasetSelectOptions(saved.fileName || '', currentDatasetKey);
    populateCategoryFilter(saved.bundle);
    const infoEl = $('#loaded-file-info');
    if (infoEl && saved.fileName) {
      const sizePart = saved.meta?.bytes ? ` · ${formatBytes(saved.meta.bytes)}` : '';
      infoEl.textContent = `${saved.fileName}${sizePart} · восстановлено из IndexedDB`;
    }
    setStepState(A, 'd');
    syncAnalyticsView();
  });
} else {
  syncAnalyticsStorageToggle();
}

const dz = $('#dz');
dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', (e) => {
  if (!dz.contains(e.relatedTarget)) dz.classList.remove('over');
});
dz.addEventListener('drop', (e) => {
  e.preventDefault();
  dz.classList.remove('over');
  const file = e.dataTransfer?.files?.[0];
  handleUserExcelFile(file);
});

/* ==========================================================================
   Accessible Tabs System (with beforematch for hidden="until-found")
   ========================================================================== */
function setupTabs(list, onShow) {
  const bs = $$('[role="tab"]', list);
  const show = (j, shouldFocus = false) => {
    bs.forEach((b, k) => {
      const sel = k === j;
      b.setAttribute('aria-selected', String(sel));
      b.tabIndex = sel ? 0 : -1;
      b.toggleAttribute('focusgroupstart', sel);
    });
    onShow(j);
    if (shouldFocus) {
      bs[j].focus();
      bs[j].scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
    }
  };

  bs.forEach((b, k) => b.addEventListener('click', () => {
    show(k, false);
    b.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
  }));

  list.addEventListener('keydown', (e) => {
    const i = bs.indexOf(document.activeElement);
    const nextMap = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: bs.length - 1 };
    const n = nextMap[e.key];
    if (i < 0 || n === undefined) return;
    e.preventDefault();
    show((n + bs.length) % bs.length, true);
  });

  return show;
}

const dashPanels = $$('[data-tp]');
const showDashTab = setupTabs($('#tabs'), (j) => {
  dashPanels.forEach((p) => {
    if (+p.dataset.tp === j) {
      p.removeAttribute('hidden');
      p.tabIndex = 0;
    } else {
      p.setAttribute('hidden', 'until-found');
      p.removeAttribute('tabindex');
    }
  });
  hideWfTooltip();
  renderDashboardTab(j);
});

dashPanels.forEach((p) => {
  p.addEventListener('beforematch', () => {
    showDashTab(+p.dataset.tp, false);
  });
});

/* ==========================================================================
   BI Toolbar State, Dataset Switcher, Filtering & Export
   ========================================================================== */
const biDatasetTrigger = $('#bi-dataset-trigger');
const biDatasetLabel = $('#bi-dataset-label');
const biDatasetPop = $('#bi-dataset-pop');
const biDatasetList = $('#bi-dataset-list');
const biDatasetReasonTip = $('#bi-dataset-reason-tip');
const biYearBtn = $('#bi-year-btn');
const biYearCnt = $('#bi-year-cnt');
const biYearPop = $('#bi-year-pop');
const biYearList = $('#bi-year-list');
const biCatSel = $('#bi-cat');
const biCatBtn = $('#bi-cat-btn');
const biCatCnt = $('#bi-cat-cnt');
const biCatPop = $('#bi-cat-pop');
const biCatList = $('#bi-cat-list');
const biSkuBtn = $('#bi-sku-btn');
const biSkuCnt = $('#bi-sku-cnt');
const biSkuPop = $('#bi-sku-pop');
const biSkuList = $('#bi-sku-list');
const biSkuSearch = $('#bi-sku-search');
const biRevBgBtn = $('#bi-rev-bg');
const biLabelsBtn = $('#bi-labels-toggle');
const biQuadSel = $('#bi-quad-filter');
const biResetBtn = $('#bi-reset');
const biExportBtn = $('#bi-export-csv');

let currentYearFilter = 'all'; // 'all' or Set<number>
let currentCatFilter = 'all'; // 'all' or Set<string>
let currentSkuFilter = 'all'; // 'all' or Set<string>
let allAvailableYears = [];
let allAvailableCats = [];
let allAvailableSkus = [];
let currentScaleMode = 'auto';
let showRevenueBg = true;
let showChartLabels = true;
let currentCh2Metric = 'profit';
let currentQuadFilter = 'all';
let currentTsAgg = 'sku';
let currentTsView = 'both';
let currentSeasView = 'both';
let activeSavedDsName = '';

const DASH_REQUIRED_COL_GROUPS = [
  { label: 'Дата / период', test: (h) => /дат|date|period|период|месяц|month|год|year|недел|week/i.test(h) },
  { label: 'Категория / товар', test: (h) => /категор|category|товар|product|sku|номенклатур|наименован|артикул|исходн/i.test(h) },
  { label: 'Выручка / продажи', test: (h) => /выручк|продаж|revenue|sales|оборот|сумма/i.test(h) },
  { label: 'Себестоимость / прибыль', test: (h) => /себестоим|затрат|cost|cogs|прибыль|profit|марж|margin/i.test(h) },
  { label: 'Количество / шт', test: (h) => /колич|кол-во|объем|объём|qty|quantity|volume|шт|units/i.test(h) }
];

function validateSavedDatasetForDashboard(ds) {
  const matrix = Array.isArray(ds?.matrix) ? ds.matrix : [];
  const headerRow = matrix.length > 0 && Array.isArray(matrix[0])
    ? matrix[0].map((c) => String(c ?? '').trim())
    : (Array.isArray(ds?.headers) ? ds.headers.map((c) => String(c ?? '').trim()) : []);
  const rowCount = matrix.length > 1 ? matrix.length - 1 : Number(ds?.rowCount || 0);

  const missing = [];
  for (const grp of DASH_REQUIRED_COL_GROUPS) {
    if (!headerRow.some((h) => grp.test(h))) {
      missing.push(grp.label);
    }
  }
  if (rowCount <= 0) {
    return {
      compatible: false,
      missing,
      reason: 'Набор не содержит строк данных для расчёта дашборда VMPC-INO.'
    };
  }
  if (missing.length > 0) {
    return {
      compatible: false,
      missing,
      reason: `Невозможно построить дашборд VMPC-INO: отсутствуют обязательные столбцы — ${missing.join(', ')}. Для аналитики нужны дата/период, категория/товар, выручка, себестоимость/прибыль и количество.`
    };
  }
  return { compatible: true, missing: [], reason: '' };
}

function hideBiDatasetReasonTip() {
  if (!biDatasetReasonTip) return;
  try {
    if (biDatasetReasonTip.matches(':popover-open')) biDatasetReasonTip.hidePopover();
  } catch { /* ignore */ }
  biDatasetReasonTip.hidden = true;
}

function showBiDatasetReasonTip(anchorEl, reasonText) {
  if (!biDatasetReasonTip || !anchorEl || !reasonText) return;
  biDatasetReasonTip.textContent = reasonText;
  biDatasetReasonTip.hidden = false;
  try {
    if (!biDatasetReasonTip.matches(':popover-open')) biDatasetReasonTip.showPopover();
  } catch { /* ignore */ }
  const r = anchorEl.getBoundingClientRect();
  const tw = biDatasetReasonTip.offsetWidth || 280;
  const th = biDatasetReasonTip.offsetHeight || 72;
  const pad = 10;
  let left = r.right + 8;
  if (left + tw > window.innerWidth - pad) {
    left = Math.max(pad, r.left - tw - 8);
  }
  let top = r.top + (r.height - th) / 2;
  top = Math.max(pad, Math.min(top, window.innerHeight - th - pad));
  biDatasetReasonTip.style.left = `${Math.round(left)}px`;
  biDatasetReasonTip.style.top = `${Math.round(top)}px`;
}

function getActiveDatasetDisplayLabel(activeKey) {
  if (activeKey === 'user' && customDatasetCache) return `Файл: ${customDatasetCache.name}`;
  if (String(activeKey).startsWith('saved:')) {
    const id = String(activeKey).slice(6);
    const found = cachedSavedDatasets.find((d) => d.id === id);
    return found ? found.name : (activeSavedDsName || 'Сохранённый набор');
  }
  const idx = Number(activeKey);
  if (Number.isFinite(idx) && SAMPLES[idx]) return SAMPLES[idx].label;
  return SAMPLES[0].label;
}

function renderBiDatasetPopover() {
  if (!biDatasetList) return;
  const frag = document.createDocumentFragment();

  const addGroupLabel = (txt) => {
    const lbl = document.createElement('div');
    lbl.className = 'bi-ds-group-lbl';
    lbl.textContent = txt;
    frag.append(lbl);
  };

  const addItem = ({ key, title, meta = '', active = false, compat = true, reason = '' }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `bi-ds-item${active ? ' is-active' : ''}${!compat ? ' is-incompat' : ''}`;
    btn.dataset.dsKey = key;
    if (!compat) {
      btn.setAttribute('aria-disabled', 'true');
      btn.dataset.incompatReason = reason;
    }
    const nameSpan = document.createElement('span');
    nameSpan.className = 'bi-ds-name';
    nameSpan.textContent = title;
    btn.append(nameSpan);
    if (meta) {
      const metaSpan = document.createElement('span');
      metaSpan.className = 'bi-ds-meta';
      metaSpan.textContent = meta;
      btn.append(metaSpan);
    }
    frag.append(btn);
  };

  addGroupLabel('Встроенные примеры');
  SAMPLES.forEach((smp, i) => {
    addItem({
      key: String(i),
      title: smp.label,
      meta: 'Демо',
      active: currentDatasetKey === String(i)
    });
  });

  if (customDatasetCache) {
    addGroupLabel('Загруженный файл');
    addItem({
      key: 'user',
      title: customDatasetCache.name,
      meta: 'Excel',
      active: currentDatasetKey === 'user'
    });
  }

  if (Array.isArray(cachedSavedDatasets) && cachedSavedDatasets.length > 0) {
    addGroupLabel('Сохранённые из «Атрибутов»');
    cachedSavedDatasets.forEach((ds) => {
      const check = validateSavedDatasetForDashboard(ds);
      addItem({
        key: `saved:${ds.id}`,
        title: ds.name,
        meta: check.compatible ? `${ds.rowCount} стр.` : 'Несовместим',
        active: currentDatasetKey === `saved:${ds.id}`,
        compat: check.compatible,
        reason: check.reason
      });
    });
  }

  biDatasetList.replaceChildren(frag);
}

function syncDatasetSelectOptions(customName, activeKey) {
  if (biDatasetLabel) {
    biDatasetLabel.textContent = getActiveDatasetDisplayLabel(activeKey ?? currentDatasetKey);
  }
  renderBiDatasetPopover();
}

function getBundleYears(bundle) {
  const set = new Set();
  (bundle?.profit_bars?.years || []).forEach((y) => { if (Number.isFinite(Number(y))) set.add(Number(y)); });
  (bundle?.time_series?.series || []).forEach((s) => {
    (s.points || []).forEach((pt) => { if (Number.isFinite(Number(pt.year))) set.add(Number(pt.year)); });
  });
  if (bundle?.vmpc?.prev_year) set.add(Number(bundle.vmpc.prev_year));
  if (bundle?.vmpc?.curr_year) set.add(Number(bundle.vmpc.curr_year));
  return [...set].filter(Number.isFinite).sort((a, b) => a - b);
}

function matchesYearFilter(yr) {
  if (!currentYearFilter || currentYearFilter === 'all') return true;
  if (currentYearFilter instanceof Set) return currentYearFilter.has(Number(yr));
  return Number(yr) === Number(currentYearFilter);
}

function getBundleCategories(bundle) {
  const set = new Set();
  (bundle?.marg_map?.items || []).forEach((it) => { if (it.category) set.add(it.category); });
  (bundle?.profit_bars?.categories || []).forEach((c) => {
    if (c && c !== 'Другие') set.add(c);
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

function matchesCatFilter(cat) {
  if (!currentCatFilter || currentCatFilter === 'all') return true;
  if (currentCatFilter instanceof Set) return currentCatFilter.has(cat);
  return cat === currentCatFilter;
}

function matchesSkuFilter(skuKey) {
  if (!currentSkuFilter || currentSkuFilter === 'all') return true;
  if (currentSkuFilter instanceof Set) return currentSkuFilter.has(skuKey);
  return skuKey === currentSkuFilter;
}

function getBundleSkus(bundle) {
  const set = new Set();
  (bundle?.marg_map?.items || []).forEach((it) => {
    if (it.category && it.product) set.add(`${it.category}_${it.product}`);
  });
  (bundle?.time_series?.series || []).forEach((s) => {
    if (s.series_name) set.add(s.series_name);
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

function updateBiFilterBadges() {
  const yearClear = $('#bi-year-clear');
  const catClear = $('#bi-cat-clear');
  const skuClear = $('#bi-sku-clear');
  const quadClear = $('#bi-quad-clear');
  if (biYearCnt && biYearBtn) {
    const isAll = currentYearFilter === 'all';
    const cnt = isAll ? allAvailableYears.length : currentYearFilter.size;
    biYearCnt.textContent = isAll ? `Все (${allAvailableYears.length})` : `${cnt}/${allAvailableYears.length}`;
    biYearBtn.classList.toggle('is-filtered', !isAll);
    biYearBtn.closest('.bi-filter-wrap')?.classList.toggle('is-filtered', !isAll);
    if (yearClear) yearClear.hidden = isAll;
  }
  if (biCatCnt && biCatBtn) {
    const isAll = currentCatFilter === 'all';
    const cnt = isAll ? allAvailableCats.length : currentCatFilter.size;
    biCatCnt.textContent = isAll ? `Все (${allAvailableCats.length})` : `${cnt}/${allAvailableCats.length}`;
    biCatBtn.classList.toggle('is-filtered', !isAll);
    biCatBtn.closest('.bi-filter-wrap')?.classList.toggle('is-filtered', !isAll);
    if (catClear) catClear.hidden = isAll;
  }
  if (biSkuCnt && biSkuBtn) {
    const isAll = currentSkuFilter === 'all';
    const cnt = isAll ? allAvailableSkus.length : currentSkuFilter.size;
    biSkuCnt.textContent = isAll ? `Все (${allAvailableSkus.length})` : `${cnt}/${allAvailableSkus.length}`;
    biSkuBtn.classList.toggle('is-filtered', !isAll);
    biSkuBtn.closest('.bi-filter-wrap')?.classList.toggle('is-filtered', !isAll);
    if (skuClear) skuClear.hidden = isAll;
  }
  if (quadClear) {
    const isQuadFiltered = Boolean(currentQuadFilter && currentQuadFilter !== 'all');
    quadClear.hidden = !isQuadFiltered;
    quadClear.closest('.bi-filter-wrap')?.classList.toggle('is-filtered', isQuadFiltered);
  }
}

function renderBiYearPopover() {
  if (!biYearList) return;
  setSafeHtml(biYearList, allAvailableYears.map((yr) => {
    const checked = matchesYearFilter(yr) ? 'checked' : '';
    return `<label class="bi-pop-item"><input type="checkbox" value="${yr}" ${checked}><span>${yr} г.</span></label>`;
  }).join(''));
  $$('input[type="checkbox"]', biYearList).forEach((cb) => {
    cb.addEventListener('change', () => {
      const next = currentYearFilter === 'all' ? new Set(allAvailableYears) : new Set(currentYearFilter);
      const num = Number(cb.value);
      if (cb.checked) next.add(num);
      else next.delete(num);
      currentYearFilter = next.size === allAvailableYears.length ? 'all' : next;
      updateBiFilterBadges();
      closeDrillCards();
      renderDashboardAll(true);
    });
  });
}

function renderBiCatPopover() {
  if (!biCatList) return;
  setSafeHtml(biCatList, allAvailableCats.map((c) => {
    const checked = matchesCatFilter(c);
    return `<label class="bi-pop-item"><input type="checkbox" value="${esc(c)}"${checked ? ' checked' : ''}><span>${esc(c)}</span></label>`;
  }).join(''));
  $$('input[type="checkbox"]', biCatList).forEach((cb) => {
    cb.addEventListener('change', () => {
      const checkedVals = $$('input[type="checkbox"]:checked', biCatList).map((x) => x.value);
      currentCatFilter = checkedVals.length === allAvailableCats.length ? 'all' : new Set(checkedVals);
      updateBiFilterBadges();
      closeDrillCards();
      renderDashboardAll(true);
    });
  });
}

function renderBiSkuPopover(query = '') {
  if (!biSkuList) return;
  const q = String(query || '').trim().toLowerCase();
  const visible = allAvailableSkus.filter((s) => !q || s.toLowerCase().includes(q));
  setSafeHtml(biSkuList, visible.map((s) => {
    const checked = matchesSkuFilter(s);
    const label = s.replace('_', ' · ');
    return `<label class="bi-pop-item"><input type="checkbox" value="${esc(s)}"${checked ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  }).join(''));
  $$('input[type="checkbox"]', biSkuList).forEach((cb) => {
    cb.addEventListener('change', () => {
      const next = currentSkuFilter === 'all' ? new Set(allAvailableSkus) : new Set(currentSkuFilter);
      if (cb.checked) next.add(cb.value);
      else next.delete(cb.value);
      currentSkuFilter = next.size === allAvailableSkus.length ? 'all' : next;
      updateBiFilterBadges();
      closeDrillCards();
      renderDashboardAll(true);
    });
  });
}

function populateCategoryFilter(bundle) {
  allAvailableYears = getBundleYears(bundle);
  allAvailableCats = getBundleCategories(bundle);
  allAvailableSkus = getBundleSkus(bundle);
  if (currentYearFilter instanceof Set) {
    const valid = new Set([...currentYearFilter].filter((y) => allAvailableYears.includes(y)));
    currentYearFilter = valid.size === allAvailableYears.length || valid.size === 0 ? 'all' : valid;
  }
  if (currentCatFilter instanceof Set) {
    const valid = new Set([...currentCatFilter].filter((c) => allAvailableCats.includes(c)));
    currentCatFilter = valid.size === allAvailableCats.length || valid.size === 0 ? 'all' : valid;
  }
  if (currentSkuFilter instanceof Set) {
    const valid = new Set([...currentSkuFilter].filter((s) => allAvailableSkus.includes(s)));
    currentSkuFilter = valid.size === allAvailableSkus.length || valid.size === 0 ? 'all' : valid;
  }
  renderBiYearPopover();
  renderBiCatPopover();
  renderBiSkuPopover(biSkuSearch?.value || '');
  updateBiFilterBadges();
}

let activeElastHelpTrigger = $('#elast-help-btn');
document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('[popovertarget="elast-help-pop"]');
  if (btn) activeElastHelpTrigger = btn;
}, true);

function bindPopoverPosition(triggerOrGetter, popEl) {
  if (!triggerOrGetter || !popEl) return;
  popEl.addEventListener('beforetoggle', (e) => {
    if (e.newState !== 'open') return;
    // Use native CSS Anchor Positioning when supported; JS positioning acts only as fallback
    if (CSS.supports('position-area', 'block-end')) return;
    const triggerBtn = typeof triggerOrGetter === 'function' ? triggerOrGetter() : triggerOrGetter;
    if (!triggerBtn) return;
    const r = triggerBtn.getBoundingClientRect();
    const popW = popEl.classList.contains('bi-help-pop-wide') ? Math.min(460, window.innerWidth - 16) : 340;
    const left = Math.max(8, Math.min(window.innerWidth - popW - 8, r.left));
    const top = Math.min(window.innerHeight - 280, r.bottom + 6);
    popEl.style.position = 'fixed';
    popEl.style.left = `${left}px`;
    popEl.style.top = `${Math.max(8, top)}px`;
  });
}

bindPopoverPosition(biYearBtn, biYearPop);
bindPopoverPosition(biCatBtn, biCatPop);
bindPopoverPosition(biSkuBtn, biSkuPop);
bindPopoverPosition($('#seas-help-btn'), $('#seas-help-pop'));
bindPopoverPosition(() => activeElastHelpTrigger || $('#elast-help-btn'), $('#elast-help-pop'));

$('#bi-year-all')?.addEventListener('click', () => {
  currentYearFilter = 'all';
  renderBiYearPopover();
  updateBiFilterBadges();
  closeDrillCards();
  renderDashboardAll(true);
});

$('#bi-year-none')?.addEventListener('click', () => {
  currentYearFilter = new Set();
  renderBiYearPopover();
  updateBiFilterBadges();
  closeDrillCards();
  renderDashboardAll(true);
});

$('#bi-year-clear')?.addEventListener('click', () => {
  currentYearFilter = 'all';
  renderBiYearPopover();
  updateBiFilterBadges();
  closeDrillCards();
  renderDashboardAll(true);
});

$('#bi-cat-clear')?.addEventListener('click', () => {
  currentCatFilter = 'all';
  renderBiCatPopover();
  renderBiSkuPopover(biSkuSearch?.value || '');
  updateBiFilterBadges();
  closeDrillCards();
  renderDashboardAll(true);
});

$('#bi-sku-clear')?.addEventListener('click', () => {
  currentSkuFilter = 'all';
  renderBiSkuPopover(biSkuSearch?.value || '');
  updateBiFilterBadges();
  closeDrillCards();
  renderDashboardAll(true);
});

$('#bi-quad-clear')?.addEventListener('click', () => {
  currentQuadFilter = 'all';
  if (biQuadSel) biQuadSel.value = 'all';
  updateBiFilterBadges();
  renderDashboardTab(1);
});

$('#bi-cat-all')?.addEventListener('click', () => {
  currentCatFilter = 'all';
  renderBiCatPopover();
  updateBiFilterBadges();
  renderDashboardAll(true);
});

$('#bi-cat-none')?.addEventListener('click', () => {
  currentCatFilter = new Set();
  renderBiCatPopover();
  updateBiFilterBadges();
  renderDashboardAll(true);
});

$('#bi-sku-all')?.addEventListener('click', () => {
  currentSkuFilter = 'all';
  renderBiSkuPopover(biSkuSearch?.value || '');
  updateBiFilterBadges();
  renderDashboardAll(true);
});

$('#bi-sku-none')?.addEventListener('click', () => {
  currentSkuFilter = new Set();
  renderBiSkuPopover(biSkuSearch?.value || '');
  updateBiFilterBadges();
  renderDashboardAll(true);
});

biSkuSearch?.addEventListener('input', () => renderBiSkuPopover(biSkuSearch.value));

async function switchDashboardDataset(key) {
  hideWfTooltip();
  closeDrillCards();

  if (key === 'user' && customDatasetCache) {
    setCurrentDataset(customDatasetCache.bundle, customDatasetCache.name);
    currentAiComment = customDatasetCache.bundle.ai_comment || '';
    currentDatasetKey = 'user';
    syncDatasetSelectOptions(customDatasetCache.name, currentDatasetKey);
    populateCategoryFilter(customDatasetCache.bundle);
    syncAnalyticsView();
    renderDashboardAll(true);
    toast(`Загружен файл: ${customDatasetCache.name}`);
    return;
  }

  if (String(key).startsWith('saved:')) {
    const dsId = String(key).slice(6);
    const ds = cachedSavedDatasets.find((d) => d.id === dsId);
    if (!ds) {
      toast('Сохранённый датасет не найден');
      return;
    }
    const check = validateSavedDatasetForDashboard(ds);
    if (!check.compatible) {
      toast(check.reason);
      return;
    }
    if (biDatasetTrigger) biDatasetTrigger.disabled = true;
    try {
      await initWasmEngine();
      const { buildXlsxBytes } = await import('./xlsx_export.js?v=3.48.0');
      const bytes = buildXlsxBytes(ds.matrix, 'Данные');
      const bundle = await processExcelData(bytes, ds.name);
      currentAiComment = buildQuickSummaryFromMarginMap(bundle);
      bundle.ai_comment = currentAiComment;
      setCurrentDataset(bundle, ds.name);
      currentDatasetKey = `saved:${ds.id}`;
      activeSavedDsName = ds.name;
      syncDatasetSelectOptions(ds.name, currentDatasetKey);
      populateCategoryFilter(bundle);
      syncAnalyticsView();
      renderDashboardAll(true);
      toast(`Загружен набор из «Атрибутов»: ${ds.name}`);
    } catch (err) {
      console.warn('[BI] Failed loading saved attribute dataset:', err);
      toast(`Не удалось построить дашборд из набора: ${err.message}`);
    } finally {
      if (biDatasetTrigger) biDatasetTrigger.disabled = false;
    }
    return;
  }

  const idx = Math.max(0, Math.min(SAMPLES.length - 1, Number(key) || 0));
  const smp = SAMPLES[idx];
  if (biDatasetTrigger) biDatasetTrigger.disabled = true;

  try {
    await initWasmEngine();
    const bytes = await fetchSampleAsUint8Array(smp.url);
    const bundle = await processExcelData(bytes, smp.name);
    let reply = '';
    try {
      const resp = await fetch(smp.reply);
      if (resp.ok) reply = await resp.text();
    } catch { /* ignore */ }
    currentAiComment = reply;
    bundle.ai_comment = reply;
    setCurrentDataset(bundle, smp.name);
    currentDatasetKey = String(idx);
    syncDatasetSelectOptions(smp.name, currentDatasetKey);
    populateCategoryFilter(bundle);
    syncAnalyticsView();
    renderDashboardAll(true);
    toast(`Набор переключён: ${smp.name}`);
  } catch (err) {
    console.warn('[BI] Failed switching dataset:', err);
    toast(`Ошибка переключения: ${err.message}`);
  } finally {
    if (biDatasetTrigger) biDatasetTrigger.disabled = false;
  }
}

if (biDatasetPop && biDatasetList) {
  biDatasetPop.addEventListener('toggle', (e) => {
    if (e.newState === 'open') {
      renderBiDatasetPopover();
    } else {
      hideBiDatasetReasonTip();
    }
  });
  biDatasetList.addEventListener('click', (e) => {
    const item = e.target.closest('.bi-ds-item');
    if (!item) return;
    if (item.getAttribute('aria-disabled') === 'true' || item.classList.contains('is-incompat')) {
      showBiDatasetReasonTip(item, item.dataset.incompatReason || '');
      return;
    }
    const key = item.dataset.dsKey;
    hideBiDatasetReasonTip();
    try {
      if (biDatasetPop.matches(':popover-open')) biDatasetPop.hidePopover();
    } catch {
      biDatasetPop.classList.remove(':popover-open');
    }
    if (key != null) switchDashboardDataset(key);
  });
  biDatasetList.addEventListener('pointerover', (e) => {
    const item = e.target.closest('.bi-ds-item.is-incompat');
    if (item && item.dataset.incompatReason) {
      showBiDatasetReasonTip(item, item.dataset.incompatReason);
    } else {
      hideBiDatasetReasonTip();
    }
  });
  biDatasetList.addEventListener('pointerleave', hideBiDatasetReasonTip);
  biDatasetList.addEventListener('focusin', (e) => {
    const item = e.target.closest('.bi-ds-item.is-incompat');
    if (item && item.dataset.incompatReason) {
      showBiDatasetReasonTip(item, item.dataset.incompatReason);
    } else {
      hideBiDatasetReasonTip();
    }
  });
  biDatasetList.addEventListener('focusout', hideBiDatasetReasonTip);
}

const biScaleSeg = $('[data-bi-scale]')?.closest('.seg, [role="group"]');
if (biScaleSeg) {
  biScaleSeg.addEventListener('click', () => {
    currentScaleMode = currentScaleMode === 'auto' ? 'rub' : 'auto';
    $$('[data-bi-scale]', biScaleSeg).forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.biScale === currentScaleMode));
    });
    renderDashboardAll(false);
  });
}

if (biRevBgBtn) {
  biRevBgBtn.addEventListener('click', () => {
    showRevenueBg = !showRevenueBg;
    biRevBgBtn.setAttribute('aria-pressed', String(showRevenueBg));
    renderDashboardAll(false);
  });
}

if (biLabelsBtn) {
  biLabelsBtn.addEventListener('click', () => {
    showChartLabels = !showChartLabels;
    biLabelsBtn.setAttribute('aria-pressed', String(showChartLabels));
    renderDashboardAll(false);
  });
}

$$('[data-ch2-metric]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.ch2Metric === 'revenue' ? 'revenue' : 'profit';
    if (next === currentCh2Metric) return;
    currentCh2Metric = next;
    $$('[data-ch2-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ch2Metric === next)));
    renderDashboardTab(0);
  });
});

if (biQuadSel) {
  biQuadSel.addEventListener('change', (e) => {
    currentQuadFilter = e.target.value || 'all';
    updateBiFilterBadges();
    renderDashboardTab(1);
  });
}

$$('[data-ts-agg]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.tsAgg === 'cat' ? 'cat' : 'sku';
    if (next === currentTsAgg) return;
    currentTsAgg = next;
    $$('[data-ts-agg]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tsAgg === next)));
    renderDashboardTab(1);
  });
});

$$('[data-ts-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.tsView || 'both';
    if (next === currentTsView) return;
    currentTsView = next;
    $$('[data-ts-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tsView === next)));
    renderDashboardTab(1);
  });
});

$$('[data-seas-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.seasView || 'both';
    if (next === currentSeasView) return;
    currentSeasView = next;
    $$('[data-seas-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.seasView === next)));
    renderDashboardTab(2);
  });
});

if (biResetBtn) {
  biResetBtn.addEventListener('click', () => {
    currentYearFilter = 'all';
    currentCatFilter = 'all';
    currentSkuFilter = 'all';
    currentScaleMode = 'auto';
    showRevenueBg = true;
    showChartLabels = true;
    currentCh2Metric = 'profit';
    currentQuadFilter = 'all';
    currentTsAgg = 'sku';
    currentTsView = 'both';
    currentSeasView = 'both';
    if (biSkuSearch) biSkuSearch.value = '';
    if (biRevBgBtn) biRevBgBtn.setAttribute('aria-pressed', 'true');
    if (biLabelsBtn) biLabelsBtn.setAttribute('aria-pressed', 'true');
    if (biQuadSel) biQuadSel.value = 'all';
    $$('[data-bi-scale]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.biScale === 'auto')));
    $$('[data-ch2-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ch2Metric === 'profit')));
    $$('[data-ts-agg]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tsAgg === 'sku')));
    $$('[data-ts-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tsView === 'both')));
    $$('[data-seas-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.seasView === 'both')));
    renderBiYearPopover();
    renderBiCatPopover();
    renderBiSkuPopover('');
    updateBiFilterBadges();
    closeDrillCards();
    hideWfTooltip();
    renderDashboardAll(true);
    toast('Фильтры BI сброшены');
  });
}

function csvCell(val) {
  const s = String(val ?? '');
  const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s.replace(',', '.'))) ? `'${s}` : s;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

if (biExportBtn) {
  biExportBtn.addEventListener('click', () => {
    const bundle = getCurrentDataset();
    if (!bundle) {
      toast('Нет данных для экспорта');
      return;
    }
    // Optional quadrant filter match set (from marg_map)
    const quadAliases = {
      'Топ товары': new Set(['Топ товары', 'top_right']),
      'Рассмотреть пути повышения маржинальности': new Set(['Рассмотреть пути повышения маржинальности', 'top_left']),
      'Рассмотреть пути повышения продаж': new Set(['Рассмотреть пути повышения продаж', 'bottom_right']),
      'Отстающие товары': new Set(['Отстающие товары', 'bottom_left'])
    };
    const allowedByQuad = (currentQuadFilter && currentQuadFilter !== 'all')
      ? new Set(
          (bundle.marg_map?.items || [])
            .filter((it) => it.quadrant === currentQuadFilter || quadAliases[currentQuadFilter]?.has(it.quadrant))
            .map((it) => `${it.category}_${it.product}`)
        )
      : null;

    const tsSeries = bundle.time_series?.series || [];
    const rows = [];
    for (const s of tsSeries) {
      const cat = s.category || String(s.series_name || '').split('_')[0] || '';
      const prod = s.product || String(s.series_name || '').split('_').slice(1).join('_') || '';
      const skuKey = s.series_name || `${cat}_${prod}`;
      if (!matchesCatFilter(cat) || !matchesSkuFilter(skuKey)) continue;
      if (allowedByQuad && !allowedByQuad.has(`${cat}_${prod}`) && !allowedByQuad.has(skuKey)) continue;
      for (const pt of (s.points || [])) {
        if (!Number.isFinite(pt.sales_rub) || !matchesYearFilter(pt.year)) continue;
        const sales = Math.round(pt.sales_rub);
        const hasMarg = Number.isFinite(pt.margin_pct);
        const profit = hasMarg ? Math.round(pt.sales_rub * (pt.margin_pct / 100)) : '';
        const costs = hasMarg ? (sales - profit) : '';
        const margRu = hasMarg ? pt.margin_pct.toFixed(1).replace('.', ',') : '';
        rows.push({
          year: pt.year || 0,
          month: pt.month || 0,
          cells: [pt.year || '', pt.month || '', pt.date_text || '', cat, prod, sales, costs, profit, margRu]
        });
      }
    }

    rows.sort((a, b) => a.year - b.year || a.month - b.month || String(a.cells[3]).localeCompare(String(b.cells[3]), 'ru') || String(a.cells[4]).localeCompare(String(b.cells[4]), 'ru'));

    if (!rows.length) {
      toast('По выбранным фильтрам нет строк для выгрузки');
      return;
    }

    const header = ['Год', 'Месяц', 'Период', 'Категория', 'Товар (SKU)', 'Выручка (₽)', 'Затраты (₽)', 'Прибыль (₽)', 'Маржа (%)'].map(csvCell).join(';');
    const lines = [header, ...rows.map((r) => r.cells.map(csvCell).join(';'))];
    const baseName = String(getCurrentFileName() || 'sparkle_dataset').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, '_');
    const outName = `${baseName}_filtered.csv`;
    downloadBlob('\uFEFF' + lines.join('\r\n'), outName, 'text/csv;charset=utf-8');
    toast(`Скачан датасет (${rows.length} строк): ${outName}`);
  });
}

/* ==========================================================================
   Interactive SVG Waterfall Renderer, Hover Tooltip & Drill-Down Cards
   ========================================================================== */
const fmtN = (v) => Math.round(v).toLocaleString('ru-RU');
const niceStep = (x) => {
  if (!x || !Number.isFinite(x)) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

function formatCompactVal(v, mode = 'auto') {
  if (mode === 'rub') {
    return `${fmtN(v)}`;
  }
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)}k`;
  return `${Math.round(v)}`;
}

function buildWaterfallGeometry(rawItems) {
  let run = 0;
  const steps = rawItems.map((it) => {
    const isTotal = it.measure === 'absolute' || Boolean(it.total);
    if (isTotal) {
      run = it.value;
      return { label: it.label, v: it.value, s: 0, e: it.value, t: 'total' };
    }
    const st = run;
    run += it.value;
    return { label: it.label, v: it.value, s: st, e: run, t: it.value >= 0 ? 'up' : 'down' };
  });

  const minVal = Math.min(0, ...steps.map((x) => Math.min(x.s, x.e)));
  const maxVal = Math.max(0, ...steps.map((x) => Math.max(x.s, x.e)));
  const span = (maxVal - minVal) || 1;
  const step = niceStep(span / 5);
  const bot = Math.floor(minVal / step) * step;
  const top = Math.ceil(maxVal / step) * step;
  return { steps, step, bot, top };
}

const wfTip = $('#wf-tip');
const wfDrill = $('#wf-drill');
const skuDrill = $('#sku-drill');
let activeWfSelection = null;

function positionTooltip(clientX, clientY) {
  if (!wfTip || wfTip.hidden) return;
  const pad = 12;
  const w = wfTip.offsetWidth || 220;
  const h = wfTip.offsetHeight || 80;
  let left = clientX + 14;
  let top = clientY - h - 10;
  if (left + w + pad > window.innerWidth) left = Math.max(pad, clientX - w - 14);
  if (top < pad) top = clientY + 18;
  if (top + h + pad > window.innerHeight) top = Math.max(pad, window.innerHeight - h - pad);
  wfTip.style.left = `${left}px`;
  wfTip.style.top = `${top}px`;
}

function showWfTooltip(step, baseProfit, eventOrEl) {
  if (!wfTip) return;
  const pct = baseProfit ? ((step.v / Math.abs(baseProfit)) * 100) : 0;
  const sign = step.t !== 'total' && step.v > 0 ? '+' : '';
  const typeLabel = step.t === 'total' ? (step.metricLabel || 'Итоговое значение') : 'Изменение';
  let extra = '';
  if (step.t === 'total' && Number.isFinite(step.revBg) && step.revBg > 0) {
    const marginPct = (step.v / step.revBg) * 100;
    const costsVal = step.revBg - step.v;
    extra += `<div class="wf-tip-row">Выручка: ${formatKpiRub(step.revBg)}</div>`;
    extra += `<div class="wf-tip-row">Затраты: ${formatKpiRub(costsVal)} · Маржа: ${marginPct.toFixed(1)}%</div>`;
  } else if (step.t !== 'total') {
    extra += `<div class="wf-tip-row">Вклад к прошлому году: ${sign}${pct.toFixed(1)}%</div>`;
  }
  if (Array.isArray(step.segments) && step.segments.length) {
    extra += step.segments.slice(0, 4).map((seg) =>
      `<div class="wf-tip-row">• ${esc(seg.category)}: ${formatKpiRub(seg.value)}</div>`
    ).join('');
  }
  setSafeHtml(wfTip, `<div class="wf-tip-title">${esc(step.label)}</div>` +
    `<div class="wf-tip-val">${typeLabel}: ${sign}${formatKpiRub(step.v)}</div>` +
    extra +
    `<div class="wf-tip-hint">Клик для детализации</div>`);
  wfTip.hidden = false;

  if (eventOrEl && 'clientX' in eventOrEl && eventOrEl.clientX > 0) {
    positionTooltip(eventOrEl.clientX, eventOrEl.clientY);
  } else if (eventOrEl && typeof eventOrEl.getBoundingClientRect === 'function') {
    const r = eventOrEl.getBoundingClientRect();
    positionTooltip(r.left + r.width / 2, r.top);
  }
}

function hideWfTooltip() {
  if (wfTip) wfTip.hidden = true;
}

function bindFullTooltips(root) {
  if (!root) return;
  $$('[data-full]', root).forEach((el) => {
    if (el.dataset.tipBound) return;
    el.dataset.tipBound = '1';
    const full = el.dataset.full || el.textContent || '';
    el.addEventListener('pointerenter', (e) => showTextTooltip(full, e));
    el.addEventListener('pointermove', (e) => positionTooltip(e.clientX, e.clientY));
    el.addEventListener('pointerleave', hideWfTooltip);
    el.addEventListener('focus', () => showTextTooltip(full, el));
    el.addEventListener('blur', hideWfTooltip);
  });
}

function initPopoverFallback() {
  if (Object.hasOwn(HTMLElement.prototype, 'popover')) return;
  const pop = $('#rgm-help-pop');
  if (!pop) return;
  $$('[popovertarget="rgm-help-pop"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('popovertargetaction');
      const open = action === 'hide' ? false : !pop.classList.contains(':popover-open');
      pop.classList.toggle(':popover-open', open);
    });
  });
}

function showTextTooltip(text, eventOrEl) {
  if (!wfTip || !text) return;
  wfTip.textContent = text;
  wfTip.hidden = false;
  if (eventOrEl && 'clientX' in eventOrEl && eventOrEl.clientX > 0) {
    positionTooltip(eventOrEl.clientX, eventOrEl.clientY);
  } else if (eventOrEl && typeof eventOrEl.getBoundingClientRect === 'function') {
    const r = eventOrEl.getBoundingClientRect();
    positionTooltip(r.left + Math.min(40, r.width / 2), r.top);
  }
}

function syncDrillOverlayLeft() {
  const sb = $('.sb');
  const rect = sb ? sb.getBoundingClientRect() : null;
  const leftPx = (rect && rect.width > 0 && rect.left >= -2 && window.innerWidth > 860)
    ? Math.max(0, Math.round(rect.right))
    : 0;
  [wfDrill, skuDrill].forEach((el) => {
    if (el) el.style.setProperty('--drill-left', `${leftPx}px`);
  });
}

function closeDrillCards() {
  if (wfDrill) wfDrill.hidden = true;
  if (skuDrill) skuDrill.hidden = true;
  $$('.wf-bar[aria-pressed="true"]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
  activeWfSelection = null;
}

[wfDrill, skuDrill].forEach((overlay) => {
  overlay?.addEventListener('click', (e) => {
    if (e.target?.closest?.('[popovertarget]')) {
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    closeDrillCards();
  });
});

window.addEventListener('resize', syncDrillOverlayLeft);
window.addEventListener('hashchange', closeDrillCards);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ((wfDrill && !wfDrill.hidden) || (skuDrill && !skuDrill.hidden))) {
    closeDrillCards();
  }
});

$('#wf-drill-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeDrillCards();
});

$('#sku-drill-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeDrillCards();
});

function openWfDrillDown(chartId, stepIdx, step, baseProfit) {
  const bundle = getCurrentDataset();
  if (!bundle || !wfDrill) return;

  // Clear previous active states
  $$('.wf-bar[aria-pressed="true"]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
  const clickedBar = $(`#${chartId} .wf-bar[data-idx="${stepIdx}"]`);
  if (clickedBar) clickedBar.setAttribute('aria-pressed', 'true');
  activeWfSelection = `${chartId}:${stepIdx}`;

  const titleEl = $('#wf-drill-title');
  const bodyEl = $('#wf-drill-body');
  const mmItems = (bundle.marg_map?.items || []).filter(
    (it) => matchesCatFilter(it.category) && matchesSkuFilter(`${it.category}_${it.product}`)
  );

  if (chartId === 'ch1') {
    const pct = baseProfit ? ((step.v / Math.abs(baseProfit)) * 100) : 0;
    const diffPct = baseProfit ? (((step.v - baseProfit) / Math.abs(baseProfit)) * 100) : 0;
    const sign = step.t !== 'total' && step.v > 0 ? '+' : '';
    const diffSign = diffPct > 0 ? '+' : '';
    if (titleEl) titleEl.textContent = `Углублённый разбор фактора: «${step.label}»`;

    const sortedSkus = mmItems.toSorted((a, b) => {
      if (step.label.includes('Затрат')) return (b.costs_rub || 0) - (a.costs_rub || 0);
      if (step.label.includes('Цена') || step.label.includes('Марж')) return (b.margin_pct || 0) - (a.margin_pct || 0);
      return (b.sales_rub || 0) - (a.sales_rub || 0);
    }).slice(0, 5);

    const prevYr = bundle.vmpc?.prev_year;
    const currYr = bundle.vmpc?.curr_year;
    const currProfit = Number.isFinite(bundle.vmpc?.curr_profit) ? bundle.vmpc.curr_profit : step.e;
    const verb = step.v >= 0 ? 'увеличил' : 'снизил';
    const summaryHtml = step.t === 'total'
      ? `Прибыль компании (${esc(step.label)}): <b>${formatKpiRub(step.v)}</b>${stepIdx > 0 ? ` (${diffSign}${diffPct.toFixed(1)}% к ${prevYr || 'прошлому'} г.: ${formatKpiRub(baseProfit)})` : ''}.`
      : `Фактор «${esc(step.label)}» ${verb} прибыль ${currYr ? `${currYr} г. ` : ''}на <b>${formatKpiRub(Math.abs(step.v))}</b> (${sign}${pct.toFixed(1)}% к ${prevYr || 'прошлому'} г.). Общая прибыль компании: <b>${formatKpiRub(baseProfit)}</b> (${prevYr || ''} г.) → <b>${formatKpiRub(currProfit)}</b> (${currYr || ''} г.).`;

    setSafeHtml(bodyEl, `
      <p style="margin:0 0 10px;font-size:0.84375rem">${summaryHtml}</p>
      ${sortedSkus.length ? `
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">Категория</th>
              <th scope="col">Товар (SKU)</th>
              <th scope="col">Выручка</th>
              <th scope="col">Затраты</th>
              <th scope="col">Маржа</th>
              <th scope="col">Статус матрицы</th>
            </tr>
          </thead>
          <tbody>
            ${sortedSkus.map((it) => `
              <tr>
                <td>${esc(it.category)}</td>
                <td><b>${esc(it.product)}</b></td>
                <td>${formatKpiRub(it.sales_rub)}</td>
                <td>${formatKpiRub(it.costs_rub)}</td>
                <td>${(it.margin_pct || 0).toFixed(1)}%</td>
                <td>${esc(it.quadrant || '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="hint" style="margin:0">Для выбранного фильтра товарных строк нет.</p>'}`);
  } else {
    // ch2: Profit / Revenue by categories & years
    const pb = bundle.profit_bars;
    const rawCatPart = String(step.label).split('_')[0];
    const isOtherBlock = step.t !== 'total' && rawCatPart === 'Другие';
    const explicitCats = new Set(
      (pb?.category_bars || []).map((cb) => cb.category).filter((c) => c && c !== 'Другие')
    );

    if (titleEl) {
      titleEl.textContent = isOtherBlock
        ? `Детализация «Другие категории»: ${step.label}`
        : `Детализация прибыли: «${step.label}»`;
    }

    const years = pb?.years || [];
    const yearIndices = years.map((y) => (pb?.x_labels || []).indexOf(String(y)));

    // Build category rows strictly matching the clicked block
    let catRows = [];
    if (isOtherBlock) {
      // Expand actual "Other" categories (к3..кN) from time_series so user sees real underlying categories!
      const otherByCatYear = new Map();
      for (const s of (bundle.time_series?.series || [])) {
        const cat = s.category || String(s.series_name || '').split('_')[0];
        if (!cat || explicitCats.has(cat) || !matchesCatFilter(cat)) continue;
        if (!otherByCatYear.has(cat)) otherByCatYear.set(cat, new Map());
        const ym = otherByCatYear.get(cat);
        for (const pt of (s.points || [])) {
          if (!Number.isFinite(pt.sales_rub) || !Number.isFinite(pt.margin_pct)) continue;
          const prof = pt.sales_rub * (pt.margin_pct / 100);
          ym.set(pt.year, (ym.get(pt.year) || 0) + prof);
        }
      }
      catRows = [...otherByCatYear.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')).map(([cat, ym]) => ({
        category: cat,
        vals: years.map((y) => (ym.has(y) ? ym.get(y) : null))
      }));
      if (!catRows.length) {
        const otherCb = (pb?.category_bars || []).find((cb) => cb.category === 'Другие');
        if (otherCb) {
          catRows = [{ category: 'Другие', vals: yearIndices.map((xi) => (xi >= 0 ? otherCb.values?.[xi] : null)) }];
        }
      }
    } else {
      const matchingCats = (pb?.category_bars || []).filter((cb) => {
        if (step.t !== 'total' && rawCatPart) return cb.category === rawCatPart;
        if (currentCatFilter !== 'all') return matchesCatFilter(cb.category);
        return true;
      });
      catRows = matchingCats.map((cb) => ({
        category: cb.category,
        vals: yearIndices.map((xi) => (xi >= 0 ? cb.values?.[xi] : null))
      }));
    }

    const catFilteredSkus = mmItems.filter((it) => {
      if (step.t === 'total') return true;
      if (isOtherBlock) return !explicitCats.has(it.category);
      return it.category === rawCatPart;
    }).sort((a, b) => (b.sales_rub - b.costs_rub) - (a.sales_rub - a.costs_rub)).slice(0, 8);

    const isRevMode = currentCh2Metric === 'revenue';
    const metricGen = isRevMode ? 'выручка' : 'прибыль';
    const metricNom = isRevMode ? 'Общая выручка' : 'Общая прибыль';
    const yrMatch = String(step.label).match(/(20\d{2})/);
    const stepYr = yrMatch ? Number(yrMatch[1]) : null;
    const yrIdx = stepYr != null ? years.indexOf(stepYr) : -1;
    const prevYr = yrIdx > 0 ? years[yrIdx - 1] : null;
    const getYearTotal = (yr) => {
      if (yr == null) return null;
      if (isRevMode) {
        const revMap = computeYearlyRevenueMap(bundle, currentCatFilter).byYear;
        return revMap.has(String(yr)) ? revMap.get(String(yr)) : null;
      }
      const xIdx = (pb?.x_labels || []).indexOf(String(yr));
      return xIdx >= 0 ? pb?.waterfall_totals?.[xIdx] : null;
    };
    const currYrTotal = getYearTotal(stepYr);
    const prevYrTotal = getYearTotal(prevYr);
    const dirVerb = step.v >= 0 ? 'выросла на' : 'снизилась на';
    const catPhrase = isOtherBlock ? 'группы «Другие категории»' : `категории «${esc(rawCatPart)}»`;
    const companyContext = (currYrTotal != null && prevYrTotal != null)
      ? ` ${metricNom} компании: <b>${formatKpiRub(prevYrTotal)}</b> (${prevYr} г.) → <b>${formatKpiRub(currYrTotal)}</b> (${stepYr} г.).`
      : (currYrTotal != null ? ` ${metricNom} компании за ${stepYr} г.: <b>${formatKpiRub(currYrTotal)}</b>.` : '');
    const ch2SummaryHtml = step.t === 'total'
      ? `${metricNom} компании за ${esc(step.label)} г.: <b>${formatKpiRub(step.v)}</b>.`
      : `${isRevMode ? 'Выручка' : 'Прибыль'} ${catPhrase} в ${stepYr || ''} г. ${dirVerb} <b>${formatKpiRub(Math.abs(step.v))}</b>${prevYr ? ` по сравнению с ${prevYr} г.` : ''}.${companyContext}`;

    setSafeHtml(bodyEl, `
      <p style="margin:0 0 10px;font-size:0.84375rem">${ch2SummaryHtml}</p>
      ${catRows.length && years.length ? `
        <table class="tbl" style="margin-bottom:10px">
          <thead>
            <tr>
              <th scope="col">${isOtherBlock ? 'Категории в «Других»' : 'Категория'}</th>
              ${years.map((y) => `<th scope="col">Прибыль ${y}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${catRows.map((row) => `
              <tr>
                <td><b>${esc(row.category)}</b></td>
                ${row.vals.map((val) => `<td>${val != null ? formatKpiRub(val) : '—'}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>` : ''}
      ${catFilteredSkus.length ? `
        <table class="tbl">
          <thead>
            <tr>
              <th scope="col">Категория</th>
              <th scope="col">Топ SKU по прибыли</th>
              <th scope="col">Валовая прибыль</th>
              <th scope="col">Маржа</th>
            </tr>
          </thead>
          <tbody>
            ${catFilteredSkus.map((it) => `
              <tr>
                <td>${esc(it.category)}</td>
                <td><b>${esc(it.product)}</b></td>
                <td>${formatKpiRub(it.sales_rub - it.costs_rub)}</td>
                <td>${(it.margin_pct || 0).toFixed(1)}%</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p class="hint" style="margin:0">Для выбранной категории товарных строк нет.</p>'}`);
  }

  syncDrillOverlayLeft();
  wfDrill.hidden = false;
}

const WF_CAT_PALETTE = ['#3B82F6', '#FACC15', '#A855F7', '#0D9488', '#F26A3D', '#64748B'];

function computeYearlyRevenueMap(bundle, catFilter = 'all') {
  const byYear = new Map();
  const byYearCat = new Map();
  const tsSeries = bundle?.time_series?.series || [];
  for (const s of tsSeries) {
    const cat = s.category || String(s.series_name || '').split('_')[0] || 'Другие';
    if (catFilter !== 'all' && cat !== catFilter) continue;
    for (const pt of (s.points || [])) {
      if (!Number.isFinite(pt.sales_rub)) continue;
      const yr = String(pt.year);
      byYear.set(yr, (byYear.get(yr) || 0) + pt.sales_rub);
      if (!byYearCat.has(yr)) byYearCat.set(yr, new Map());
      const cm = byYearCat.get(yr);
      cm.set(cat, (cm.get(cat) || 0) + pt.sales_rub);
    }
  }
  return { byYear, byYearCat };
}

function drawSvgWaterfall(el, rawItems, label, chartId, opts = {}) {
  if (!el || !rawItems?.length) return;
  const revBgMap = opts.revBgMap || null;
  const stackSegmentsMap = opts.stackSegmentsMap || null;
  const metricLabel = opts.metricLabel || 'Итоговое значение';

  const res = buildWaterfallGeometry(rawItems);
  // Attach optional revenue background and category stack segments to total steps
  res.steps.forEach((s) => {
    s.metricLabel = metricLabel;
    if (s.t === 'total') {
      const yrMatch = String(s.label).match(/\b(20\d{2})\b/);
      const yrKey = yrMatch ? yrMatch[1] : String(s.label).trim();
      if (revBgMap && revBgMap.has(yrKey)) {
        s.revBg = revBgMap.get(yrKey);
      }
      if (stackSegmentsMap && stackSegmentsMap.has(yrKey)) {
        s.segments = stackSegmentsMap.get(yrKey);
      }
    }
  });

  // Expand Y top if hatched revenue background bars exceed profit max
  if (revBgMap && showRevenueBg) {
    const revVals = res.steps.map((s) => (Number.isFinite(s.revBg) ? s.revBg : 0));
    const maxWithRev = Math.max(res.top, ...revVals);
    if (maxWithRev > res.top) {
      const span = (maxWithRev - res.bot) || 1;
      res.step = niceStep(span / 5);
      res.top = Math.ceil(maxWithRev / res.step) * res.step;
    }
  }

  const W = 640, H = 310, L = 74, R = 26, T = 26, B = 58;
  const pw = W - L - R, ph = H - T - B;
  const n = res.steps.length, sl = pw / n, bw = sl * 0.6;
  const y = (v) => T + ph - ((v - res.bot) / ((res.top - res.bot) || 1)) * ph;
  const baseProfit = res.steps[0]?.v || 0;
  const hatchId = `wf-hatch-${chartId}`;
  const isDark = isDarkMode();
  const hatchStroke = isDark ? 'rgba(203, 213, 225, 0.32)' : 'rgba(148, 163, 184, 0.45)';
  const hatchBorder = isDark ? 'rgba(203, 213, 225, 0.28)' : 'rgba(148, 163, 184, 0.4)';
  const yAxisTitle = metricLabel === 'Выручка' ? 'Выручка (₽)' : 'Прибыль (₽)';
  const xAxisTitle = chartId === 'ch1' ? 'Факторы изменения' : 'Годы и категории';

  let g = `<defs>
    <pattern id="${hatchId}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${hatchStroke}" stroke-width="3"/>
    </pattern>
  </defs>
  <text x="15" y="${T + ph / 2}" text-anchor="middle" class="at" transform="rotate(-90 15 ${T + ph / 2})" style="font-size:11px;font-family:Inter,system-ui,sans-serif">${esc(yAxisTitle)}</text>
  <text x="${L + pw / 2}" y="${H - 4}" text-anchor="middle" class="at" style="font-size:11px;font-family:Inter,system-ui,sans-serif">${esc(xAxisTitle)}</text>`;

  for (let v = res.bot; v <= res.top + 0.001; v += res.step) {
    const lbl = Math.abs(v) >= 1e6 ? `${Math.round(v / 1e6)}M` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`;
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gx"/>`;
    g += `<text x="${L - 8}" y="${y(v) + 3}" text-anchor="end" class="at">${lbl}</text>`;
  }

  res.steps.forEach((s, k) => {
    const x = L + k * sl + (sl - bw) / 2;
    const hi = Math.max(s.s, s.e);
    const lo = Math.min(s.s, s.e);
    const c = { total: '#6F8091', up: '#00A87A', down: '#EF5B3F' }[s.t];
    const cx = x + bw / 2;
    const valLabel = formatCompactVal(s.v, currentScaleMode);
    const hasRevBg = showRevenueBg && s.t === 'total' && Number.isFinite(s.revBg) && s.revBg > hi;
    const topAnchor = hasRevBg ? s.revBg : hi;
    const textY = s.e < s.s ? y(lo) + 12 : y(topAnchor) - 5;

    const dimOther = chartId === 'ch2' && currentCatFilter !== 'all' &&
      s.t !== 'total' && !matchesCatFilter(String(s.label).split('_')[0]);
    const opacityAttr = dimOther ? 'opacity="0.32"' : '';
    const isPressed = activeWfSelection === `${chartId}:${k}`;

    let barShapes = '';
    if (hasRevBg) {
      const ry = y(s.revBg);
      const rh = Math.max(4, y(0) - ry);
      barShapes += `<rect x="${x}" y="${ry}" width="${bw}" height="${rh}" fill="url(#${hatchId})" stroke="${hatchBorder}" stroke-width="1" rx="6"/>`;
    }

    if (s.t === 'total' && Array.isArray(s.segments) && s.segments.length && s.v > 0) {
      let acc = 0;
      const posSegs = s.segments.filter((seg) => seg.value > 0);
      posSegs.forEach((seg, si) => {
        const segLo = acc;
        const segHi = acc + seg.value;
        acc = segHi;
        const sy = y(segHi);
        const sh = Math.max(2, y(segLo) - sy);
        const segColor = WF_CAT_PALETTE[si % WF_CAT_PALETTE.length];
        const isTopSeg = si === posSegs.length - 1;
        barShapes += `<rect x="${x}" y="${sy}" width="${bw}" height="${Math.max(1, sh - (isTopSeg ? 0 : 1.5))}" fill="${segColor}" rx="${isTopSeg ? 5 : 1}"/>`;
      });
    } else {
      barShapes += `<rect x="${x}" y="${y(hi)}" width="${bw}" height="${Math.max(4, y(lo) - y(hi))}" fill="${c}" rx="4"/>`;
    }

    g += `<g class="wf-bar" tabindex="0" role="button" aria-pressed="${isPressed}" data-chart="${chartId}" data-idx="${k}" aria-label="${esc(s.label)}: ${fmtN(s.v)} рублей. Нажмите для детализации" ${opacityAttr}>${barShapes}</g>`;

    if (showChartLabels) {
      const displayLbl = hasRevBg ? `${valLabel} / ${formatCompactVal(s.revBg, currentScaleMode)}` : valLabel;
      g += `<text x="${cx}" y="${textY}" text-anchor="middle" class="at" style="pointer-events:none;font-size:${currentScaleMode === 'rub' || hasRevBg ? '9px' : '11px'}" ${opacityAttr}>${displayLbl}</text>`;
    }
    g += `<text x="${cx}" y="${H - B + 16}" text-anchor="middle" class="at" style="pointer-events:none" ${opacityAttr}>${String(s.label).split(/[\s_]+/).map((t, i) => `<tspan x="${cx}" dy="${i ? 12 : 0}">${esc(t)}</tspan>`).join('')}</text>`;

    if (k < n - 1) {
      g += `<line x1="${x + bw}" x2="${x + sl}" y1="${y(s.e)}" y2="${y(s.e)}" class="cn"/>`;
    }
  });

  setSafeHtml(el, `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}">${g}</svg>
  <table class="sr-only"><caption>${esc(label)}</caption><thead><tr><th scope="col">Показатель</th><th scope="col">Значение, ₽</th></tr></thead><tbody>${res.steps.map((s) => `<tr><td>${esc(s.label)}</td><td>${fmtN(s.v)}</td></tr>`).join('')}</tbody></table>`);

  $$('.wf-bar', el).forEach((barEl) => {
    const idx = Number(barEl.dataset.idx);
    const stepObj = res.steps[idx];
    barEl.addEventListener('pointerenter', (e) => showWfTooltip(stepObj, baseProfit, e));
    barEl.addEventListener('pointermove', (e) => positionTooltip(e.clientX, e.clientY));
    barEl.addEventListener('pointerleave', hideWfTooltip);
    barEl.addEventListener('focus', () => showWfTooltip(stepObj, baseProfit, barEl));
    barEl.addEventListener('blur', hideWfTooltip);
    barEl.addEventListener('click', () => openWfDrillDown(chartId, idx, stepObj, baseProfit));
    barEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openWfDrillDown(chartId, idx, stepObj, baseProfit);
      }
    });
  });
}

const SKU_QUAD_META = {
  top_right: {
    label: 'Звёзды (лидеры продаж)',
    advice: 'Сильный товар с высокой выручкой и маржой: держите в наличии и не снижайте цену без необходимости.'
  },
  top_left: {
    label: 'Повысить маржу',
    advice: 'Товар хорошо продаётся, но приносит мало прибыли с каждой штуки: проверьте закупочную цену, доставку или попробуйте чуть поднять цену.'
  },
  bottom_right: {
    label: 'Растить продажи',
    advice: 'Высокая прибыль с каждой штуки, но покупают редко: попробуйте акции, наборы или более заметную выкладку.'
  },
  bottom_left: {
    label: 'Отстающие товары',
    advice: 'Низкие и продажи, и прибыль: рассмотрите сокращение остатков или замену товара.'
  }
};

function getQuadrantMeta(rawQuad) {
  if (!rawQuad) return { label: '—', advice: 'Отслеживать динамику маржинальности и эластичности цены.' };
  if (SKU_QUAD_META[rawQuad]) return SKU_QUAD_META[rawQuad];
  const ruMap = {
    'Топ товары': SKU_QUAD_META.top_right,
    'Рассмотреть пути повышения маржинальности': SKU_QUAD_META.top_left,
    'Рассмотреть пути повышения продаж': SKU_QUAD_META.bottom_right,
    'Отстающие товары': SKU_QUAD_META.bottom_left
  };
  return ruMap[rawQuad] || { label: String(rawQuad), advice: 'Отслеживать динамику маржинальности и эластичности цены.' };
}

function getBundleYearRange(bundle) {
  const yrs = new Set();
  (bundle?.profit_bars?.years || []).forEach((y) => { if (Number.isFinite(Number(y))) yrs.add(Number(y)); });
  if (bundle?.vmpc?.prev_year) yrs.add(Number(bundle.vmpc.prev_year));
  if (bundle?.vmpc?.curr_year) yrs.add(Number(bundle.vmpc.curr_year));
  if (!yrs.size && bundle?.marg_map?.year) yrs.add(Number(bundle.marg_map.year));
  const sorted = [...yrs].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return '';
  return sorted.length === 1 ? `${sorted[0]} г.` : `${sorted[0]}–${sorted[sorted.length - 1]} гг.`;
}

function computeSkuElasticityStats(bundle, category, product) {
  const prods = bundle?.elasticity?.products || [];
  const normCat = String(category || '').trim().toLowerCase();
  const normProd = String(product || '').trim().toLowerCase();
  const entry = prods.find((p) => {
    const c = String(p.category || String(p.series_name || '').split('_')[0] || '').trim().toLowerCase();
    const pr = String(p.product || String(p.series_name || '').split('_').slice(1).join('_') || '').trim().toLowerCase();
    return c === normCat && pr === normProd;
  }) || prods.find((p) => {
    const pr = String(p.product || String(p.series_name || '').split('_').slice(1).join('_') || '').trim().toLowerCase();
    return pr === normProd;
  });
  if (!entry || !Array.isArray(entry.points) || !entry.points.length) return null;

  const pts = entry.points.filter((pt) => Number.isFinite(pt.price) && Number.isFinite(pt.volume));
  if (!pts.length) return null;
  const n = pts.length;
  const prices = pts.map((p) => p.price);
  const vols = pts.map((p) => p.volume);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / n;
  const avgVol = vols.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (const pt of pts) {
    num += (pt.price - avgPrice) * (pt.volume - avgVol);
    den += (pt.price - avgPrice) ** 2;
  }
  const slope = Math.abs(den) > 1e-9 ? num / den : 0;
  const rawElast = avgVol !== 0 ? slope * (avgPrice / avgVol) : 0;
  const elast = Math.abs(rawElast) < 0.05 ? 0 : rawElast;

  let status = 'Слабая связь с ценой';
  let advice = 'Цена почти не влияет на объём продаж — приоритет на наличие, сезонность и видимость на полке.';
  if (elast < -1) {
    status = 'Эластичный спрос';
    advice = 'Покупатели остро реагируют на цену: повышение снижает выручку, лучше работают точечные промо и скидки.';
  } else if (elast < -0.15) {
    status = 'Неэластичный спрос';
    advice = 'Спрос устойчив к цене: есть запас для плавного повышения цены и роста маржи без сильной потери объёма.';
  } else if (elast > 0.15) {
    status = 'Нетипичный рост (E > 0)';
    advice = 'Объём рос одновременно с ценой — проверьте влияние высокого сезона, дефицита или смены позиционирования.';
  }

  return {
    elast,
    status,
    advice,
    count: n,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    avgPrice,
    minVol: Math.min(...vols),
    maxVol: Math.max(...vols),
    avgVol
  };
}

function computeSkuSeasonalityStats(bundle, category, product) {
  const sh = bundle?.seasonality?.sales_seasonality;
  const ph = bundle?.seasonality?.prices_seasonality;
  if (!sh?.products?.length) return null;
  const normCat = String(category || '').trim().toLowerCase();
  const normProd = String(product || '').trim().toLowerCase();
  const idx = sh.products.findIndex((pr, i) =>
    String(sh.categories?.[i] || '').trim().toLowerCase() === normCat &&
    String(pr || '').trim().toLowerCase() === normProd
  );
  if (idx < 0) return null;
  const months = sh.months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const sRow = sh.matrix?.[idx] || [];
  const pRow = ph?.matrix?.[idx] || [];
  let maxS = -Infinity, maxSM = null, minS = Infinity, minSM = null;
  sRow.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    if (v > maxS) { maxS = v; maxSM = months[i]; }
    if (v < minS) { minS = v; minSM = months[i]; }
  });
  let maxP = -Infinity, maxPM = null, minP = Infinity, minPM = null;
  pRow.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    if (v > maxP) { maxP = v; maxPM = months[i]; }
    if (v < minP) { minP = v; minPM = months[i]; }
  });
  return { maxS, maxSM, minS, minSM, maxP, maxPM, minP, minPM };
}

function showSkuDrill(item, opts = {}) {
  if (!skuDrill || !item) return;
  const bundle = getCurrentDataset();
  const source = opts.source || 'margin';
  const profit = (item.sales_rub || 0) - (item.costs_rub || 0);
  const quad = getQuadrantMeta(item.quadrant);
  const mmYear = bundle?.marg_map?.year ? `${bundle.marg_map.year} г.` : '';
  const periodRange = getBundleYearRange(bundle);
  const elast = computeSkuElasticityStats(bundle, item.category, item.product);
  const seas = computeSkuSeasonalityStats(bundle, item.category, item.product);

  const titlePrefix = source === 'elasticity'
    ? 'Эластичность SKU'
    : source === 'seasonality'
      ? 'Сезонность SKU'
      : 'Карточка SKU';
  const titlePeriod = (source === 'elasticity' || source === 'seasonality') ? periodRange : mmYear;
  $('#sku-drill-title').textContent = `${titlePrefix}: ${item.category} · ${item.product}${titlePeriod ? ` (${titlePeriod})` : ''}`;

  const finSection = `
    <div class="sku-sec-title">Финансовые итоги${mmYear ? ` · ${esc(mmYear)}` : ''}</div>
    <div class="sku-kpi-grid">
      <div class="sku-kpi"><span class="bi-label">Выручка</span><div class="sku-kpi-val">${formatKpiRub(item.sales_rub)}</div></div>
      <div class="sku-kpi"><span class="bi-label">Затраты</span><div class="sku-kpi-val">${formatKpiRub(item.costs_rub)}</div></div>
      <div class="sku-kpi"><span class="bi-label">Прибыль</span><div class="sku-kpi-val">${formatKpiRub(profit)}</div></div>
      <div class="sku-kpi"><span class="bi-label">Маржа</span><div class="sku-kpi-val">${(item.margin_pct || 0).toFixed(1)}%</div></div>
    </div>
    <p class="sku-advice"><b>Квадрант:</b> ${esc(quad.label)}. <b>Рекомендация:</b> ${esc(quad.advice)}</p>`;

  const elastSection = elast ? `
    <div class="sku-sec-title">Эластичность спроса по цене${periodRange ? ` · ${esc(periodRange)}` : ''}</div>
    <div class="sku-kpi-grid">
      <div class="sku-kpi">
        <div class="sku-kpi-hd">
          <span class="bi-label">Коэффициент E</span>
          <button type="button" class="bi-help-btn bi-help-btn-xs" popovertarget="elast-help-pop" aria-label="Как читать коэффициент E" title="Как читать коэффициент E">?</button>
        </div>
        <div class="sku-kpi-val">E ≈ ${elast.elast.toFixed(1)}</div>
      </div>
      <div class="sku-kpi"><span class="bi-label">Средняя цена</span><div class="sku-kpi-val">${fmtN(elast.avgPrice)} ₽</div></div>
      <div class="sku-kpi"><span class="bi-label">Диапазон цен</span><div class="sku-kpi-val">${fmtN(elast.minPrice)}–${fmtN(elast.maxPrice)} ₽</div></div>
      <div class="sku-kpi"><span class="bi-label">Средний объём</span><div class="sku-kpi-val">${fmtN(elast.avgVol)} шт (${elast.count} т.)</div></div>
    </div>
    <p class="sku-advice"><b>Как реагируют покупатели:</b> ${esc(elast.status)}. <b>Что делать:</b> ${esc(elast.advice)}</p>` : '';

  const seasSection = seas && Number.isFinite(seas.maxS) ? `
    <div class="sku-sec-title">Сезонность${periodRange ? ` · среднее за ${esc(periodRange)}` : ''}</div>
    <div class="sku-kpi-grid">
      <div class="sku-kpi"><span class="bi-label">Пик продаж</span><div class="sku-kpi-val">Мес. ${seas.maxSM} (×${seas.maxS.toFixed(2)})</div></div>
      <div class="sku-kpi"><span class="bi-label">Спад продаж</span><div class="sku-kpi-val">Мес. ${seas.minSM} (×${seas.minS.toFixed(2)})</div></div>
      <div class="sku-kpi"><span class="bi-label">Макс. цена</span><div class="sku-kpi-val">${seas.maxPM != null ? `Мес. ${seas.maxPM} (×${seas.maxP.toFixed(2)})` : '—'}</div></div>
      <div class="sku-kpi"><span class="bi-label">Промо / мин. цена</span><div class="sku-kpi-val">${seas.minPM != null ? `Мес. ${seas.minPM} (×${seas.minP.toFixed(2)})` : '—'}</div></div>
    </div>` : '';

  let html = '';
  if (source === 'elasticity') {
    html = elastSection + finSection;
  } else if (source === 'seasonality') {
    html = seasSection + finSection;
  } else {
    html = finSection + (elastSection ? elastSection : '');
  }

  setSafeHtml($('#sku-drill-body'), html);
  syncDrillOverlayLeft();
  skuDrill.hidden = false;
}

/* ==========================================================================
   Dashboard Data Coordination
   ========================================================================== */
async function ensureDashboardDataAndRender() {
  let bundle = getCurrentDataset();

  if (!bundle) {
    try {
      await initWasmEngine();
      const smp = SAMPLES[0];
      const bytes = await fetchSampleAsUint8Array(smp.url);
      bundle = await processExcelData(bytes, smp.name);
      try {
        const resp = await fetch(smp.reply);
        if (resp.ok) currentAiComment = await resp.text();
      } catch { /* ignore */ }
      bundle.ai_comment = currentAiComment;
      currentDatasetKey = '0';
    } catch (e) {
      console.warn('[Dashboard] Wasm live sample init fallback:', e);
      bundle = await fetchPrecomputedDemo('assets/samples/demo_test_data_fixed.json');
      setCurrentDataset(bundle, 'demo_test_data_fixed.json');
      currentDatasetKey = '0';
    }
  }

  syncDatasetSelectOptions(getCurrentFileName(), currentDatasetKey);
  populateCategoryFilter(bundle);
  syncAnalyticsView();
  renderDashboardAll(true);
}

function formatKpiRub(v) {
  if (!Number.isFinite(v)) return '—';
  if (currentScaleMode === 'rub') return `${fmtN(v)} ₽`;
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)} млрд ₽`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)} млн ₽`;
  if (a >= 1e3) return `${Math.round(v / 1e3)} тыс ₽`;
  return `${Math.round(v)} ₽`;
}

function renderDashboardKpiStrip(bundle) {
  if (!bundle) return;
  const vmpc = bundle.vmpc || bundle.fig_vmpc;
  const selYears = allAvailableYears.filter((y) => matchesYearFilter(y)).sort((a, b) => a - b);
  let currYear = Number(vmpc?.curr_year);
  let prevYear = Number(vmpc?.prev_year);
  if (currentYearFilter !== 'all') {
    if (selYears.length >= 2) {
      currYear = selYears[selYears.length - 1];
      prevYear = selYears[selYears.length - 2];
    } else if (selYears.length === 1) {
      currYear = selYears[0];
      const idx = allAvailableYears.indexOf(currYear);
      prevYear = idx > 0 ? allAvailableYears[idx - 1] : NaN;
    } else {
      currYear = NaN;
      prevYear = NaN;
    }
  }
  const yrLbl = Number.isFinite(currYear)
    ? (Number.isFinite(prevYear) ? `${currYear} к ${prevYear}` : String(currYear))
    : '';
  ['#dk-yr-1', '#dk-yr-2', '#dk-yr-3', '#dk-yr-4'].forEach((sel) => {
    const el = $(sel);
    if (el) el.textContent = yrLbl;
  });

  // Compute filtered Revenue & Profit for prevYear and currYear from time_series
  const tsSeries = bundle.time_series?.series || [];
  let prevRev = 0, currRev = 0, prevProf = 0, currProf = 0;
  let hasPrev = false, hasCurr = false;

  for (const s of tsSeries) {
    const cat = s.category || String(s.series_name || '').split('_')[0];
    if (!matchesCatFilter(cat) || !matchesSkuFilter(s.series_name)) continue;
    for (const pt of (s.points || [])) {
      if (!Number.isFinite(pt.sales_rub)) continue;
      const pVal = Number.isFinite(pt.margin_pct) ? pt.sales_rub * (pt.margin_pct / 100) : 0;
      if (pt.year === prevYear) { prevRev += pt.sales_rub; prevProf += pVal; hasPrev = true; }
      else if (pt.year === currYear) { currRev += pt.sales_rub; currProf += pVal; hasCurr = true; }
    }
  }

  // Fallback to vmpc totals when showing all years, categories and SKUs
  if (currentYearFilter === 'all' && currentCatFilter === 'all' && currentSkuFilter === 'all' && Number.isFinite(vmpc?.prev_profit) && Number.isFinite(vmpc?.curr_profit)) {
    prevProf = vmpc.prev_profit;
    currProf = vmpc.curr_profit;
  }

  const prevCost = hasPrev ? (prevRev - prevProf) : NaN;
  const currCost = hasCurr ? (currRev - currProf) : NaN;
  const prevMarg = hasPrev && prevRev > 0 ? (prevProf / prevRev) * 100 : NaN;
  const currMarg = hasCurr && currRev > 0 ? (currProf / currRev) * 100 : NaN;

  const setKpi = (valSel, deltaSel, currVal, prevVal, isPct = false, invert = false) => {
    const vEl = $(valSel);
    const dEl = $(deltaSel);
    if (vEl) vEl.textContent = Number.isFinite(currVal) ? (isPct ? `${currVal.toFixed(1)}%` : formatKpiRub(currVal)) : '—';
    if (!dEl) return;
    if (!Number.isFinite(currVal) || !Number.isFinite(prevVal)) {
      dEl.textContent = '—';
      dEl.className = 'dash-kpi-delta';
      return;
    }
    const diff = currVal - prevVal;
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '•';
    const sign = diff > 0 ? '+' : '';
    let cls = 'dash-kpi-delta';
    if (diff > 0) cls += invert ? ' is-neg' : ' is-pos';
    else if (diff < 0) cls += invert ? ' is-pos' : ' is-neg';
    if (isPct) {
      dEl.textContent = `${arrow} ${sign}${diff.toFixed(1)} п.п. к ${prevYear}`;
    } else {
      const pct = prevVal !== 0 ? (diff / Math.abs(prevVal)) * 100 : null;
      const pctStr = pct !== null && Number.isFinite(pct) ? ` (${sign}${pct.toFixed(1)}%)` : '';
      dEl.textContent = `${arrow} ${sign}${formatKpiRub(diff)}${pctStr}`;
    }
    dEl.className = cls;
  };

  setKpi('#dk-rev', '#dk-rev-d', hasCurr ? currRev : NaN, hasPrev ? prevRev : NaN, false, false);
  setKpi('#dk-cost', '#dk-cost-d', currCost, prevCost, false, true);
  setKpi('#dk-prof', '#dk-prof-d', hasCurr ? currProf : NaN, hasPrev ? prevProf : NaN, false, false);
  setKpi('#dk-marg', '#dk-marg-d', currMarg, prevMarg, true, false);
}

function openSkuDrillByKey(category, product, source = 'margin') {
  const bundle = getCurrentDataset();
  if (!product && category) {
    // Category-level click from aggregated Dynamics chart -> filter to that category
    currentCatFilter = new Set([category]);
    renderBiCatPopover();
    renderBiSkuPopover(biSkuSearch?.value || '');
    updateBiFilterBadges();
    renderDashboardAll(false);
    toast(`Применён фильтр по категории: ${category}`);
    return;
  }
  const items = bundle?.marg_map?.items || [];
  const normCat = String(category || '').trim().toLowerCase();
  const normProd = String(product || '').trim().toLowerCase();
  const found = items.find((it) =>
    String(it.category || '').trim().toLowerCase() === normCat &&
    String(it.product || '').trim().toLowerCase() === normProd
  ) || items.find((it) =>
    String(it.product || '').trim().toLowerCase() === normProd
  );
  if (found) {
    showSkuDrill(found, { source });
  } else {
    toast(`Детализация для ${category} · ${product} недоступна в товарной матрице`);
  }
}

function renderDashboardAll(forceThemeRefresh = false) {
  const bundle = getCurrentDataset();
  if (!bundle) return;
  renderDashboardKpiStrip(bundle);
  const activeTabBtn = $('#tabs [aria-selected="true"]');
  const activeIdx = activeTabBtn ? Number(activeTabBtn.dataset.t) : 0;
  renderDashboardTab(activeIdx, forceThemeRefresh);
}

function formatSimpleMd(md) {
  if (!md) return '';
  return esc(md)
    .replace(/^######\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.*)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function renderDashboardTab(tabIdx) {
  const bundle = getCurrentDataset();
  if (!bundle) return;

  const isDark = isDarkMode();

  if (tabIdx === 0) {
    const { byYear: revByYear, byYearCat: revByYearCat } = computeYearlyRevenueMap(bundle, 'all');
    const vmpc = bundle.vmpc || bundle.fig_vmpc;
    if (vmpc?.waterfall_items) {
      $('#vmpc-years-lbl').textContent = `[${vmpc.prev_year} vs ${vmpc.curr_year}] · Клик по столбцу раскрывает детали`;
      drawSvgWaterfall($('#ch1'), vmpc.waterfall_items, `Факторный анализ прибыли, ${vmpc.prev_year} и ${vmpc.curr_year}`, 'ch1', {
        revBgMap: revByYear,
        metricLabel: 'Прибыль'
      });
    } else if (vmpc?.data?.[0]) {
      const tr = vmpc.data[0];
      const itemsList = (tr.x || []).map((lbl, i) => ({ label: lbl, value: tr.y[i], measure: tr.measure[i] }));
      drawSvgWaterfall($('#ch1'), itemsList, 'Факторный анализ прибыли', 'ch1', { revBgMap: revByYear, metricLabel: 'Прибыль' });
    }

    const pb = bundle.profit_bars || bundle.fig_profit_bars;
    const ch2Title = $('#ch2-title');
    if (currentCh2Metric === 'revenue' && revByYear.size) {
      if (ch2Title) ch2Title.textContent = 'Выручка по категориям и годам';
      const yrs = [...revByYear.keys()].filter((yr) => matchesYearFilter(yr)).sort();
      $('#bars-years-lbl').textContent = `[${yrs.join(', ')}] · Разбивка выручки по категориям`;
      const revItems = yrs.map((yr) => ({ label: yr, value: revByYear.get(yr) || 0, measure: 'absolute' }));
      const revStacks = new Map();
      yrs.forEach((yr) => {
        const cm = revByYearCat.get(yr);
        if (cm) {
          revStacks.set(yr, [...cm.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value));
        }
      });
      drawSvgWaterfall($('#ch2'), revItems, 'Выручка по категориям и годам', 'ch2', {
        stackSegmentsMap: revStacks,
        metricLabel: 'Выручка'
      });
    } else if (pb?.x_labels) {
      if (ch2Title) ch2Title.textContent = 'Прибыль по категориям и годам';
      const visibleYears = (pb.years || []).filter((y) => matchesYearFilter(y));
      $('#bars-years-lbl').textContent = `[${visibleYears.join(', ')}] · Клик открывает таблицу по категориям`;
      const fullItems = pb.x_labels.map((lbl, i) => ({ label: lbl, value: pb.waterfall_totals[i], measure: pb.measures[i] }));
      const itemsList = currentYearFilter === 'all'
        ? fullItems
        : fullItems.filter((it) => {
            const m = String(it.label).match(/(20\d{2})/);
            if (!m) return true;
            const yr = Number(m[1]);
            if (!matchesYearFilter(yr)) return false;
            // Only keep relative bridge steps if the preceding year is also visible
            if (it.measure !== 'absolute') {
              const idx = (pb.years || []).indexOf(yr);
              const prevY = idx > 0 ? pb.years[idx - 1] : null;
              return prevY != null && matchesYearFilter(prevY);
            }
            return true;
          });
      const profitStacks = new Map();
      visibleYears.forEach((yr) => {
        const xIdx = (pb.x_labels || []).indexOf(String(yr));
        if (xIdx < 0) return;
        const segs = (pb.category_bars || []).map((cb) => ({
          category: cb.category,
          value: Number(cb.values?.[xIdx]) || 0
        }));
        profitStacks.set(String(yr), segs);
      });
      drawSvgWaterfall($('#ch2'), itemsList, 'Прибыль по категориям и годам', 'ch2', {
        revBgMap: revByYear,
        stackSegmentsMap: profitStacks,
        metricLabel: 'Прибыль'
      });
    } else if (pb?.data?.[0]) {
      const tr = pb.data[0];
      const itemsList = (tr.x || []).map((lbl, i) => ({ label: lbl, value: tr.y[i], measure: tr.measure[i] }));
      drawSvgWaterfall($('#ch2'), itemsList, 'Прибыль по категориям и товарам', 'ch2', { revBgMap: revByYear, metricLabel: 'Прибыль' });
    }
  } else if (tabIdx === 1) {
    const mm = bundle.marg_map || bundle.fig_marg_map;
    const filteredYears = allAvailableYears.filter((y) => matchesYearFilter(y));
    const periodRange = filteredYears.length
      ? (filteredYears.length === 1 ? `${filteredYears[0]} г.` : `${filteredYears[0]}–${filteredYears[filteredYears.length - 1]} гг.`)
      : getBundleYearRange(bundle);
    if (mm) {
      if (mm.year) {
        $('#marg-year-lbl').textContent = `Продажи и маржа по SKU [${mm.year} г.] · Клик по точке раскрывает детали`;
      }
      renderMarginMap('chart-marg-map', mm, isDark, currentCatFilter, (pt) => showSkuDrill(pt, { source: 'margin' }), currentQuadFilter, currentScaleMode, currentSkuFilter);
    }
    const tsSubLbl = $('#ts-sub-lbl');
    if (tsSubLbl) {
      tsSubLbl.textContent = `${periodRange ? `[${periodRange}] · ` : ''}Выручка и маржинальность по месяцам · клик раскрывает детали`;
    }
    const ts = bundle.time_series || bundle.fig_sales_change;
    const mc = bundle.time_series || bundle.fig_marg_change;
    const salesHost = $('#chart-sales-change');
    const margHost = $('#chart-marg-change');
    const showSales = currentTsView === 'both' || currentTsView === 'sales';
    const showMarg = currentTsView === 'both' || currentTsView === 'margin';
    if (salesHost) salesHost.hidden = !showSales;
    if (margHost) margHost.hidden = !showMarg;
    const hPx = currentTsView === 'both' ? 175 : 340;
    const onDynClick = (cat, prod) => openSkuDrillByKey(cat, prod, 'dynamics');
    if (showSales && ts) renderSalesChange('chart-sales-change', ts, isDark, currentCatFilter, currentTsAgg, hPx, currentScaleMode, currentSkuFilter, onDynClick, currentYearFilter);
    if (showMarg && mc) renderMargChange('chart-marg-change', mc, isDark, currentCatFilter, currentTsAgg, hPx, currentSkuFilter, onDynClick, currentYearFilter);

    const insightText = currentAiComment || bundle.ai_comment || '';
    const card = $('#ai-insight-card');
    if (card && insightText) {
      card.hidden = false;
      setSafeHtml($('#ai-insight-body'), `<p>${formatSimpleMd(insightText)}</p>`);
    } else if (card) {
      card.hidden = true;
    }

    setTimeout(resizeAllCharts, 60);
  } else if (tabIdx === 2) {
    const periodRange = getBundleYearRange(bundle);
    const seasPeriod = $('#seas-period-lbl');
    const elastPeriod = $('#elast-period-lbl');
    if (seasPeriod) seasPeriod.textContent = periodRange ? `(${periodRange})` : '';
    if (elastPeriod) elastPeriod.textContent = periodRange ? `(${periodRange})` : '';

    const sh = bundle.seasonality?.sales_seasonality || bundle.fig_sales_heat || bundle.fig_sales_heatmap;
    const ph = bundle.seasonality?.prices_seasonality || bundle.fig_prices_heat || bundle.fig_prices_heatmap;
    const shWrap = $('#seas-sales-wrap');
    const phWrap = $('#seas-prices-wrap');
    const showSh = currentSeasView === 'both' || currentSeasView === 'sales';
    const showPh = currentSeasView === 'both' || currentSeasView === 'prices';
    if (shWrap) shWrap.hidden = !showSh;
    if (phWrap) phWrap.hidden = !showPh;
    const heatH = currentSeasView === 'both' ? 210 : 365;
    const onSeasClick = (cat, prod) => openSkuDrillByKey(cat, prod, 'seasonality');
    const onElastClick = (cat, prod) => openSkuDrillByKey(cat, prod, 'elasticity');
    if (showSh && sh) renderSalesHeatmap('chart-sales-heat', sh, isDark, currentCatFilter, heatH, currentSkuFilter, onSeasClick);
    if (showPh && ph) renderPricesHeatmap('chart-prices-heat', ph, isDark, currentCatFilter, heatH, currentSkuFilter, onSeasClick);
    const el = bundle.elasticity || bundle.fig_elasticity;
    if (el) renderPriceElasticity('chart-elasticity', el, isDark, currentCatFilter, currentSkuFilter, onElastClick);

    setTimeout(resizeAllCharts, 60);
  }
}

/* ==========================================================================
   AI Settings Dialog (<dialog id="api-dlg">) & Live Agent Execution
   ========================================================================== */
const apiDlg = $('#api-dlg');
const apiForm = $('#api-form');
const apiProviderSel = $('#api-provider');
const apiProtocolSel = $('#api-protocol');
const apiBaseUrlInp = $('#api-base-url');
const apiModelInp = $('#api-model');
const apiModelsList = $('#api-models-list');
const apiKeyInp = $('#api-key');
const apiKeyToggle = $('#api-key-toggle');
const apiTestBtn = $('#api-test-btn');
const apiClearBtn = $('#api-clear-btn');
const apiStatusEl = $('#api-test-status');
const apiDocsNote = $('#api-docs-note');

const apiKeyStorageBadge = $('#api-key-storage-badge');
const settingsTabButtons = $$('[data-settings-tab]');
const settingsPanelApi = $('#settings-panel-api');
const settingsPanelData = $('#settings-panel-data');
const settingsDataList = $('#settings-data-list');
const dmSummaryPills = $('#dm-summary-pills');
const btnClearAllData = $('#btn-clear-all-data');
const dataConfirmDlg = $('#data-confirm-dlg');
const dataConfirmTitle = $('#data-confirm-title');
const dataConfirmDesc = $('#data-confirm-desc');
const dataConfirmOk = $('#data-confirm-ok');

let defaultDatasetStoragePref = 'session';

const apiKeyStorageSeg = $('#api-key-storage-seg');

function syncApiKeyStorageBadge() {
  if (apiKeyStorageBadge) {
    apiKeyStorageBadge.textContent = aiService.persistKey
      ? 'Хранение: localStorage (браузер)'
      : 'Хранение: только сессия (RAM)';
  }
  if (apiKeyStorageSeg) {
    $$('[data-api-storage]', apiKeyStorageSeg).forEach((btn) => {
      const isPersist = btn.dataset.apiStorage === 'localstorage';
      btn.setAttribute('aria-pressed', String(isPersist === Boolean(aiService.persistKey)));
    });
  }
}

if (apiKeyStorageSeg) {
  $$('[data-api-storage]', apiKeyStorageSeg).forEach((btn) => {
    btn.addEventListener('click', async () => {
      const wantPersist = btn.dataset.apiStorage === 'localstorage';
      if (wantPersist === Boolean(aiService.persistKey)) return;
      const ok = await confirmDataAction({
        title: wantPersist
          ? 'Сохранять API-ключ в localStorage?'
          : 'Перевести API-ключ в память сессии (RAM)?',
        description: wantPersist
          ? 'API-ключ и настройки ИИ будут сохраняться в localStorage этого браузера между перезагрузками. Не рекомендуется на чужих или общих ПК.'
          : 'API-ключ будет удалён из localStorage и останется только в оперативной памяти (RAM) до закрытия или обновления вкладки (F5).',
        confirmLabel: wantPersist ? 'Сохранять в localStorage' : 'Перевести в RAM',
        danger: false
      });
      if (!ok) return;
      aiService.setKeyPersistence(wantPersist);
      syncApiBadges();
      await renderSettingsDataPanel();
      toast(wantPersist ? 'API-ключ сохраняется в localStorage' : 'API-ключ переведён в память сессии (RAM)');
    });
  });
}

function syncApiBadges() {
  $$('[data-api-badge]').forEach((el) => {
    const task = el.dataset.apiTask || 'attributes';
    el.textContent = aiService.getSummaryBadge(task);
  });
  syncApiKeyStorageBadge();
  if (typeof syncDashAiModeUi === 'function') syncDashAiModeUi();
}

const apiModelSelect = $('#api-model-select');
const apiModelCustomWrap = $('#api-model-custom-wrap');
const apiPriceNoteEl = $('#api-price-note');
const apiThinkingAttrSel = $('#api-thinking-attr');
const apiThinkingDashSel = $('#api-thinking-dash');
const apiThinkingRiskSel = $('#api-thinking-risk');

const CUSTOM_MODEL_VALUE = '__custom__';
let pendingThinkingAttr = aiService.getTaskConfig('attributes').thinkingLevel || 'off';
let pendingThinkingDash = aiService.getTaskConfig('dashboard').thinkingLevel || 'medium';
let pendingThinkingRisk = aiService.getTaskConfig('risk').thinkingLevel || 'medium';

function getEffectiveSelectedModel() {
  if (!apiModelSelect) return apiModelInp?.value.trim() || DEFAULT_MODEL_ID;
  if (apiModelSelect.value === CUSTOM_MODEL_VALUE) {
    return apiModelInp?.value.trim() || '';
  }
  return apiModelSelect.value || DEFAULT_MODEL_ID;
}

function formatRubPrice(val) {
  if (!Number.isFinite(val)) return '—';
  if (val < 0.1) return `~${val.toFixed(2).replace('.', ',')} ₽`;
  if (val < 10) return `~${val.toFixed(1).replace('.', ',')} ₽`;
  return `~${Math.round(val).toLocaleString('ru-RU')} ₽`;
}

function populateThinkingSelect(sel, allowedLevels, defaultLvl, selectedLvl, dashEntry = null) {
  if (!sel) return;
  setSafeHtml(sel, THINKING_LEVELS.map((lvl) => {
    const supported = allowedLevels.includes(lvl);
    const isDef = supported && lvl === defaultLvl;
    let label = lvl;
    if (!supported) {
      label = `${lvl} (недоступно)`;
    } else if (dashEntry) {
      const estRub = estimateDashboardCostRub(dashEntry, lvl);
      const priceStr = Number.isFinite(estRub) ? formatRubPrice(estRub) : '';
      label = isDef
        ? `${lvl} · по умолч.${priceStr ? ` (${priceStr})` : ''}`
        : `${lvl}${priceStr ? ` (${priceStr})` : ''}`;
    } else {
      label = isDef ? `${lvl} (по умолч.)` : lvl;
    }
    return `<option value="${lvl}"${supported ? '' : ' disabled'}>${label}</option>`;
  }).join(''));
  sel.value = selectedLvl;
}

function refreshSelectedModelOptionMetrics(selectedModelId, attrThinking) {
  if (!apiModelSelect) return;
  const selVal = apiModelSelect.value;
  [...apiModelSelect.options].forEach((opt) => {
    if (opt.disabled || opt.value === CUSTOM_MODEL_VALUE) return;
    const entry = getModelCatalogEntry(opt.value);
    if (!entry) return;
    const isSelected = opt.value === selVal && selVal !== CUSTOM_MODEL_VALUE;
    const lvl = isSelected ? attrThinking : (entry.defaultThinking || 'off');
    const qNum = estimateQualityWithThinking(entry, lvl);
    const cNum = estimateCost1000Rub(entry, lvl);
    const qEl = opt.querySelector('.opt-qual');
    const cEl = opt.querySelector('.opt-cost');
    if (qEl && Number.isFinite(qNum)) {
      qEl.textContent = `${qNum.toFixed(1)}/10`;
      qEl.className = `opt-qual ${getQualityToneClass(qNum)}`;
    }
    if (cEl && Number.isFinite(cNum)) {
      setSafeHtml(cEl, `${esc(formatRubPrice(cNum))}<span class="sr-only"> за 1 000 товаров</span>`);
      cEl.className = `opt-cost ${getCostToneClass(cNum)}`;
    }
  });
  // Force Chromium <selectedcontent> to re-clone the mutated <option> children
  if (selVal && selVal !== CUSTOM_MODEL_VALUE) {
    apiModelSelect.selectedIndex = -1;
    apiModelSelect.value = selVal;
  }
}

function syncModelPricingAndThinking(modelId, reqAttrThinking = null, reqDashThinking = null, reqRiskThinking = null) {
  const isCustom = apiModelSelect?.value === CUSTOM_MODEL_VALUE;
  const entry = getModelCatalogEntry(modelId);
  const allowedLevels = isCustom || !entry ? THINKING_LEVELS : entry.thinkingLevels;
  const defAttr = getDefaultThinkingForTask(modelId, 'attributes');
  const defDash = getDefaultThinkingForTask(modelId, 'dashboard');
  const defRisk = getDefaultThinkingForTask(modelId, 'risk');

  let nextAttr = reqAttrThinking || pendingThinkingAttr || defAttr;
  if (!allowedLevels.includes(nextAttr)) nextAttr = defAttr;
  pendingThinkingAttr = nextAttr;

  let nextDash = reqDashThinking || pendingThinkingDash || defDash;
  if (!allowedLevels.includes(nextDash)) nextDash = defDash;
  pendingThinkingDash = nextDash;

  let nextRisk = reqRiskThinking || pendingThinkingRisk || defRisk;
  if (!allowedLevels.includes(nextRisk)) nextRisk = defRisk;
  pendingThinkingRisk = nextRisk;

  populateThinkingSelect(apiThinkingAttrSel, allowedLevels, defAttr, pendingThinkingAttr, null);
  populateThinkingSelect(apiThinkingDashSel, allowedLevels, defDash, pendingThinkingDash, (!isCustom && entry) ? entry : null);
  populateThinkingSelect(apiThinkingRiskSel, allowedLevels, defRisk, pendingThinkingRisk, (!isCustom && entry) ? entry : null);
  refreshSelectedModelOptionMetrics(modelId, pendingThinkingAttr);

  if (apiPriceNoteEl) {
    if (entry && !isCustom) {
      const thinkExtraK = THINKING_EXTRA_OUT_K[pendingThinkingAttr] || 0;
      const inPart = isShortPromptCached(entry) ? '36k вход · 9k кэш' : '45k вход';
      const outPart = thinkExtraK > 0 ? `25k выход · ${thinkExtraK}k мысли` : '25k выход';
      apiPriceNoteEl.textContent = `1k тов.: ${inPart} · ${outPart}`;
    } else {
      apiPriceNoteEl.textContent = 'Свой Model ID · тариф провайдера';
    }
  }
}

function getQualityToneClass(score) {
  if (!Number.isFinite(score)) return 'tone-muted';
  if (score >= 9.0) return 'tone-good';
  if (score >= 7.0) return 'tone-mid';
  return 'tone-low';
}

function getCostToneClass(estRub) {
  if (!Number.isFinite(estRub)) return 'tone-muted';
  if (estRub <= 15) return 'tone-good';
  if (estRub <= 90) return 'tone-mid';
  return 'tone-low';
}

function populateModelSelect(providerId, protocolId, targetModelId = '') {
  if (!apiModelSelect) return;
  const matching = MODEL_CATALOG.filter((m) =>
    (providerId === 'custom' || m.providers.includes(providerId)) &&
    m.protocols.includes(protocolId)
  );
  const pool = matching.length ? matching : MODEL_CATALOG;

  const groups = new Map();
  pool.forEach((entry) => {
    const g = entry.company || 'Модели';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(entry);
  });

  const col2Companies = new Set(['OpenAI', 'Anthropic']);
  const groupCount = groups.size;
  let col2Idx = 0;

  let html = '<button type="button"><selectedcontent></selectedcontent></button>';
  for (const [companyName, entries] of groups.entries()) {
    let grpCls = 'optgrp-c1';
    if (groupCount === 1) {
      grpCls = 'optgrp-full';
    } else if (col2Companies.has(companyName)) {
      grpCls = col2Idx === 0 ? 'optgrp-c2-first' : 'optgrp-c2-second';
      col2Idx++;
    }
    html += `<optgroup class="${grpCls}" label="${esc(companyName)}">`;
    entries.forEach((entry) => {
      const resolvedId = resolveModelIdForProvider(entry, providerId, protocolId);
      const estNum = estimateCost1000Rub(entry, entry.defaultThinking || 'off');
      const est = formatRubPrice(estNum);
      const qual = entry.qualityScore ? `${entry.qualityScore.toFixed(1)}/10` : '—';
      const qualTone = getQualityToneClass(entry.qualityScore);
      const costTone = getCostToneClass(estNum);
      html += `<option value="${esc(resolvedId)}"><span class="opt-row"><span class="opt-name">${esc(entry.label)}</span><span class="sr-only"> · Качество </span><span class="opt-qual ${qualTone}">${qual}</span><span class="sr-only"> · </span><span class="opt-cost ${costTone}">${esc(est)}<span class="sr-only"> за 1 000 товаров</span></span></span></option>`;
    });
    html += '</optgroup>';
  }

  if (Array.isArray(LOCAL_MODELS_CATALOG) && LOCAL_MODELS_CATALOG.length) {
    const mid = Math.ceil(LOCAL_MODELS_CATALOG.length / 2);
    const localLeft = LOCAL_MODELS_CATALOG.slice(0, mid);
    const localRight = LOCAL_MODELS_CATALOG.slice(mid);
    const renderLocalOpt = (lm) => {
      const qual = lm.qualityScore ? `${lm.qualityScore.toFixed(1)}/10` : '—';
      const qualTone = getQualityToneClass(lm.qualityScore);
      return `<option value="${esc(lm.id)}" disabled><span class="opt-row"><span class="opt-name">${esc(lm.label)}<span class="opt-local-badge">локально</span></span><span class="sr-only"> · Качество </span><span class="opt-qual ${qualTone}">${qual}</span><span class="sr-only"> · </span><span class="opt-cost tone-good">0 ₽<span class="sr-only"> за 1 000 товаров</span></span></span></option>`;
    };
    html += '<optgroup class="optgrp-local-l" label="Локальные модели (WebGPU · доступно локально)">';
    localLeft.forEach((lm) => { html += renderLocalOpt(lm); });
    html += '</optgroup>';
    if (localRight.length) {
      html += '<optgroup class="optgrp-local-r" label="&#160;">';
      localRight.forEach((lm) => { html += renderLocalOpt(lm); });
      html += '</optgroup>';
    }
  }

  html += `<option class="opt-custom-item" value="${CUSTOM_MODEL_VALUE}"><span class="opt-row"><span class="opt-name opt-custom">Другая модель (ввести вручную)…</span><span class="opt-qual"></span><span class="opt-cost"></span></span></option>`;
  setSafeHtml(apiModelSelect, html);

  const normTarget = String(targetModelId || '').trim();
  const options = [...apiModelSelect.options].map((o) => o.value);
  if (normTarget && options.includes(normTarget)) {
    apiModelSelect.value = normTarget;
    if (apiModelCustomWrap) apiModelCustomWrap.hidden = true;
    if (apiModelInp) apiModelInp.required = false;
  } else if (normTarget) {
    // Try matching by catalog entry (e.g. switching provider prefix)
    const entry = getModelCatalogEntry(normTarget);
    const resolved = entry ? resolveModelIdForProvider(entry, providerId, protocolId) : '';
    if (resolved && options.includes(resolved)) {
      apiModelSelect.value = resolved;
      if (apiModelCustomWrap) apiModelCustomWrap.hidden = true;
      if (apiModelInp) apiModelInp.required = false;
    } else {
      apiModelSelect.value = CUSTOM_MODEL_VALUE;
      if (apiModelInp) {
        apiModelInp.value = normTarget;
        apiModelInp.required = true;
      }
      if (apiModelCustomWrap) apiModelCustomWrap.hidden = false;
    }
  } else {
    apiModelSelect.selectedIndex = 0;
    if (apiModelCustomWrap) apiModelCustomWrap.hidden = true;
    if (apiModelInp) apiModelInp.required = false;
  }

  syncModelPricingAndThinking(getEffectiveSelectedModel());
}

function syncAllowedProtocols(providerId) {
  const preset = PROVIDER_PRESETS[providerId] || PROVIDER_PRESETS.proxyapi;
  const allowed = preset.allowedProtocols || ['openai', 'anthropic', 'google'];
  if (apiProtocolSel) {
    [...apiProtocolSel.options].forEach((opt) => {
      opt.disabled = !allowed.includes(opt.value);
    });
    if (!allowed.includes(apiProtocolSel.value)) {
      apiProtocolSel.value = preset.defaultProtocol || allowed[0];
    }
  }
  const isCustomProvider = providerId === 'custom';
  if (apiBaseUrlInp) {
    apiBaseUrlInp.readOnly = !isCustomProvider;
    apiBaseUrlInp.classList.toggle('api-readonly-url', !isCustomProvider);
    apiBaseUrlInp.title = isCustomProvider
      ? 'Укажите базовый URL совместимого API'
      : 'Официальный URL провайдера (для своего адреса выберите «Другой провайдер»)';
  }
  return apiProtocolSel ? apiProtocolSel.value : preset.defaultProtocol;
}

function updatePresetSuggestions(providerId, protocolId, overwriteInputs = false) {
  const preset = PROVIDER_PRESETS[providerId] || PROVIDER_PRESETS.proxyapi;
  const validProtocol = syncAllowedProtocols(providerId);
  const effectiveProto = (preset.allowedProtocols || ['openai', 'anthropic', 'google']).includes(protocolId)
    ? protocolId
    : validProtocol;
  const url = preset.urls[effectiveProto] || preset.urls[preset.defaultProtocol] || 'https://api.proxyapi.ru/v1';
  const models = preset.models[effectiveProto] || preset.models[preset.defaultProtocol] || [DEFAULT_MODEL_ID];

  if (overwriteInputs || providerId !== 'custom') {
    apiBaseUrlInp.value = url;
  }
  if (overwriteInputs) {
    populateModelSelect(providerId, effectiveProto, models[0] || DEFAULT_MODEL_ID);
  } else {
    populateModelSelect(providerId, effectiveProto, aiService.model || models[0] || DEFAULT_MODEL_ID);
  }
}

window.addEventListener('storage', (e) => {
  if (!e.key || e.key.startsWith('sparkle_ai_')) {
    aiService.loadFromStorage();
    syncApiBadges();
  }
});

function confirmDataAction({ title, description, confirmLabel = 'Подтвердить', danger = false }) {
  if (!dataConfirmDlg) return Promise.resolve(true);
  return new Promise((resolve) => {
    if (dataConfirmTitle) dataConfirmTitle.textContent = title;
    if (dataConfirmDesc) dataConfirmDesc.textContent = description;
    if (dataConfirmOk) {
      dataConfirmOk.textContent = confirmLabel;
      dataConfirmOk.classList.toggle('dm-danger-btn', danger);
    }
    dataConfirmDlg.returnValue = '';
    dataConfirmDlg.addEventListener('close', () => {
      const accepted = dataConfirmDlg.returnValue === 'confirm';
      dataConfirmDlg.returnValue = '';
      resolve(accepted);
    }, { once: true });
    dataConfirmDlg.showModal();
  });
}

function setDefaultDatasetStoragePref(mode) {
  defaultDatasetStoragePref = mode === 'indexeddb' ? 'indexeddb' : 'session';
  $$('input[name="ds-storage"]').forEach((r) => {
    r.checked = r.value === defaultDatasetStoragePref;
  });
}

async function renderSettingsDataPanel() {
  if (!settingsDataList) return;
  const [dsStats, localCacheInfo] = await Promise.all([
    datasetStore.getStats(),
    localLlmService.getCacheStats ? localLlmService.getCacheStats().catch(() => null) : Promise.resolve(null)
  ]);

  const idbSupported = datasetStore.isIndexedDbSupported();
  const hasSessionWorkData = Boolean(
    customDatasetCache || importedContext || (Array.isArray(lastRgmMatrix) && lastRgmMatrix.length > 1)
  );
  const localCacheBytes = (localCacheInfo && typeof localCacheInfo.bytes === 'number') ? localCacheInfo.bytes : 0;
  const hasUiCustomRam = isDarkMode() || Boolean(app?.classList.contains('col')) || Boolean(localMirrorUrl?.value?.trim());

  // Compute unified 3-level status ('empty' | 'ram' | 'disk') for every category
  const apiStatus = !aiService.hasKey()
    ? { level: 'empty', text: 'Пусто' }
    : (aiService.persistKey
      ? { level: 'disk', text: 'На диске · localStorage' }
      : { level: 'ram', text: 'В памяти (RAM)' });

  const dsStatus = dsStats.idbCount > 0
    ? { level: 'disk', text: `На диске · IDB: ${dsStats.idbCount} (${formatBytes(dsStats.idbBytes)})${dsStats.ramCount ? ` · RAM: ${dsStats.ramCount}` : ''}` }
    : (dsStats.ramCount > 0
      ? { level: 'ram', text: `В памяти (RAM) · ${dsStats.ramCount} (${formatBytes(dsStats.ramBytes)})` }
      : { level: 'empty', text: 'Пусто' });

  const webgpuStatus = localCacheBytes > 0
    ? { level: 'disk', text: `На диске · ${formatBytes(localCacheBytes)}` }
    : (localLlmService.cacheEnabled
      ? { level: 'disk', text: 'На диске · кэш вкл.' }
      : { level: 'empty', text: 'Пусто' });

  const sessionWorkStatus = hasSessionWorkData
    ? { level: 'ram', text: 'В памяти (RAM)' }
    : { level: 'empty', text: 'Пусто' };

  const riceStats = getRiceStorageStats();
  const uiStatus = uiPrefsPersist
    ? { level: 'disk', text: `На диске · тема: ${isDarkMode() ? 'тёмная' : 'светлая'}` }
    : (hasUiCustomRam
      ? { level: 'ram', text: `В памяти (RAM) · тема: ${isDarkMode() ? 'тёмная' : 'светлая'}` }
      : { level: 'empty', text: 'Пусто' });

  const groups = [
    {
      id: 'ai',
      label: 'ИИ',
      items: [
        {
          id: 'api',
          title: 'API-ключ и настройки ИИ',
          desc: 'Ключ и параметры подключения к облачным провайдерам.',
          status: apiStatus,
          modes: [
            { value: 'ram', label: 'RAM (по умолч.)', active: !aiService.persistKey },
            { value: 'localstorage', label: 'localStorage', active: aiService.persistKey }
          ],
          actions: [
            { id: 'clear-api', label: 'Очистить', disabled: !aiService.hasKey() }
          ]
        },
        {
          id: 'webgpu',
          title: 'Локальные модели (WebGPU)',
          desc: 'Веса Qwen3 в браузере (автоудаление или кэш).',
          status: webgpuStatus,
          modes: [
            { value: 'autopurge', label: 'Автоудаление (по умолч.)', active: !localLlmService.cacheEnabled },
            { value: 'cache', label: 'Кэш', active: localLlmService.cacheEnabled }
          ],
          actions: [
            { id: 'clear-webgpu', label: 'Очистить', disabled: localCacheBytes === 0 && !localLlmService.cacheEnabled }
          ]
        }
      ]
    },
    {
      id: 'data',
      label: 'Данные',
      items: [
        {
          id: 'session-work',
          title: 'Рабочие данные сессии',
          desc: 'Загруженные Excel/CSV, таблицы и контекст импорта.',
          status: sessionWorkStatus,
          fixedMode: 'Только RAM',
          modes: [],
          actions: [
            { id: 'clear-session-work', label: 'Очистить', disabled: !hasSessionWorkData }
          ]
        },
        {
          id: 'datasets',
          title: 'Сохранённые датасеты',
          desc: 'Таблицы из «Выделения атрибутов» для других вкладок.',
          status: dsStatus,
          modes: [
            { value: 'session', label: 'RAM (по умолч.)', active: defaultDatasetStoragePref === 'session' },
            { value: 'indexeddb', label: 'IndexedDB', active: defaultDatasetStoragePref === 'indexeddb', disabled: !idbSupported }
          ],
          actions: [
            { id: 'clear-ds-all', label: 'Очистить', disabled: dsStats.ramCount === 0 && dsStats.idbCount === 0 }
          ]
        },
        {
          id: 'analytics',
          title: 'Подготовка аналитики и дашборд',
          desc: 'Загруженный Excel-файл, рассчитанные метрики дашборда и кэш AI-выводов.',
          status: (() => {
            const hasBundle = Boolean(getCurrentDataset());
            const aiCnt = dashAiInsightCache.size;
            const aiSuffix = aiCnt > 0 ? ` · AI-кэш: ${aiCnt}` : '';
            if (!hasBundle && !aiCnt) return { level: 'empty', text: 'Пусто' };
            const isDemoDash = hasBundle && (currentDatasetKey === '0' || currentDatasetKey === '1');
            const dsName = getCurrentFileName() || 'набор';
            if (analyticsPersistDisk) {
              return {
                level: 'disk',
                text: isDemoDash
                  ? 'Демо-набор'
                  : `На диске · ${dsName}${aiSuffix}`
              };
            }
            return {
              level: 'ram',
              text: isDemoDash
                ? 'Демо-набор'
                : `В памяти (RAM) · ${dsName}${aiSuffix}`
            };
          })(),
          modes: [
            { value: 'ram', label: 'RAM (по умолч.)', active: !analyticsPersistDisk },
            { value: 'disk', label: 'IndexedDB', active: analyticsPersistDisk, disabled: !idbSupported }
          ],
          actions: [
            { id: 'clear-analytics', label: 'Очистить', disabled: !getCurrentDataset() && !analyticsPersistDisk && dashAiInsightCache.size === 0 }
          ]
        },
        {
          id: 'rice',
          title: 'Приоритизация (RICE)',
          desc: 'Список стратегических инициатив, перенесённые действия по рискам (-Р), оценки R/I/C/E и статусы.',
          status: riceStats.status,
          modes: [
            { value: 'ram', label: 'RAM (по умолч.)', active: !riceStats.persist },
            { value: 'localstorage', label: 'localStorage', active: riceStats.persist }
          ],
          actions: [
            { id: 'clear-rice', label: 'Очистить', disabled: riceStats.count === 0 }
          ]
        },
        {
          id: 'risk-workspace',
          title: 'Риск-менеджмент (Фреймворк PESTEL и Карта 3×3)',
          desc: 'Единый реестр рисков, сигналы PESTEL, матрица 3×3, пороги осей и кэш AI-анализа рисков.',
          status: (() => {
            const st = riskStore ? (riskStore.getStorageStats?.() || riskStore.getStats?.()) : null;
            if (!st) return { level: 'ram', text: 'Демо-набор (RAM)' };
            const rawStatus = st.status || { level: st.count > 0 ? 'ram' : 'empty', text: st.count > 0 ? `Демо-набор (RAM) · ${st.count}` : 'Пусто' };
            if (rawStatus.level === 'demo' || (st.isDemo && rawStatus.level === 'empty' && st.count > 0)) {
              return { level: 'ram', text: rawStatus.text || `Демо-набор (RAM) · ${st.count}` };
            }
            return rawStatus;
          })(),
          modes: [
            { value: 'ram', label: 'RAM (по умолч.)', active: !((riskStore?.getStorageStats?.() || riskStore?.getStats?.())?.persist) },
            { value: 'disk', label: 'IndexedDB', active: Boolean((riskStore?.getStorageStats?.() || riskStore?.getStats?.())?.persist), disabled: !idbSupported }
          ],
          actions: [
            {
              id: 'clear-risk-workspace',
              label: 'Очистить',
              disabled: (() => {
                const st = riskStore?.getStorageStats?.() || riskStore?.getStats?.();
                return !st || (st.count === 0 && !st.hasCustom && st.aiCacheCount === 0 && !st.persist);
              })()
            }
          ]
        }
      ]
    },
    {
      id: 'extra',
      label: 'Дополнительно',
      items: [
        {
          id: 'ui-prefs',
          title: 'Настройки интерфейса',
          desc: 'Тема оформления, боковая панель и зеркало WebGPU.',
          status: uiStatus,
          modes: [
            { value: 'ram', label: 'RAM (по умолч.)', active: !uiPrefsPersist },
            { value: 'localstorage', label: 'localStorage', active: uiPrefsPersist }
          ],
          actions: [
            { id: 'clear-ui-prefs', label: 'Сбросить', disabled: !uiPrefsPersist && !hasUiCustomRam }
          ]
        }
      ]
    }
  ];

  const items = groups.flatMap((g) => g.items);

  // Top summary indicators + Clear All disabled state
  const diskCount = items.filter((i) => i.status.level === 'disk').length;
  const ramCount = items.filter((i) => i.status.level === 'ram').length;
  const emptyCount = items.filter((i) => i.status.level === 'empty').length;

  if (dmSummaryPills) {
    setSafeHtml(dmSummaryPills, `
      <span class="dm-status ${diskCount > 0 ? 'is-disk' : 'is-empty'}"><span class="dm-dot" aria-hidden="true"></span>На диске: ${diskCount}</span>
      <span class="dm-status ${ramCount > 0 ? 'is-ram' : 'is-empty'}"><span class="dm-dot" aria-hidden="true"></span>В памяти (RAM): ${ramCount}</span>
      <span class="dm-status is-empty"><span class="dm-dot" aria-hidden="true"></span>Пусто: ${emptyCount}</span>
    `);
  }
  if (btnClearAllData) {
    btnClearAllData.disabled = diskCount === 0 && ramCount === 0;
  }

  setSafeHtml(settingsDataList, groups.map((group) => `
    <section class="dm-group" aria-labelledby="dm-grp-${group.id}">
      <h3 class="dm-group-title" id="dm-grp-${group.id}">${esc(group.label)}</h3>
      <div class="dm-group-box">
        ${group.items.map((item) => `
          <article class="dm-row" data-dm-id="${item.id}">
            <div class="dm-row-main">
              <div class="dm-row-hd">
                <span class="dm-card-title">${esc(item.title)}</span>
                <span class="dm-status is-${item.status.level}"><span class="dm-dot" aria-hidden="true"></span>${esc(item.status.text)}</span>
              </div>
              <div class="dm-card-desc">${esc(item.desc)}</div>
            </div>
            ${item.fixedMode
              ? `<span class="dm-fixed-mode">${esc(item.fixedMode)}</span>`
              : `<div class="dm-seg" role="group" aria-label="Режим хранения: ${esc(item.title)}">
                  ${item.modes.map((m) => `
                    <button type="button" class="dm-seg-btn" data-dm-mode="${item.id}:${m.value}" aria-pressed="${m.active}"${m.disabled ? ' disabled' : ''}>${esc(m.label)}</button>
                  `).join('')}
                </div>`
            }
            <div class="dm-row-actions">
              ${item.actions.map((a) => `
                <button type="button" class="bt sm" data-dm-action="${a.id}"${a.title ? ` title="${esc(a.title)}"` : ''}${a.disabled ? ' disabled' : ''}>${esc(a.label)}</button>
              `).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `).join(''));

  $$('[data-dm-mode]', settingsDataList).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.getAttribute('aria-pressed') === 'true') return;
      const [cat, val] = btn.dataset.dmMode.split(':');

      if (cat === 'api') {
        const toPersist = val === 'localstorage';
        const ok = await confirmDataAction({
          title: toPersist ? 'Сохранять API-ключ в localStorage?' : 'Перевести API-ключ в память сессии (RAM)?',
          description: toPersist
            ? 'API-ключ и настройки ИИ будут сохранены на диске в профиле браузера и останутся после перезагрузки страницы (до ручной очистки). Не рекомендуется на общих ПК.'
            : 'API-ключ и настройки ИИ будут немедленно удалены из localStorage и останутся только в оперативной памяти до закрытия или обновления вкладки.',
          confirmLabel: toPersist ? 'Включить localStorage' : 'Перевести в RAM'
        });
        if (!ok) return;
        aiService.setKeyPersistence(toPersist);
        syncApiBadges();
        toast(toPersist ? 'API-ключ теперь сохраняется в localStorage' : 'API-ключ переведён в память сессии (RAM)');
      } else if (cat === 'datasets') {
        const toIdb = val === 'indexeddb';
        const ok = await confirmDataAction({
          title: toIdb ? 'Сохранять новые датасеты в IndexedDB?' : 'Сохранять новые датасеты только в RAM?',
          description: toIdb
            ? 'В окне сохранения датасетов по умолчанию будет выбираться локальная БД браузера (IndexedDB), данные переживут перезагрузку страницы.'
            : 'В окне сохранения датасетов по умолчанию будет выбираться память сессии (RAM) — данные исчезнут при обновлении или закрытии вкладки.',
          confirmLabel: 'Сменить режим'
        });
        if (!ok) return;
        setDefaultDatasetStoragePref(toIdb ? 'indexeddb' : 'session');
        toast(toIdb ? 'Режим датасетов по умолчанию: IndexedDB' : 'Режим датасетов по умолчанию: RAM');
      } else if (cat === 'webgpu') {
        const toCache = val === 'cache';
        const ok = await confirmDataAction({
          title: toCache ? 'Включить кэш локальной модели в браузере?' : 'Включить автоудаление локальной модели?',
          description: toCache
            ? 'Веса локальной модели Qwen3 будут сохраняться на диске в кэше браузера, чтобы не скачивать их повторно.'
            : 'Автоудаление будет включено, а текущий кэш весов локальной модели в браузере будет очищен.',
          confirmLabel: toCache ? 'Включить кэш' : 'Включить автоудаление'
        });
        if (!ok) return;
        await handleCacheSwitchChange(toCache);
      } else if (cat === 'analytics') {
        const toDisk = val === 'disk';
        await setAnalyticsStorageMode(toDisk, { confirm: true });
      } else if (cat === 'rice') {
        const toPersist = val === 'localstorage';
        const ok = await confirmDataAction({
          title: toPersist ? 'Сохранять инициативы RICE в localStorage?' : 'Перевести RICE в память сессии (RAM)?',
          description: toPersist
            ? 'Список инициатив RICE будет сохраняться в localStorage браузера и переживёт перезагрузку страницы.'
            : 'Сохранённые инициативы будут удалены из localStorage и останутся только в RAM до закрытия вкладки.',
          confirmLabel: toPersist ? 'Включить localStorage' : 'Перевести в RAM'
        });
        if (!ok) return;
        setRicePersistence(toPersist);
        toast(toPersist ? 'Приоритизация (RICE): сохранение в localStorage' : 'Приоритизация (RICE): режим сессии (RAM)');
      } else if (cat === 'risk-workspace') {
        const toDisk = val === 'disk';
        await riskStore?.setStorageMode(toDisk, { confirm: true });
      } else if (cat === 'ui-prefs') {
        const toPersist = val === 'localstorage';
        const ok = await confirmDataAction({
          title: toPersist ? 'Сохранять настройки интерфейса в localStorage?' : 'Сбрасывать настройки интерфейса при перезагрузке (RAM)?',
          description: toPersist
            ? 'Тема оформления и состояние боковой панели будут сохраняться в localStorage и переживут перезагрузку страницы.'
            : 'Сохранённые настройки интерфейса будут удалены из localStorage. При следующем обновлении (F5) сайт откроется с настройками по умолчанию.',
          confirmLabel: toPersist ? 'Включить localStorage' : 'Перевести в RAM'
        });
        if (!ok) return;
        setUiPrefsPersistence(toPersist);
        toast(toPersist ? 'Настройки интерфейса теперь сохраняются в localStorage' : 'Настройки интерфейса переведены в режим сессии (RAM)');
      }
      await renderSettingsDataPanel();
    });
  });

  $$('[data-dm-action]', settingsDataList).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const act = btn.dataset.dmAction;

      if (act === 'clear-api') {
        const ok = await confirmDataAction({
          title: 'Очистить API-ключ?',
          description: 'API-ключ будет удалён из памяти сессии и из localStorage браузера. Настройки провайдера останутся.',
          confirmLabel: 'Очистить ключ',
          danger: true
        });
        if (!ok) return;
        aiService.clearConfig();
        if (apiKeyInp) apiKeyInp.value = '';
        syncApiBadges();
        toast('API-ключ удалён');
      } else if (act === 'clear-ds-all') {
        const ok = await confirmDataAction({
          title: 'Очистить сохранённые датасеты?',
          description: 'Все сохранённые наборы атрибутов будут удалены из памяти сессии (RAM) и из локальной базы IndexedDB.',
          confirmLabel: 'Очистить',
          danger: true
        });
        if (!ok) return;
        datasetStore.clearSession();
        await datasetStore.clearIndexedDb();
        await refreshSavedDatasetsUi();
        toast('Сохранённые датасеты очищены');
      } else if (act === 'clear-webgpu') {
        const ok = await confirmDataAction({
          title: 'Очистить кэш локальных AI-моделей?',
          description: 'Все скачанные веса моделей WebGPU будут удалены из кэша браузера. При следующем запуске модель скачается заново.',
          confirmLabel: 'Очистить кэш',
          danger: true
        });
        if (!ok) return;
        await clearAllLocalCacheAction();
      } else if (act === 'clear-session-work') {
        const ok = await confirmDataAction({
          title: 'Очистить рабочие данные текущей сессии?',
          description: 'Загруженный файл импорта, таблица результатов разбора атрибутов и пользовательский файл Дашборда будут сброшены.',
          confirmLabel: 'Очистить сессию',
          danger: true
        });
        if (!ok) return;
        clearImportedBuffer();
        customDatasetCache = null;
        lastRgmHeaders = [];
        lastRgmRows = [];
        lastRgmMatrix = [];
        lastRgmCellStyles = {};
        $('#res')?.replaceChildren();
        if (resLimitNote) resLimitNote.hidden = true;
        if (B) setStepState(B, 'i');
        toast('Рабочие данные текущей сессии очищены');
      } else if (act === 'clear-analytics') {
        const ok = await confirmDataAction({
          title: 'Удалить данные подготовки аналитики и дашборда?',
          description: 'Загруженный Excel-файл и рассчитанные метрики будут удалены из памяти сессии (RAM) и из IndexedDB браузера.',
          confirmLabel: 'Удалить данные',
          danger: true
        });
        if (!ok) return;
        await clearAnalyticsDataset();
      } else if (act === 'clear-rice') {
        const ok = await confirmDataAction({
          title: 'Очистить список инициатив RICE?',
          description: 'Все инициативы RICE будут удалены из памяти сессии и из localStorage браузера.',
          confirmLabel: 'Очистить RICE',
          danger: true
        });
        if (!ok) return;
        clearRiceData();
        toast('Список инициатив RICE очищен');
      } else if (act === 'clear-risk-workspace') {
        const ok = await confirmDataAction({
          title: 'Очистить единый реестр рисков (PESTEL и Карта 3×3)?',
          description: 'Все риски, сигналы PESTEL, стратегии, планы мер и кэш AI-анализа стыков будут удалены из памяти сессии (RAM) и из IndexedDB браузера.',
          confirmLabel: 'Очистить риски',
          danger: true
        });
        if (!ok) return;
        await riskStore?.clearAllData();
      } else if (act === 'clear-ui-prefs') {
        const ok = await confirmDataAction({
          title: 'Сбросить настройки интерфейса?',
          description: 'Тема вернётся к светлой, боковая панель развернётся, режим хранения вернётся в RAM, а сохранённые ключи интерфейса будут удалены из localStorage.',
          confirmLabel: 'Сбросить',
          danger: true
        });
        if (!ok) return;
        setUiPrefsPersistence(false);
        applyTheme('light', { persist: false });
        app.classList.remove('col');
        $('#tg')?.setAttribute('aria-expanded', 'true');
        if (localMirrorUrl) localMirrorUrl.value = '';
        if (dashMirrorUrl) dashMirrorUrl.value = '';
        toast('Настройки интерфейса сброшены');
      }
      await renderSettingsDataPanel();
    });
  });
}

btnClearAllData?.addEventListener('click', async () => {
  if (btnClearAllData.disabled) return;
  const ok = await confirmDataAction({
    title: 'Очистить ВСЕ данные приложения?',
    description: 'Будут безвозвратно удалены: API-ключ и настройки ИИ, все сохранённые датасеты (RAM и IndexedDB), кэш локальных WebGPU-моделей, текущие рабочие таблицы в RAM и настройки интерфейса.',
    confirmLabel: 'Очистить всё',
    danger: true
  });
  if (!ok) return;

  aiService.clearAllSettings();
  if (apiKeyInp) apiKeyInp.value = '';
  datasetStore.clearSession();
  await datasetStore.clearIndexedDb();
  await localLlmService.purgeAllLocalCaches();
  localLlmService.setCacheEnabled?.(false);
  clearImportedBuffer();
  customDatasetCache = null;
  lastRgmHeaders = [];
  lastRgmRows = [];
  lastRgmMatrix = [];
  lastRgmCellStyles = {};
  $('#res')?.replaceChildren();
  if (resLimitNote) resLimitNote.hidden = true;
  if (B) setStepState(B, 'i');
  setUiPrefsPersistence(false);
  setRicePersistence(false);
  clearRiceData();
  await riskStore?.setStorageMode(false, { confirm: false, silent: true });
  await riskStore?.clearAllData({ silent: true });
  await setAnalyticsStorageMode(false, { confirm: false, silent: true });
  await clearAnalyticsDataset({ silent: true });
  applyTheme('light', { persist: false });
  app.classList.remove('col');
  $('#tg')?.setAttribute('aria-expanded', 'true');
  if (localMirrorUrl) localMirrorUrl.value = '';
  if (dashMirrorUrl) dashMirrorUrl.value = '';
  setDefaultDatasetStoragePref('session');
  syncApiBadges();
  syncLocalAiControlsUi();
  await refreshLocalCacheStatus();
  await refreshSavedDatasetsUi();
  await renderSettingsDataPanel();
  toast('Все локальные данные Sparkle App полностью очищены');
});

function selectSettingsTab(tabKey, moveFocus = false) {
  const isData = tabKey === 'data';
  settingsTabButtons.forEach((btn) => {
    const active = btn.dataset.settingsTab === (isData ? 'data' : 'api');
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
    btn.toggleAttribute('focusgroupstart', active);
    if (active && moveFocus) btn.focus();
  });
  if (settingsPanelApi) settingsPanelApi.hidden = isData;
  if (settingsPanelData) settingsPanelData.hidden = !isData;
  if (isData) {
    renderSettingsDataPanel();
  }
}

settingsTabButtons.forEach((btn, idx) => {
  btn.addEventListener('click', () => selectSettingsTab(btn.dataset.settingsTab));
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      let nextIdx = idx;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % settingsTabButtons.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + settingsTabButtons.length) % settingsTabButtons.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = settingsTabButtons.length - 1;
      selectSettingsTab(settingsTabButtons[nextIdx].dataset.settingsTab, true);
    }
  });
});

function openSettingsDialog(tab = 'api', statusMessage = '') {
  if (!apiDlg) return;
  const attrCfg = aiService.getTaskConfig('attributes');
  const dashCfg = aiService.getTaskConfig('dashboard');
  const riskCfg = aiService.getTaskConfig('risk');

  apiProviderSel.value = aiService.provider || 'proxyapi';
  apiProtocolSel.value = aiService.protocol || 'openai';
  apiBaseUrlInp.value = aiService.baseUrl || 'https://api.proxyapi.ru/v1';
  apiModelInp.value = attrCfg.model || DEFAULT_MODEL_ID;
  pendingThinkingAttr = attrCfg.thinkingLevel || getDefaultThinkingForTask(attrCfg.model, 'attributes');
  pendingThinkingDash = dashCfg.thinkingLevel || getDefaultThinkingForTask(dashCfg.model, 'dashboard');
  pendingThinkingRisk = riskCfg.thinkingLevel || getDefaultThinkingForTask(riskCfg.model, 'risk');
  apiKeyInp.value = aiService.key || '';
  apiKeyInp.type = 'password';

  updatePresetSuggestions(apiProviderSel.value, apiProtocolSel.value, false);
  populateModelSelect(apiProviderSel.value, apiProtocolSel.value, attrCfg.model || DEFAULT_MODEL_ID);
  syncModelPricingAndThinking(getEffectiveSelectedModel(), pendingThinkingAttr, pendingThinkingDash, pendingThinkingRisk);
  syncApiKeyStorageBadge();
  if (apiStatusEl) apiStatusEl.textContent = statusMessage;
  selectSettingsTab(tab);
  if (!apiDlg.open) apiDlg.showModal();
}

function openApiDialog(statusMessage = '') {
  openSettingsDialog('api', statusMessage);
}

$('#btn-open-settings')?.addEventListener('click', () => {
  closeMobileSidebar(false);
  openSettingsDialog('data');
});

$$('[data-open-api]').forEach((btn) => {
  btn.addEventListener('click', () => openSettingsDialog('api'));
});

$('#api-close')?.addEventListener('click', () => apiDlg.close());

apiProviderSel?.addEventListener('change', () => {
  const preset = PROVIDER_PRESETS[apiProviderSel.value] || PROVIDER_PRESETS.proxyapi;
  apiProtocolSel.value = preset.defaultProtocol || 'openai';
  updatePresetSuggestions(apiProviderSel.value, apiProtocolSel.value, true);
  const nextModel = getEffectiveSelectedModel();
  syncModelPricingAndThinking(
    nextModel,
    getDefaultThinkingForTask(nextModel, 'attributes'),
    getDefaultThinkingForTask(nextModel, 'dashboard'),
    getDefaultThinkingForTask(nextModel, 'risk')
  );
  if (apiStatusEl) apiStatusEl.textContent = '';
});

apiProtocolSel?.addEventListener('change', () => {
  updatePresetSuggestions(apiProviderSel.value, apiProtocolSel.value, true);
  const nextModel = getEffectiveSelectedModel();
  syncModelPricingAndThinking(
    nextModel,
    getDefaultThinkingForTask(nextModel, 'attributes'),
    getDefaultThinkingForTask(nextModel, 'dashboard'),
    getDefaultThinkingForTask(nextModel, 'risk')
  );
  if (apiStatusEl) apiStatusEl.textContent = '';
});

apiModelSelect?.addEventListener('change', () => {
  const isCustom = apiModelSelect.value === CUSTOM_MODEL_VALUE;
  if (apiModelCustomWrap) apiModelCustomWrap.hidden = !isCustom;
  if (apiModelInp) {
    apiModelInp.required = isCustom;
    if (isCustom) {
      apiModelInp.focus();
    } else {
      apiModelInp.value = apiModelSelect.value;
    }
  }
  const nextModel = getEffectiveSelectedModel();
  syncModelPricingAndThinking(
    nextModel,
    getDefaultThinkingForTask(nextModel, 'attributes'),
    getDefaultThinkingForTask(nextModel, 'dashboard'),
    getDefaultThinkingForTask(nextModel, 'risk')
  );
});

apiModelInp?.addEventListener('input', () => {
  if (apiModelSelect?.value === CUSTOM_MODEL_VALUE) {
    syncModelPricingAndThinking(apiModelInp.value.trim(), pendingThinkingAttr, pendingThinkingDash, pendingThinkingRisk);
  }
});

apiThinkingAttrSel?.addEventListener('change', () => {
  syncModelPricingAndThinking(getEffectiveSelectedModel(), apiThinkingAttrSel.value, pendingThinkingDash, pendingThinkingRisk);
});

apiThinkingDashSel?.addEventListener('change', () => {
  syncModelPricingAndThinking(getEffectiveSelectedModel(), pendingThinkingAttr, apiThinkingDashSel.value, pendingThinkingRisk);
});

apiThinkingRiskSel?.addEventListener('change', () => {
  syncModelPricingAndThinking(getEffectiveSelectedModel(), pendingThinkingAttr, pendingThinkingDash, apiThinkingRiskSel.value);
});

apiKeyToggle?.addEventListener('click', () => {
  const show = apiKeyInp.type === 'password';
  apiKeyInp.type = show ? 'text' : 'password';
  apiKeyToggle.setAttribute('aria-pressed', String(show));
  apiKeyToggle.textContent = show ? 'Скрыть' : 'Показать';
});

apiForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const modelVal = getEffectiveSelectedModel();
  if (!modelVal) {
    if (apiStatusEl) apiStatusEl.textContent = 'Укажите идентификатор модели (Model ID).';
    apiModelInp?.focus();
    return;
  }
  aiService.saveConfig({
    provider: apiProviderSel.value,
    protocol: apiProtocolSel.value,
    baseUrl: apiBaseUrlInp.value,
    profiles: {
      attributes: { model: modelVal, thinkingLevel: pendingThinkingAttr },
      dashboard: { model: modelVal, thinkingLevel: pendingThinkingDash },
      risk: { model: modelVal, thinkingLevel: pendingThinkingRisk }
    },
    apiKey: apiKeyInp.value
  });
  syncApiBadges();
  apiDlg.close();
  toast('Настройки AI API сохранены');
});

apiTestBtn?.addEventListener('click', async () => {
  const keyVal = apiKeyInp.value.trim();
  if (!keyVal) {
    if (apiStatusEl) apiStatusEl.textContent = 'Введите API-ключ для проверки соединения.';
    apiKeyInp.focus();
    return;
  }
  const modelVal = getEffectiveSelectedModel();
  if (!modelVal) {
    if (apiStatusEl) apiStatusEl.textContent = 'Укажите идентификатор модели (Model ID).';
    apiModelInp?.focus();
    return;
  }
  aiService.saveConfig({
    provider: apiProviderSel.value,
    protocol: apiProtocolSel.value,
    baseUrl: apiBaseUrlInp.value,
    profiles: {
      attributes: { model: modelVal, thinkingLevel: pendingThinkingAttr },
      dashboard: { model: modelVal, thinkingLevel: pendingThinkingDash },
      risk: { model: modelVal, thinkingLevel: pendingThinkingRisk }
    },
    apiKey: keyVal
  });
  syncApiBadges();
  apiTestBtn.setAttribute('aria-busy', 'true');
  if (apiStatusEl) apiStatusEl.textContent = 'Проверяем соединение с API…';

  try {
    const reply = await aiService.testConnection();
    if (apiStatusEl) apiStatusEl.textContent = `Успешно (${aiService.protocol}): ${reply || 'OK'}`;
  } catch (err) {
    if (apiStatusEl) apiStatusEl.textContent = `Ошибка: ${err.message}`;
  } finally {
    apiTestBtn.removeAttribute('aria-busy');
  }
});

apiClearBtn?.addEventListener('click', async () => {
  const ok = await confirmDataAction({
    title: 'Очистить API-ключ?',
    description: 'API-ключ будет удалён из памяти сессии и из localStorage браузера. Настройки провайдера и модели останутся.',
    confirmLabel: 'Очистить ключ',
    danger: true
  });
  if (!ok) return;
  aiService.clearConfig();
  apiKeyInp.value = '';
  syncApiBadges();
  if (apiStatusEl) apiStatusEl.textContent = 'API-ключ очищен из браузера.';
  toast('API-ключ удалён');
});

// Dashboard Margin Map AI: supports both Cloud API and Local WebGPU Model
const dashLocalPanel = $('#dash-local-ai-panel');
const dashModelSelect = $('#dash-local-model-select');
const dashModelDiff = $('#dash-local-model-diff');
const dashMirrorToggle = $('#btn-dash-mirror-toggle');
const dashMirrorWrap = $('#dash-local-mirror-wrap');
const dashMirrorUrl = $('#dash-local-mirror-url');
const dashCacheSwitch = $('#dash-local-cache-switch');
const dashCacheStatus = $('#dash-local-cache-status');
const dashCacheHint = $('#dash-local-cache-hint');
const dashAiPill = $('#dash-ai-pill');
const dashAiSettingsBtn = $('#dash-ai-settings-btn');
const dashLocalProgressBox = $('#dash-local-progress-box');
const dashLocalProg = $('#dash-local-prog');
const dashLocalStatus = $('#dash-local-status');

function syncDashAiModeUi() {
  const mode = $('input[name="dash-ai-mode"]:checked')?.value || 'local-ai';
  const isLocal = mode === 'local-ai';

  if (dashAiSettingsBtn) {
    dashAiSettingsBtn.textContent = isLocal ? 'Параметры модели' : 'Настройка API';
    dashAiSettingsBtn.setAttribute('aria-expanded', isLocal ? String(!dashLocalPanel?.hidden) : 'false');
  }
  if (!isLocal && dashLocalPanel) {
    dashLocalPanel.hidden = true;
  }
  if (dashAiPill) {
    if (isLocal) {
      const spec = localLlmService.getActiveModelSpec();
      dashAiPill.textContent = `${spec.shortName} · ${localLlmService.cacheEnabled ? 'кэш вкл' : 'автоудаление'}`;
    } else {
      dashAiPill.textContent = aiService.getSummaryBadge('dashboard');
    }
  }
}

$$('input[name="dash-ai-mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    syncLocalAiControlsUi();
    syncDashAiModeUi();
  });
});

dashAiSettingsBtn?.addEventListener('click', () => {
  const mode = $('input[name="dash-ai-mode"]:checked')?.value || 'local-ai';
  if (mode === 'local-ai' && dashLocalPanel) {
    const nextHidden = !dashLocalPanel.hidden;
    dashLocalPanel.hidden = nextHidden;
    dashAiSettingsBtn.setAttribute('aria-expanded', String(!nextHidden));
    if (!nextHidden) syncLocalAiControlsUi();
  } else {
    openApiDialog('', 'dashboard');
  }
});

$('#btn-cancel-dash-local')?.addEventListener('click', async () => {
  localLlmService.terminateWorker();
  if (!localLlmService.cacheEnabled) {
    await localLlmService.purgeAllLocalCaches();
  }
  await refreshLocalCacheStatus();
  if (dashLocalProgressBox) dashLocalProgressBox.hidden = true;
  const btn = $('#btn-ai-analyze-marg');
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Сгенерировать через AI';
  }
  toast('Локальная генерация выводов отменена');
});

function persistDashboardAiCacheIfDisk() {
  if (!analyticsPersistDisk) return;
  const bundle = getCurrentDataset();
  if (!bundle) return;
  saveAnalyticsToDisk({
    bundle,
    fileName: getCurrentFileName(),
    datasetKey: currentDatasetKey,
    isCustom: currentDatasetKey === 'user',
    meta: lastAnalyticsMeta
  });
}

function buildDashboardAiPayload(bundle) {
  const mm = bundle?.marg_map;
  const quadAliases = {
    'Топ товары': new Set(['Топ товары', 'top_right']),
    'Рассмотреть пути повышения маржинальности': new Set(['Рассмотреть пути повышения маржинальности', 'top_left']),
    'Рассмотреть пути повышения продаж': new Set(['Рассмотреть пути повышения продаж', 'bottom_right']),
    'Отстающие товары': new Set(['Отстающие товары', 'bottom_left'])
  };

  const filteredItems = (mm?.items || []).filter((it) => {
    const catOk = matchesCatFilter(it.category);
    const skuKey = `${it.category}_${it.product}`;
    const skuOk = matchesSkuFilter(skuKey) || matchesSkuFilter(it.product);
    const quadOk = !currentQuadFilter || currentQuadFilter === 'all' ||
      it.quadrant === currentQuadFilter || Boolean(quadAliases[currentQuadFilter]?.has(it.quadrant));
    return catOk && skuOk && quadOk;
  });

  const enrichedItems = filteredItems.map((it) => {
    const profitRub = (it.sales_rub || 0) - (it.costs_rub || 0);
    const quadMeta = getQuadrantMeta(it.quadrant);
    const elasticity = computeSkuElasticityStats(bundle, it.category, it.product);
    const seasonality = computeSkuSeasonalityStats(bundle, it.category, it.product);
    return {
      ...it,
      profit_rub: profitRub,
      quadrant_ru: quadMeta.label,
      elasticity,
      seasonality
    };
  });

  const filterParts = [];
  if (currentYearFilter instanceof Set) filterParts.push(`Годы: ${[...currentYearFilter].sort().join(', ')}`);
  if (currentCatFilter instanceof Set) filterParts.push(`Категории: ${[...currentCatFilter].join(', ')}`);
  if (currentSkuFilter instanceof Set) filterParts.push(`SKU: ${currentSkuFilter.size} шт.`);
  if (currentQuadFilter && currentQuadFilter !== 'all') filterParts.push(`Группа: ${getQuadrantMeta(currentQuadFilter).label}`);

  return {
    year: mm?.year || '',
    periodRange: getBundleYearRange(bundle),
    filterNote: filterParts.join(' · '),
    items: enrichedItems
  };
}

function getDashboardAiCacheKey(mode, payload) {
  const modelId = mode === 'local-ai'
    ? (localLlmService.getActiveModelSpec()?.id || 'local')
    : (aiService.getTaskConfig('dashboard')?.model || aiService.model || 'api');
  const yrKey = currentYearFilter === 'all' ? 'all' : [...currentYearFilter].sort().join(',');
  const catKey = currentCatFilter === 'all' ? 'all' : [...currentCatFilter].sort().join(',');
  const skuKey = currentSkuFilter === 'all' ? 'all' : [...currentSkuFilter].sort().join(',');
  const totalSales = Math.round(payload.items.reduce((acc, it) => acc + (it.sales_rub || 0), 0));
  return `${mode}|${modelId}|${currentDatasetKey}|${getCurrentFileName()}|${yrKey}|${catKey}|${skuKey}|${currentQuadFilter}|${payload.items.length}|${totalSales}`;
}

function renderAiInsightCard(reply) {
  currentAiComment = reply;
  const bundle = getCurrentDataset();
  if (bundle) bundle.ai_comment = reply;
  const card = $('#ai-insight-card');
  if (card) {
    card.hidden = false;
    setSafeHtml($('#ai-insight-body'), `<p>${formatSimpleMd(reply)}</p>`);
  }
}

$('#btn-ai-analyze-marg')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const bundle = getCurrentDataset();
  if (!bundle?.marg_map) {
    toast('Сначала загрузите аналитические данные');
    return;
  }

  const aiPayload = buildDashboardAiPayload(bundle);
  if (!aiPayload.items.length) {
    toast('По выбранным фильтрам нет товаров для AI-анализа');
    return;
  }

  const mode = $('input[name="dash-ai-mode"]:checked')?.value || 'local-ai';
  const cacheKey = getDashboardAiCacheKey(mode, aiPayload);
  if (dashAiInsightCache.has(cacheKey)) {
    renderAiInsightCard(dashAiInsightCache.get(cacheKey));
    toast('Загружен кэшированный вывод AI (данные и фильтры не менялись)');
    return;
  }

  if (mode === 'local-ai') {
    if (!localLlmService.isEngineReadyForCurrentModel()) {
      const confirmed = await confirmLocalDownload();
      if (!confirmed) {
        toast('Загрузка локальной модели отменена');
        return;
      }
    }

    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    const origLabel = btn.textContent;
    btn.textContent = 'Локальный AI анализирует…';
    if (dashLocalProgressBox && dashLocalProg && dashLocalStatus) {
      dashLocalProgressBox.hidden = false;
      dashLocalProg.value = 2;
      dashLocalStatus.textContent = 'Проверка WebGPU и подготовка…';
    }

    try {
      const reply = await localLlmService.analyzeMarginMap(aiPayload, {
        onProgress: ({ pct, stage }) => {
          if (dashLocalProg) dashLocalProg.value = pct;
          if (dashLocalStatus) dashLocalStatus.textContent = stage;
        }
      });
      dashAiInsightCache.set(cacheKey, reply);
      renderAiInsightCard(reply);
      persistDashboardAiCacheIfDisk();
      await refreshLocalCacheStatus();
      toast('Выводы локального AI обновлены (матрица + эластичность)');
    } catch (err) {
      console.error('[Local AI Margin Map]', err);
      if (!localLlmService.aborted) {
        toast(`Ошибка WebGPU: ${err.message}`);
      }
    } finally {
      if (dashLocalProgressBox) dashLocalProgressBox.hidden = true;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = origLabel;
    }
    return;
  }

  // Cloud API mode
  if (!aiService.hasKey()) {
    openApiDialog('Укажите API-ключ (по умолчанию ProxyAPI) для генерации выводов.');
    return;
  }

  btn.setAttribute('aria-busy', 'true');
  btn.disabled = true;
  const origLabel = btn.textContent;
  btn.textContent = 'AI анализирует товары…';

  try {
    const reply = await aiService.analyzeMarginMap(aiPayload);
    dashAiInsightCache.set(cacheKey, reply);
    renderAiInsightCard(reply);
    persistDashboardAiCacheIfDisk();
    toast('Выводы AI обновлены (матрица + эластичность)');
  } catch (err) {
    console.error('[AI Margin Map]', err);
    toast(`Ошибка API: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = origLabel;
  }
});

/* ==========================================================================
   Framework Phases Focus Stepper (Accessible Tabs + Full Diagram View)
   ========================================================================== */
let activeFwPh = 0;

function setPh(k) {
  activeFwPh = k;
  const fwSec = $('section[data-v="framework"]');
  const isAll = fwSec?.getAttribute('data-fw-view') === 'all';
  const tabs = $$('#phs [role="tab"]');
  const panels = $$('[data-fw-panel]');
  tabs.forEach((btn, i) => {
    const active = i === k;
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
    if (active && !isAll) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
  panels.forEach((panel, i) => {
    const active = isAll || i === k;
    if (active) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', 'until-found');
    }
  });
}

function setFwViewMode(mode) {
  const fwSec = $('section[data-v="framework"]');
  if (!fwSec) return;
  const next = (mode === 'all' || mode === 'slide') ? mode : 'step';
  fwSec.setAttribute('data-fw-view', next);
  $$('[data-fw-mode]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('data-fw-mode') === next));
  });
  const slideView = $('#fw-slide-view');
  if (slideView) slideView.hidden = next !== 'slide';
  $$('.fw-phase-banner', fwSec).forEach((banner) => {
    if (next === 'all') {
      banner.removeAttribute('aria-hidden');
    } else {
      banner.setAttribute('aria-hidden', 'true');
    }
  });
  if (next !== 'slide') setPh(activeFwPh);
}

const fwSlideDlg = $('#fw-slide-dlg');
const fwSlideFrame = $('#fw-slide-frame');
const fwSlideViewport = $('#fw-slide-viewport');
const fwSlideImg = $('#fw-slide-img');
const fwZoomPct = $('#fw-zoom-pct');
const fwZoomReset = $('#fw-zoom-reset');

let fwScale = 1;
let fwTx = 0;
let fwTy = 0;
let fwDragging = false;
let fwDragStartX = 0;
let fwDragStartY = 0;
let fwDragOriginX = 0;
let fwDragOriginY = 0;

function applyFwSlideTransform() {
  if (fwSlideImg) {
    fwSlideImg.style.transform = `translate(${fwTx}px, ${fwTy}px) scale(${fwScale})`;
  }
  if (fwZoomPct) {
    fwZoomPct.textContent = `${Math.round(fwScale * 100)}%`;
  }
}

function resetFwSlideTransform() {
  fwScale = 1;
  fwTx = 0;
  fwTy = 0;
  applyFwSlideTransform();
}

function openFwSlideDialog(customSrc = '', customTitle = '') {
  if (!fwSlideDlg) return;
  const img = $('#fw-slide-img');
  const hdTitle = $('.fw-slide-dlg-hd > span', fwSlideDlg);
  const dlLink = $('.fw-slide-dlg-hd a[download]', fwSlideDlg);
  const src = customSrc || 'images/sts_strategy_analytics_framework.png';
  const title = customTitle || 'Фреймворк стратегической аналитики';
  if (img) {
    img.src = src;
    img.alt = title;
  }
  if (hdTitle) hdTitle.textContent = title;
  if (dlLink) {
    dlLink.href = src;
    dlLink.download = `${title}.png`;
  }
  resetFwSlideTransform();
  fwSlideDlg.showModal();
}

fwSlideFrame?.addEventListener('click', () => openFwSlideDialog());
fwSlideFrame?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openFwSlideDialog();
  }
});
$('#fw-slide-dlg-close')?.addEventListener('click', () => fwSlideDlg?.close());
fwZoomReset?.addEventListener('click', resetFwSlideTransform);

fwSlideViewport?.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const nextScale = Math.max(0.5, Math.min(4, fwScale * factor));
  if (nextScale === fwScale) return;
  const rect = fwSlideViewport.getBoundingClientRect();
  const cx = e.clientX - (rect.left + rect.width / 2);
  const cy = e.clientY - (rect.top + rect.height / 2);
  const ratio = nextScale / fwScale;
  fwTx = cx - (cx - fwTx) * ratio;
  fwTy = cy - (cy - fwTy) * ratio;
  fwScale = nextScale;
  applyFwSlideTransform();
}, { passive: false });

fwSlideViewport?.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  fwDragging = true;
  fwDragStartX = e.clientX;
  fwDragStartY = e.clientY;
  fwDragOriginX = fwTx;
  fwDragOriginY = fwTy;
  fwSlideViewport.classList.add('is-dragging');
  fwSlideViewport.setPointerCapture(e.pointerId);
});

fwSlideViewport?.addEventListener('pointermove', (e) => {
  if (!fwDragging) return;
  fwTx = fwDragOriginX + (e.clientX - fwDragStartX);
  fwTy = fwDragOriginY + (e.clientY - fwDragStartY);
  applyFwSlideTransform();
});

const endFwDrag = (e) => {
  if (!fwDragging) return;
  fwDragging = false;
  fwSlideViewport?.classList.remove('is-dragging');
  try { fwSlideViewport?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
};

fwSlideViewport?.addEventListener('pointerup', endFwDrag);
fwSlideViewport?.addEventListener('pointercancel', endFwDrag);
fwSlideViewport?.addEventListener('dblclick', resetFwSlideTransform);

$$('[data-fw-mode]').forEach((btn) => {
  btn.addEventListener('click', () => setFwViewMode(btn.getAttribute('data-fw-mode')));
});

$$('[data-fw-jump]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = Number(btn.getAttribute('data-fw-jump'));
    if (!Number.isInteger(target)) return;
    setPh(target);
    const fwSec = $('section[data-v="framework"]');
    if (fwSec && fwSec.getAttribute('data-fw-view') === 'step') {
      $('#phs')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  });
});

$$('[data-fw-panel]').forEach((panel, i) => {
  panel.addEventListener('beforematch', () => setPh(i));
});

if ($('#phs')) {
  setupTabs($('#phs'), setPh)(0);
}

/* ==========================================================================
   Unified Risk Workspace: PESTEL Framework & 3x3 Risk Map + RICE Bridge
   ========================================================================== */
let riskMapCtrl = null;
let riskFrameworkCtrl = null;

function getCompanyContext() {
  // (a) Dashboard / Analytics
  const bundle = getCurrentDataset();
  let dashboard = { available: false, label: 'Нет данных', summary: 'Данные дашборда не загружены.' };
  if (bundle) {
    const fileName = getCurrentFileName() || 'Набор данных';
    const vmpc = bundle.vmpc || bundle.fig_vmpc;
    const margItems = bundle.marg_map?.items || [];
    const cats = getBundleCategories(bundle);
    const years = getBundleYears(bundle);
    const parts = [`Источник: ${fileName}${years.length ? ` (${years.join('–')} гг.)` : ''}`];
    if (vmpc && Number.isFinite(vmpc.prev_profit) && Number.isFinite(vmpc.curr_profit)) {
      const diff = vmpc.curr_profit - vmpc.prev_profit;
      const pct = vmpc.prev_profit ? ((diff / Math.abs(vmpc.prev_profit)) * 100).toFixed(1) : '0';
      parts.push(`Прибыль VMPC (${vmpc.prev_year}→${vmpc.curr_year}): ${Math.round(vmpc.prev_profit).toLocaleString('ru-RU')} → ${Math.round(vmpc.curr_profit).toLocaleString('ru-RU')} ₽ (${diff >= 0 ? '+' : ''}${pct}%)`);
    }
    if (cats.length) {
      parts.push(`Категории (${cats.length}): ${cats.slice(0, 8).join(', ')}`);
    }
    if (margItems.length) {
      const sortedByRev = [...margItems].sort((a, b) => (b.sales_rub || 0) - (a.sales_rub || 0));
      const topSku = sortedByRev.slice(0, 5).map((x) => `${x.product} (${x.category}, маржа ${(x.margin_pct || 0).toFixed(1)}%)`);
      const problemSku = margItems
        .filter((x) => (x.margin_pct || 0) < 15 || x.quadrant === 'bottom_left' || /отстающ|проблем/i.test(x.quadrant_ru || ''))
        .slice(0, 5)
        .map((x) => `${x.product} (маржа ${(x.margin_pct || 0).toFixed(1)}%)`);
      if (topSku.length) parts.push(`Топ SKU по выручке: ${topSku.join('; ')}`);
      if (problemSku.length) parts.push(`Проблемные / низкомаржинальные SKU: ${problemSku.join('; ')}`);
    }
    dashboard = {
      available: true,
      label: `${fileName} (${margItems.length} SKU)`,
      summary: parts.join('\n')
    };
  }

  // (b) RICE initiatives
  const rice = getRiceContextSummary();

  // (c) Current risks
  const allRisks = riskStore?.getRisks?.() || [];
  const risks = allRisks.length
    ? {
        available: true,
        count: allRisks.length,
        summary: `Текущий реестр рисков (${allRisks.length} шт.):\n` + allRisks.slice(0, 15).map((r, i) =>
          `${i + 1}. [${r.pestel || '—'} | ${r.curve || '—'}] ${r.title || 'Без названия'}${r.decision ? ` → мера: ${r.decision}` : ''}`
        ).join('\n')
      }
    : { available: false, count: 0, summary: 'Реестр рисков пуст.' };

  return { dashboard, rice, risks };
}

riskStore = createRiskWorkspaceStore({
  runWasmRiskMatrix,
  toast,
  confirmDataAction,
  riceBridge: {
    upsertRisk: upsertRiskInitiative,
    removeRisk: removeRiskInitiativeByRiskId,
    removeFromRice: removeRiskInitiativeByRiskId,
    removeRiskInitiativeByRiskId,
    hasRisk: hasRiskInitiative,
    focusRisk: focusRiceInitiativeByRiskId,
    getScaleMode: getRiceScaleMode,
    openDatepicker: openExternalDatepicker
  },
  onAnyChange: () => {
    if (apiDlg?.open) renderSettingsDataPanel();
  }
});

riskMapCtrl = initRiskMap({
  riskStore,
  toast,
  confirmDataAction,
  setupPopupMenu,
  closePopupMenu
});

riskFrameworkCtrl = initRiskFramework({
  riskStore,
  toast,
  confirmDataAction,
  aiService,
  localLlmService,
  confirmLocalDownload,
  openApiDialog,
  refreshLocalCacheStatus,
  getCompanyContext,
  openSlideZoom: (src, title) => openFwSlideDialog(src, title),
  setupPopupMenu,
  closePopupMenu
});

/* ==========================================================================
   RGM Attribute Extraction: Level 1 (Wasm) / Level 2 (WebGPU) / Level 3 (API)
   ========================================================================== */
const SAMPLE_RGM = 'сырпарм200гготовкупотр599рСЫРЗАВОД';
let lastRgmCsv = '';
let lastRgmRealCsv = '';
let lastRgmMatrix = [];
let lastRgmHeaders = [];
let lastRgmRows = [];
let lastRgmCellStyles = {};

const rgmInstrWrap = $('#rgm-instr-wrap');
const rgmInstructions = $('#rgm-instructions');
const wasmSubNote = $('#wasm-sub-note');
const apiSubBar = $('#api-sub-bar');
const localAiPanel = $('#local-ai-panel');
const localModelSelect = $('#local-model-select');
const localModelDiff = $('#local-model-diff');
const localMirrorToggle = $('#btn-local-mirror-toggle');
const localMirrorWrap = $('#local-mirror-wrap');
const localMirrorUrl = $('#local-mirror-url');
const localCacheSwitch = $('#local-cache-switch');
const localCacheStatus = $('#local-cache-status');
const localCacheHint = $('#local-cache-hint');
const resLimitNote = $('#res-limit-note');
const localConfirmDlg = $('#local-confirm-dlg');
const localConfirmBody = $('#local-confirm-body');
const localConfirmSwitch = $('#local-confirm-cache-switch');
const localConfirmGo = $('#local-confirm-go');
const localConfirmCancel = $('#local-confirm-cancel');
const localConfirmX = $('#local-confirm-x');
const localAiProgressBox = $('#local-ai-progress-box');
const localAiProg = $('#local-ai-prog');
const localAiStatus = $('#local-ai-status');
const rgmSkeleton = $('#rgm-skeleton');

async function refreshLocalCacheStatus() {
  const status = await localLlmService.inspectCacheStatus();
  const text = !localLlmService.cacheEnabled
    ? (status.cached ? 'Очистится' : 'Выкл')
    : (status.cached ? 'Сохранён' : 'Пуст');
  [localCacheStatus, dashCacheStatus].forEach((el) => {
    if (el) el.textContent = text;
  });
}

function safeExternalUrl(raw, fallback = 'https://www.apache.org/licenses/LICENSE-2.0') {
  try {
    const u = new URL(String(raw || ''), window.location.origin);
    return u.protocol === 'https:' ? u.href : fallback;
  } catch {
    return fallback;
  }
}

let localDeviceCaps = null;

async function refreshLocalDeviceCapabilities(force = false) {
  try {
    localDeviceCaps = await localLlmService.inspectDeviceCapabilities(force);
  } catch {
    localDeviceCaps = null;
  }
  applyLocalModelCapabilitiesToSelects();
  renderLocalModelDiff();
}

function applyLocalModelCapabilitiesToSelects() {
  const groups = new Map();
  Object.values(LOCAL_MODEL_TIERS).forEach((spec) => {
    const g = spec.group || 'Локальные модели';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(spec);
  });

  let html = '<button type="button"><selectedcontent></selectedcontent></button>';
  for (const [groupName, specs] of groups.entries()) {
    html += `<optgroup label="${esc(groupName)}">`;
    specs.forEach((spec) => {
      const cap = localDeviceCaps?.models?.[spec.key];
      const isDisabled = Boolean(cap && !cap.available);
      const qual = Number.isFinite(spec.qualityScore) ? `${spec.qualityScore.toFixed(1)}/10` : '—';
      const qualTone = getQualityToneClass(spec.qualityScore);
      const reasonBadge = isDisabled ? `<span class="opt-local-badge">${esc(cap.reason)}</span>` : '';
      html += `<option value="${esc(spec.key)}"${isDisabled ? ' disabled' : ''}><span class="loc-opt-row"><span class="opt-name">${esc(spec.shortName)}${reasonBadge}</span><span class="sr-only"> (${esc(spec.sizeText)}) · Качество </span><span class="opt-qual ${qualTone}">${qual}</span><span class="sr-only"> · VRAM </span><span class="loc-opt-vram">${esc(spec.vramShort || spec.vramText)}</span></span></option>`;
    });
    html += '</optgroup>';
  }

  [localModelSelect, dashModelSelect].forEach((sel) => {
    if (!sel) return;
    setSafeHtml(sel, html);
    sel.value = localLlmService.modelKey;
  });
}

function buildLocalHardwareHint(caps) {
  if (!caps) return '';
  if (!caps.webgpuOk) {
    return `<li class="spec-meta-row spec-hw-warn"><span class="spec-k">WebGPU недоступен:</span><span>${esc(caps.webgpuReason)}</span></li>`;
  }
  const disabledEntries = Object.entries(caps.models || {})
    .filter(([, st]) => !st.available)
    .map(([k, st]) => `${LOCAL_MODEL_TIERS[k]?.shortName || k} (${st.reason})`);
  if (disabledEntries.length) {
    return `<li class="spec-meta-row spec-hw-warn"><span class="spec-k">Совет:</span><span>Выберите ${esc(LOCAL_MODEL_TIERS[caps.recommendedModelKey]?.shortName || '1.7B')}. Отключено: ${esc(disabledEntries.join(', '))}</span></li>`;
  }
  const v = caps.gpuVendor || '';
  let recText = '4B (баланс) или 1.7B (быстрее)';
  if (v === 'nvidia' || v === 'amd') {
    const vName = v === 'nvidia' ? 'NVIDIA' : 'AMD';
    recText = `${vName}: 4B быстро · 8B при ≥ 8 ГБ VRAM`;
  } else if (v === 'apple') {
    recText = 'Apple Silicon: 4B · 8B при ≥ 16 ГБ ОЗУ';
  } else if (v === 'intel') {
    recText = 'Intel GPU: 1.7B быстро · 4B точнее';
  }
  return `<li class="spec-meta-row spec-advice-row"><span class="spec-k">Совет:</span><span class="spec-badge" title="${esc(recText)}">${esc(recText)}</span></li>`;
}

function renderLocalModelDiff() {
  const spec = localLlmService.getActiveModelSpec();
  const licHref = esc(safeExternalUrl(spec.licenseUrl));
  const hwRowHtml = buildLocalHardwareHint(localDeviceCaps);
  const html = `
    <li class="spec-tile"><span class="spec-k">Скорость</span><span class="spec-v">${esc(spec.speedDetailText || `${spec.batchEtaText} (${spec.tpsText})`)}</span></li>
    <li class="spec-tile"><span class="spec-k">Загрузка</span><span class="spec-v">${esc(spec.dlDetailText || `${spec.dlTimeText} (${spec.sizeText})`)}</span></li>
    <li class="spec-tile"><span class="spec-k">Память</span><span class="spec-v">${esc(spec.vramText)}</span></li>
    <li class="spec-tile"><span class="spec-k">Точность</span><span class="spec-v">${esc(spec.accuracyShort || spec.qualityNote)}</span></li>
    ${hwRowHtml}
    <li class="spec-meta-row">
      <span class="spec-k">Лицензия:</span>
      <a class="spec-badge spec-license-link" href="${licHref}" target="_blank" rel="noopener noreferrer" title="Открыть официальный файл LICENSE модели">${esc(spec.licenseShort || spec.license)} <span aria-hidden="true">↗</span></a>
    </li>`;
  [localModelDiff, dashModelDiff].forEach((el) => {
    if (el) setSafeHtml(el, html);
  });
}

function applySwitchUi(el, checked) {
  if (!el) return;
  el.checked = Boolean(checked);
  if (!('switch' in HTMLInputElement.prototype)) {
    el.classList.add('sw-fallback');
    el.setAttribute('role', 'switch');
  }
  el.setAttribute('aria-checked', String(el.checked));
}

function syncRgmModeUi() {
  const mode = $('input[name="rgm-mode"]:checked')?.value || 'wasm';

  if (wasmSubNote) wasmSubNote.hidden = mode !== 'wasm';
  if (localAiPanel) localAiPanel.hidden = mode !== 'local-ai';
  if (apiSubBar) apiSubBar.hidden = mode !== 'ai';

  if (rgmInstructions && rgmInstrWrap) {
    const isWasm = mode === 'wasm';
    rgmInstructions.disabled = isWasm;
    rgmInstrWrap.classList.toggle('is-disabled', isWasm);
    if (isWasm) {
      rgmInstrWrap.title = 'Инструкции доступны только при выборе AI (Локальный AI WebGPU или AI-агент API)';
      rgmInstructions.placeholder = 'Доступно для AI (WebGPU / API)';
    } else {
      rgmInstrWrap.title = 'Произвольные инструкции для AI-обработки строк';
      rgmInstructions.placeholder = 'Например: бренды с заглавной; «ж/б» → «Жестяная банка»';
    }
  }

  if (mode === 'local-ai') syncLocalAiControlsUi();
}

function setMirrorWrapOpen(btn, wrap, isOpen) {
  if (!wrap) return;
  wrap.hidden = !isOpen;
  if (btn) {
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.classList.toggle('is-active', isOpen);
  }
}

function syncLocalAiControlsUi() {
  applyLocalModelCapabilitiesToSelects();
  if (!localDeviceCaps) refreshLocalDeviceCapabilities();
  [localMirrorUrl, dashMirrorUrl].forEach((inp) => {
    if (inp) inp.value = localLlmService.mirrorUrl || '';
  });
  if (localLlmService.mirrorUrl) {
    setMirrorWrapOpen(localMirrorToggle, localMirrorWrap, true);
    setMirrorWrapOpen(dashMirrorToggle, dashMirrorWrap, true);
  }
  renderLocalModelDiff();

  applySwitchUi(localCacheSwitch, localLlmService.cacheEnabled);
  applySwitchUi(dashCacheSwitch, localLlmService.cacheEnabled);
  applySwitchUi(localConfirmSwitch, localLlmService.cacheEnabled);

  const cachePolicyHtml = localLlmService.cacheEnabled
    ? '<span class="cache-policy-k">Локальный кэш</span><span class="cache-policy-v">Старт за ~2–5 сек</span>'
    : '<span class="cache-policy-k">Автоочистка</span><span class="cache-policy-v">При закрытии или отмене</span>';
  [localCacheHint, dashCacheHint].forEach((el) => {
    if (el) setSafeHtml(el, cachePolicyHtml);
  });

  refreshLocalCacheStatus();
  syncDashAiModeUi();
}

function renderConfirmModalBody() {
  if (!localConfirmBody) return;
  const spec = localLlmService.getActiveModelSpec();
  const srcUrl = localLlmService.mirrorUrl
    ? esc(localLlmService.mirrorUrl)
    : 'Hugging Face CDN (mlc-ai)';
  setSafeHtml(localConfirmBody, `
    <p><b>Что произойдёт сейчас:</b> браузер скачает локальную нейросеть <b>${esc(spec.shortName)}</b> (${esc(spec.sizeText)}, ${esc(spec.vramText)}) напрямую без передачи ваших данных на сторонний сервер.</p>
    <p><b>Откуда скачивается:</b> <code>${srcUrl}</code></p>
    <p><b>Куда сохраняется:</b> во временное/локальное хранилище <code>Cache API</code> вашего браузера на этом компьютере.</p>
    <p><b>Производительность и качество:</b> ${esc(spec.tpsText)}, ${esc(spec.batchEtaText)}. ${esc(spec.qualityNote)}.</p>
    <p><b>Когда модель удалится:</b> при выключенном переключателе ниже (по умолчанию) все скачанные файлы удаляются <b>сразу после обработки, при отмене или при закрытии вкладки</b> — даже если загрузка успела дойти только до 5%, 50% или 100%.</p>`);
}

function confirmLocalDownload() {
  return new Promise((resolve) => {
    if (!localConfirmDlg) {
      resolve(true);
      return;
    }
    syncLocalAiControlsUi();
    renderConfirmModalBody();

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      localConfirmGo?.removeEventListener('click', onGo);
      localConfirmCancel?.removeEventListener('click', onCancel);
      localConfirmX?.removeEventListener('click', onCancel);
      localConfirmDlg.removeEventListener('close', onClose);
      if (localConfirmDlg.open) localConfirmDlg.close();
      resolve(ok);
    };
    const onGo = () => finish(true);
    const onCancel = () => finish(false);
    const onClose = () => finish(false);

    localConfirmGo?.addEventListener('click', onGo);
    localConfirmCancel?.addEventListener('click', onCancel);
    localConfirmX?.addEventListener('click', onCancel);
    localConfirmDlg.addEventListener('close', onClose);
    localConfirmDlg.showModal();
  });
}

$$('input[name="rgm-mode"]').forEach((radio) => {
  radio.addEventListener('change', syncRgmModeUi);
});

function handleModelSelectChange(e) {
  const nextKey = e.target.value;
  const cap = localDeviceCaps?.models?.[nextKey];
  if (cap && !cap.available) {
    toast(`Модель недоступна: ${cap.reason}`);
    applyLocalModelCapabilitiesToSelects();
    return;
  }
  localLlmService.setModelKey(nextKey);
  syncLocalAiControlsUi();
  const spec = localLlmService.getActiveModelSpec();
  toast(`Выбрана локальная модель: ${spec.shortName}`);
}

localModelSelect?.addEventListener('change', handleModelSelectChange);
dashModelSelect?.addEventListener('change', handleModelSelectChange);

function bindMirrorToggle(btn, wrap, input) {
  btn?.addEventListener('click', () => {
    if (!wrap) return;
    const nextOpen = wrap.hidden;
    setMirrorWrapOpen(btn, wrap, nextOpen);
    if (nextOpen && input) input.focus();
  });
}

bindMirrorToggle(localMirrorToggle, localMirrorWrap, localMirrorUrl);
bindMirrorToggle(dashMirrorToggle, dashMirrorWrap, dashMirrorUrl);

function handleMirrorInputChange(e) {
  localLlmService.setMirrorUrl(e.target.value);
  syncLocalAiControlsUi();
  toast(localLlmService.mirrorUrl ? 'Установлено зеркало для весов' : 'Используется Hugging Face CDN');
}

localMirrorUrl?.addEventListener('change', handleMirrorInputChange);
dashMirrorUrl?.addEventListener('change', handleMirrorInputChange);

async function handleCacheSwitchChange(enabled) {
  localLlmService.setCacheEnabled(enabled);
  syncLocalAiControlsUi();

  if (!enabled) {
    await localLlmService.purgeAllLocalCaches();
    await refreshLocalCacheStatus();
    toast('Кэширование отключено — сохранённые файлы модели удалены');
  } else {
    toast('Кэширование включено — модель будет сохраняться в браузере');
  }
}

localCacheSwitch?.addEventListener('change', () => handleCacheSwitchChange(localCacheSwitch.checked));
dashCacheSwitch?.addEventListener('change', () => handleCacheSwitchChange(dashCacheSwitch.checked));
localConfirmSwitch?.addEventListener('change', () => handleCacheSwitchChange(localConfirmSwitch.checked));

async function clearAllLocalCacheAction() {
  await localLlmService.purgeAllLocalCaches();
  await refreshLocalCacheStatus();
  toast('Кэш локальной модели полностью очищен');
}

$('#btn-clear-local-cache')?.addEventListener('click', clearAllLocalCacheAction);
$('#btn-clear-dash-cache')?.addEventListener('click', clearAllLocalCacheAction);

$('#btn-cancel-local-ai')?.addEventListener('click', async () => {
  localLlmService.terminateWorker();
  if (!localLlmService.cacheEnabled) {
    await localLlmService.purgeAllLocalCaches();
  }
  await refreshLocalCacheStatus();
  setStepState(B, 'i');
  $('#send').removeAttribute('aria-busy');
  toast('Локальная обработка отменена');
});

const handleTabClosePurge = () => {
  if (!localLlmService.cacheEnabled) {
    localLlmService.purgeStorageBestEffortSync();
  }
};
window.addEventListener('pagehide', handleTabClosePurge);
window.addEventListener('beforeunload', handleTabClosePurge);

const rgmColsInput = $('#rgm-cols');
const rgmProductsInput = $('#inp');
const rgmFileInput = $('#rgm-file-inp');
const rgmImportNote = $('#rgm-import-note');
const rgmImportText = $('#rgm-import-text');
const importDlg = $('#import-dlg');
const impSecondaryChk = $('#imp-secondary-chk');
const impProgressBox = $('#imp-progress-box');
const impProgressStage = $('#imp-progress-stage');
const impProgressPct = $('#imp-progress-pct');
const impProgressBar = $('#imp-progress-bar');
const impProgressFile = $('#imp-progress-file');
const impCancelLoadBtn = $('#imp-cancel-load');
const impMappingBox = $('#imp-mapping-box');
const impMapFile = $('#imp-map-file');
const impMapSummary = $('#imp-map-summary');
const impMapList = $('#imp-map-list');
const impParamsChips = $('#imp-params-chips');
const impParamsCnt = $('#imp-params-cnt');
const impParamAddInp = $('#imp-param-add-inp');
const impParamAddBtn = $('#imp-param-add-btn');
const impMapError = $('#imp-map-error');
const impChooseFileBtn = $('#imp-choose-file');
const impApplyBtn = $('#imp-apply-btn');
const impRechooseBtn = $('#imp-rechoose-btn');

let importMode = 'simple';
let importPreserveSecondary = false;
let pendingAnalyzedFile = null;
let pendingColumnRoles = {};
let pendingSecondaryMemory = new Set();
let pendingTargetParams = [];
let importedContext = null;
let chipAnnounceTimer = null;
let activeImportAbortController = null;

function setImportLoadingProgress(pct, stage = 'Чтение файла…', fileLabel = '') {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (impProgressBar) impProgressBar.value = clamped;
  if (impProgressPct) impProgressPct.textContent = `${clamped}%`;
  if (impProgressStage && stage) impProgressStage.textContent = stage;
  if (impProgressFile && fileLabel) impProgressFile.textContent = fileLabel;
}

function abortActiveImportLoad() {
  if (activeImportAbortController) {
    activeImportAbortController.abort();
    activeImportAbortController = null;
  }
  if (impProgressBox) impProgressBox.hidden = true;
}

function announceChipOrder(msg) {
  const live = $('#live');
  if (!live) return;
  clearTimeout(chipAnnounceTimer);
  live.textContent = '';
  chipAnnounceTimer = setTimeout(() => { live.textContent = msg; }, 500);
}

function moveChipNode(container, chip, refNode) {
  if ('moveBefore' in Element.prototype) {
    container.moveBefore(chip, refNode || null);
  } else if (refNode) {
    refNode.before(chip);
  } else {
    container.append(chip);
  }
}

function animateChipsFlip(container, beforeRects) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const chips = [...container.querySelectorAll('.imp-param-chip')];
  chips.forEach((chip) => {
    const prev = beforeRects.get(chip);
    if (!prev) return;
    const next = chip.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    chip.animate(
      [{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }],
      { duration: 160, easing: 'ease-out' }
    );
  });
}

function syncTargetParamsFromDom() {
  if (!impParamsChips) return;
  const chips = [...impParamsChips.querySelectorAll('.imp-param-chip')];
  pendingTargetParams = chips.map((el) => el.dataset.paramName || '').filter(Boolean);
  chips.forEach((el, idx) => {
    const rm = el.querySelector('.imp-chip-rm');
    if (rm) rm.dataset.paramIdx = String(idx);
  });
}

function colIndexToExcelLetter(idx) {
  let n = idx;
  let out = '';
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

function addTargetParamsFromList(items) {
  const seen = new Set(pendingTargetParams.map((p) => p.toLowerCase()));
  let added = 0;
  for (const raw of items) {
    const cleaned = String(raw || '').trim();
    const low = cleaned.toLowerCase();
    if (!cleaned || seen.has(low)) continue;
    seen.add(low);
    pendingTargetParams.push(cleaned);
    added++;
  }
  return added;
}

function syncImportModeUi() {
  $$('input[name="imp-mode"]').forEach((r) => {
    r.checked = r.value === importMode;
  });
  if (impSecondaryChk) impSecondaryChk.checked = importPreserveSecondary;
}

function clearImportedBuffer() {
  importedContext = null;
  if (rgmImportNote) rgmImportNote.hidden = true;
  if (rgmImportText) rgmImportText.textContent = '';
  if (rgmFileInput) rgmFileInput.value = '';
}

function resetImportDialogMapping() {
  pendingAnalyzedFile = null;
  pendingColumnRoles = {};
  pendingSecondaryMemory = new Set();
  pendingTargetParams = [];
  if (impMappingBox) impMappingBox.hidden = true;
  impMapList?.replaceChildren();
  impParamsChips?.replaceChildren();
  if (impParamAddInp) impParamAddInp.value = '';
  if (impMapError) {
    impMapError.hidden = true;
    impMapError.textContent = '';
  }
  if (impChooseFileBtn) impChooseFileBtn.hidden = false;
  if (impApplyBtn) {
    impApplyBtn.hidden = true;
    impApplyBtn.disabled = false;
  }
  if (impRechooseBtn) impRechooseBtn.hidden = true;
}

function updateImportValidationState() {
  if (!pendingAnalyzedFile || !impApplyBtn) return true;
  const cols = pendingAnalyzedFile.columns || [];
  const unassignedCount = cols.filter((c) => !pendingColumnRoles[c.index]).length;
  const productCount = cols.filter((c) => pendingColumnRoles[c.index] === 'product').length;
  let errorMsg = '';

  if (unassignedCount > 0) {
    errorMsg = `Выберите роль для всех колонок (не выбрано: ${unassignedCount}).`;
  } else if (productCount !== 1) {
    errorMsg = 'Выберите ровно одну колонку с ролью «Название товара».';
  } else if (pendingTargetParams.length === 0) {
    errorMsg = 'Добавьте хотя бы один параметр для выделения.';
  }

  impApplyBtn.disabled = Boolean(errorMsg);
  if (impMapError) {
    impMapError.textContent = errorMsg;
    impMapError.hidden = !errorMsg;
  }
  return !errorMsg;
}

function bindChipReorderInteractions(container) {
  let activePointerId = null;
  let dragChip = null;
  let dragHandle = null;
  let startX = 0;
  let startY = 0;
  let currentRefNode = undefined;
  let kbdGrabbedChip = null;
  let kbdOriginRef = null;
  let isMovingKbd = false;

  const clearDropMarkers = () => {
    container.querySelectorAll('.is-drop-before, .is-drop-after').forEach((el) => {
      el.classList.remove('is-drop-before', 'is-drop-after');
    });
  };

  const computeDropRef = (clientX, clientY, movingChip) => {
    const siblings = [...container.querySelectorAll('.imp-param-chip')].filter((el) => el !== movingChip);
    if (!siblings.length) return { refNode: null, markerEl: null, markerSide: null };

    // Group siblings by visual row (wrapped flex) using layout boxes
    const rects = siblings.map((el) => ({ el, r: el.getBoundingClientRect() }));
    let closest = null;
    let bestRowDist = Infinity;
    for (const item of rects) {
      const cy = (item.r.top + item.r.bottom) / 2;
      const dist = Math.abs(clientY - cy);
      if (dist < bestRowDist) {
        bestRowDist = dist;
        closest = item;
      }
    }
    const targetRowY = (closest.r.top + closest.r.bottom) / 2;
    const rowItems = rects.filter((item) => Math.abs((item.r.top + item.r.bottom) / 2 - targetRowY) < 18);

    for (const item of rowItems) {
      const midX = item.r.left + item.r.width / 2;
      if (clientX < midX) {
        return { refNode: item.el, markerEl: item.el, markerSide: 'before' };
      }
    }
    const lastInRow = rowItems[rowItems.length - 1];
    return {
      refNode: lastInRow.el.nextElementSibling,
      markerEl: lastInRow.el,
      markerSide: 'after'
    };
  };

  const finishPointerDrag = (commit) => {
    if (!dragChip) return;
    const chip = dragChip;
    const handle = dragHandle;
    const refNode = currentRefNode;
    const beforeRects = new Map(
      [...container.querySelectorAll('.imp-param-chip')].map((el) => [el, el.getBoundingClientRect()])
    );

    clearDropMarkers();
    chip.classList.remove('is-dragging');
    chip.style.translate = '';
    document.documentElement.classList.remove('is-chip-dragging');
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('keydown', onDragKeyDown, true);

    if (handle && activePointerId !== null && handle.hasPointerCapture?.(activePointerId)) {
      try { handle.releasePointerCapture(activePointerId); } catch { /* ignore */ }
    }

    activePointerId = null;
    dragChip = null;
    dragHandle = null;
    currentRefNode = undefined;

    if (commit && refNode !== undefined && refNode !== chip && refNode !== chip.nextElementSibling) {
      chip.getAnimations?.().forEach((a) => a.finish());
      moveChipNode(container, chip, refNode);
      syncTargetParamsFromDom();
      chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      animateChipsFlip(container, beforeRects);
      const pos = [...container.querySelectorAll('.imp-param-chip')].indexOf(chip) + 1;
      announceChipOrder(`Параметр «${chip.dataset.paramName}» перемещён на позицию ${pos}`);
    } else if (!commit) {
      animateChipsFlip(container, beforeRects);
      announceChipOrder(`Перемещение параметра «${chip.dataset.paramName}» отменено`);
    }
  };

  const onPointerMove = (e) => {
    if (!dragChip || e.pointerId !== activePointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    dragChip.style.translate = `${dx}px ${dy}px`;

    clearDropMarkers();
    const { refNode, markerEl, markerSide } = computeDropRef(e.clientX, e.clientY, dragChip);
    if (refNode === dragChip.nextElementSibling || refNode === dragChip) {
      currentRefNode = undefined;
      return;
    }
    currentRefNode = refNode;
    if (markerEl && markerSide) {
      markerEl.classList.add(markerSide === 'before' ? 'is-drop-before' : 'is-drop-after');
    }
  };

  const onPointerUp = (e) => {
    if (!dragChip || e.pointerId !== activePointerId) return;
    finishPointerDrag(true);
  };

  const onPointerCancel = (e) => {
    if (!dragChip || e.pointerId !== activePointerId) return;
    finishPointerDrag(false);
  };

  const onDragKeyDown = (e) => {
    if (e.key === 'Escape' && dragChip) {
      e.preventDefault();
      e.stopPropagation();
      finishPointerDrag(false);
    }
  };

  container.querySelectorAll('.imp-chip-handle').forEach((handle) => {
    const chip = handle.closest('.imp-param-chip');
    if (!chip) return;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || activePointerId !== null) return;
      e.preventDefault();
      activePointerId = e.pointerId;
      dragChip = chip;
      dragHandle = handle;
      startX = e.clientX;
      startY = e.clientY;
      currentRefNode = undefined;
      chip.classList.add('is-dragging');
      document.documentElement.classList.add('is-chip-dragging');
      handle.setPointerCapture?.(e.pointerId);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
      document.addEventListener('keydown', onDragKeyDown, true);
    });

    handle.addEventListener('lostpointercapture', () => {
      if (dragChip === chip) finishPointerDrag(false);
    });

    handle.addEventListener('keydown', (e) => {
      const grabbed = kbdGrabbedChip === chip;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!grabbed) {
          if (kbdGrabbedChip) {
            kbdGrabbedChip.classList.remove('is-kbd-grabbed');
            kbdGrabbedChip.querySelector('.imp-chip-handle')?.setAttribute('aria-pressed', 'false');
          }
          kbdGrabbedChip = chip;
          kbdOriginRef = chip.nextElementSibling;
          chip.classList.add('is-kbd-grabbed');
          handle.setAttribute('aria-pressed', 'true');
          announceChipOrder(`Параметр «${chip.dataset.paramName}» захвачен. Стрелки влево/вправо — переместить, Пробел — закрепить, Esc — отменить.`);
        } else {
          chip.classList.remove('is-kbd-grabbed');
          handle.setAttribute('aria-pressed', 'false');
          kbdGrabbedChip = null;
          kbdOriginRef = null;
          const pos = [...container.querySelectorAll('.imp-param-chip')].indexOf(chip) + 1;
          announceChipOrder(`Параметр «${chip.dataset.paramName}» закреплён на позиции ${pos}`);
        }
        return;
      }

      if (!grabbed) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const beforeRects = new Map(
          [...container.querySelectorAll('.imp-param-chip')].map((el) => [el, el.getBoundingClientRect()])
        );
        isMovingKbd = true;
        moveChipNode(container, chip, kbdOriginRef);
        syncTargetParamsFromDom();
        chip.classList.remove('is-kbd-grabbed');
        handle.setAttribute('aria-pressed', 'false');
        chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        handle.focus({ preventScroll: true });
        isMovingKbd = false;
        animateChipsFlip(container, beforeRects);
        kbdGrabbedChip = null;
        kbdOriginRef = null;
        announceChipOrder(`Перемещение параметра «${chip.dataset.paramName}» отменено`);
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const targetRef = e.key === 'ArrowLeft'
          ? chip.previousElementSibling
          : chip.nextElementSibling?.nextElementSibling ?? null;
        if (e.key === 'ArrowLeft' && !chip.previousElementSibling) return;
        if (e.key === 'ArrowRight' && !chip.nextElementSibling) return;

        const beforeRects = new Map(
          [...container.querySelectorAll('.imp-param-chip')].map((el) => [el, el.getBoundingClientRect()])
        );
        isMovingKbd = true;
        moveChipNode(container, chip, targetRef);
        syncTargetParamsFromDom();
        chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        handle.focus({ preventScroll: true });
        isMovingKbd = false;
        animateChipsFlip(container, beforeRects);
        const pos = [...container.querySelectorAll('.imp-param-chip')].indexOf(chip) + 1;
        announceChipOrder(`Параметр «${chip.dataset.paramName}» — позиция ${pos}`);
      }
    });

    handle.addEventListener('blur', () => {
      if (isMovingKbd || kbdGrabbedChip !== chip) return;
      chip.classList.remove('is-kbd-grabbed');
      handle.setAttribute('aria-pressed', 'false');
      kbdGrabbedChip = null;
      kbdOriginRef = null;
    });
  });
}

function renderImportTargetParams() {
  if (!impParamsChips || !impParamsCnt) return;
  impParamsCnt.textContent = `${pendingTargetParams.length} шт.`;

  if (!pendingTargetParams.length) {
    setSafeHtml(impParamsChips, '<span class="imp-params-empty">Список пуст — добавьте хотя бы один параметр ниже.</span>');
  } else {
    setSafeHtml(impParamsChips, pendingTargetParams.map((param, idx) => `
      <span class="imp-param-chip" role="listitem" data-param-name="${esc(param)}">
        <button type="button" class="imp-chip-handle" aria-label="Переместить параметр ${esc(param)}" aria-pressed="false" title="Перетащите для смены порядка или нажмите Пробел и стрелки">⋮⋮</button>
        <span class="imp-param-chip-txt">${esc(param)}</span>
        <button type="button" class="imp-chip-rm" data-param-idx="${idx}" aria-label="Удалить параметр ${esc(param)}">×</button>
      </span>
    `).join(''));

    $$('.imp-chip-rm', impParamsChips).forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.paramIdx);
        if (idx >= 0 && idx < pendingTargetParams.length) {
          const [removed] = pendingTargetParams.splice(idx, 1);
          const removedLow = String(removed || '').toLowerCase();
          let clearedColRole = false;
          if (pendingAnalyzedFile && Array.isArray(pendingAnalyzedFile.columns)) {
            pendingAnalyzedFile.columns.forEach((c) => {
              if (pendingColumnRoles[c.index] === 'param' && c.name.toLowerCase() === removedLow) {
                pendingColumnRoles[c.index] = null;
                clearedColRole = true;
              }
            });
          }
          if (clearedColRole) {
            renderImportMappingList();
          } else {
            renderImportTargetParams();
            updateImportValidationState();
          }
        }
      });
    });

    bindChipReorderInteractions(impParamsChips);
  }
}

function renderImportMappingList() {
  if (!pendingAnalyzedFile || !impMapList || !impMapSummary) return;
  const cols = pendingAnalyzedFile.columns || [];
  const paramCnt = cols.filter((c) => pendingColumnRoles[c.index] === 'param').length;
  const secCnt = importPreserveSecondary ? cols.filter((c) => pendingColumnRoles[c.index] === 'secondary').length : 0;
  if (impMapFile) impMapFile.textContent = pendingAnalyzedFile.fileName;
  impMapSummary.textContent = `${paramCnt} парам. · ${secCnt} второст. · ${pendingAnalyzedFile.dataRows.length} стр.`;

  setSafeHtml(impMapList, cols.map((c) => {
    const role = Object.prototype.hasOwnProperty.call(pendingColumnRoles, c.index)
      ? pendingColumnRoles[c.index]
      : c.role;
    const unassigned = !role;
    const colLetter = colIndexToExcelLetter(c.index);
    const sampleHtml = c.sample
      ? `<span class="imp-map-col-sample" title="${esc(c.sample)}">· ${esc(c.sample)}</span>`
      : '';
    const unassignedBadge = unassigned
      ? '<span class="imp-unassigned-tag">Выберите роль</span>'
      : '';
    const secDisabledAttr = importPreserveSecondary ? '' : ' disabled title="Включите чекбокс «Сохранять второстепенные данные» выше"';

    return `
      <div class="imp-map-row${unassigned ? ' is-unassigned' : ''}" data-col-idx="${c.index}">
        <div class="imp-map-col-info">
          <span class="imp-map-col-letter">${colLetter}</span>
          <span class="imp-map-col-name">${esc(c.name)}</span>
          <span class="imp-map-col-cnt">(${c.nonEmptyCount} зап.)</span>
          ${sampleHtml}
          ${unassignedBadge}
        </div>
        <div class="imp-role-pills" data-col-idx="${c.index}">
          <button type="button" class="imp-role-btn" data-role="product" aria-pressed="${role === 'product'}">Название товара</button>
          <button type="button" class="imp-role-btn" data-role="param" aria-pressed="${role === 'param'}">Параметр</button>
          <button type="button" class="imp-role-btn" data-role="secondary" aria-pressed="${role === 'secondary'}"${secDisabledAttr}>Второстепенный</button>
          <button type="button" class="imp-role-btn" data-role="ignore" aria-pressed="${role === 'ignore'}">Пропустить</button>
        </div>
      </div>`;
  }).join(''));

  $$('.imp-role-btn', impMapList).forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const idx = Number(btn.closest('.imp-role-pills')?.dataset.colIdx);
      const nextRole = btn.dataset.role;
      const col = cols.find((c) => c.index === idx);

      if (nextRole === 'product') {
        cols.forEach((other) => {
          if (other.index !== idx && pendingColumnRoles[other.index] === 'product') {
            pendingColumnRoles[other.index] = null;
          }
        });
        pendingSecondaryMemory.delete(idx);
        pendingColumnRoles[idx] = 'product';
      } else if (nextRole === 'secondary') {
        if (!importPreserveSecondary) return;
        pendingColumnRoles[idx] = 'secondary';
        pendingSecondaryMemory.add(idx);
      } else if (nextRole === 'param') {
        pendingSecondaryMemory.delete(idx);
        pendingColumnRoles[idx] = 'param';
        if (col && col.name) {
          addTargetParamsFromList([col.name]);
        }
      } else {
        pendingSecondaryMemory.delete(idx);
        pendingColumnRoles[idx] = 'ignore';
      }

      renderImportMappingList();
    });
  });

  renderImportTargetParams();
  updateImportValidationState();
}

function handleAddImportParam() {
  if (!impParamAddInp) return;
  const parts = impParamAddInp.value
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!parts.length) return;
  addTargetParamsFromList(parts);
  impParamAddInp.value = '';
  renderImportTargetParams();
  updateImportValidationState();
  impParamAddInp.focus();
}

async function applyAnalyzedImport(analyzed, rolesOverride = null, targetHeaders = null) {
  const { buildImportPayload } = await import('./file_import.js?v=3.12.0');
  const payload = buildImportPayload(analyzed, {
    mode: importMode,
    preserveSecondary: importPreserveSecondary,
    columnRoles: rolesOverride,
    targetHeaders
  });

  if (rgmColsInput && payload.headers.length) {
    rgmColsInput.value = payload.headers.join(', ');
    rgmColsInput.removeAttribute('aria-invalid');
  }
  if (rgmProductsInput) {
    rgmProductsInput.value = payload.products.slice(0, 100).join('\n');
    rgmProductsInput.removeAttribute('aria-invalid');
  }

  importedContext = payload;
  const tags = [];
  if (payload.mode === 'use-data') tags.push('сверка данных');
  if (payload.preserveSecondary && payload.secondaryHeaders.length) {
    tags.push(`+${payload.secondaryHeaders.length} второст.`);
  }
  const capNote = payload.products.length > 100
    ? `показаны первые 100 из ${payload.products.length}`
    : `${payload.products.length} стр.`;
  const extraTag = tags.length ? ` · ${tags.join(' · ')}` : '';

  if (rgmImportText) {
    rgmImportText.textContent = `«${payload.fileName}»: ${capNote}${extraTag}`;
  }
  if (rgmImportNote) {
    rgmImportNote.hidden = !(payload.products.length > 100 || payload.mode === 'use-data' || (payload.preserveSecondary && payload.secondaryHeaders.length > 0));
  }
  toast(`Загружено «${payload.fileName}»: ${payload.products.length} строк${extraTag}`);
}

rgmColsInput?.addEventListener('input', () => rgmColsInput.removeAttribute('aria-invalid'));
rgmProductsInput?.addEventListener('input', () => {
  rgmProductsInput.removeAttribute('aria-invalid');
  if (importedContext) clearImportedBuffer();
});

$('#btn-rgm-clear-import')?.addEventListener('click', () => {
  clearImportedBuffer();
  toast('Импорт сброшен — используются данные из текстового поля');
});

$('#btn-rgm-upload')?.addEventListener('click', () => {
  syncImportModeUi();
  resetImportDialogMapping();
  importDlg?.showModal();
});

$('#imp-dlg-close')?.addEventListener('click', () => {
  abortActiveImportLoad();
  importDlg?.close();
});
importDlg?.addEventListener('close', () => abortActiveImportLoad());
impCancelLoadBtn?.addEventListener('click', () => {
  abortActiveImportLoad();
  if (pendingAnalyzedFile) {
    if (impMappingBox) impMappingBox.hidden = false;
    if (impApplyBtn) impApplyBtn.hidden = false;
    if (impRechooseBtn) impRechooseBtn.hidden = false;
  } else {
    if (impChooseFileBtn) impChooseFileBtn.hidden = false;
  }
  toast('Загрузка файла отменена');
});
impChooseFileBtn?.addEventListener('click', () => rgmFileInput?.click());
impRechooseBtn?.addEventListener('click', () => rgmFileInput?.click());
impParamAddBtn?.addEventListener('click', handleAddImportParam);
impParamAddInp?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    handleAddImportParam();
  }
});

$$('input[name="imp-mode"]').forEach((r) => {
  r.addEventListener('change', () => {
    importMode = r.value === 'use-data' ? 'use-data' : 'simple';
    syncImportModeUi();
    if (pendingAnalyzedFile) renderImportMappingList();
  });
});

impSecondaryChk?.addEventListener('change', () => {
  importPreserveSecondary = Boolean(impSecondaryChk.checked);
  if (pendingAnalyzedFile) {
    const cols = pendingAnalyzedFile.columns || [];
    if (!importPreserveSecondary) {
      cols.forEach((c) => {
        if (pendingColumnRoles[c.index] === 'secondary') {
          pendingSecondaryMemory.add(c.index);
          pendingColumnRoles[c.index] = 'ignore';
        }
      });
    } else {
      cols.forEach((c) => {
        if (pendingSecondaryMemory.has(c.index) && pendingColumnRoles[c.index] === 'ignore') {
          pendingColumnRoles[c.index] = 'secondary';
        }
      });
    }
  }
  syncImportModeUi();
  if (pendingAnalyzedFile) renderImportMappingList();
});

impApplyBtn?.addEventListener('click', async () => {
  if (!pendingAnalyzedFile || !updateImportValidationState()) return;
  try {
    await applyAnalyzedImport(pendingAnalyzedFile, pendingColumnRoles, pendingTargetParams);
    importDlg?.close();
    resetImportDialogMapping();
  } catch (err) {
    toast(`Ошибка импорта: ${err.message}`);
  }
});

rgmFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  abortActiveImportLoad();
  const controller = new AbortController();
  activeImportAbortController = controller;

  const sizeMb = (file.size / (1024 * 1024)).toFixed(file.size >= 1024 * 1024 ? 1 : 2);
  const fileLabel = `${file.name} (${sizeMb} МБ)`;
  setImportLoadingProgress(0, 'Подготовка файла…', fileLabel);
  if (impMappingBox) impMappingBox.hidden = true;
  if (impChooseFileBtn) impChooseFileBtn.hidden = true;
  if (impApplyBtn) impApplyBtn.hidden = true;
  if (impRechooseBtn) impRechooseBtn.hidden = true;
  if (impProgressBox) impProgressBox.hidden = false;
  syncImportModeUi();
  if (importDlg && !importDlg.open) importDlg.showModal();

  try {
    const { analyzeAttributesFileWithProgress } = await import('./file_import.js?v=3.12.0');
    const existingCols = (rgmColsInput ? rgmColsInput.value : '')
      .split(/[,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const analyzed = await analyzeAttributesFileWithProgress(file, {
      existingCols,
      signal: controller.signal,
      onProgress: (pct, stage) => {
        if (activeImportAbortController === controller) {
          setImportLoadingProgress(pct, stage);
        }
      }
    });

    if (activeImportAbortController !== controller) return;
    activeImportAbortController = null;
    if (impProgressBox) impProgressBox.hidden = true;

    pendingAnalyzedFile = analyzed;
    pendingColumnRoles = {};
    pendingSecondaryMemory = new Set();
    pendingTargetParams = [];

    analyzed.columns.forEach((c) => {
      if (c.role === 'secondary' && !importPreserveSecondary) {
        pendingSecondaryMemory.add(c.index);
        pendingColumnRoles[c.index] = 'ignore';
      } else {
        pendingColumnRoles[c.index] = c.role;
        if (c.role === 'secondary') pendingSecondaryMemory.add(c.index);
      }
    });

    addTargetParamsFromList(existingCols);
    addTargetParamsFromList(analyzed.packedHeaders || []);
    addTargetParamsFromList(
      analyzed.columns
        .filter((c) => pendingColumnRoles[c.index] === 'param')
        .map((c) => c.name)
    );

    renderImportMappingList();
    if (impMappingBox) impMappingBox.hidden = false;
    if (impChooseFileBtn) impChooseFileBtn.hidden = true;
    if (impApplyBtn) impApplyBtn.hidden = false;
    if (impRechooseBtn) impRechooseBtn.hidden = false;
    syncImportModeUi();
    if (importDlg && !importDlg.open) importDlg.showModal();
  } catch (err) {
    if (activeImportAbortController === controller) {
      activeImportAbortController = null;
    }
    if (impProgressBox) impProgressBox.hidden = true;
    if (err?.name === 'AbortError') return;
    console.error('[RGM File Import]', err);
    if (pendingAnalyzedFile) {
      if (impMappingBox) impMappingBox.hidden = false;
      if (impApplyBtn) impApplyBtn.hidden = false;
      if (impRechooseBtn) impRechooseBtn.hidden = false;
    } else if (impChooseFileBtn) {
      impChooseFileBtn.hidden = false;
    }
    toast(`Ошибка импорта: ${err.message}`);
  } finally {
    rgmFileInput.value = '';
  }
});

const HEADER_FAMILIES = [
  /категор|category/i,
  /бренд|марк|brand/i,
  /жирн|fat/i,
  /упаков|тар|pack/i,
  /вес|об[ъь]?[её]м|weight|volume/i,
  /цен|price/i,
  /вкус|flavor/i,
  /стран|country/i,
  /производ|vendor|maker/i
];

function findPrefilledValue(pfObj, targetHeader) {
  if (!pfObj) return '';
  if (pfObj[targetHeader]) return pfObj[targetHeader];
  const targetLow = String(targetHeader || '').toLowerCase().trim();
  const entries = Object.entries(pfObj).filter(([, v]) => v);
  // 1) Case-insensitive exact match
  for (const [k, v] of entries) {
    if (k.toLowerCase().trim() === targetLow) return v;
  }
  // 2) Semantic family match (e.g., "Название категории" <-> "Категория")
  const fam = HEADER_FAMILIES.find((re) => re.test(targetLow));
  if (fam) {
    for (const [k, v] of entries) {
      if (fam.test(k.toLowerCase())) return v;
    }
  }
  return '';
}

function isWasmValueCompatible(prefilled, wasmVal) {
  const a = String(prefilled || '').toLowerCase().trim();
  const b = String(wasmVal || '').toLowerCase().trim();
  if (!a || !b || b === '—') return true;
  if (a === b) return true;
  // Numeric comparison (e.g., "20%" vs "20", "300 г" vs "300")
  const na = a.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  const nb = b.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (na && nb && Math.abs(parseFloat(na[0]) - parseFloat(nb[0])) < 0.001) return true;
  // Root / substring overlap (4+ char stems)
  if (a.includes(b) || b.includes(a)) return true;
  const stemA = a.replace(/[^а-яa-z0-9]/gi, '').slice(0, 4);
  const stemB = b.replace(/[^а-яa-z0-9]/gi, '').slice(0, 4);
  if (stemA.length >= 4 && stemB.length >= 4 && (a.includes(stemB) || b.includes(stemA))) return true;
  return false;
}

function fillB() {
  clearImportedBuffer();
  if (rgmColsInput) {
    rgmColsInput.value = 'Категория, бренд, жирность, упаковка, вес, цена';
    rgmColsInput.removeAttribute('aria-invalid');
  }
  if (rgmProductsInput) {
    rgmProductsInput.value = `${SAMPLE_RGM}\nБЗМЖ смет Луговушка 20% 300г пл/ст 129р\n6*0.5л вода мин Горный Ключ пэт 240р`;
    rgmProductsInput.removeAttribute('aria-invalid');
  }
}

$('#fill').addEventListener('click', fillB);
$('#send').addEventListener('click', runB);

async function runB() {
  if (B.dataset.s === 'r') return;
  const colsRaw = (rgmColsInput ? rgmColsInput.value : '').trim();
  const parsedCols = colsRaw.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
  const activeImport = importedContext && importedContext.rows?.length ? importedContext : null;
  const productLines = activeImport
    ? activeImport.rows.map((r) => r.raw)
    : (rgmProductsInput ? rgmProductsInput.value : '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);

  if (!parsedCols.length) {
    rgmColsInput?.setAttribute('aria-invalid', 'true');
    rgmColsInput?.focus();
    toast('Укажите хотя бы один столбец через запятую');
    return;
  }
  if (!productLines.length) {
    rgmProductsInput?.setAttribute('aria-invalid', 'true');
    rgmProductsInput?.focus();
    toast('Введите хотя бы одно название товара');
    return;
  }
  rgmColsInput?.removeAttribute('aria-invalid');
  rgmProductsInput?.removeAttribute('aria-invalid');

  const rgmMode = $('input[name="rgm-mode"]:checked')?.value || 'wasm';
  if (rgmMode === 'ai' && !aiService.hasKey()) {
    openApiDialog('Укажите API-ключ для запуска AI-разбора номенклатуры.');
    return;
  }
  if (rgmMode === 'local-ai' && !localLlmService.isEngineReadyForCurrentModel()) {
    const confirmed = await confirmLocalDownload();
    if (!confirmed) {
      toast('Загрузка локальной модели отменена');
      return;
    }
  }

  setStepState(B, 'r');
  $('#send').setAttribute('aria-busy', 'true');
  if (localAiProgressBox && rgmSkeleton) {
    const showProgress = rgmMode === 'local-ai' || rgmMode === 'ai';
    localAiProgressBox.hidden = !showProgress;
    rgmSkeleton.hidden = showProgress;
    if (showProgress && localAiProg && localAiStatus) {
      localAiProg.value = 5;
      localAiStatus.textContent = rgmMode === 'local-ai'
        ? 'Проверка WebGPU и подготовка…'
        : 'Подготовка пакетов для API…';
    }
  }
  const t0 = Date.now();

  try {
    let headers = parsedCols;
    let rows;

    const customInstr = rgmInstructions ? rgmInstructions.value.trim() : '';
    const prefilledByProduct = new Map();
    if (activeImport && activeImport.mode === 'use-data') {
      activeImport.rows.forEach((r) => {
        if (r.prefilled && Object.keys(r.prefilled).length && !prefilledByProduct.has(r.raw)) {
          const mapped = {};
          headers.forEach((h) => {
            const val = findPrefilledValue(r.prefilled, h);
            if (val) mapped[h] = val;
          });
          if (Object.keys(mapped).length) prefilledByProduct.set(r.raw, mapped);
        }
      });
    }

    if (rgmMode === 'ai') {
      rows = await aiService.extractAttributesWithAi(headers, productLines, customInstr, {
        prefilledByProduct,
        onProgress: ({ pct, stage }) => {
          if (localAiProg) localAiProg.value = pct;
          if (localAiStatus) localAiStatus.textContent = stage;
        }
      });
    } else if (rgmMode === 'local-ai') {
      let draftFn = null;
      try {
        await initWasmEngine();
        const wasmEngine = getWasmEngine();
        if (wasmEngine && typeof wasmEngine.extractAttributes === 'function') {
          draftFn = (line) => {
            try {
              const r = wasmEngine.extractAttributes(`${headers.join(', ')}\n${line}`);
              const p = typeof r === 'string' ? JSON.parse(r) : r;
              return p?.rows?.[0]?.attributes || null;
            } catch {
              return null;
            }
          };
        }
      } catch { /* ignore */ }

      rows = await localLlmService.extractAttributes(headers, productLines, {
        draftExtractor: draftFn,
        customInstructions: customInstr,
        prefilledByProduct,
        onProgress: ({ pct, stage }) => {
          if (localAiProg) localAiProg.value = pct;
          if (localAiStatus) localAiStatus.textContent = stage;
        }
      });
      await refreshLocalCacheStatus();
    } else {
      await initWasmEngine();
      const engine = getWasmEngine();
      if (!engine || typeof engine.extractAttributes !== 'function') {
        throw new Error('Модуль WebAssembly не инициализирован');
      }
      // Deduplicate unique lines for Wasm extraction, then map 1-to-N back to all rows
      const uniqueLines = [...new Set(productLines)];
      const combinedPayload = `${headers.join(', ')}\n${uniqueLines.join('\n')}`;
      const res = engine.extractAttributes(combinedPayload);
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      headers = parsed.headers || headers;
      const wasmByRaw = new Map();
      (parsed.rows || []).forEach((r) => wasmByRaw.set(r.raw, r.attributes || {}));

      rows = productLines.map((raw, idx) => {
        const wasmAttrs = wasmByRaw.get(raw) || {};
        const pf = activeImport && activeImport.mode === 'use-data'
          ? (activeImport.rows[idx]?.prefilled || {})
          : {};
        const attributes = {};
        const disputes = {};
        headers.forEach((h) => {
          const pfVal = findPrefilledValue(pf, h);
          const wVal = wasmAttrs[h] || '—';
          if (pfVal) {
            attributes[h] = pfVal;
            if (wVal && wVal !== '—' && !isWasmValueCompatible(pfVal, wVal)) {
              disputes[h] = wVal;
            }
          } else {
            attributes[h] = wVal;
          }
        });
        return { raw, attributes, disputes };
      });
    }

    const csvEscape = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(?:[.,]\d+)?$/.test(s.trim())) {
        s = `'${s}`;
      }
      return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const secondaryHeaders = (activeImport && activeImport.preserveSecondary)
      ? (activeImport.secondaryHeaders || [])
      : [];
    const fullHeaders = ['Название товара', ...headers, ...secondaryHeaders];

    lastRgmHeaders = [...headers, ...secondaryHeaders];
    lastRgmRows = rows;
    lastRgmCellStyles = {};
    let disputedRowCount = 0;

    lastRgmMatrix = [
      fullHeaders,
      ...rows.map((row, rIdx) => {
        const secObj = (activeImport && activeImport.preserveSecondary)
          ? (activeImport.rows[rIdx]?.secondary || {})
          : {};
        const disputes = row.disputes || {};
        const disputedKeys = Object.keys(disputes);
        if (disputedKeys.length > 0) {
          disputedRowCount++;
          lastRgmCellStyles[`${rIdx + 1}:0`] = 'red';
          disputedKeys.forEach((dk) => {
            const cIdx = headers.indexOf(dk);
            if (cIdx >= 0) {
              lastRgmCellStyles[`${rIdx + 1}:${cIdx + 1}`] = 'yellow';
            }
          });
        }
        return [
          row.raw,
          ...headers.map((h) => row.attributes?.[h] ?? ''),
          ...secondaryHeaders.map((sh) => secObj[sh] ?? '')
        ];
      })
    ];
    lastRgmCsv = lastRgmMatrix.map((r) => r.join('#')).join('\n');
    lastRgmRealCsv = lastRgmMatrix.map((r) => r.map(csvEscape).join(';')).join('\r\n');

    const previewRows = rows.slice(0, 10);
    const hasMoreRows = rows.length > 10;

    const tableHtml = `
      <table class="tbl">
        <caption class="sr-only">Результат выделения атрибутов</caption>
        <thead>
          <tr>
            <th scope="col">Название товара</th>
            ${headers.map((x) => `<th scope="col">${esc(x)}</th>`).join('')}
            ${secondaryHeaders.map((x) => `<th scope="col">${esc(x)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${previewRows.map((row, rIdx) => {
            const disputes = row.disputes || {};
            const disputedKeys = Object.keys(disputes);
            const hasDispute = disputedKeys.length > 0;
            const secObj = (activeImport && activeImport.preserveSecondary)
              ? (activeImport.rows[rIdx]?.secondary || {})
              : {};
            const nameTip = hasDispute
              ? `${row.raw} — спорные поля: ${disputedKeys.join(', ')}`
              : row.raw;
            return `
              <tr>
                <td class="${hasDispute ? 'cell-dispute-name' : ''}">
                  <span class="cell-trunc" tabindex="0" data-full="${esc(nameTip)}" aria-label="${esc(nameTip)}">${esc(row.raw)}</span>
                </td>
                ${headers.map((h) => {
                  const val = row.attributes?.[h] || '—';
                  const exp = disputes[h];
                  if (exp) {
                    const tip = `Спорное значение из файла · ожидалось: «${exp}»`;
                    return `<td class="cell-dispute-val" tabindex="0" data-full="${esc(tip)}">${esc(val)}</td>`;
                  }
                  return `<td>${esc(val)}</td>`;
                }).join('')}
                ${secondaryHeaders.map((sh) => `<td>${esc(secObj[sh] || '—')}</td>`).join('')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    setTimeout(() => {
      const resEl = $('#res');
      setSafeHtml(resEl, tableHtml);
      if (resLimitNote) {
        const noteParts = [];
        if (hasMoreRows) {
          noteParts.push(esc(`Показаны первые 10 из ${rows.length.toLocaleString('ru-RU')} строк`));
        }
        if (activeImport?.mode === 'use-data') {
          if (disputedRowCount > 0) {
            noteParts.push(`<span class="res-dispute-badge is-alert">спорных строк: ${disputedRowCount.toLocaleString('ru-RU')}</span>`);
          } else {
            noteParts.push('<span class="res-dispute-badge is-ok">спорных строк: 0</span>');
          }
        }
        if (secondaryHeaders.length > 0) {
          noteParts.push(esc(`+${secondaryHeaders.length} второст. столбцов`));
        }
        const suffix = (hasMoreRows || secondaryHeaders.length > 0)
          ? ' — полная таблица в экспорте.'
          : '';
        resLimitNote.hidden = noteParts.length === 0;
        setSafeHtml(resLimitNote, noteParts.length ? `${noteParts.join(' · ')}${suffix}` : '');
      }
      bindFullTooltips(resEl);
      setStepState(B, 'd');
      $('#send').removeAttribute('aria-busy');
    }, rgmMode === 'local-ai' ? 0 : Math.max(0, 350 - (Date.now() - t0)));
  } catch (err) {
    console.error('[RGM] Attribute extraction failed:', err);
    if (!localLlmService.aborted) {
      toast(`Ошибка: ${err.message}`);
    }
    setStepState(B, 'i');
    $('#send').removeAttribute('aria-busy');
  }
}

function closePopupMenu(trigger, menu, restoreFocus = false) {
  if (!menu) return;
  if (typeof menu.hidePopover === 'function' && menu.matches(':popover-open')) {
    menu.hidePopover();
  } else {
    menu.classList.remove(':popover-open');
    trigger?.setAttribute('aria-expanded', 'false');
  }
  if (restoreFocus && trigger) {
    try { trigger.focus({ focusVisible: false }); } catch { trigger.focus(); }
  }
}

function positionPopupMenuFallback(trigger, menu) {
  if (!menu || !trigger) return;
  if (CSS.supports && CSS.supports('position-area: block-end')) return;
  const r = trigger.getBoundingClientRect();
  const mw = menu.offsetWidth || 210;
  const mh = menu.offsetHeight || 130;
  const left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8));
  const top = (r.bottom + 6 + mh > window.innerHeight) ? Math.max(8, r.top - mh - 6) : (r.bottom + 6);
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function setupPopupMenu(trigger, menu) {
  if (!trigger || !menu) return;
  const group = menu.querySelector('[focusgroup~="menu"]');

  menu.addEventListener('toggle', (e) => {
    const isOpen = e.newState === 'open';
    trigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      positionPopupMenuFallback(trigger, menu);
    }
  });

  if (!('commandForElement' in HTMLButtonElement.prototype) || !Object.hasOwn(HTMLElement.prototype, 'popover')) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (Object.hasOwn(HTMLElement.prototype, 'popover')) {
        if (menu.matches(':popover-open')) {
          menu.hidePopover();
        } else {
          try { menu.showPopover({ source: trigger }); } catch { menu.showPopover(); }
        }
      } else {
        const nextOpen = !menu.classList.contains(':popover-open');
        menu.classList.toggle(':popover-open', nextOpen);
        trigger.setAttribute('aria-expanded', String(nextOpen));
        if (nextOpen) positionPopupMenuFallback(trigger, menu);
      }
    });
  }

  if (group && !('focusGroup' in HTMLElement.prototype)) {
    group.setAttribute('role', 'menu');
    group.querySelectorAll('button:not([role])').forEach((item) => {
      item.setAttribute('role', 'menuitem');
    });
    group.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = [...group.querySelectorAll('button')].filter((i) => !i.disabled);
      const current = items.indexOf(document.activeElement);
      if (current < 0) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
      event.preventDefault();
      event.stopImmediatePropagation();
      items[next].focus({ preventScroll: true });
    }, true);
  }

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const isOpen = menu.matches?.(':popover-open') || menu.classList.contains(':popover-open');
      if (!isOpen) trigger.click();
      setTimeout(() => menu.querySelector('button')?.focus(), 0);
    }
  });
}

const dlTrigger = $('#rgm-dl-trigger');
const dlMenu = $('#rgm-dl-menu');
const dsOpenTrigger = $('#ds-open-trigger');
const dsOpenMenu = $('#ds-open-menu');

function initDownloadMenu() {
  setupPopupMenu(dlTrigger, dlMenu);
  setupPopupMenu(dsOpenTrigger, dsOpenMenu);
}

$('#btn-rgm-xlsx').addEventListener('click', async () => {
  closePopupMenu(dlTrigger, dlMenu, true);
  if (!lastRgmMatrix.length) return;
  try {
    const { buildXlsxBytes } = await import('./xlsx_export.js?v=3.9.0');
    const bytes = buildXlsxBytes(lastRgmMatrix, 'Атрибуты', { cellStyles: lastRgmCellStyles });
    downloadBlob(
      bytes,
      'Параметры товаров.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  } catch (err) {
    console.error('[XLSX Export]', err);
    toast(`Ошибка экспорта XLSX: ${err.message}`);
  }
});

$('#btn-rgm-csv')?.addEventListener('click', () => {
  closePopupMenu(dlTrigger, dlMenu, true);
  if (!lastRgmRealCsv) return;
  downloadBlob('\uFEFF' + lastRgmRealCsv, 'Параметры товаров.csv', 'text/csv;charset=utf-8');
});

$('#btn-rgm-txt').addEventListener('click', () => {
  closePopupMenu(dlTrigger, dlMenu, true);
  if (!lastRgmCsv) return;
  downloadBlob(lastRgmCsv, 'Параметры товаров.txt', 'text/plain;charset=utf-8');
});

function downloadBlob(content, filename, mime) {
  const safeName = String(filename || 'export').replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ==========================================================================
   Internal Workspace Dataset Store (Session RAM / IndexedDB) & Cross-Tab Sync
   ========================================================================== */
const dsDlg = $('#dataset-save-dlg');
const dsNameInp = $('#ds-name-inp');
const dsCurrMeta = $('#ds-current-meta');
const dsRamUsage = $('#ds-ram-usage');
const dsIdbUsage = $('#ds-idb-usage');
const dsIdbQuota = $('#ds-idb-quota');
const dsSavedCount = $('#ds-saved-count');
const dsSavedList = $('#ds-saved-list');
const dsSaveConfirm = $('#ds-save-confirm');

let cachedSavedDatasets = [];

function getSelectedDsStorage() {
  return $('input[name="ds-storage"]:checked')?.value === 'indexeddb' ? 'indexeddb' : 'session';
}

async function refreshSavedDatasetsUi() {
  const [items, stats] = await Promise.all([
    datasetStore.listDatasets(),
    datasetStore.getStats()
  ]);
  cachedSavedDatasets = items;

  if (dsRamUsage) dsRamUsage.textContent = `${formatBytes(stats.ramBytes)} (${stats.ramCount} шт.)`;
  if (dsIdbUsage) dsIdbUsage.textContent = `${formatBytes(stats.idbBytes)} (${stats.idbCount} шт.)`;
  if (dsIdbQuota) {
    if (!datasetStore.isIndexedDbSupported()) {
      dsIdbQuota.textContent = 'не поддерживается';
    } else if (stats.quotaBytes) {
      const freeEst = Math.max(0, stats.quotaBytes - (stats.originUsageBytes || 0));
      dsIdbQuota.textContent = `до ${formatBytes(freeEst)} (квота ${formatBytes(stats.quotaBytes)})`;
    } else {
      dsIdbQuota.textContent = 'зависит от свободного места';
    }
  }
  if (dsSavedCount) dsSavedCount.textContent = String(items.length);

  if (dsSavedList) {
    if (!items.length) {
      setSafeHtml(dsSavedList, '<div style="font-size:0.78125rem;color:var(--mu);padding:6px 2px">Пока нет сохранённых наборов. Нажмите «Сохранить датасет», чтобы передать таблицу на другие вкладки.</div>');
    } else {
      setSafeHtml(dsSavedList, items.map((it) => `
        <div class="ds-saved-item">
          <div class="ds-saved-item-main">
            <b>${esc(it.name)}</b>
            <span class="help-chip">${it.storage === 'indexeddb' ? 'IndexedDB' : 'RAM'}</span>
            <span style="color:var(--mu)">${it.rowCount} стр. · ${formatBytes(it.bytes)}</span>
          </div>
          <button type="button" class="lk" data-del-ds="${esc(it.id)}" data-del-st="${esc(it.storage)}" style="font-size:0.75rem;color:var(--mu)">Удалить</button>
        </div>
      `).join(''));
      $$('[data-del-ds]', dsSavedList).forEach((btn) => {
        btn.addEventListener('click', async () => {
          await datasetStore.removeDataset(btn.dataset.delDs, btn.dataset.delSt);
          await refreshSavedDatasetsUi();
          toast('Датасет удалён');
        });
      });
    }
  }

  // Sync #dashboard «Данные» popover with saved attribute datasets
  renderBiDatasetPopover();
}

async function openDatasetSaveDialog({ allowSave = true } = {}) {
  if (!dsDlg) return;
  const hasCurrent = allowSave && lastRgmMatrix.length > 1;
  if (dsNameInp) dsNameInp.value = formatDefaultDatasetName();
  if (dsCurrMeta) {
    dsCurrMeta.textContent = hasCurrent
      ? `${lastRgmRows.length} строк · ${formatBytes(datasetStore.estimateMatrixBytes(lastRgmMatrix))}`
      : 'Нет активного результата';
  }
  if (dsSaveConfirm) dsSaveConfirm.disabled = !hasCurrent;
  const idbRadio = $('input[name="ds-storage"][value="indexeddb"]');
  if (idbRadio) {
    idbRadio.disabled = !datasetStore.isIndexedDbSupported();
  }
  await refreshSavedDatasetsUi();
  dsDlg.showModal();
}

$('#btn-rgm-save-dataset')?.addEventListener('click', () => openDatasetSaveDialog({ allowSave: true }));
$('#ds-dlg-close')?.addEventListener('click', () => dsDlg?.close());

$$('[data-ds-nav]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetHash = btn.dataset.dsNav;
    closePopupMenu(dsOpenTrigger, dsOpenMenu, false);
    dsDlg?.close();
    if (targetHash) window.location.hash = targetHash;
  });
});

dsSaveConfirm?.addEventListener('click', async () => {
  if (lastRgmMatrix.length <= 1) {
    toast('Сначала выполните разбор товаров');
    return;
  }
  const storage = getSelectedDsStorage();
  const name = dsNameInp?.value.trim() || formatDefaultDatasetName();
  try {
    const saved = await datasetStore.saveDataset({
      name,
      headers: lastRgmHeaders,
      rows: lastRgmRows,
      matrix: lastRgmMatrix,
      storage
    });
    if (dsNameInp) dsNameInp.value = formatDefaultDatasetName();
    await refreshSavedDatasetsUi();
    toast(`Сохранено (${saved.storage === 'indexeddb' ? 'IndexedDB' : 'память сессии'}): ${saved.name}`);
  } catch (err) {
    console.error('[DatasetStore] Save failed:', err);
    toast(`Ошибка сохранения: ${err.message}`);
  }
});

$('#ds-clear-idb')?.addEventListener('click', async () => {
  await datasetStore.clearIndexedDb();
  await refreshSavedDatasetsUi();
  toast('Хранилище IndexedDB очищено');
});

/* ==========================================================================
   Bootstrap Application & Initialize Rust Wasm Core
   ========================================================================== */
async function initApp() {
  syncApiBadges();
  syncThemeButtonUi();
  syncLocalAiControlsUi();
  syncRgmModeUi();
  bindFullTooltips(B);
  initPopoverFallback();
  initDownloadMenu();
  refreshSavedDatasetsUi();

  // Safety sweep: if persistent caching is OFF (or a previous download/run left dirty flags on abrupt tab kill), wipe caches immediately
  if (!localLlmService.cacheEnabled || localLlmService.getDirtyFlag()) {
    localLlmService.purgeAllLocalCaches().then(() => refreshLocalCacheStatus());
  }

  route();

  try {
    await initWasmEngine();
    if (isWasmReady()) {
      updateCoreBadge('wasm', ' · Rust');
      riskStore?.notifyExternalSync?.();
    } else {
      updateCoreBadge('demo');
    }
  } catch (err) {
    console.warn('[Sparkle] Wasm initialization warning:', err);
    updateCoreBadge('demo');
  }

  initRiceTool({
    onStateChange: () => {
      riskStore?.notifyExternalSync?.();
      if (apiDlg?.open) renderSettingsDataPanel();
    },
    onRiskInitiativeEdited: (it) => {
      riskStore?.syncFromRiceItem?.(it);
    },
    onScaleModeConverted: (from, to) => {
      riskStore?.convertRiskRiceScale?.(from, to);
    },
    confirmAction: confirmDataAction,
    toast,
    isDarkMode
  });
  riskStore?.notifyExternalSync?.();

  window.addEventListener('resize', () => {
    setTimeout(() => {
      resizeAllCharts();
      if ($('[data-v="rice"]')?.classList.contains('on')) rerenderRiceChart();
    }, 100);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
