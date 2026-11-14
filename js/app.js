/**
 * Sparkle SPA Application Coordinator & Hash Router
 * Integrates all modules, design system, themes, charts and command palette.
 */

import { initWasmEngine, isWasmReady } from './wasm_loader.js';
import { renderFullDashboard, renderPlotlyFigure } from './charts.js';
import { RiskMatrix } from './risk_map.js';
import { initLivePreview, initBatchAttributeParser } from './rgm_parser.js';
import { aiService, MANDATORY_CAPTIONS, DEFAULT_MODELS, DEFAULT_BASE_URL } from './ai_service.js';
import {
  setupExcelWizard,
  getCurrentDataset,
  setCurrentDataset,
  getCurrentFileName,
  fetchPrecomputedDemo,
  fetchSampleAsUint8Array,
  processExcelData
} from './excel_handler.js';

// Section Groups Configuration for Sidebar and Crumbs
const GROUPS = [
  {
    n: 'Стратегическая сессия',
    s: 'Стратегия',
    c: '--strat',
    t: [
      ['framework', 'Фреймворк сессии'],
      ['prep', 'Подготовка аналитики'],
      ['dash', 'Аналитический дашборд']
    ]
  },
  {
    n: 'Риск-менеджмент',
    s: 'Риски',
    c: '--risk',
    t: [
      ['risk', 'Фреймворк рисков'],
      ['riskmap', 'Карта рисков 3×3']
    ]
  },
  {
    n: 'Рост выручки (RGM)',
    s: 'Рост',
    c: '--rgm',
    t: [
      ['market', 'Аналитика рынка'],
      ['attrs', 'Выделение атрибутов']
    ]
  },
  {
    n: 'Настройки',
    s: 'Настройки',
    c: '--acc',
    t: [
      ['settings', 'AI API и Безопасность']
    ]
  }
];

const ALL_ROUTES = [
  ['home', 'Главная', null],
  ...GROUPS.flatMap(g => g.t.map(([id, title]) => [id, title, g]))
];

const getGroupColor = (g) => g ? `var(${g.c})` : 'var(--acc)';

// DOM Helper functions
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  const saved = localStorage.getItem('sparkle_theme') || 'auto';
  applyTheme(saved);

  const btn = $('#theme-toggle');
  if (btn) {
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('sparkle_theme', next);
    };
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }

  const btnText = $('#theme-toggle-text');
  if (btnText) {
    btnText.textContent = isDark ? 'Тёмная тема' : 'Светлая тема';
  }

  // Refresh charts on theme toggle if active
  const activeDataset = getCurrentDataset();
  if (activeDataset && location.hash === '#dash') {
    renderFullDashboard(activeDataset, isDark);
  }
}

function isCurrentDark() {
  const rootTheme = document.documentElement.getAttribute('data-theme');
  if (rootTheme === 'dark') return true;
  if (rootTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* ==========================================================================
   Toast Notification Service
   ========================================================================== */
let toastTimeout;
export function showToast(message) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('on');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('on'), 3000);
}

window.addEventListener('sparkle:toast', (e) => showToast(e.detail));

/* ==========================================================================
   Router
   ========================================================================== */
function route() {
  let hash = location.hash.slice(1);
  if (!ALL_ROUTES.some(r => r[0] === hash)) {
    hash = 'home';
  }

  const group = GROUPS.find(g => g.t.some(t => t[0] === hash));

  // Show active section
  $$('main section').forEach(sec => {
    sec.classList.toggle('on', sec.id === hash);
  });

  // Update theme accent CSS variable
  $('main').style.setProperty('--c', getGroupColor(group));

  // Sync sidebar active state
  $$('[data-id]').forEach(a => {
    a.toggleAttribute('aria-current', a.dataset.id === hash);
  });

  // Sync mobile tabbar
  $$('#tb a').forEach((a, idx) => {
    if (idx === 0) {
      a.toggleAttribute('aria-current', hash === 'home');
    } else {
      a.toggleAttribute('aria-current', GROUPS[idx - 1] === group);
    }
  });

  // Update breadcrumbs and segmented tabs
  const crumbEl = $('#crumb');
  if (crumbEl) {
    crumbEl.innerHTML = group
      ? `<span style="--c:${getGroupColor(group)};display:flex;align-items:center"><b class="d"></b>${group.n}</span>
         <div class="seg">` +
        group.t.map(([id, title]) => `<a href="#${id}"${id === hash ? ' aria-current="true"' : ''}>${title}</a>`).join('') +
        '</div>'
      : '';
  }

  // Handle specific section activations
  if (hash === 'dash') {
    handleDashboardActivation();
  } else if (hash === 'settings') {
    loadSettingsUI();
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', route);

/* ==========================================================================
   Command Palette (Ctrl + K)
   ========================================================================== */
function initCommandPalette() {
  const pal = $('#pal');
  const pi = $('#pi');
  const pl = $('#pl');
  if (!pal || !pi || !pl) return;

  let filtered = [];
  let selectedIdx = 0;

  const renderList = () => {
    const q = pi.value.toLowerCase().trim();
    filtered = ALL_ROUTES.filter(([id, title, g]) => {
      const gName = g ? g.n : 'Начало';
      return (title + ' ' + gName).toLowerCase().includes(q);
    });

    selectedIdx = Math.max(0, Math.min(selectedIdx, filtered.length - 1));

    if (!filtered.length) {
      pl.innerHTML = '<p class="mut" style="padding:14px;text-align:center">Ничего не найдено</p>';
      return;
    }

    pl.innerHTML = filtered.map(([id, title, g], i) => `
      <a href="#${id}" class="${i === selectedIdx ? 'on' : ''}" style="--c:${getGroupColor(g)}">
        <b class="d"></b>${title}
        <small>${g ? g.n : 'Раздел'}</small>
      </a>
    `).join('');
  };

  const setOpen = (open) => {
    pal.hidden = !open;
    if (open) {
      pi.value = '';
      selectedIdx = 0;
      renderList();
      pi.focus();
    }
  };

  pi.addEventListener('input', () => {
    selectedIdx = 0;
    renderList();
  });

  $$('[data-pal]').forEach(btn => {
    btn.onclick = () => setOpen(true);
  });

  pal.onclick = (e) => {
    if (e.target === pal || e.target.closest('a')) setOpen(false);
  };

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOpen(pal.hidden);
    } else if (!pal.hidden && filtered.length) {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % filtered.length;
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length;
        renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        location.hash = '#' + filtered[selectedIdx][0];
        setOpen(false);
      }
    } else if (e.key === 'Escape' && !pal.hidden) {
      setOpen(false);
    }
  });
}

/* ==========================================================================
   Dashboard Renderer & Subtabs
   ========================================================================== */
async function handleDashboardActivation() {
  let bundle = getCurrentDataset();
  if (!bundle) {
    // Attempt live in-memory Wasm processing of default sample
    try {
      const sampleBytes = await fetchSampleAsUint8Array('assets/samples/test_data_3.xlsx');
      bundle = await processExcelData(sampleBytes, 'test_data_3.xlsx');
    } catch (e) {
      console.warn('[Dashboard] Live Wasm parse of default sample failed, fallback to demo fixture:', e);
      bundle = await fetchPrecomputedDemo('assets/samples/demo_test_data_3.json');
      setCurrentDataset(bundle, 'test_data_3.xlsx');
    }
  }

  const isDark = isCurrentDark();
  renderFullDashboard(bundle, isDark);

  // AI Commentary rendering with sanitized markdown
  const aiBox = $('#dash-ai-content');
  if (aiBox && bundle.ai_comment) {
    aiBox.innerHTML = formatMarkdown(bundle.ai_comment);
  }

  // Bind AI Refresh Button
  const aiBtn = $('#btn-run-ai-analysis');
  if (aiBtn) {
    aiBtn.onclick = async () => {
      if (!aiService.hasKey()) {
        showToast('Для генерации нового AI-анализа укажите ключ в разделе Настройки');
        location.hash = '#settings';
        return;
      }

      aiBtn.disabled = true;
      aiBtn.innerHTML = '<span class="spinner"></span> Анализируем через ProxyAPI...';

      try {
        const prompt = `Ты бизнес-аналитик Sparkle. Проанализируй показатели маржинальности и выдели топ-3 товара.`;
        const res = await aiService.generateCompletion([
          { role: 'system', content: 'Ты опытный стратегический аналитик и RGM-эксперт.' },
          { role: 'user', content: prompt }
        ]);
        if (aiBox) aiBox.innerHTML = formatMarkdown(res);
        showToast('AI-анализ успешно обновлён');
      } catch (err) {
        showToast(`Ошибка AI: ${err.message}`);
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = 'Обновить AI-анализ';
      }
    };
  }
}

function initDashboardTabs() {
  const tabs = $$('#dash-tabs button');
  const panels = $$('#dash-tab-content > div');

  tabs.forEach((tab, i) => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.toggle('on', t === tab));
      panels.forEach((p, j) => p.hidden = (j !== i));

      // Trigger Plotly relayout to fit newly visible container
      window.dispatchEvent(new Event('resize'));
    };
  });
}

function formatMarkdown(text) {
  if (!text) return '';
  // Sanitize raw HTML tags to prevent DOM XSS vulnerabilities
  const safeText = esc(text);
  return safeText
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/^\d+\.\s+(.*$)/gim, '<div style="margin:4px 0">• $1</div>');
}

/* ==========================================================================
   ProxyAPI Settings & Mandatory Security Notices
   ========================================================================== */
function loadSettingsUI() {
  const keyInput = $('#setting-api-key');
  const urlInput = $('#setting-base-url');
  const modelSelect = $('#setting-model-select');
  const customModelGroup = $('#setting-custom-model-group');
  const customModelInput = $('#setting-custom-model');

  if (keyInput) keyInput.value = aiService.key;
  if (urlInput) urlInput.value = aiService.baseUrl || DEFAULT_BASE_URL;
  if (modelSelect) modelSelect.value = aiService.model || DEFAULT_MODELS[0].id;
  if (customModelInput) customModelInput.value = aiService.customModel;

  const updateCustomVisibility = () => {
    if (customModelGroup) {
      customModelGroup.hidden = (modelSelect.value !== 'custom');
    }
  };
  if (modelSelect) {
    modelSelect.onchange = updateCustomVisibility;
    updateCustomVisibility();
  }

  // Save button
  const saveBtn = $('#btn-save-ai-settings');
  if (saveBtn) {
    saveBtn.onclick = () => {
      aiService.saveConfig(
        keyInput.value,
        urlInput.value,
        modelSelect.value,
        customModelInput.value
      );
      showSecurityModal();
    };
  }

  // Clear button
  const clearBtn = $('#btn-clear-ai-settings');
  if (clearBtn) {
    clearBtn.onclick = () => {
      aiService.clearConfig();
      if (keyInput) keyInput.value = '';
      if (urlInput) urlInput.value = DEFAULT_BASE_URL;
      if (modelSelect) modelSelect.value = DEFAULT_MODELS[0].id;
      if (customModelInput) customModelInput.value = '';
      updateCustomVisibility();
      showToast('API-ключи полностью удалены из localStorage');
    };
  }

  // Test button
  const testBtn = $('#btn-test-ai-connection');
  const testStatus = $('#ai-test-status');
  if (testBtn) {
    testBtn.onclick = async () => {
      testBtn.disabled = true;
      testBtn.innerHTML = '<span class="spinner"></span> Проверка соединения...';
      if (testStatus) testStatus.textContent = '';

      try {
        const res = await aiService.testConnection();
        if (testStatus) {
          testStatus.innerHTML = `<span style="color:#10b981">✓ Соединение успешно: ${esc(res)}</span>`;
        }
        showToast('Соединение с ProxyAPI успешно установлено');
      } catch (err) {
        if (testStatus) {
          testStatus.innerHTML = `<span style="color:#f43f5e">✗ Ошибка: ${esc(err.message)}</span>`;
        }
        showToast(`Ошибка проверки: ${err.message}`);
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Проверить соединение';
      }
    };
  }
}

function showSecurityModal() {
  const modal = $('#save-key-modal');
  if (!modal) return;
  modal.hidden = false;

  const closeBtn = $('#btn-close-sec-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.hidden = true;
      showToast('Настройки сохранены');
    };
  }
}

/* ==========================================================================
   Framework Checklists & Content
   ========================================================================== */
function initChecklists() {
  const chk = (el, items) => {
    if (!el) return;
    el.classList.add('chk');
    el.innerHTML = items.map(t => `<label><input type="checkbox"><span>${t}</span></label>`).join('') + '<p class="pgl"></p>';
    const update = () => {
      const checked = el.querySelectorAll(':checked').length;
      el.querySelector('.pgl').textContent = `Выполнено ${checked} из ${items.length}`;
    };
    el.onchange = update;
    update();
  };

  // Strategic framework phases
  const PHASES = {
    'Подготовка': [
      'Определите цели и задачи стратегической сессии',
      'Сформируйте состав участников и регламент',
      'Подготовьте финансовые и операционные данные (VMPC-INO)',
      'Разработайте детальный сценарий фасилитации'
    ],
    'Сессия': [
      'Откройте сессию и введите участников в контекст',
      'Представьте аналитику и положение на рынке',
      'Сгенерируйте стратегические инициативы',
      'Приоритизируйте цели фреймворком RICE'
    ],
    'Реализация': [
      'Декомпозируйте стратегические цели в OKR/KPI',
      'Проинформируйте сотрудников о целях компании',
      'Настройте регулярный трекинг выполнения инициатив'
    ]
  };

  const phc = $('#phc');
  const ph = $('#ph');
  if (phc && ph) {
    phc.innerHTML = '';
    ph.innerHTML = '';
    Object.keys(PHASES).forEach((key, idx) => {
      const btn = document.createElement('button');
      const div = document.createElement('div');
      chk(div, PHASES[key]);
      phc.appendChild(div);
      btn.textContent = `${idx + 1}. ${key}`;
      btn.onclick = () => {
        $$('#ph button').forEach(x => x.classList.toggle('on', x === btn));
        $$('#phc > div').forEach((x, j) => x.hidden = (j !== idx));
      };
      ph.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  // Risk management checklist
  chk($('#rk'), [
    'Соберите комитет по управлению рисками и утвердите регулярность встреч',
    'Идентифицируйте риски, оцените вероятность и влияние каждого на матрице 3×3',
    'Зафиксируйте стратегию обработки (Снижение, Перенос, Уклонение, Принятие)',
    'Отслеживайте динамику и возвращайтесь к карте после каждого заседания'
  ]);

  // Framework tools chips
  const TOOLS = {
    'Компания': ['Прибыль и выручка', 'Маржинальность', 'Структура затрат', 'Эффективность', 'Качество продукции', 'Вовлечённость'],
    'Внешняя среда': ['PEST(EL)', 'SWOT', '5 сил Портера', 'BCG', 'Balanced Scorecard', 'Голубой океан', 'Матрица Ансоффа', 'McKinsey 7S', 'OKR'],
    'Внутренняя среда': ['Оргструктура', 'Интересы менеджмента', 'Управление знаниями', 'KPI и культура', 'Финансы'],
    'Потребители': ['Аватары клиентов', 'Факторы выбора', 'Тренды рынка', 'Sentiment analysis', 'CJM', 'CLTV']
  };

  const tt = $('#tt');
  const tl = $('#tl');
  if (tt && tl) {
    tt.innerHTML = '';
    Object.keys(TOOLS).forEach((key, idx) => {
      const btn = document.createElement('button');
      btn.textContent = key;
      btn.onclick = () => {
        $$('#tt button').forEach(x => x.classList.toggle('on', x === btn));
        tl.innerHTML = TOOLS[key].map(x => `<span class="chip n">${x}</span>`).join('');
      };
      tt.appendChild(btn);
      if (idx === 0) btn.click();
    });
  }

  const rs = $('#rs');
  if (rs) {
    rs.innerHTML = [
      'Цели и драйверы роста',
      'Ключевые факторы успеха',
      'Основные действия на 12 месяцев',
      'Карта рисков и меры реагирования',
      'План распределения ресурсов'
    ].map(x => `<span class="chip n">${x}</span>`).join('');
  }

  // Audience selector in #prep
  const AU_TEXTS = [
    'Разобраться с данными, найти свой подход к аналитике, начать автоматизацию и помочь сотрудникам вырасти в лидеров проектов.',
    'Сэкономить время аналитиков на подготовке данных к сессии и получить независимый объективный взгляд со стороны.'
  ];
  const audBtns = $$('#aud button');
  audBtns.forEach((btn, idx) => {
    btn.onclick = () => {
      audBtns.forEach(x => x.classList.toggle('on', x === btn));
      const textEl = $('#audt');
      if (textEl) textEl.textContent = AU_TEXTS[idx];
    };
  });
  if (audBtns[0]) audBtns[0].click();
}

/* ==========================================================================
   Navigation Bar Generation
   ========================================================================== */
function buildNavigation() {
  const navEl = $('#nav');
  if (navEl) {
    navEl.innerHTML = '<a href="#home" data-id="home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Главная</a>' +
      GROUPS.map(g => `
        <div class="gl" style="--c:${getGroupColor(g)}"><b class="d"></b>${g.n}</div>
        ${g.t.map(([id, title]) => `<a href="#${id}" data-id="${id}" style="--c:${getGroupColor(g)}">${title}</a>`).join('')}
      `).join('');
  }

  const tbEl = $('#tb');
  if (tbEl) {
    tbEl.innerHTML = '<a href="#home"><b class="d" style="background:var(--ink)"></b>Главная</a>' +
      GROUPS.map(g => `<a href="#${g.t[0][0]}" style="--c:${getGroupColor(g)}"><b class="d"></b>${g.s}</a>`).join('');
  }
}

/* ==========================================================================
   Application Bootstrap
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  buildNavigation();
  initTheme();
  initCommandPalette();
  initChecklists();
  initDashboardTabs();

  // Initialize Excel Wizards
  setupExcelWizard('#prep .wiz');
  setupExcelWizard('#market .wiz');

  // Initialize Risk Matrix
  new RiskMatrix({
    containerId: 'rm',
    summaryId: 'rn',
    textInputId: 'rt',
    probSelectId: 'rp',
    impactSelectId: 'ri',
    stratSelectId: 'rs2'
  });

  // Initialize RGM parsers
  initLivePreview('li', 'lo');
  initBatchAttributeParser({
    textareaId: 'ai',
    resultId: 'ares',
    copyBtnId: 'acp'
  });

  // Attempt async Wasm initialization in background
  initWasmEngine().catch(() => {});

  // Trigger initial route
  route();
});
