/**
 * Risk Framework & Interactive 6-Column PESTEL Horizon Scanner (#risk-framework, v3.48.0)
 * Backed by Unified Risk Workspace Store (100% synced with #risk-map & #rice).
 * Zero innerHTML: pure DOM APIs, native <dialog closedby="any">, popover guides,
 * horizontal 6-column PESTEL board + dedicated AI risks zone, interactive AI modal with interview.
 */

import {
  PESTEL_ORDER,
  PESTEL_META,
  CURVE_ORDER,
  CURVE_META,
  bindToolbarRovingTabindex
} from './risk_shared.js?v=3.48.2';

function stripThinkTags(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function parseJsonRisksArray(raw, { defaultCurve = 'event' } = {}) {
  const txt = stripThinkTags(raw);
  const normalizeArr = (arr) => arr
    .filter((x) => x && typeof x === 'object' && String(x.title || '').trim())
    .slice(0, 6)
    .map((x) => ({
      title: String(x.title).trim().slice(0, 140),
      signals: String(x.signals || '').trim().slice(0, 180),
      rationale: String(x.rationale || x.description || '').trim().slice(0, 320),
      pestel: String(x.pestel || '').trim(),
      curve: String(x.curve || defaultCurve).trim(),
      probability: [0, 1, 2].includes(Number(x.probability)) ? Number(x.probability) : 1,
      impact: [0, 1, 2].includes(Number(x.impact)) ? Number(x.impact) : 1,
      action: String(x.action || '').trim().slice(0, 300)
    }));

  const tryParse = (str) => {
    try {
      const parsed = JSON.parse(str);
      const arr = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.risks) ? parsed.risks : null);
      if (!arr) return null;
      const clean = normalizeArr(arr);
      return clean.length ? clean : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(txt);
  if (direct) return direct;
  const arrMatch = txt.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const parsed = tryParse(arrMatch[0]);
    if (parsed) return parsed;
  }
  const objMatch = txt.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const parsed = tryParse(objMatch[0]);
    if (parsed) return parsed;
  }
  return [];
}

function parseJsonQuestionsArray(raw) {
  const txt = stripThinkTags(raw);
  const tryParse = (str) => {
    try {
      const parsed = JSON.parse(str);
      const arr = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.questions) ? parsed.questions : null);
      if (!arr) return null;
      const clean = arr
        .map((q) => (typeof q === 'string' ? q : String(q?.question || q?.text || '')))
        .map((s) => s.trim())
        .filter((s) => s.length >= 6)
        .slice(0, 5);
      return clean.length ? clean : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(txt);
  if (direct) return direct;
  const arrMatch = txt.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const parsed = tryParse(arrMatch[0]);
    if (parsed) return parsed;
  }
  const objMatch = txt.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const parsed = tryParse(objMatch[0]);
    if (parsed) return parsed;
  }

  return txt
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\d•\-*.)\s]+/, '').trim())
    .filter((line) => line.length >= 8 && line.includes('?'))
    .slice(0, 5);
}

export function initRiskFramework({
  riskStore,
  toast,
  confirmDataAction,
  aiService,
  localLlmService,
  confirmLocalDownload,
  openApiDialog,
  refreshLocalCacheStatus,
  setupPopupMenu,
  closePopupMenu,
  getCompanyContext
}) {
  const sec = document.querySelector('section[data-v="risk-framework"]');
  if (!sec || !riskStore) return null;

  const $ = (sel, root = sec) => root.querySelector(sel);
  const $$ = (sel, root = sec) => [...root.querySelectorAll(sel)];

  let showHorizonChart = true;
  let activeHorizon = 'all';
  let searchQuery = '';
  let aiMode = 'local-ai';
  let aiBusy = false;
  let interviewQuestions = [];

  // Main DOM refs
  const summaryLbl = $('#rf-summary-lbl');
  const horizonCard = $('#rf-horizon-card');
  const boardView = $('#rf-board-view');
  const pestelGridEl = $('#rf-pestel-grid');
  const aiZoneEl = $('#rf-ai-pestel-zone');
  const aiPestelGridEl = $('#rf-ai-pestel-grid');
  const emptyEl = $('#rf-empty');
  const emptyMsgEl = $('#rf-empty-msg');
  const resetFiltersBtn = $('#rf-reset-filters');
  const svgCurves = $('#rf-curves-svg');
  const curveTipEl = document.getElementById('rf-curve-tip');
  const toggleChartBtn = $('#rf-btn-toggle-chart');
  const liveStatus = $('#rf-live-status');

  const undoBtn = $('#rf-btn-undo');
  const redoBtn = $('#rf-btn-redo');
  const searchOpenBtn = $('#rf-search-open');
  const searchBox = $('#rf-search-box');
  const searchInp = $('#rf-search-input');
  const searchCloseBtn = $('#rf-search-close');
  const dlTrigger = $('#rf-dl-trigger');
  const dlMenu = $('#rf-dl-menu');

  // AI Risk Analysis Modal refs (#rk-ai-dlg)
  const aiToggleBtn = $('#rf-btn-ai-toggle');
  const aiDlg = document.getElementById('rk-ai-dlg');
  const aiCloseBtn = document.getElementById('rk-ai-close');
  const aiCfgBtn = document.getElementById('rk-ai-cfg-btn');
  const aiModeHint = document.getElementById('rk-ai-mode-hint');
  const aiChkNew = document.getElementById('rk-ai-mode-new');
  const aiChkCross = document.getElementById('rk-ai-mode-cross');
  const aiSrcDash = document.getElementById('rk-ai-src-dash');
  const aiSrcDashMeta = document.getElementById('rk-ai-src-dash-meta');
  const aiSrcRice = document.getElementById('rk-ai-src-rice');
  const aiSrcRiceMeta = document.getElementById('rk-ai-src-rice-meta');
  const aiSrcRisks = document.getElementById('rk-ai-src-risks');
  const aiSrcRisksMeta = document.getElementById('rk-ai-src-risks-meta');
  const aiSourcesSummary = document.getElementById('rk-ai-sources-summary');
  const aiAskBtn = document.getElementById('rk-ai-ask-btn');
  const aiInterviewStatus = document.getElementById('rk-ai-interview-status');
  const aiQuestionsEl = document.getElementById('rk-ai-questions');
  const aiProgWrap = document.getElementById('rk-ai-prog-wrap');
  const aiProg = document.getElementById('rk-ai-prog');
  const aiProgPct = document.getElementById('rk-ai-prog-pct');
  const aiProgLbl = document.getElementById('rk-ai-prog-lbl');
  const aiStatusEl = document.getElementById('rk-ai-status');
  const aiCancelBtn = document.getElementById('rk-ai-cancel');
  const aiRunBtn = document.getElementById('rk-ai-run');

  setupPopupMenu?.(dlTrigger, dlMenu);
  bindToolbarRovingTabindex($('#rf-main-toolbar'));

  function announce(msg) {
    if (liveStatus) liveStatus.textContent = msg;
  }

  function syncToolbarState() {
    if (undoBtn) undoBtn.setAttribute('aria-disabled', String(!riskStore.canUndo()));
    if (redoBtn) redoBtn.setAttribute('aria-disabled', String(!riskStore.canRedo()));
    const isDisk = riskStore.isPersistDisk();
    $$('[data-rf-storage]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String((btn.dataset.rfStorage === 'disk') === isDisk));
    });
  }

  undoBtn?.addEventListener('click', () => { if (riskStore.canUndo()) riskStore.undo(); });
  redoBtn?.addEventListener('click', () => { if (riskStore.canRedo()) riskStore.redo(); });

  // Horizon Chart Toggle
  toggleChartBtn?.addEventListener('click', () => {
    showHorizonChart = !showHorizonChart;
    toggleChartBtn.setAttribute('aria-pressed', String(showHorizonChart));
    if (horizonCard) horizonCard.hidden = !showHorizonChart;
  });

  // =========================================================================
  // Horizon Curve & Legend Hover Tooltip (#rf-curve-tip)
  // =========================================================================
  function hideCurveTip() {
    if (!curveTipEl) return;
    try {
      if (curveTipEl.matches(':popover-open')) curveTipEl.hidePopover();
    } catch { /* ignore */ }
    curveTipEl.hidden = true;
  }

  function showCurveTip(anchorEl, curveKey) {
    if (!curveTipEl || !anchorEl) return;
    const meta = CURVE_META[curveKey];
    if (!meta) return;
    if (document.querySelector('dialog[open]')) return;

    curveTipEl.replaceChildren();
    const title = document.createElement('strong');
    title.className = 'rf-ctip-title';
    title.textContent = meta.pill;
    const desc = document.createElement('span');
    desc.className = 'rf-ctip-desc';
    desc.textContent = meta.desc;
    curveTipEl.append(title, desc);

    curveTipEl.hidden = false;
    try {
      if (!curveTipEl.matches(':popover-open')) curveTipEl.showPopover();
    } catch { /* ignore */ }

    const rect = anchorEl.getBoundingClientRect();
    const pw = curveTipEl.offsetWidth || 260;
    const ph = curveTipEl.offsetHeight || 64;
    const pad = 10;
    let top = rect.top - ph - 8;
    if (top < pad) top = rect.bottom + 8;
    let left = rect.left + (rect.width - pw) / 2;
    left = Math.max(pad, Math.min(window.innerWidth - pw - pad, left));
    curveTipEl.style.top = `${Math.round(top)}px`;
    curveTipEl.style.left = `${Math.round(left)}px`;
  }

  window.addEventListener('scroll', hideCurveTip, { capture: true, passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideCurveTip();
  });

  // Collapsible Toolbar Search (auto-collapses on click outside)
  function openSearch() {
    if (!searchBox || !searchOpenBtn) return;
    searchOpenBtn.hidden = true;
    searchBox.hidden = false;
    searchInp?.focus();
  }

  function collapseSearchBoxOnly() {
    if (!searchBox || !searchOpenBtn || searchBox.hidden) return;
    searchBox.hidden = true;
    searchOpenBtn.hidden = false;
    searchOpenBtn.classList.toggle('is-active', Boolean(searchQuery));
  }

  function closeSearch() {
    if (!searchBox || !searchOpenBtn) return;
    if (searchInp) searchInp.value = '';
    searchQuery = '';
    searchBox.hidden = true;
    searchOpenBtn.hidden = false;
    searchOpenBtn.classList.remove('is-active');
    renderAll();
    searchOpenBtn.focus();
  }

  searchOpenBtn?.addEventListener('click', openSearch);
  searchCloseBtn?.addEventListener('click', closeSearch);
  searchInp?.addEventListener('input', () => {
    searchQuery = searchInp.value.trim().toLowerCase();
    renderAll();
  });
  searchInp?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!searchBox || searchBox.hidden) return;
    if (searchBox.contains(e.target) || searchOpenBtn?.contains(e.target)) return;
    collapseSearchBoxOnly();
  });

  // Interactive Horizon Filter (synced between SVG curves and 5 breakdown rows)
  function setHorizonFilter(curveKey) {
    activeHorizon = (activeHorizon === curveKey && curveKey !== 'all') ? 'all' : curveKey;
    const activeAttr = activeHorizon === 'all' ? '' : activeHorizon;
    if (svgCurves) svgCurves.setAttribute('data-active-curve', activeAttr);

    $$('.rf-curve-g').forEach((g) => {
      g.setAttribute('aria-pressed', String(g.dataset.curve === activeHorizon));
    });

    $$('[data-rf-hwrap]').forEach((wrap) => {
      const code = wrap.dataset.rfHwrap;
      const on = code === activeHorizon;
      wrap.classList.toggle('is-active', on);
      const btn = wrap.querySelector('[data-rf-hbtn]');
      const clr = wrap.querySelector('[data-rf-hclr]');
      if (btn) btn.setAttribute('aria-pressed', String(on));
      if (clr) clr.hidden = !on;
    });

    renderAll();
  }

  $$('.rf-curve-g').forEach((g) => {
    const cKey = g.dataset.curve;
    g.addEventListener('click', () => {
      hideCurveTip();
      setHorizonFilter(cKey);
    });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hideCurveTip();
        setHorizonFilter(cKey);
      }
    });
    g.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') showCurveTip(g, cKey);
    });
    g.addEventListener('pointerleave', hideCurveTip);
    g.addEventListener('focus', () => {
      if (g.matches(':focus-visible')) showCurveTip(g, cKey);
    });
    g.addEventListener('blur', hideCurveTip);
  });

  $$('[data-rf-hwrap]').forEach((wrap) => {
    const cKey = wrap.dataset.rfHwrap;
    wrap.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') showCurveTip(wrap, cKey);
    });
    wrap.addEventListener('pointerleave', hideCurveTip);
  });

  $$('[data-rf-hbtn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hideCurveTip();
      setHorizonFilter(btn.dataset.rfHbtn);
    });
    btn.addEventListener('focus', () => {
      if (btn.matches(':focus-visible')) showCurveTip(btn, btn.dataset.rfHbtn);
    });
    btn.addEventListener('blur', hideCurveTip);
  });

  $$('[data-rf-hclr]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideCurveTip();
      setHorizonFilter('all');
    });
  });

  function resetAllFilters() {
    activeHorizon = 'all';
    searchQuery = '';
    if (searchInp) searchInp.value = '';
    if (searchBox && !searchBox.hidden) {
      searchBox.hidden = true;
      if (searchOpenBtn) searchOpenBtn.hidden = false;
    }
    searchOpenBtn?.classList.remove('is-active');
    setHorizonFilter('all');
  }

  resetFiltersBtn?.addEventListener('click', resetAllFilters);
  $('#rf-empty-reset')?.addEventListener('click', resetAllFilters);

  function getFilteredRisks(enriched) {
    return enriched.filter((s) => {
      if (activeHorizon !== 'all' && s.curve !== activeHorizon) return false;
      if (searchQuery) {
        const hay = `${s.title} ${s.description || ''} ${s.action || ''} ${s.owner || ''} ${s.pestel ? (PESTEL_META[s.pestel]?.label || '') : ''}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  // =========================================================================
  // 6-Column Horizontal PESTEL Board (Manual above + AI Zone below divider)
  // =========================================================================
  function renderPestelColumns(container, items, { isAiZone = false } = {}) {
    if (!container) return;
    container.replaceChildren();
    const frag = document.createDocumentFragment();

    PESTEL_ORDER.forEach((code) => {
      const meta = PESTEL_META[code] || PESTEL_META.T;
      const lensRisks = items.filter((s) => s.pestel === code);

      const col = document.createElement('article');
      col.className = `rf-lens-card${isAiZone ? ' is-ai-col' : ''}`;

      if (!isAiZone) {
        const hd = document.createElement('div');
        hd.className = 'rf-lens-hd';

        const left = document.createElement('div');
        left.className = 'rf-lens-title-grp';

        const badge = document.createElement('span');
        badge.className = 'rf-lens-letter';
        badge.textContent = meta.letter;

        const h2 = document.createElement('h2');
        h2.className = 'rf-lens-h2';
        h2.textContent = meta.label;
        h2.title = meta.hint;

        left.append(badge, h2);

        const right = document.createElement('div');
        right.className = 'rf-lens-hd-right';

        const cnt = document.createElement('span');
        cnt.className = 'rf-lens-cnt';
        cnt.textContent = String(lensRisks.length);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'rm-cell-add rf-lens-add';
        addBtn.textContent = '+';
        addBtn.title = `Добавить риск в категорию «${meta.label}»`;
        addBtn.setAttribute('aria-label', `Добавить риск: ${meta.label}`);
        addBtn.addEventListener('click', () => {
          riskStore.openRiskModal(null, {
            pestel: code,
            curve: activeHorizon !== 'all' ? activeHorizon : null
          });
        });

        right.append(cnt, addBtn);
        hd.append(left, right);
        col.append(hd);
      }

      const list = document.createElement('div');
      list.className = 'rf-lens-list';

      if (!lensRisks.length) {
        const emptyNote = document.createElement('div');
        emptyNote.className = 'rf-lens-empty';
        emptyNote.textContent = isAiZone ? '—' : 'Нет рисков';
        list.append(emptyNote);
      } else {
        lensRisks.forEach((rk) => {
          list.append(riskStore.createCompactRiskCard(rk, { context: 'framework' }));
        });
      }

      col.append(list);
      frag.append(col);
    });

    // Uncategorized (pestel == null) draft risks stay clearly visible in a full-width strip
    const unassigned = items.filter((s) => !s.pestel || !PESTEL_META[s.pestel]);
    if (unassigned.length) {
      const strip = document.createElement('article');
      strip.className = 'rf-lens-card is-unassigned';
      strip.style.gridColumn = '1 / -1';

      const hd = document.createElement('div');
      hd.className = 'rf-lens-hd';
      const left = document.createElement('div');
      left.className = 'rf-lens-title-grp';
      const badge = document.createElement('span');
      badge.className = 'rf-lens-letter';
      badge.textContent = '—';
      const h2 = document.createElement('h2');
      h2.className = 'rf-lens-h2';
      h2.textContent = 'Без категории PESTEL (черновики)';
      left.append(badge, h2);

      const cnt = document.createElement('span');
      cnt.className = 'rf-lens-cnt';
      cnt.textContent = String(unassigned.length);
      hd.append(left, cnt);

      const list = document.createElement('div');
      list.className = 'rf-lens-list is-inline-wrap';
      unassigned.forEach((rk) => {
        list.append(riskStore.createCompactRiskCard(rk, { context: 'framework' }));
      });

      strip.append(hd, list);
      frag.append(strip);
    }

    container.append(frag);
  }

  function renderBoard(filtered) {
    const manualFiltered = filtered.filter((s) => !s.isAi);
    const aiFiltered = filtered.filter((s) => Boolean(s.isAi));

    renderPestelColumns(pestelGridEl, manualFiltered, { isAiZone: false });

    if (aiZoneEl && aiPestelGridEl) {
      if (aiFiltered.length > 0) {
        aiZoneEl.hidden = false;
        renderPestelColumns(aiPestelGridEl, aiFiltered, { isAiZone: true });
      } else {
        aiZoneEl.hidden = true;
        aiPestelGridEl.replaceChildren();
      }
    }
  }

  // =========================================================================
  // AI Risk Analysis Modal (#rk-ai-dlg)
  // =========================================================================
  function getResolvedContext() {
    const ctx = getCompanyContext?.();
    if (ctx && typeof ctx === 'object') return ctx;
    const all = riskStore.evaluateRisks().enriched;
    return {
      dashboard: { available: false, label: 'Нет данных дашборда', summary: '' },
      rice: { available: false, count: 0, summary: '' },
      risks: {
        available: all.length > 0,
        count: all.length,
        summary: all.map((r) => `${r.title} (${r.pestel || '—'})`).join('; ')
      }
    };
  }

  function syncAiModalSources() {
    const ctx = getResolvedContext();
    const dashOk = Boolean(ctx.dashboard?.available);
    const riceOk = Boolean(ctx.rice?.available);
    const risksOk = Boolean(ctx.risks?.available);

    if (aiSrcDash) {
      aiSrcDash.disabled = !dashOk;
      if (!dashOk) aiSrcDash.checked = false;
    }
    if (aiSrcDashMeta) {
      aiSrcDashMeta.textContent = dashOk ? (ctx.dashboard.label || 'Доступно') : 'Нет данных';
    }

    if (aiSrcRice) {
      aiSrcRice.disabled = !riceOk;
      if (!riceOk) aiSrcRice.checked = false;
    }
    if (aiSrcRiceMeta) {
      aiSrcRiceMeta.textContent = riceOk ? `${ctx.rice.count || 0} иниц.` : 'Пусто';
    }

    if (aiSrcRisks) {
      aiSrcRisks.disabled = !risksOk;
      if (!risksOk) aiSrcRisks.checked = false;
    }
    if (aiSrcRisksMeta) {
      aiSrcRisksMeta.textContent = risksOk ? `${ctx.risks.count || 0} рисков` : 'Пусто';
    }

    if (aiSourcesSummary) {
      const parts = [];
      if (dashOk) parts.push(`Дашборд: ${ctx.dashboard.label || 'загружен'}`);
      if (riceOk) parts.push(`RICE: ${ctx.rice.count} иниц.`);
      if (risksOk) parts.push(`Реестр рисков: ${ctx.risks.count} шт.`);
      aiSourcesSummary.textContent = parts.length
        ? `Доступно для анализа: ${parts.join(' · ')}`
        : 'Нет загруженных данных — вы можете описать бизнес в ответах интервью ниже.';
    }
  }

  function syncAiModeUi() {
    if (!aiDlg) return;
    aiDlg.querySelectorAll('[data-rk-ai-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.rkAiMode === aiMode));
    });
    if (aiCfgBtn) aiCfgBtn.hidden = aiMode !== 'api';
    if (aiModeHint) {
      aiModeHint.textContent = aiMode === 'local-ai'
        ? 'Локальная модель WebGPU в браузере (0 ₽, данные не покидают устройство).'
        : 'Облачный API (использует уровень Thinking для рисков из Настроек → ИИ API).';
    }
  }

  function openAiModal() {
    if (!aiDlg) return;
    riskStore.hideRiskHoverPop();
    hideCurveTip();
    syncAiModalSources();
    syncAiModeUi();
    if (aiStatusEl) aiStatusEl.textContent = '';
    aiDlg.returnValue = '';
    aiDlg.showModal();
  }

  aiToggleBtn?.addEventListener('click', openAiModal);
  aiCloseBtn?.addEventListener('click', () => aiDlg?.close('cancel'));
  aiDlg?.addEventListener('close', () => { aiDlg.returnValue = ''; });

  aiDlg?.querySelectorAll('[data-rk-ai-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      aiMode = btn.dataset.rkAiMode === 'api' ? 'api' : 'local-ai';
      syncAiModeUi();
    });
  });

  aiCfgBtn?.addEventListener('click', () => {
    openApiDialog?.('Настройка облачного провайдера и Thinking для анализа рисков');
  });

  function setAiProgress(visible, pct = 0, label = '') {
    if (aiProgWrap) aiProgWrap.hidden = !visible;
    const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    if (aiProg) aiProg.value = p;
    if (aiProgPct) aiProgPct.textContent = `${p}%`;
    if (aiProgLbl && label) aiProgLbl.textContent = label;
  }

  function setAiBusyState(busy, runLabel = 'Запустить анализ') {
    aiBusy = busy;
    if (aiRunBtn) {
      aiRunBtn.disabled = busy;
      aiRunBtn.textContent = runLabel;
      if (busy) aiRunBtn.setAttribute('aria-busy', 'true');
      else aiRunBtn.removeAttribute('aria-busy');
    }
    if (aiAskBtn) aiAskBtn.disabled = busy;
  }

  aiCancelBtn?.addEventListener('click', async () => {
    if (!aiBusy) {
      aiDlg?.close('cancel');
      return;
    }
    localLlmService?.terminateWorker?.();
    if (!localLlmService?.cacheEnabled) {
      await localLlmService?.purgeAllLocalCaches?.();
    }
    await refreshLocalCacheStatus?.();
    setAiProgress(false);
    setAiBusyState(false);
    if (aiStatusEl) {
      aiStatusEl.hidden = false;
      aiStatusEl.textContent = 'AI-анализ отменён.';
    }
    toast('AI-анализ отменён');
  });

  function buildSelectedContextText() {
    const ctx = getResolvedContext();
    const blocks = [];
    if (aiSrcDash?.checked && ctx.dashboard?.available && ctx.dashboard.summary) {
      blocks.push(`[Данные дашборда и аналитики]\n${ctx.dashboard.summary}`);
    }
    if (aiSrcRice?.checked && ctx.rice?.available && ctx.rice.summary) {
      blocks.push(`[Инициативы RICE]\n${ctx.rice.summary}`);
    }
    if (aiSrcRisks?.checked && ctx.risks?.available && ctx.risks.summary) {
      blocks.push(`[Текущие риски]\n${ctx.risks.summary}`);
    }
    return blocks.join('\n\n');
  }

  function collectInterviewAnswers() {
    if (!aiQuestionsEl) return [];
    const pairs = [];
    aiQuestionsEl.querySelectorAll('.rk-ai-q-item').forEach((item, idx) => {
      const qText = item.querySelector('.rk-ai-q-lbl')?.textContent?.trim() || interviewQuestions[idx] || '';
      const ans = item.querySelector('.rk-ai-q-ans')?.value?.trim() || '';
      if (qText && ans) pairs.push({ q: qText, a: ans });
    });
    return pairs;
  }

  function renderInterviewQuestions(questions) {
    interviewQuestions = questions;
    if (!aiQuestionsEl) return;
    aiQuestionsEl.replaceChildren();
    if (!questions.length) {
      aiQuestionsEl.hidden = true;
      return;
    }
    aiQuestionsEl.hidden = false;
    const frag = document.createDocumentFragment();
    questions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'rk-ai-q-item';

      const lbl = document.createElement('label');
      lbl.className = 'rk-ai-q-lbl';
      lbl.htmlFor = `rk-ai-q-inp-${idx}`;
      lbl.textContent = `${idx + 1}. ${q}`;

      const inp = document.createElement('textarea');
      inp.className = 'rk-ai-q-ans';
      inp.id = `rk-ai-q-inp-${idx}`;
      inp.rows = 2;
      inp.placeholder = 'Ваш ответ (необязательно)…';

      item.append(lbl, inp);
      frag.append(item);
    });
    aiQuestionsEl.append(frag);
  }

  async function runAiPrompt({ systemPrompt, userPrompt, maxTokens = 1200, stageLabel = 'Генерация AI…' }) {
    if (aiMode === 'local-ai') {
      if (!localLlmService.isEngineReadyForCurrentModel()) {
        const confirmed = await confirmLocalDownload();
        if (!confirmed) {
          toast('Загрузка локальной модели отменена');
          return null;
        }
      }
      setAiProgress(true, 10, 'Подготовка локального AI…');
      const engine = await localLlmService.initEngine(({ pct, stage }) => {
        setAiProgress(true, Math.min(70, Math.round((pct || 0) * 0.7)), stage || 'Загрузка локального AI…');
      });
      setAiProgress(true, 75, stageLabel);
      const completion = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userPrompt}\n/no_think` }
        ],
        temperature: 0.25,
        max_tokens: maxTokens,
        extra_body: { enable_thinking: false }
      });
      await refreshLocalCacheStatus?.();
      return stripThinkTags(completion?.choices?.[0]?.message?.content || '');
    }

    if (!aiService.hasKey()) {
      openApiDialog('Укажите API-ключ (по умолчанию ProxyAPI) для AI-анализа рисков.');
      return null;
    }
    setAiProgress(true, 45, stageLabel);
    return aiService.generateCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { task: 'risks', temperature: 0.3, max_tokens: maxTokens, cacheSystem: true });
  }

  // Interactive Interview: ask AI for 3–5 clarifying questions
  aiAskBtn?.addEventListener('click', async () => {
    if (aiBusy) return;
    setAiBusyState(true, 'Запрос вопросов…');
    if (aiInterviewStatus) aiInterviewStatus.textContent = 'AI формирует уточняющие вопросы…';
    try {
      const ctxText = buildSelectedContextText();
      const sysPrompt = [
        'Ты риск-менеджер по методологии PESTEL и Horizon Scanning.',
        'Определи пробелы в предоставленных данных компании и задай 3–5 коротких, конкретных уточняющих вопросов пользователю, ответы на которые помогут найти скрытые бизнес-риски.',
        'Верни СТРОГО валидный JSON-массив строк без markdown-обёртки и пояснений, например: ["Вопрос 1?", "Вопрос 2?", "Вопрос 3?"].',
        'Пиши простым деловым русским языком.'
      ].join('\n');
      const userPrompt = ctxText
        ? `Доступные данные компании:\n${ctxText}\n\nСформулируй 3–5 уточняющих вопросов.`
        : 'Данных о компании пока нет. Задай 3–5 ключевых вопросов о бизнесе, цепочке поставок, марже и регуляторике для выявления рисков.';

      const raw = await runAiPrompt({
        systemPrompt: sysPrompt,
        userPrompt,
        maxTokens: 600,
        stageLabel: 'Подготовка вопросов интервью…'
      });
      if (raw == null) return;

      const qs = parseJsonQuestionsArray(raw);
      if (!qs.length) {
        throw new Error('AI не смог сформировать список вопросов. Попробуйте ещё раз.');
      }
      renderInterviewQuestions(qs);
      if (aiInterviewStatus) {
        aiInterviewStatus.textContent = `Вопросов: ${qs.length}. Ответьте на любые из них и нажмите «Запустить анализ».`;
      }
    } catch (err) {
      if (!localLlmService?.aborted) {
        const msg = `Ошибка интервью AI: ${err.message}`;
        if (aiInterviewStatus) aiInterviewStatus.textContent = msg;
        toast(msg);
      }
    } finally {
      setAiProgress(false);
      setAiBusyState(false);
    }
  });

  // Primary CTA: Run AI Risk Analysis (New Risks first, then Intersections if both checked)
  aiRunBtn?.addEventListener('click', async () => {
    if (aiBusy) return;
    const wantNew = Boolean(aiChkNew?.checked);
    const wantCross = Boolean(aiChkCross?.checked);
    if (!wantNew && !wantCross) {
      toast('Выберите хотя бы один режим анализа (новые риски или стыки)');
      return;
    }

    setAiBusyState(true, 'Анализ…');
    if (aiStatusEl) aiStatusEl.textContent = '';
    let totalAdded = 0;

    try {
      const scales = riskStore.getScales();
      const periodStr = scales.period || '2025–2028 гг.';
      const ctxText = buildSelectedContextText();
      const interview = collectInterviewAnswers();
      const interviewBlock = interview.length
        ? `\n\n[Ответы пользователя на интервью]\n${interview.map((x, i) => `${i + 1}) ${x.q}\nОтвет: ${x.a}`).join('\n')}`
        : '';

      // Stage 1: Search new risks (always runs FIRST if both modes checked)
      if (wantNew) {
        const sysNew = [
          'Ты ведущий риск-менеджер по методологии PESTEL и Horizon Scanning.',
          'На основе данных компании, текущих рисков и ответов интервью найди 3–5 новых, ещё не учтённых бизнес-рисков.',
          'Верни СТРОГО валидный JSON-массив объектов без markdown-обёртки и пояснений.',
          'Формат каждого объекта: {"title":"Краткий риск до 90 символов","description":"Почему это опасно (1–2 предложения)","pestel":"P"|"E"|"S"|"T"|"Env"|"L","curve":"black_swan"|"trend"|"event"|"news"|"weak","probability":0|1|2,"impact":0|1|2,"action":"Конкретная мера реагирования"}',
          'Где probability: 0=Вероятно, 1=Возможно, 2=Маловероятно; impact: 0=Небольшое, 1=Умеренное, 2=Существенное.',
          'Отвечай простым деловым русским языком.'
        ].join('\n');

        const userNew = `Горизонт: ${periodStr}.\n${ctxText || 'Используй типовой профиль розничного/коммерческого бизнеса РФ.'}${interviewBlock}\n\nПредложи 3–5 новых рисков, которых ещё нет в списке.`;

        const rawNew = await runAiPrompt({
          systemPrompt: sysNew,
          userPrompt: userNew,
          maxTokens: 1400,
          stageLabel: wantCross ? 'Этап 1/2: поиск новых рисков…' : 'Поиск новых рисков…'
        });
        if (rawNew == null) return;

        const parsedNew = parseJsonRisksArray(rawNew, { defaultCurve: 'trend' });
        if (parsedNew.length) {
          const { addedCount } = await riskStore.addAiGeneratedRisks(parsedNew);
          totalAdded += addedCount;
        }
      }

      // Stage 2: Search risks at intersections (uses current risks INCLUDING newly added ones from Stage 1)
      if (wantCross) {
        const currentRisks = riskStore.evaluateRisks().enriched;
        if (currentRisks.length < 2) {
          toast('Для поиска стыков нужно минимум 2 риска в реестре');
        } else {
          const listStr = currentRisks.slice(0, 24).map((s, idx) =>
            `${idx + 1}. [${s.pestel ? (PESTEL_META[s.pestel]?.label || s.pestel) : '—'} | ${s.curve ? (CURVE_META[s.curve]?.label || s.curve) : '—'}] ${s.title}${s.description ? ` — ${s.description}` : ''}`
          ).join('\n');

          const sysCross = [
            'Ты ведущий риск-менеджер по методологии Horizon Scanning и PESTEL.',
            'Найди 3–4 неочевидных операционных или финансовых риска на СТЫКАХ (пересечениях) 2–3 существующих рисков.',
            'Верни СТРОГО валидный JSON-массив объектов без markdown-обёртки и пояснений.',
            'Формат каждого объекта: {"title":"Краткий риск до 90 символов","signals":"Какие 2–3 риска пересекаются","rationale":"Почему их стык опасен (1–2 предложения)","pestel":"P"|"E"|"S"|"T"|"Env"|"L","curve":"black_swan"|"trend"|"event"|"news"|"weak","probability":0|1|2,"impact":0|1|2,"action":"Конкретная мера реагирования"}',
            'Где probability: 0=Вероятно, 1=Возможно, 2=Маловероятно; impact: 0=Небольшое, 1=Умеренное, 2=Существенное.',
            'Отвечай простым деловым русским языком.'
          ].join('\n');

          const userCross = `Горизонт: ${periodStr}.\nТекущие риски:\n${listStr}${interviewBlock}\n\nНайди 3–4 риска на стыках.`;

          const rawCross = await runAiPrompt({
            systemPrompt: sysCross,
            userPrompt: userCross,
            maxTokens: 1400,
            stageLabel: wantNew ? 'Этап 2/2: поиск рисков на стыках…' : 'Поиск рисков на стыках…'
          });
          if (rawCross == null) return;

          const parsedCross = parseJsonRisksArray(rawCross, { defaultCurve: 'event' });
          if (parsedCross.length) {
            const { addedCount } = await riskStore.addAiGeneratedRisks(parsedCross);
            totalAdded += addedCount;
          }
        }
      }

      setAiProgress(true, 100, 'Готово');
      riskStore.notifyExternalSync();
      if (totalAdded > 0) {
        aiDlg?.close('done');
        toast(`Добавлено рисков от AI: ${totalAdded}`);
        announce(`Добавлено рисков от AI: ${totalAdded}`);
        requestAnimationFrame(() => {
          aiZoneEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      } else {
        const msg = 'Новых уникальных рисков не найдено (возможно, они уже есть в реестре).';
        if (aiStatusEl) aiStatusEl.textContent = msg;
        toast(msg);
      }
    } catch (err) {
      if (!localLlmService?.aborted) {
        const msg = `Ошибка AI-анализа: ${err.message}`;
        if (aiStatusEl) aiStatusEl.textContent = msg;
        toast(msg);
      }
    } finally {
      setAiProgress(false);
      setAiBusyState(false);
    }
  });

  // Top Toolbar Actions (100% synced with #risk-map)
  $('#rf-btn-add')?.addEventListener('click', () => {
    riskStore.openRiskModal(null, {
      curve: activeHorizon !== 'all' ? activeHorizon : null
    });
  });
  $('#rf-empty-add')?.addEventListener('click', () => riskStore.openRiskModal(null));
  $('#rf-btn-sample')?.addEventListener('click', () => riskStore.loadDemoSample());
  $('#rf-empty-demo')?.addEventListener('click', () => riskStore.loadDemoSample());
  $('#rf-btn-import')?.addEventListener('click', () => riskStore.openImportDialog());

  $('#rf-btn-clear')?.addEventListener('click', async () => {
    const count = riskStore.getRisks().length;
    if (!count) {
      toast('Реестр рисков уже пуст');
      return;
    }
    const isDemo = riskStore.isDemoMode();
    const ok = await confirmDataAction({
      title: 'Очистить единый реестр рисков?',
      description: isDemo
        ? 'Демо-риски будут убраны с вкладок «Фреймворк» и «Карта рисков», чтобы вы могли заполнить список с нуля.'
        : `Все риски (${count} шт.) будут удалены с вкладок «Фреймворк» и «Карта рисков», а связанные с ними записи убраны из RICE (отмена Ctrl+Z).`,
      confirmLabel: 'Очистить',
      danger: !isDemo
    });
    if (!ok) return;
    await riskStore.clearAllData();
  });

  $$('[data-rf-storage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toDisk = btn.dataset.rfStorage === 'disk';
      if (toDisk === riskStore.isPersistDisk()) return;
      riskStore.setStorageMode(toDisk, { confirm: true });
    });
  });

  $('#rf-btn-xlsx')?.addEventListener('click', () => {
    closePopupMenu?.(dlTrigger, dlMenu, true);
    const { enriched } = riskStore.evaluateRisks();
    riskStore.exportRisksXlsx(getFilteredRisks(enriched), 'Реестр_рисков_PESTEL.xlsx');
  });

  $('#rf-btn-csv')?.addEventListener('click', () => {
    closePopupMenu?.(dlTrigger, dlMenu, true);
    const { enriched } = riskStore.evaluateRisks();
    riskStore.exportRisksCsv(getFilteredRisks(enriched), 'Реестр_рисков_PESTEL.csv');
  });

  function renderAll() {
    syncToolbarState();
    const { enriched } = riskStore.evaluateRisks();
    const filtered = getFilteredRisks(enriched);
    const scales = riskStore.getScales();
    const inRiceCnt = enriched.filter((x) => x.inRice).length;

    // Update 5 Horizon counts in strict CURVE_ORDER (scoped to searchQuery)
    CURVE_ORDER.forEach((cKey) => {
      const cnt = enriched.filter((s) => {
        if (s.curve !== cKey) return false;
        if (searchQuery) {
          const hay = `${s.title} ${s.description || ''} ${s.action || ''} ${s.owner || ''}`.toLowerCase();
          if (!hay.includes(searchQuery)) return false;
        }
        return true;
      }).length;
      const el = $(`[data-rf-hcnt="${cKey}"]`);
      if (el) el.textContent = String(cnt);
    });

    const hasFilters = activeHorizon !== 'all' || Boolean(searchQuery);
    if (resetFiltersBtn) resetFiltersBtn.hidden = !hasFilters;

    const periodStr = scales.period || '2025–2028 гг.';
    if (summaryLbl) {
      const visPart = hasFilters ? `${filtered.length}/${enriched.length}` : `${enriched.length}`;
      summaryLbl.textContent = `${periodStr} · рисков: ${visPart} · в RICE: ${inRiceCnt}`;
    }

    const noResults = filtered.length === 0;
    if (emptyEl) emptyEl.hidden = !noResults;
    if (noResults && emptyMsgEl) {
      emptyMsgEl.textContent = enriched.length === 0
        ? 'Реестр рисков пуст. Добавьте первый риск, импортируйте таблицу или загрузите пример.'
        : 'Нет рисков по выбранному фильтру.';
    }

    if (boardView) boardView.hidden = noResults;
    if (!noResults) {
      renderBoard(filtered);
    }
  }

  riskStore.subscribe(renderAll);
  renderAll();

  return {
    refresh: renderAll
  };
}
