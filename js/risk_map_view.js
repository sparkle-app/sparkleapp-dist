/**
 * Risk Map 3x3 (#risk-map, v3.48.0)
 * Backed by Unified Risk Workspace Store (100% synced with #risk-framework & #rice)
 * and Rust WebAssembly (runWasmRiskMatrix).
 * Zero innerHTML: pure DOM APIs, Drag & Drop + Alt+Arrow 3x3 cells, compact cards & hover popovers.
 */

import {
  PESTEL_META,
  PROB_LABELS,
  IMP_LABELS,
  STRAT_LABELS,
  SEV_META,
  computeScoreFallback,
  createSvgIcon,
  bindToolbarRovingTabindex
} from './risk_shared.js?v=3.48.2';

export function initRiskMap({
  riskStore,
  toast,
  confirmDataAction,
  setupPopupMenu,
  closePopupMenu
}) {
  const sec = document.querySelector('section[data-v="risk-map"]');
  if (!sec || !riskStore) return null;

  const $ = (sel, root = sec) => root.querySelector(sel);
  const $$ = (sel, root = sec) => [...root.querySelectorAll(sel)];

  let filterSeverity = 'all';
  let searchQuery = '';
  let draggedRiskId = null;

  // DOM refs
  const gridEl = $('#rg');
  const summaryLbl = $('#rm-summary-lbl');
  const clearFiltersBtn = $('#rm-clear-filters');

  const kpiTotal = $('#rm-kpi-total');
  const kpiHigh = $('#rm-kpi-high');
  const kpiMed = $('#rm-kpi-med');
  const kpiLow = $('#rm-kpi-low');

  const undoBtn = $('#rm-btn-undo');
  const redoBtn = $('#rm-btn-redo');
  const searchOpenBtn = $('#rm-search-open');
  const searchBox = $('#rm-search-box');
  const searchInp = $('#rm-search-inp');
  const searchCloseBtn = $('#rm-search-close');
  const dlTrigger = $('#rm-dl-trigger');
  const dlMenu = $('#rm-dl-menu');

  setupPopupMenu?.(dlTrigger, dlMenu);
  bindToolbarRovingTabindex($('#rm-main-toolbar'));

  document.getElementById('rm-btn-pptx')?.addEventListener('click', () => {
    closePopupMenu?.(dlTrigger, dlMenu, false);
  });

  function syncToolbarState() {
    if (undoBtn) undoBtn.setAttribute('aria-disabled', String(!riskStore.canUndo()));
    if (redoBtn) redoBtn.setAttribute('aria-disabled', String(!riskStore.canRedo()));
    const isDisk = riskStore.isPersistDisk();
    $$('[data-rm-storage]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String((btn.dataset.rmStorage === 'disk') === isDisk));
    });
  }

  undoBtn?.addEventListener('click', () => { if (riskStore.canUndo()) riskStore.undo(); });
  redoBtn?.addEventListener('click', () => { if (riskStore.canRedo()) riskStore.redo(); });

  function getFiltered(mappedEnriched) {
    return mappedEnriched.filter((x) => {
      if (filterSeverity !== 'all' && x.severity !== Number(filterSeverity)) return false;
      if (searchQuery) {
        const hay = `${x.title} ${x.description || ''} ${x.owner || ''} ${x.action || ''} ${x.s != null ? (STRAT_LABELS[x.s] || '') : ''} ${x.pestel ? (PESTEL_META[x.pestel]?.label || '') : ''}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderMatrix(filtered) {
    if (!gridEl) return;
    gridEl.replaceChildren();
    const scales = riskStore.getScales();
    const frag = document.createDocumentFragment();

    // Corner cell: gear button on the left + swapped axes (Влияние → top, Вероятность ↓ bottom) on the right
    // Rest of corner cell and all axis headers are non-clickable divs.
    const corner = document.createElement('div');
    corner.className = 'rm-axis-hc is-corner';

    const gearBtn = document.createElement('button');
    gearBtn.type = 'button';
    gearBtn.id = 'rm-scales-gear';
    gearBtn.className = 'rm-scales-gear';
    gearBtn.title = 'Настроить шкалы вероятности и влияния';
    gearBtn.setAttribute('aria-label', 'Настроить шкалы вероятности и влияния');
    gearBtn.append(
      createSvgIcon([
        'M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
        'M13.1 9.6a1.1 1.1 0 0 0 .22 1.21l.04.04a1.33 1.33 0 1 1-1.88 1.88l-.04-.04a1.1 1.1 0 0 0-1.21-.22 1.1 1.1 0 0 0-.67 1.01v.12a1.33 1.33 0 1 1-2.66 0v-.06a1.1 1.1 0 0 0-.72-1.01 1.1 1.1 0 0 0-1.21.22l-.04.04a1.33 1.33 0 1 1-1.88-1.88l.04-.04a1.1 1.1 0 0 0 .22-1.21 1.1 1.1 0 0 0-1.01-.67h-.12a1.33 1.33 0 1 1 0-2.66h.06a1.1 1.1 0 0 0 1.01-.72 1.1 1.1 0 0 0-.22-1.21l-.04-.04a1.33 1.33 0 1 1 1.88-1.88l.04.04a1.1 1.1 0 0 0 1.21.22h.05a1.1 1.1 0 0 0 .67-1.01v-.12a1.33 1.33 0 1 1 2.66 0v.06a1.1 1.1 0 0 0 .67 1.01 1.1 1.1 0 0 0 1.21-.22l.04-.04a1.33 1.33 0 1 1 1.88 1.88l-.04.04a1.1 1.1 0 0 0-.22 1.21v.05a1.1 1.1 0 0 0 1.01.67h.12a1.33 1.33 0 1 1 0 2.66h-.06a1.1 1.1 0 0 0-1.01.67Z'
      ], 14)
    );
    gearBtn.addEventListener('click', () => riskStore.openScalesDialog());

    const axesWrap = document.createElement('div');
    axesWrap.className = 'rm-corner-axes';
    const axImp = document.createElement('span');
    axImp.className = 'rm-axis-top';
    axImp.textContent = 'Влияние →';
    const axProb = document.createElement('span');
    axProb.className = 'rm-axis-bot';
    axProb.textContent = 'Вероятность ↓';
    axesWrap.append(axImp, axProb);

    corner.append(gearBtn, axesWrap);
    frag.append(corner);

    // Column headers (Impact) — non-clickable
    IMP_LABELS.forEach((lbl, cIdx) => {
      const hc = document.createElement('div');
      hc.className = 'rm-axis-hc';
      hc.setAttribute('role', 'columnheader');

      const main = document.createElement('span');
      main.textContent = lbl;
      hc.append(main);
      if (scales.imp[cIdx]) {
        const sub = document.createElement('span');
        sub.className = 'rm-axis-sub';
        sub.textContent = scales.imp[cIdx];
        hc.append(sub);
      }
      frag.append(hc);
    });

    // 3x3 rows
    PROB_LABELS.forEach((pLbl, rIdx) => {
      const rh = document.createElement('div');
      rh.className = 'rm-axis-hc is-row';
      rh.setAttribute('role', 'rowheader');

      const main = document.createElement('span');
      main.textContent = pLbl;
      rh.append(main);
      if (scales.prob[rIdx]) {
        const sub = document.createElement('span');
        sub.className = 'rm-axis-sub';
        sub.textContent = scales.prob[rIdx];
        rh.append(sub);
      }
      frag.append(rh);

      IMP_LABELS.forEach((iLbl, cIdx) => {
        const { severity } = computeScoreFallback(rIdx, cIdx);
        const sMeta = SEV_META[severity] || SEV_META[1];

        const cell = document.createElement('div');
        cell.className = `rm-cell is-sev-${severity}`;
        cell.setAttribute('role', 'gridcell');
        cell.dataset.r = String(rIdx);
        cell.dataset.c = String(cIdx);

        // Drag & Drop target events
        cell.addEventListener('dragover', (e) => {
          if (draggedRiskId == null) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          cell.classList.add('is-drop-target');
        });
        cell.addEventListener('dragleave', (e) => {
          if (!cell.contains(e.relatedTarget)) {
            cell.classList.remove('is-drop-target');
          }
        });
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('is-drop-target');
          const id = draggedRiskId ?? Number(e.dataTransfer.getData('text/plain'));
          draggedRiskId = null;
          if (Number.isFinite(id) && id > 0) {
            riskStore.moveRiskToCell(id, rIdx, cIdx);
          }
        });

        const hd = document.createElement('div');
        hd.className = 'rm-cell-hd';

        const lbl = document.createElement('span');
        lbl.className = 'rm-cell-lbl';
        lbl.textContent = sMeta.text;

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'rm-cell-add';
        addBtn.textContent = '+';
        addBtn.title = `Добавить риск (${pLbl} × ${iLbl})`;
        addBtn.setAttribute('aria-label', `Добавить риск в ячейку: ${pLbl}, влияние ${iLbl}`);
        addBtn.addEventListener('click', () => riskStore.openRiskModal(null, { r: rIdx, c: cIdx }));

        hd.append(lbl, addBtn);
        cell.append(hd);

        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'rm-cell-items';

        const cellRisks = filtered.filter((x) => x.r === rIdx && x.c === cIdx);
        cellRisks.forEach((item) => {
          itemsWrap.append(
            riskStore.createCompactRiskCard(item, {
              context: 'map',
              draggable: true,
              onDragStart: (id) => { draggedRiskId = id; },
              onDragEnd: () => {
                draggedRiskId = null;
                gridEl?.querySelectorAll('.rm-cell.is-drop-target').forEach((c) => c.classList.remove('is-drop-target'));
              }
            })
          );
        });

        cell.append(itemsWrap);
        frag.append(cell);
      });
    });

    gridEl.append(frag);
  }

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
    render();
    searchOpenBtn.focus();
  }

  searchOpenBtn?.addEventListener('click', openSearch);
  searchCloseBtn?.addEventListener('click', closeSearch);
  searchInp?.addEventListener('input', () => {
    searchQuery = searchInp.value.trim().toLowerCase();
    render();
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

  // Severity Filter Capsules with integrated × clear
  function setSeverityFilter(val) {
    filterSeverity = (filterSeverity === val && val !== 'all') ? 'all' : val;
    $$('[data-rm-sev]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.rmSev === filterSeverity));
    });
    $$('[data-rm-sevwrap]').forEach((wrap) => {
      const isOn = wrap.dataset.rmSevwrap === filterSeverity;
      wrap.classList.toggle('is-active', isOn);
      const clr = wrap.querySelector('[data-rm-sevclr]');
      if (clr) clr.hidden = !isOn;
    });
    render();
  }

  $$('[data-rm-sev]').forEach((btn) => {
    btn.addEventListener('click', () => setSeverityFilter(btn.dataset.rmSev));
  });
  $$('[data-rm-sevclr]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setSeverityFilter('all');
    });
  });

  function resetAllFilters() {
    filterSeverity = 'all';
    searchQuery = '';
    if (searchInp) searchInp.value = '';
    if (searchBox && !searchBox.hidden) {
      searchBox.hidden = true;
      if (searchOpenBtn) searchOpenBtn.hidden = false;
    }
    searchOpenBtn?.classList.remove('is-active');
    setSeverityFilter('all');
  }

  clearFiltersBtn?.addEventListener('click', resetAllFilters);

  // Top Toolbar Actions (100% synced with #risk-framework)
  $('#rm-btn-add')?.addEventListener('click', () => riskStore.openRiskModal(null));
  $('#rm-btn-sample')?.addEventListener('click', () => riskStore.loadDemoSample());
  $('#rm-btn-import')?.addEventListener('click', () => riskStore.openImportDialog());

  $$('[data-rm-storage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toDisk = btn.dataset.rmStorage === 'disk';
      if (toDisk === riskStore.isPersistDisk()) return;
      riskStore.setStorageMode(toDisk, { confirm: true });
    });
  });

  $('#rm-btn-clear')?.addEventListener('click', async () => {
    const count = riskStore.getRisks().length;
    if (!count) {
      toast('Карта рисков уже пуста');
      return;
    }
    const isDemo = riskStore.isDemoMode();
    const ok = await confirmDataAction({
      title: 'Очистить единый реестр рисков?',
      description: isDemo
        ? 'Демо-риски будут убраны с вкладок «Карта рисков» и «Фреймворк», чтобы вы могли заполнить матрицу с нуля.'
        : `Все риски (${count} шт.) будут удалены с вкладок «Карта рисков» и «Фреймворк», а связанные с ними записи убраны из RICE (отмена Ctrl+Z).`,
      confirmLabel: 'Очистить',
      danger: !isDemo
    });
    if (!ok) return;
    await riskStore.clearAllData();
  });

  $('#rm-btn-xlsx')?.addEventListener('click', () => {
    closePopupMenu?.(dlTrigger, dlMenu, true);
    const { enriched } = riskStore.evaluateRisks();
    const mapped = enriched.filter((x) => x.r != null && x.c != null);
    riskStore.exportRisksXlsx(getFiltered(mapped), 'Карта_рисков_3x3.xlsx');
  });

  $('#rm-btn-csv')?.addEventListener('click', () => {
    closePopupMenu?.(dlTrigger, dlMenu, true);
    const { enriched } = riskStore.evaluateRisks();
    const mapped = enriched.filter((x) => x.r != null && x.c != null);
    riskStore.exportRisksCsv(getFiltered(mapped), 'Карта_рисков_3x3.csv');
  });

  function render() {
    syncToolbarState();
    const { enriched } = riskStore.evaluateRisks();
    const mapped = enriched.filter((x) => x.r != null && x.c != null);
    const unmappedCnt = enriched.length - mapped.length;
    const filtered = getFiltered(mapped);
    const scales = riskStore.getScales();

    const highCnt = mapped.filter((x) => x.severity === 2).length;
    const medCnt = mapped.filter((x) => x.severity === 1).length;
    const lowCnt = mapped.filter((x) => x.severity === 0).length;
    const inRiceCnt = enriched.filter((x) => x.inRice).length;

    if (kpiTotal) kpiTotal.textContent = String(mapped.length);
    if (kpiHigh) kpiHigh.textContent = String(highCnt);
    if (kpiMed) kpiMed.textContent = String(medCnt);
    if (kpiLow) kpiLow.textContent = String(lowCnt);

    const hasFilters = filterSeverity !== 'all' || Boolean(searchQuery);
    if (clearFiltersBtn) clearFiltersBtn.hidden = !hasFilters;

    const periodLabel = scales.period || '2025–2028 гг.';
    if (summaryLbl) {
      const visPart = hasFilters ? `${filtered.length}/${mapped.length}` : `${mapped.length}`;
      const unmappedPart = unmappedCnt > 0 ? ` · без оценки: ${unmappedCnt}` : '';
      summaryLbl.textContent = `${periodLabel} · на карте: ${visPart}${unmappedPart} · в RICE: ${inRiceCnt}`;
    }

    renderMatrix(filtered);
  }

  riskStore.subscribe(render);
  render();

  return {
    refresh: render
  };
}
