/**
 * Sparkle 3x3 Interactive Risk Matrix Module
 * Formula: s = 2 - r + c
 * Severity: k0 (green, s < 2), k1 (yellow, s == 2), k2 (red, s > 2)
 */

export const PROBABILITIES = ['Вероятно', 'Возможно', 'Маловероятно'];
export const IMPACTS = ['Небольшое', 'Умеренное', 'Существенное'];
export const STRATEGIES = ['Снижение', 'Перенос', 'Уклонение', 'Принятие'];

export class RiskMatrix {
  constructor(options = {}) {
    this.containerId = options.containerId || 'rm';
    this.summaryId = options.summaryId || 'rn';
    this.inputs = {
      text: options.textInputId || 'rt',
      prob: options.probSelectId || 'rp',
      impact: options.impactSelectId || 'ri',
      strategy: options.stratSelectId || 'rs2'
    };
    this.filterStrategy = null; // null = all

    // Initial default risks for quick demonstration
    this.risks = [
      { id: 1, t: 'Срыв поставок ключевого сырья', r: 0, c: 2, s: 0 },
      { id: 2, t: 'Рост закупочных цен выше инфляции', r: 1, c: 1, s: 1 },
      { id: 3, t: 'Снижение покупательской способности', r: 0, c: 1, s: 0 },
      { id: 4, t: 'Логистические задержки при распределении', r: 2, c: 1, s: 2 }
    ];

    this.init();
  }

  init() {
    this.populateSelects();
    this.bindEvents();
    this.render();
  }

  populateSelects() {
    const pEl = document.getElementById(this.inputs.prob);
    const iEl = document.getElementById(this.inputs.impact);
    const sEl = document.getElementById(this.inputs.strategy);

    if (pEl) pEl.innerHTML = PROBABILITIES.map((p, i) => `<option value="${i}">${p}</option>`).join('');
    if (iEl) iEl.innerHTML = IMPACTS.map((im, i) => `<option value="${i}">${im}</option>`).join('');
    if (sEl) sEl.innerHTML = STRATEGIES.map((st, i) => `<option value="${i}">${st}</option>`).join('');
  }

  bindEvents() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Delegated clicks for removing risk or selecting cell
    container.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (pill) {
        const id = Number(pill.dataset.id);
        this.removeRisk(id);
        return;
      }

      const cell = e.target.closest('.cell');
      if (cell) {
        const r = Number(cell.dataset.r);
        const c = Number(cell.dataset.c);
        const pEl = document.getElementById(this.inputs.prob);
        const iEl = document.getElementById(this.inputs.impact);
        const tEl = document.getElementById(this.inputs.text);
        if (pEl) pEl.value = r;
        if (iEl) iEl.value = c;
        if (tEl) tEl.focus();
      }
    });

    // Add button
    const addBtn = document.getElementById('ra');
    if (addBtn) {
      addBtn.onclick = () => this.addRiskFromInputs();
    }

    // Enter key in text input
    const textInput = document.getElementById(this.inputs.text);
    if (textInput) {
      textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addRiskFromInputs();
        }
      });
    }

    // Export button
    const copyBtn = document.getElementById('rcp');
    if (copyBtn) {
      copyBtn.onclick = () => this.copyToClipboard();
    }
  }

  addRisk(text, probIdx, impactIdx, stratIdx) {
    if (!text || !text.trim()) return;
    const newRisk = {
      id: Date.now(),
      t: text.trim(),
      r: Number(probIdx),
      c: Number(impactIdx),
      s: Number(stratIdx)
    };
    this.risks.push(newRisk);
    this.render();
  }

  addRiskFromInputs() {
    const tEl = document.getElementById(this.inputs.text);
    const pEl = document.getElementById(this.inputs.prob);
    const iEl = document.getElementById(this.inputs.impact);
    const sEl = document.getElementById(this.inputs.strategy);

    if (!tEl || !tEl.value.trim()) {
      if (tEl) tEl.focus();
      return;
    }

    this.addRisk(tEl.value, pEl.value, iEl.value, sEl.value);
    tEl.value = '';
    tEl.focus();
  }

  removeRisk(id) {
    this.risks = this.risks.filter(r => r.id !== id);
    this.render();
  }

  setFilterStrategy(stratIndex) {
    this.filterStrategy = stratIndex === 'all' || stratIndex === null ? null : Number(stratIndex);
    this.render();
  }

  render() {
    const container = document.getElementById(this.containerId);
    const summary = document.getElementById(this.summaryId);
    if (!container) return;

    let html = '<div></div>' + IMPACTS.map(i => `<div class="lab">${i}</div>`).join('');

    const filteredRisks = this.filterStrategy === null
      ? this.risks
      : this.risks.filter(r => r.s === this.filterStrategy);

    PROBABILITIES.forEach((probLabel, r) => {
      html += `<div class="lab">${probLabel}</div>`;
      IMPACTS.forEach((_, c) => {
        // Calculation: s = 2 - r + c
        const s = 2 - r + c;
        const colorClass = s < 2 ? 'k0' : s === 2 ? 'k1' : 'k2';
        
        const cellRisks = filteredRisks.filter(x => x.r === r && x.c === c);
        const pillsHtml = cellRisks.map(x => `
          <button class="pill" data-id="${x.id}" title="Нажмите, чтобы удалить">${escapeHtml(x.t)} <small>${STRATEGIES[x.s]}</small></button>
        `).join('');

        html += `<div class="cell ${colorClass}" data-r="${r}" data-c="${c}">${pillsHtml}</div>`;
      });
    });

    container.innerHTML = html;

    if (summary) {
      const count = filteredRisks.length;
      summary.textContent = count
        ? `Отображено рисков: ${count}. Нажмите на бейдж, чтобы удалить его, или на свободную ячейку, чтобы выбрать координаты.`
        : 'Пока нет рисков в выбранной категории: добавьте первый риск.';
    }
  }

  toTSV() {
    if (!this.risks.length) return '';
    const header = ['Риск', 'Вероятность', 'Влияние', 'Стратегия', 'Уровень критичности'].join('\t');
    const rows = this.risks.map(x => {
      const s = 2 - x.r + x.c;
      const level = s < 2 ? 'Низкий (k0)' : s === 2 ? 'Средний (k1)' : 'Высокий (k2)';
      return [x.t, PROBABILITIES[x.r], IMPACTS[x.c], STRATEGIES[x.s], level].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  async copyToClipboard() {
    if (!this.risks.length) {
      window.dispatchEvent(new CustomEvent('sparkle:toast', { detail: 'Сначала добавьте хотя бы один риск' }));
      return;
    }
    const tsv = this.toTSV();
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tsv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    window.dispatchEvent(new CustomEvent('sparkle:toast', { detail: 'Скопировано в буфер: можно вставлять в Excel' }));
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
