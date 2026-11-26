/**
 * Sparkle Interactive RICE Prioritization Tool v3.48.0
 * Zero-Server: Rust Wasm + 1-Step Undo/Redo + Custom Datepicker + Excel Filters
 * + Risk (-Р) Bidirectional Sync & Source Filter + Dual Plotly Charts + XLSX I/O.
 * Zero innerHTML: 100% pure DOM APIs.
 */
import { runWasmRicePrioritization } from './wasm_loader.js?v=3.48.0';

const STORAGE_DATA_KEY = 'sparkle_rice_items_v1';
const STORAGE_PERSIST_KEY = 'sparkle_rice_persist_v1';
const STORAGE_SCALE_KEY = 'sparkle_rice_scale_v1';

const PRESET_STATUSES = ['Черновик', 'На рассмотрении', 'Утверждено', 'Отклонено'];
const COLLATOR = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
const SVG_NS = 'http://www.w3.org/2000/svg';
const RU_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const XLSX_HEADERS = [
  'Приоритет',
  'Идея',
  'Ответственный',
  'Срок реализации',
  'Необходимые ресурсы',
  '(Reach) Охват эффекта',
  '(Impact) Эффект реализации',
  '(Confidence) Уровень риска при реализации',
  '(Effort) Объем ресурсов',
  'RICE score (R*I*C/E)',
  'Комментарий',
  'Статус'
];

function createSampleInitiatives() {
  return [
    {
      id: 1,
      idea: 'Разработка унифицированных метрик для оценки существующих и новых продуктов компании, а также их автоматизация',
      responsible: 'Иванов Алексей (Руководитель аналитики)',
      deadline: '2026-06-30',
      resources: 'Внутренние:\n1. IT\n2. Бизнес-аналитик\nДополнительные:\n1. Управленческая экспертиза',
      reach: 2,
      reachDesc: 'Внутренние пользователи компании',
      impact: 3,
      impactDesc: '1. Быстрая оценка текущего положения\n2. Data-driven стратегические решения\n3. Цифровизация оценки эффектов',
      confidence: 3,
      confidenceDesc: 'Риск минимален, т.к. необходимая информация доступна, ресурсы имеются',
      effort: 1,
      effortDesc: '320 человеко-часов',
      comment: 'Базовый фундамент для всех последующих инициатив дорожной карты.',
      status: 'Утверждено',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 2,
      idea: 'Оптимизация промо-матрицы и отказ от убыточных акций в ключевых категориях',
      responsible: 'Смирнова Ольга (Директор по RGM)',
      deadline: '2026-05-15',
      resources: 'Команда коммерческой аналитики и категорийные менеджеры',
      reach: 3,
      reachDesc: 'Все розничные точки и онлайн-канал',
      impact: 3,
      impactDesc: 'Рост валовой маржи на +1.4 п.п. без потери трафика',
      confidence: 3,
      confidenceDesc: 'Подтверждено историческим факторным анализом VMPC-INO',
      effort: 2,
      effortDesc: '2 месяца на пересчёт и согласование с поставщиками',
      comment: 'Быстрый финансовый эффект уже в ближайшем квартале.',
      status: 'Утверждено',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 3,
      idea: 'Перезапуск программы лояльности с персональными оффеферми в мобильном приложении',
      responsible: 'Петров Дмитрий (Head of CRM)',
      deadline: '2026-09-30',
      resources: 'CRM-команда, мобильная разработка, маркетинговый бюджет на пилот',
      reach: 3,
      reachDesc: 'Активная база мобильного приложения (4.5 млн пользователей)',
      impact: 2,
      impactDesc: 'Увеличение частоты покупок на +8% и рост среднего чека',
      confidence: 2,
      confidenceDesc: 'Требуется A/B-тест механик на 2 регионах перед масштабированием',
      effort: 2,
      effortDesc: '4 месяца разработки и интеграции',
      comment: 'Зависит от готовности витрины клиентских данных.',
      status: 'На рассмотрении',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 4,
      idea: 'Автоматизация прогнозирования спроса и автозаказа для скоропортящихся товаров',
      responsible: 'Козлов Сергей (Директор по логистике)',
      deadline: '2026-10-31',
      resources: 'Data Science, интеграция с ERP/WMS, пилот на 1 РЦ',
      reach: 2,
      reachDesc: 'Категория Fresh (35% оборота сети)',
      impact: 3,
      impactDesc: 'Снижение списаний на 18% и уменьшение OOS на полке',
      confidence: 2,
      confidenceDesc: 'Качество исторических данных по остаткам неоднородно по регионам',
      effort: 3,
      effortDesc: '6+ месяцев, требуется доработка учётного контура',
      comment: 'Рассмотреть поэтапный запуск начиная с топ-50 SKU.',
      status: 'На рассмотрении',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 5,
      idea: 'Обновление шаблонов ежемесячной управленческой отчётности для советов директоров',
      responsible: 'Волкова Елена (Финансовый контроллер)',
      deadline: '2026-04-30',
      resources: 'Внутренние ресурсы финансового департамента',
      reach: 1,
      reachDesc: 'Топ-менеджмент и руководители департаментов',
      impact: 1,
      impactDesc: 'Экономия ~12 часов ежемесячно на ручной сборке слайдов',
      confidence: 3,
      confidenceDesc: 'Полностью понятный объём работ без технических рисков',
      effort: 1,
      effortDesc: '3 недели силами 1 аналитика',
      comment: 'Хорошая поддерживающая задача с минимальными затратами.',
      status: 'Утверждено',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 6,
      idea: 'Разработка автоматизированной системы ценообразования на базе ML-модели с учётом RGM-риск-факторов',
      responsible: 'Новиков Игорь (CTO)',
      deadline: '2026-11-30',
      resources: 'Необходимо дополнительное исследование',
      reach: 3,
      reachDesc: 'Все клиенты компании (100 000 000 чел)',
      impact: 3,
      impactDesc: 'Повышение маржинальности на 1% по товарам компании (500 000 000 руб)',
      confidence: 1,
      confidenceDesc: 'Очень высокий уровень риска: отсутствуют ресурсы, ML-модель и RGM-архитектура требуют тестов',
      effort: 3,
      effortDesc: 'Необходимо дополнительное исследование',
      comment: 'Возможно рассмотреть в рамках проекта RnD-отдела с расширенными сроками.',
      status: 'Отклонено',
      isRisk: false,
      sourceRiskId: null,
      isSample: true
    },
    {
      id: 7,
      idea: 'Квалифицировать 2 резервных поставщика и сформировать буфер запаса 21 день по SKU группы A',
      responsible: 'Директор по закупкам',
      deadline: '2026-06-15',
      resources: 'Отдел ВЭД, оборотный лимит под страховой запас на центральном РЦ',
      reach: 3,
      reachDesc: 'Весь импортный ассортимент группы A (42% выручки)',
      impact: 3,
      impactDesc: 'Защита непрерывности поставок и сохранение валовой маржи на пике спроса',
      confidence: 3,
      confidenceDesc: 'Предварительные оферты от альтернативных поставщиков уже получены',
      effort: 2,
      effortDesc: '1.5 месяца на аудит партий и перенастройку автозаказа',
      comment: 'Перестройка трансграничных расчётов и логистических коридоров увеличивает срок доставки и волатильность закупочных цен по импортным SKU.',
      status: 'Утверждено',
      isRisk: true,
      sourceRiskId: 1,
      riskTitle: 'Срыв поставок ключевого сырья и рост плеча логистики',
      isSample: true
    },
    {
      id: 8,
      idea: 'Внедрить автосверку кодов маркировки в УПД до приёмки на РЦ и переложить штрафы в SLA 3PL-оператора',
      responsible: 'Руководитель логистики',
      deadline: '2026-06-01',
      resources: 'Складской ИТ-контур, ТСД-сканеры, юристы по договорам 3PL',
      reach: 2,
      reachDesc: 'Все маркируемые товарные группы на РЦ и в рознице',
      impact: 2,
      impactDesc: 'Снижение возвратов приёмки и обнуление регуляторных штрафов',
      confidence: 3,
      confidenceDesc: 'Пилотная валидация УПД уже работает на 1 складе',
      effort: 1,
      effortDesc: '3 недели тиражирования и допсоглашения с 3PL',
      comment: 'Расхождения кодов маркировки в УПД при поштучной приёмке ведут к простоям ворот РЦ, штрафам и остановке продаж.',
      status: 'Утверждено',
      isRisk: true,
      sourceRiskId: 8,
      riskTitle: 'Расширение обязательной маркировки («Честный ЗНАК») и риск блокировки отгрузок',
      isSample: true
    }
  ];
}

// Fix typo in sample item 3 cleanly
createSampleInitiatives;

function cloneItems(arr) {
  return arr.map((x) => ({ ...x }));
}

function normalizeStatus(raw) {
  const s = String(raw ?? '').trim();
  const low = s.toLowerCase();
  if (!s || low === 'draft' || low === 'черновик') return 'Черновик';
  if (low === 'pending' || low === 'review' || low === 'на рассмотрении') return 'На рассмотрении';
  if (low === 'yes' || low === 'да' || low === 'утверждено' || low === 'true' || low === '1') return 'Утверждено';
  if (low === 'no' || low === 'нет' || low === 'отклонено' || low === 'false' || low === '0') return 'Отклонено';
  return s;
}

function parseOptionalMetric(v) {
  if (v === null || v === undefined || v === '' || v === '—' || v === '-') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasCompleteRice(it) {
  return it != null
    && it.reach !== null && it.reach !== undefined && Number(it.reach) > 0
    && it.impact !== null && it.impact !== undefined && Number(it.impact) > 0
    && it.confidence !== null && it.confidence !== undefined && Number(it.confidence) > 0
    && it.effort !== null && it.effort !== undefined && Number(it.effort) > 0;
}

function formatDateRu(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatRankDisplay(it) {
  const r = Number(it?.rank) || 0;
  return it?.isRisk ? `${r}-Р` : String(r);
}

function createCalendarIcon(size = 13) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '2');
  rect.setAttribute('y', '3.5');
  rect.setAttribute('width', '12');
  rect.setAttribute('height', '10.5');
  rect.setAttribute('rx', '2');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M5 2v2.5M11 2v2.5M2 7h12');
  svg.append(rect, path);
  return svg;
}

let items = [];
let nextId = 9;
let persistEnabled = false;
let scaleMode = 'template'; // 'template' (Упрощённый 1–3) | 'classic' (Классический)
let showTable = true;
let showCharts = true;
let searchQuery = '';
let sourceFilter = 'all'; // 'all' | 'ideas' | 'risks' (Item 7)
let sortState = { col: 'rice', dir: 'desc' };
let columnFilters = {};
let activeMenuCol = null;
let activeMenuTotalUnique = 0;
let editingId = null;

// Single-step Undo / Redo (keeps the last action in memory, including filters)
let undoSnap = null;
let redoSnap = null;

function serializeFilters(f) {
  const out = {};
  for (const [k, s] of Object.entries(f || {})) {
    if (s && s.size > 0) out[k] = [...s];
  }
  return out;
}

function deserializeFilters(raw) {
  const out = {};
  for (const [k, arr] of Object.entries(raw || {})) {
    if (Array.isArray(arr) && arr.length > 0) out[k] = new Set(arr);
  }
  return out;
}

// Custom Datepicker state
let dpTarget = null; // { type: 'row', id } | { type: 'modal' } | { type: 'external', onSelect }
let dpCurrentIso = '';
let dpViewYear = new Date().getFullYear();
let dpViewMonth = new Date().getMonth();

let hooks = {
  onStateChange: () => {},
  onRiskInitiativeEdited: () => {},
  onScaleModeConverted: () => {},
  confirmAction: async () => true,
  toast: () => {},
  isDarkMode: () => false
};

function recordUndo(label) {
  undoSnap = {
    items: cloneItems(items),
    scaleMode,
    sortState: sortState ? { ...sortState } : null,
    columnFilters: serializeFilters(columnFilters),
    sourceFilter,
    searchQuery,
    label
  };
  redoSnap = null;
}

function syncSearchInputFromState() {
  const sInp = document.getElementById('rice-search');
  const sWrap = document.getElementById('rice-search-wrap');
  const sBtn = document.getElementById('btn-rice-search-toggle');
  if (!sInp) return;
  sInp.value = searchQuery;
  const open = Boolean(searchQuery.trim());
  sInp.hidden = !open;
  if (sBtn) sBtn.hidden = open;
  sWrap?.classList.toggle('is-open', open);
  sBtn?.setAttribute('aria-expanded', String(open));
}

function performUndo() {
  if (!undoSnap) return;
  const target = undoSnap;
  redoSnap = {
    items: cloneItems(items),
    scaleMode,
    sortState: sortState ? { ...sortState } : null,
    columnFilters: serializeFilters(columnFilters),
    sourceFilter,
    searchQuery,
    label: target.label
  };
  undoSnap = null;
  items = cloneItems(target.items);
  scaleMode = target.scaleMode;
  sortState = target.sortState ? { ...target.sortState } : null;
  columnFilters = deserializeFilters(target.columnFilters);
  sourceFilter = target.sourceFilter || 'all';
  searchQuery = target.searchQuery || '';
  nextId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
  syncSearchInputFromState();
  saveToStorageIfNeeded();
  renderAll({ animate: true });
  items.forEach((it) => { if (it.isRisk) hooks.onRiskInitiativeEdited(it); });
  hooks.onStateChange();
  hooks.toast(`Отменено: ${target.label}`);
}

function performRedo() {
  if (!redoSnap) return;
  const target = redoSnap;
  undoSnap = {
    items: cloneItems(items),
    scaleMode,
    sortState: sortState ? { ...sortState } : null,
    columnFilters: serializeFilters(columnFilters),
    sourceFilter,
    searchQuery,
    label: target.label
  };
  redoSnap = null;
  items = cloneItems(target.items);
  scaleMode = target.scaleMode;
  sortState = target.sortState ? { ...target.sortState } : null;
  columnFilters = deserializeFilters(target.columnFilters);
  sourceFilter = target.sourceFilter || 'all';
  searchQuery = target.searchQuery || '';
  nextId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
  syncSearchInputFromState();
  saveToStorageIfNeeded();
  renderAll({ animate: true });
  items.forEach((it) => { if (it.isRisk) hooks.onRiskInitiativeEdited(it); });
  hooks.onStateChange();
  hooks.toast(`Повторено: ${target.label}`);
}

function getHeaderDescriptions() {
  const isSimple = scaleMode === 'template';
  return {
    rank: {
      title: 'Приоритет (№)',
      body: 'Порядковый ранг по убыванию RICE score. Для действий по рискам добавляется суффикс «-Р» (например, 1-Р; 2-Р). Нажмите для фильтрации Идей / Рисков.'
    },
    idea: {
      title: 'Идея / действие',
      body: 'Формулировка инициативы или меры реагирования на риск. Наведите на ячейку, чтобы увидеть полный текст, ресурсы и описание.'
    },
    reach: {
      title: 'Reach — охват эффекта',
      body: isSimple
        ? 'Упрощённая шкала 1–3:\n1 — узкий сегмент / команда\n2 — часть клиентов / внутр. пользователи\n3 — вся клиентская база'
        : 'Классическая шкала:\nЧисло пользователей или событий за период (например, 1000 в квартал).'
    },
    impact: {
      title: 'Impact — эффект реализации',
      body: isSimple
        ? 'Упрощённая шкала 1–3:\n1 — умеренный эффект\n2 — заметный бизнес-эффект\n3 — стратегический / высокий финансовый эффект'
        : 'Классическая шкала:\n0.25 — минимальный · 0.5 — низкий · 1 — средний · 2 — высокий · 3 — прорывной'
    },
    confidence: {
      title: 'Confidence — уверенность (обратный риск)',
      body: isSimple
        ? 'Упрощённая шкала 1–3:\n1 — высокий риск реализации\n2 — умеренный риск\n3 — минимальный риск (данные и ресурсы есть)'
        : 'Классическая шкала:\n50% — низкая уверенность · 80% — средняя · 100% — высокая'
    },
    effort: {
      title: 'Effort — объём ресурсов / усилий',
      body: isSimple
        ? 'Упрощённая шкала 1–3 (меньше — лучше):\n1 — малый объём ресурсов\n2 — средний объём\n3 — большой объём / требуется RnD'
        : 'Классическая шкала (меньше — лучше):\nТрудозатраты команды в человеко-месяцах (от 0.5).'
    },
    rice: {
      title: 'RICE score',
      body: isSimple
        ? 'Итоговый приоритет по формуле R × I × C / E (максимум 27). По умолчанию таблица отсортирована по убыванию RICE.'
        : 'Итоговый приоритет по формуле R × I × (C / 100) / E. По умолчанию таблица отсортирована по убыванию RICE.'
    },
    responsible: {
      title: 'Ответственный',
      body: 'Владелец инициативы или риска (ФИО и должность).'
    },
    deadline: {
      title: 'Срок / решение необходимо до',
      body: 'Плановая дата реализации идеи, а для рисков — дата, до которой необходимо решение или действие.'
    },
    status: {
      title: 'Статус',
      body: 'Черновик, На рассмотрении, Утверждено, Отклонено или свой пользовательский статус («Другое…»).'
    }
  };
}

function normalizeItem(raw, idx = 0) {
  const srcRaw = raw?.sourceRiskId;
  const sourceRiskId = (srcRaw !== undefined && srcRaw !== null && srcRaw !== '')
    ? (Number.isFinite(Number(srcRaw)) ? Number(srcRaw) : String(srcRaw))
    : null;
  const isRisk = Boolean(raw?.isRisk || sourceRiskId !== null);

  return {
    id: Number(raw?.id) || (idx + 1),
    idea: String(raw?.idea ?? '').replace('оффеферми', 'офферами'),
    responsible: String(raw?.responsible ?? ''),
    deadline: String(raw?.deadline ?? ''),
    resources: String(raw?.resources ?? ''),
    reach: parseOptionalMetric(raw?.reach),
    reachDesc: String(raw?.reachDesc ?? ''),
    impact: parseOptionalMetric(raw?.impact),
    impactDesc: String(raw?.impactDesc ?? ''),
    confidence: parseOptionalMetric(raw?.confidence),
    confidenceDesc: String(raw?.confidenceDesc ?? ''),
    effort: parseOptionalMetric(raw?.effort),
    effortDesc: String(raw?.effortDesc ?? ''),
    comment: String(raw?.comment ?? ''),
    status: normalizeStatus(raw?.status ?? raw?.approved),
    isRisk,
    sourceRiskId,
    riskTitle: String(raw?.riskTitle ?? ''),
    isSample: Boolean(raw?.isSample)
  };
}

function loadInitialState() {
  try {
    persistEnabled = localStorage.getItem(STORAGE_PERSIST_KEY) === '1';
    const savedScale = localStorage.getItem(STORAGE_SCALE_KEY);
    if (savedScale === 'classic' || savedScale === 'template') {
      scaleMode = savedScale;
    }
    if (persistEnabled) {
      const raw = localStorage.getItem(STORAGE_DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed.map(normalizeItem);
          nextId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
          return;
        }
      }
    }
  } catch {
    persistEnabled = false;
  }
  items = createSampleInitiatives().map(normalizeItem);
  nextId = items.length + 1;
}

function saveToStorageIfNeeded() {
  if (!persistEnabled) return;
  try {
    localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(items));
    localStorage.setItem(STORAGE_SCALE_KEY, scaleMode);
  } catch (err) {
    console.warn('[RICE] localStorage write failed:', err);
  }
}

function computeRankedItems(list) {
  if (!list.length) return [];
  const complete = list.filter(hasCompleteRice);
  const incomplete = list.filter((it) => !hasCompleteRice(it));

  let rankedComplete = [];
  if (complete.length) {
    const wasmInput = complete.map((it) => ({
      id: it.id,
      idea: it.idea || 'Без названия',
      reach: Number(it.reach),
      impact: Number(it.impact),
      confidence: scaleMode === 'classic'
        ? Math.max(0.01, Number(it.confidence) / 100)
        : Number(it.confidence),
      effort: Number(it.effort),
      responsible: it.responsible || null,
      deadline: it.deadline || null
    }));

    const wasmRes = runWasmRicePrioritization(wasmInput);
    const byId = new Map(complete.map((it) => [it.id, it]));

    if (wasmRes && Array.isArray(wasmRes.initiatives)) {
      rankedComplete = wasmRes.initiatives
        .map((r) => {
          const orig = byId.get(r.id);
          if (!orig) return null;
          return { ...orig, rank: r.rank, rice_score: r.rice_score };
        })
        .filter(Boolean);
    } else {
      const scored = complete.map((it) => {
        const r = Number(it.reach);
        const im = Number(it.impact);
        const c = scaleMode === 'classic'
          ? Math.max(0.01, Number(it.confidence) / 100)
          : Number(it.confidence);
        const e = Number(it.effort);
        const score = Math.round(((r * im * c) / e) * 100) / 100;
        return { ...it, rice_score: score };
      });
      scored.sort((a, b) => b.rice_score - a.rice_score);
      rankedComplete = scored.map((it, i) => ({ ...it, rank: i + 1 }));
    }
  }

  const rankedIncomplete = incomplete.map((it, i) => ({
    ...it,
    rank: rankedComplete.length + i + 1,
    rice_score: null
  }));
  return [...rankedComplete, ...rankedIncomplete];
}

function formatScore(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return '—';
  return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, '');
}

function scoreTone(val) {
  if (val === null || val === undefined || !Number.isFinite(val)) return 'unset';
  if (scaleMode === 'template') {
    if (val >= 12) return 'high';
    if (val >= 5) return 'mid';
    return 'low';
  }
  if (val >= 500) return 'high';
  if (val >= 100) return 'mid';
  return 'low';
}

function metricTintLevel(field, val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (scaleMode === 'template') {
    if (field === 'effort') return n <= 1 ? 'good' : (n <= 2 ? 'mid' : 'low');
    return n >= 3 ? 'good' : (n >= 2 ? 'mid' : 'low');
  }
  if (field === 'effort') return n <= 1 ? 'good' : (n <= 2.5 ? 'mid' : 'low');
  if (field === 'reach') return n >= 2500 ? 'good' : (n >= 600 ? 'mid' : 'low');
  if (field === 'impact') return n >= 2 ? 'good' : (n >= 1 ? 'mid' : 'low');
  if (field === 'confidence') return n >= 90 ? 'good' : (n >= 70 ? 'mid' : 'low');
  return '';
}

function metricTintClass(field, val) {
  const lvl = metricTintLevel(field, val);
  return lvl ? `rice-tint-${lvl}` : '';
}

function statusColor(status) {
  if (status === 'Утверждено') return '#22A06B';
  if (status === 'Отклонено') return '#F26A3D';
  if (status === 'Черновик') return '#A0A5B1';
  if (status === 'На рассмотрении') return '#7A8190';
  return '#6366F1';
}

function colDisplayValue(it, col) {
  switch (col) {
    case 'rank': return formatRankDisplay(it);
    case 'idea': return it.idea || '(пусто)';
    case 'reach': return it.reach == null ? '—' : String(it.reach);
    case 'impact': return it.impact == null ? '—' : String(it.impact);
    case 'confidence': return it.confidence == null ? '—' : (scaleMode === 'classic' ? `${it.confidence}%` : String(it.confidence));
    case 'effort': return it.effort == null ? '—' : String(it.effort);
    case 'rice': return formatScore(it.rice_score);
    case 'responsible': return it.responsible || '(пусто)';
    case 'deadline': return it.deadline ? formatDateRu(it.deadline) : '(не указан)';
    case 'status': return it.status || 'Черновик';
    default: return '';
  }
}

function colSortValue(it, col) {
  switch (col) {
    case 'rank': return it.rank;
    case 'reach': return it.reach == null ? null : Number(it.reach);
    case 'impact': return it.impact == null ? null : Number(it.impact);
    case 'confidence': return it.confidence == null ? null : Number(it.confidence);
    case 'effort': return it.effort == null ? null : Number(it.effort);
    case 'rice': return it.rice_score == null ? null : Number(it.rice_score);
    case 'deadline': return it.deadline ? Date.parse(it.deadline) || 0 : 0;
    case 'idea': return it.idea || '';
    case 'responsible': return it.responsible || '';
    case 'status': return it.status || '';
    default: return '';
  }
}

function getFilteredAndSorted(rankedAll) {
  const q = searchQuery.trim().toLowerCase();
  const byId = new Map(rankedAll.map((it) => [it.id, it]));
  const baseList = sortState === null
    ? items.map((x) => byId.get(x.id)).filter(Boolean)
    : rankedAll;

  const filtered = baseList.filter((it) => {
    if (sourceFilter === 'ideas' && it.isRisk) return false;
    if (sourceFilter === 'risks' && !it.isRisk) return false;
    for (const [col, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        if (!allowedSet.has(colDisplayValue(it, col))) return false;
      }
    }
    if (q) {
      const hay = `${formatRankDisplay(it)} ${it.idea} ${it.riskTitle || ''} ${it.responsible} ${it.status} ${it.comment} ${it.resources}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!sortState) return filtered;

  const { col, dir } = sortState;
  const factor = dir === 'asc' ? 1 : -1;
  const isNullableNum = ['reach', 'impact', 'confidence', 'effort', 'rice'].includes(col);
  const isNum = ['rank', 'deadline'].includes(col);
  filtered.sort((a, b) => {
    if (isNullableNum) {
      const va = colSortValue(a, col);
      const vb = colSortValue(b, col);
      const aNull = va === null || !Number.isFinite(va);
      const bNull = vb === null || !Number.isFinite(vb);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      return factor * (va - vb);
    }
    const va = colSortValue(a, col);
    const vb = colSortValue(b, col);
    if (isNum) return factor * (Number(va) - Number(vb));
    return factor * COLLATOR.compare(String(va), String(vb));
  });
  return filtered;
}

function hasActiveFilters() {
  return Boolean(searchQuery.trim())
    || sourceFilter !== 'all'
    || Object.values(columnFilters).some((s) => s && s.size > 0);
}

function convertScale(newScale) {
  if (newScale === scaleMode) return;
  recordUndo('смена шкалы RICE');
  const from = scaleMode;
  scaleMode = newScale;
  columnFilters = {};
  items = items.map((it) => {
    const next = { ...it };
    if (from === 'template' && newScale === 'classic') {
      if (it.reach != null) next.reach = it.reach === 3 ? 5000 : (it.reach === 2 ? 1000 : 250);
      if (it.impact != null) next.impact = it.impact === 3 ? 3 : (it.impact === 2 ? 1 : 0.5);
      if (it.confidence != null) next.confidence = it.confidence === 3 ? 100 : (it.confidence === 2 ? 80 : 50);
      if (it.effort != null) next.effort = it.effort === 3 ? 4 : (it.effort === 2 ? 2 : 1);
    } else if (from === 'classic' && newScale === 'template') {
      if (it.reach != null) next.reach = it.reach >= 3000 ? 3 : (it.reach >= 600 ? 2 : 1);
      if (it.impact != null) next.impact = it.impact >= 2 ? 3 : (it.impact >= 1 ? 2 : 1);
      if (it.confidence != null) next.confidence = it.confidence >= 90 ? 3 : (it.confidence >= 65 ? 2 : 1);
      if (it.effort != null) next.effort = it.effort >= 3 ? 3 : (it.effort >= 1.5 ? 2 : 1);
    }
    return next;
  });
  saveToStorageIfNeeded();
  renderAll();
  hooks.onScaleModeConverted(from, newScale);
  hooks.toast(newScale === 'template' ? 'Формат RICE: Упрощённый (1–3)' : 'Формат RICE: Классический');
}

function pluralIdeas(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'идея';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'идеи';
  return 'идей';
}

export function getRiceScaleMode() {
  return scaleMode;
}

export function hasRiskInitiative(riskId) {
  if (riskId === undefined || riskId === null || riskId === '') return false;
  return items.some((x) => x.isRisk && String(x.sourceRiskId) === String(riskId));
}

export function upsertRiskInitiative(payload, { silent = false } = {}) {
  if (!payload || payload.sourceRiskId == null) return null;
  const key = String(payload.sourceRiskId);
  const idx = items.findIndex((x) => x.isRisk && String(x.sourceRiskId) === key);
  let targetId;
  const isNew = idx < 0;

  if (isNew) {
    targetId = nextId++;
    const created = normalizeItem({
      ...payload,
      id: targetId,
      isRisk: true,
      sourceRiskId: payload.sourceRiskId,
      isSample: Boolean(payload.isSample)
    });
    items.push(created);
  } else {
    targetId = items[idx].id;
    items[idx] = normalizeItem({
      ...items[idx],
      ...payload,
      id: targetId,
      isRisk: true,
      sourceRiskId: payload.sourceRiskId,
      isSample: payload.isSample !== undefined ? Boolean(payload.isSample) : Boolean(items[idx].isSample)
    });
  }

  saveToStorageIfNeeded();
  renderAll({ animate: !silent, movedId: targetId });
  hooks.onStateChange();

  const ranked = computeRankedItems(items).find((x) => x.id === targetId);
  return {
    id: targetId,
    rank: ranked ? ranked.rank : items.length,
    isNew
  };
}

export function removeRiskInitiative(riskId, { silent = false } = {}) {
  if (riskId == null) return false;
  const key = String(riskId);
  const before = items.length;
  items = items.filter((x) => !(x.isRisk && String(x.sourceRiskId) === key));
  if (items.length === before) return false;
  saveToStorageIfNeeded();
  renderAll({ animate: !silent });
  hooks.onStateChange();
  return true;
}

export function removeRiskInitiativeByRiskId(riskId, opts = {}) {
  return removeRiskInitiative(riskId, opts);
}

export function getRiceContextSummary() {
  const ranked = computeRankedItems(items);
  const count = ranked.length;
  if (!count) {
    return { available: false, count: 0, summary: 'Список инициатив RICE пуст.' };
  }
  const topLines = ranked.slice(0, 12).map((it) => {
    const scoreStr = formatScore(it.rice_score);
    const kind = it.isRisk ? 'Риск' : 'Идея';
    const st = it.status ? ` [${it.status}]` : '';
    return `- [${kind} #${formatRankDisplay(it)} | RICE ${scoreStr}${st}] ${it.idea || 'Без названия'}${it.responsible ? ` (отв.: ${it.responsible})` : ''}`;
  });
  return {
    available: true,
    count,
    summary: `Инициативы RICE (${count} шт., топ-${topLines.length}):\n${topLines.join('\n')}`
  };
}

export function focusRiceInitiativeByRiskId(riskId) {
  const found = items.find((x) => x.isRisk && String(x.sourceRiskId) === String(riskId));
  window.location.hash = '#rice';
  if (!found) return;
  if (!showTable) {
    showTable = true;
    syncToolbarControls();
  }
  const visible = getFilteredAndSorted(computeRankedItems(items));
  if (!visible.some((x) => x.id === found.id)) {
    sourceFilter = 'all';
    columnFilters = {};
    searchQuery = '';
    syncSearchInputFromState();
    renderAll();
  }
  setTimeout(() => {
    const tr = document.querySelector(`#rice-tbody tr[data-rice-row="${found.id}"]`);
    if (tr) {
      tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      tr.classList.remove('rice-row-moved');
      void tr.offsetWidth;
      tr.classList.add('rice-row-moved');
      tr.querySelector('[data-rice-edit="idea"]')?.focus();
      setTimeout(() => tr.classList.remove('rice-row-moved'), 1200);
    }
  }, 60);
}

export function getRiceStorageStats() {
  const count = items.length;
  const isDemo = count > 0 && items.every((x) => x.isSample);
  let status;
  if (count === 0) {
    status = { level: 'empty', text: 'Пусто' };
  } else if (persistEnabled) {
    status = {
      level: 'disk',
      text: isDemo
        ? 'Демо-набор'
        : `На диске · ${count} ${pluralIdeas(count)}`
    };
  } else if (isDemo) {
    status = { level: 'ram', text: 'Демо-набор' };
  } else {
    status = { level: 'ram', text: `В памяти · ${count} ${pluralIdeas(count)}` };
  }
  return { count, persist: persistEnabled, isDemo, isSampleOnly: isDemo, status };
}

export function setRicePersistence(enabled) {
  persistEnabled = Boolean(enabled);
  try {
    if (persistEnabled) {
      localStorage.setItem(STORAGE_PERSIST_KEY, '1');
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(items));
      localStorage.setItem(STORAGE_SCALE_KEY, scaleMode);
    } else {
      localStorage.removeItem(STORAGE_PERSIST_KEY);
      localStorage.removeItem(STORAGE_DATA_KEY);
      localStorage.removeItem(STORAGE_SCALE_KEY);
    }
  } catch (err) {
    console.warn('[RICE] persistence toggle error:', err);
  }
  syncToolbarControls();
  hooks.onStateChange();
}

export function clearRiceData({ trackUndo = false } = {}) {
  if (trackUndo && items.length > 0) recordUndo('очистка списка');
  items = [];
  nextId = 1;
  columnFilters = {};
  sourceFilter = 'all';
  try {
    if (persistEnabled) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify([]));
    } else {
      localStorage.removeItem(STORAGE_DATA_KEY);
    }
  } catch { /* ignore */ }
  renderAll();
  hooks.onStateChange();
}

function syncToolbarControls() {
  document.querySelectorAll('[data-rice-view]').forEach((btn) => {
    const isTable = btn.dataset.riceView === 'table';
    btn.setAttribute('aria-pressed', String(isTable ? showTable : showCharts));
  });
  const tableCard = document.getElementById('rice-table-card');
  if (tableCard) tableCard.hidden = !showTable;
  const chartCard = document.getElementById('rice-chart-card');
  if (chartCard) chartCard.hidden = !showCharts;

  document.querySelectorAll('[data-rice-scale]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.riceScale === scaleMode));
  });
  document.querySelectorAll('[data-rice-storage]').forEach((btn) => {
    const isDisk = btn.dataset.riceStorage === 'localstorage';
    btn.setAttribute('aria-pressed', String(isDisk === persistEnabled));
  });

  const undoBtn = document.getElementById('btn-rice-undo');
  if (undoBtn) {
    undoBtn.setAttribute('aria-disabled', String(!undoSnap));
    undoBtn.title = undoSnap ? `Отменить: ${undoSnap.label} (Ctrl+Z)` : 'Нет действия для отмены';
  }
  const redoBtn = document.getElementById('btn-rice-redo');
  if (redoBtn) {
    redoBtn.setAttribute('aria-disabled', String(!redoSnap));
    redoBtn.title = redoSnap ? `Повторить: ${redoSnap.label} (Ctrl+Y)` : 'Нет действия для повтора';
  }

  const clearBtn = document.getElementById('btn-rice-clear');
  if (clearBtn) clearBtn.setAttribute('aria-disabled', String(items.length === 0));
  const exportBtn = document.getElementById('btn-rice-export');
  if (exportBtn) exportBtn.setAttribute('aria-disabled', String(items.length === 0));

  const tbl = document.getElementById('rice-table');
  tbl?.classList.toggle('is-manual-order', sortState === null);

  document.querySelectorAll('#rice-table thead th[data-col]').forEach((th) => {
    const col = th.dataset.col;
    if (sortState && col === sortState.col) {
      th.setAttribute('aria-sort', sortState.dir === 'asc' ? 'ascending' : 'descending');
    } else {
      th.removeAttribute('aria-sort');
    }
    const isFiltered = Boolean(
      (col === 'rank' && sourceFilter !== 'all')
      || (columnFilters[col] && columnFilters[col].size > 0)
    );
    th.setAttribute('data-filtered', String(isFiltered));
  });
}

function renderSummary(rankedAll, visibleCount) {
  const host = document.getElementById('rice-summary');
  if (!host) return;
  host.replaceChildren();

  const total = rankedAll.length;
  const risksCnt = rankedAll.filter((x) => x.isRisk).length;
  const ideasCnt = total - risksCnt;
  const approved = rankedAll.filter((x) => x.status === 'Утверждено').length;
  const scoredItems = rankedAll.filter((x) => x.rice_score !== null && Number.isFinite(x.rice_score));
  const top = scoredItems[0];
  const avg = scoredItems.length
    ? Math.round((scoredItems.reduce((s, x) => s + x.rice_score, 0) / scoredItems.length) * 10) / 10
    : null;

  const appendStat = (label, valText, addDotBefore = true) => {
    if (addDotBefore) {
      const dot = document.createElement('span');
      dot.className = 'rice-stat-dot';
      dot.setAttribute('aria-hidden', 'true');
      dot.textContent = '·';
      host.append(dot);
    }
    const sp = document.createElement('span');
    sp.className = 'rice-stat-item';
    sp.append(document.createTextNode(`${label}: `));
    const b = document.createElement('b');
    b.textContent = valText;
    sp.append(b);
    host.append(sp);
  };

  appendStat('Всего', String(total), false);
  appendStat('Идей', String(ideasCnt));
  appendStat('Рисков (-Р)', String(risksCnt));
  appendStat('Утверждено', String(approved));
  appendStat('Средний RICE', formatScore(avg));
  appendStat('Лидер', top ? formatScore(top.rice_score) : '—');

  if (visibleCount !== total) {
    appendStat('Показано', String(visibleCount));
  }
  if (sortState === null) {
    appendStat('Порядок', 'ручной (за №)');
  }

  if (hasActiveFilters()) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'rice-stats-reset';
    resetBtn.id = 'btn-rice-reset-filters';
    resetBtn.textContent = 'Сбросить фильтры';
    resetBtn.addEventListener('click', () => {
      recordUndo('сброс фильтров');
      columnFilters = {};
      sourceFilter = 'all';
      searchQuery = '';
      syncSearchInputFromState();
      renderAll();
    });
    host.append(resetBtn);
  }
}

function createScaleControlEl(field, value, id) {
  const tint = metricTintClass(field, value);
  const makeSel = (vals, labelFn, ariaLbl) => {
    const sel = document.createElement('select');
    sel.className = `rice-num-sel${tint ? ` ${tint}` : ''}`;
    sel.dataset.riceEdit = field;
    sel.dataset.id = String(id);
    sel.setAttribute('aria-label', ariaLbl || field);

    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '—';
    if (value == null) emptyOpt.selected = true;
    sel.append(emptyOpt);

    vals.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.dataset.tint = metricTintLevel(field, v);
      if (value != null && Number(value) === v) opt.selected = true;
      opt.textContent = labelFn(v);
      sel.append(opt);
    });
    return sel;
  };

  if (scaleMode === 'template') {
    return makeSel([1, 2, 3], (v) => String(v), field);
  }
  if (field === 'impact') {
    return makeSel([0.25, 0.5, 1, 2, 3], (v) => String(v), 'Impact');
  }
  if (field === 'confidence') {
    return makeSel([50, 80, 100], (v) => `${v}%`, 'Confidence');
  }

  const inp = document.createElement('input');
  inp.type = 'number';
  inp.className = `rice-num-inp${tint ? ` ${tint}` : ''}`;
  inp.dataset.riceEdit = field;
  inp.dataset.id = String(id);
  inp.value = value == null ? '' : String(value);
  inp.placeholder = '—';
  inp.min = field === 'effort' ? '0.5' : '1';
  inp.step = field === 'effort' ? '0.5' : '50';
  inp.setAttribute('aria-label', field);
  return inp;
}

function statusSelectClass(status) {
  if (status === 'Утверждено') return 'st-approved';
  if (status === 'Отклонено') return 'st-rejected';
  if (status === 'Черновик') return 'st-draft';
  return '';
}

function createStatusControlEl(it) {
  const wrap = document.createElement('div');
  wrap.className = 'rice-status-wrap';

  const stClass = statusSelectClass(it.status);
  const sel = document.createElement('select');
  sel.className = `rice-status-sel${stClass ? ` ${stClass}` : ''}`;
  sel.dataset.riceEdit = 'status';
  sel.dataset.id = String(it.id);
  sel.setAttribute('aria-label', 'Статус');

  PRESET_STATUSES.forEach((st) => {
    const opt = document.createElement('option');
    opt.value = st;
    opt.textContent = st;
    if (it.status === st) opt.selected = true;
    sel.append(opt);
  });

  if (!PRESET_STATUSES.includes(it.status)) {
    const customOpt = document.createElement('option');
    customOpt.value = it.status;
    customOpt.textContent = it.status;
    customOpt.selected = true;
    sel.append(customOpt);
  }

  const otherOpt = document.createElement('option');
  otherOpt.value = '__custom__';
  otherOpt.textContent = 'Другое…';
  sel.append(otherOpt);

  const custInp = document.createElement('input');
  custInp.type = 'text';
  custInp.className = 'rice-custom-st-inp';
  custInp.dataset.riceCustomStatus = String(it.id);
  custInp.placeholder = 'Свой статус...';
  custInp.hidden = true;

  wrap.append(sel, custInp);
  return wrap;
}

function populateRankSpan(rSpan, it) {
  rSpan.replaceChildren();
  rSpan.className = `rice-rank${it.isRisk ? ' is-risk' : ''}`;
  const grip = document.createElement('span');
  grip.className = 'rice-drag-grip';
  grip.setAttribute('aria-hidden', 'true');
  grip.textContent = '⋮⋮';
  rSpan.append(grip, document.createTextNode(formatRankDisplay(it)));
}

function buildRowElement(it) {
  const tr = document.createElement('tr');
  tr.dataset.riceRow = String(it.id);
  if (it.isRisk) tr.classList.add('is-risk-row');

  // Col 0: Rank (1, 2, 1-Р, 2-Р)
  const tdRank = document.createElement('td');
  tdRank.className = 'rice-rank-cell';
  if (sortState === null) tdRank.title = 'Потяните для изменения порядка';
  const rSpan = document.createElement('span');
  populateRankSpan(rSpan, it);
  tdRank.append(rSpan);

  // Col 1: Idea / Risk Action
  const tdIdea = document.createElement('td');
  tdIdea.dataset.tipCell = 'idea';
  tdIdea.dataset.id = String(it.id);
  const ideaInp = document.createElement('input');
  ideaInp.type = 'text';
  ideaInp.className = 'rice-inline-inp';
  ideaInp.dataset.riceEdit = 'idea';
  ideaInp.dataset.id = String(it.id);
  ideaInp.value = it.idea || '';
  ideaInp.placeholder = it.isRisk ? 'Решение / действие по риску...' : 'Сформулируйте инициативу...';
  tdIdea.append(ideaInp);

  // Cols 2–5: R, I, C, E
  const makeMetricTd = (field) => {
    const td = document.createElement('td');
    td.className = 'rice-metric-cell';
    td.dataset.tipCell = field;
    td.dataset.id = String(it.id);
    td.append(createScaleControlEl(field, it[field], it.id));
    return td;
  };
  const tdReach = makeMetricTd('reach');
  const tdImpact = makeMetricTd('impact');
  const tdConf = makeMetricTd('confidence');
  const tdEffort = makeMetricTd('effort');

  // Col 6: RICE Score
  const tdScore = document.createElement('td');
  tdScore.className = 'rice-score-cell';
  tdScore.dataset.tipCell = 'rice';
  tdScore.dataset.id = String(it.id);
  const scoreSpan = document.createElement('span');
  scoreSpan.className = `rice-score tone-${scoreTone(it.rice_score)}`;
  scoreSpan.textContent = formatScore(it.rice_score);
  tdScore.append(scoreSpan);

  // Col 7: Responsible
  const tdResp = document.createElement('td');
  tdResp.dataset.tipCell = 'responsible';
  tdResp.dataset.id = String(it.id);
  const respInp = document.createElement('input');
  respInp.type = 'text';
  respInp.className = 'rice-inline-inp';
  respInp.dataset.riceEdit = 'responsible';
  respInp.dataset.id = String(it.id);
  respInp.value = it.responsible || '';
  respInp.placeholder = 'Ответственный';
  tdResp.append(respInp);

  // Col 8: Deadline
  const tdDate = document.createElement('td');
  tdDate.dataset.tipCell = 'deadline';
  tdDate.dataset.id = String(it.id);
  const dateDisp = formatDateRu(it.deadline);
  const dateBtn = document.createElement('button');
  dateBtn.type = 'button';
  dateBtn.className = `rice-date-btn${dateDisp ? '' : ' is-empty'}`;
  dateBtn.dataset.riceDateBtn = String(it.id);
  const dateLbl = document.createElement('span');
  dateLbl.textContent = dateDisp || 'Дата';
  dateBtn.append(dateLbl, createCalendarIcon(13));
  tdDate.append(dateBtn);

  // Col 9: Status
  const tdStatus = document.createElement('td');
  tdStatus.dataset.tipCell = 'status';
  tdStatus.dataset.id = String(it.id);
  tdStatus.append(createStatusControlEl(it));

  // Col 10: Actions
  const tdAct = document.createElement('td');
  tdAct.className = 'rice-act-cell';
  const detBtn = document.createElement('button');
  detBtn.type = 'button';
  detBtn.className = 'rice-act-btn';
  detBtn.dataset.riceDetails = String(it.id);
  detBtn.textContent = 'Детали';

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'rice-del-btn';
  delBtn.dataset.riceDel = String(it.id);
  delBtn.title = 'Удалить запись';
  delBtn.setAttribute('aria-label', 'Удалить запись');
  delBtn.textContent = '×';

  tdAct.append(detBtn, delBtn);
  tr.append(tdRank, tdIdea, tdReach, tdImpact, tdConf, tdEffort, tdScore, tdResp, tdDate, tdStatus, tdAct);
  return tr;
}

function updateRowInPlace(tr, it) {
  tr.classList.toggle('is-risk-row', Boolean(it.isRisk));
  const rankCell = tr.querySelector('.rice-rank-cell');
  if (rankCell) {
    rankCell.title = sortState === null ? 'Потяните для изменения порядка' : '';
    const rSpan = rankCell.querySelector('.rice-rank');
    if (rSpan) populateRankSpan(rSpan, it);
  }
  const scoreEl = tr.querySelector('.rice-score');
  if (scoreEl) {
    scoreEl.className = `rice-score tone-${scoreTone(it.rice_score)}`;
    scoreEl.textContent = formatScore(it.rice_score);
  }
  const ideaInp = tr.querySelector('[data-rice-edit="idea"]');
  if (ideaInp && document.activeElement !== ideaInp) ideaInp.value = it.idea;
  const respInp = tr.querySelector('[data-rice-edit="responsible"]');
  if (respInp && document.activeElement !== respInp) respInp.value = it.responsible;

  const dateBtn = tr.querySelector('[data-rice-date-btn]');
  if (dateBtn) {
    const disp = formatDateRu(it.deadline);
    dateBtn.classList.toggle('is-empty', !disp);
    const sp = dateBtn.querySelector('span');
    if (sp) sp.textContent = disp || 'Дата';
  }

  ['reach', 'impact', 'confidence', 'effort'].forEach((field) => {
    const el = tr.querySelector(`[data-rice-edit="${field}"]`);
    if (!el) return;
    if (document.activeElement !== el) el.value = it[field] == null ? '' : String(it[field]);
    el.classList.remove('rice-tint-good', 'rice-tint-mid', 'rice-tint-low');
    const cls = metricTintClass(field, it[field]);
    if (cls) el.classList.add(cls);
  });

  const stCell = tr.querySelector('[data-tip-cell="status"]');
  if (stCell) {
    const custInp = stCell.querySelector('[data-rice-custom-status]');
    const isTypingCustom = Boolean(custInp && !custInp.hidden && document.activeElement === custInp);
    const stSel = stCell.querySelector('[data-rice-edit="status"]');
    if (document.activeElement === stSel && stSel) {
      const isPreset = PRESET_STATUSES.includes(it.status);
      if (!isPreset && !Array.from(stSel.options).some((o) => o.value === it.status)) {
        const opt = document.createElement('option');
        opt.value = it.status;
        opt.textContent = it.status;
        stSel.insertBefore(opt, stSel.querySelector('option[value="__custom__"]'));
      }
      stSel.value = it.status;
      stSel.classList.remove('st-approved', 'st-rejected', 'st-draft');
      const stCls = statusSelectClass(it.status);
      if (stCls) stSel.classList.add(stCls);
      if (custInp) custInp.hidden = true;
    } else if (!isTypingCustom) {
      stCell.replaceChildren(createStatusControlEl(it));
    }
  }
}

function reorderNodes(tbody, orderedRows) {
  const move = Object.hasOwn(Element.prototype, 'moveBefore')
    ? (node) => tbody.moveBefore(node, null)
    : (node) => tbody.append(node);
  for (const row of orderedRows) move(row);
}

function renderEmptyBox(emptyEl) {
  if (!emptyEl) return;
  emptyEl.replaceChildren();
  const p = document.createElement('p');
  const actions = document.createElement('div');
  actions.className = 'rice-empty-actions';

  if (items.length === 0) {
    p.textContent = 'Список инициатив пуст. Добавьте идею, перенесите риск из Карты/Фреймворка или загрузите примеры.';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'bt p sm';
    addBtn.dataset.riceEmptyAdd = '1';
    addBtn.textContent = '+ Добавить инициативу';

    const sampleBtn = document.createElement('button');
    sampleBtn.type = 'button';
    sampleBtn.className = 'bt sm';
    sampleBtn.dataset.riceEmptySample = '1';
    sampleBtn.textContent = 'Загрузить примеры';
    actions.append(addBtn, sampleBtn);
  } else {
    p.textContent = 'По активным фильтрам записей не найдено.';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'bt sm';
    resetBtn.dataset.riceEmptyReset = '1';
    resetBtn.textContent = 'Сбросить фильтры';
    actions.append(resetBtn);
  }

  emptyEl.append(p, actions);
}

function renderTable(filtered, { animate = false, movedId = null } = {}) {
  const tbody = document.getElementById('rice-tbody');
  const table = document.getElementById('rice-table');
  const emptyEl = document.getElementById('rice-empty');
  const tableWrap = document.getElementById('rice-table-wrap');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.replaceChildren();
    if (emptyEl) {
      emptyEl.hidden = false;
      renderEmptyBox(emptyEl);
    }
    if (tableWrap) tableWrap.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (tableWrap) tableWrap.hidden = false;

  const existingRows = [...tbody.querySelectorAll('tr[data-rice-row]')];
  const existingMap = new Map(existingRows.map((tr) => [Number(tr.dataset.riceRow), tr]));
  const canReuse = existingRows.length === filtered.length
    && filtered.every((it) => existingMap.has(it.id))
    && existingRows[0]?.querySelector('[data-rice-edit="reach"]')?.tagName === (scaleMode === 'template' ? 'SELECT' : 'INPUT');

  if (!canReuse) {
    const frag = document.createDocumentFragment();
    filtered.forEach((it) => frag.append(buildRowElement(it)));
    tbody.replaceChildren(frag);
    return;
  }

  const oldIds = existingRows.map((tr) => Number(tr.dataset.riceRow));
  const newIds = filtered.map((it) => it.id);
  const orderChanged = oldIds.some((id, i) => id !== newIds[i]);
  const orderedRows = filtered.map((it) => existingMap.get(it.id));

  const applyUpdate = () => {
    filtered.forEach((it, i) => updateRowInPlace(orderedRows[i], it));
    if (orderChanged) reorderNodes(tbody, orderedRows);
  };

  if (animate && orderChanged && filtered.length <= 150) {
    let vt = null;
    if (table && typeof table.startViewTransition === 'function') {
      vt = table.startViewTransition(applyUpdate);
    } else if (typeof document.startViewTransition === 'function') {
      vt = document.startViewTransition(applyUpdate);
    } else {
      applyUpdate();
    }
    vt?.finished?.catch(() => {});
    vt?.ready?.catch(() => {});
    const stEl = document.getElementById('rice-sort-status');
    if (stEl) {
      stEl.textContent = sortState
        ? `Порядок обновлён по столбцу ${sortState.col} (${filtered.length} строк)`
        : `Ручной порядок обновлён (${filtered.length} строк)`;
    }
  } else {
    applyUpdate();
  }

  if (movedId != null) {
    const movedTr = tbody.querySelector(`tr[data-rice-row="${movedId}"]`);
    if (movedTr && orderChanged) {
      movedTr.classList.remove('rice-row-moved');
      void movedTr.offsetWidth;
      movedTr.classList.add('rice-row-moved');
      setTimeout(() => movedTr.classList.remove('rice-row-moved'), 950);
    }
  }
}

/* ==========================================================================
   Custom Modern Datepicker Popover (#rice-datepicker — shared with Risk modal!)
   ========================================================================== */
function renderDatepickerCalendar(selectedIso) {
  const monthEl = document.getElementById('rice-dp-month');
  const daysEl = document.getElementById('rice-dp-days');
  if (!monthEl || !daysEl) return;

  monthEl.textContent = `${RU_MONTHS[dpViewMonth]} ${dpViewYear}`;
  const firstDay = new Date(dpViewYear, dpViewMonth, 1);
  const offset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(dpViewYear, dpViewMonth + 1, 0).getDate();
  const todayIso = toIsoDate(new Date());

  const frag = document.createDocumentFragment();
  for (let i = 0; i < offset; i++) {
    frag.append(document.createElement('span'));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${dpViewYear}-${String(dpViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'rice-dp-day',
      iso === todayIso ? 'is-today' : '',
      iso === selectedIso ? 'is-selected' : ''
    ].filter(Boolean).join(' ');
    btn.dataset.dpIso = iso;
    btn.textContent = String(d);
    frag.append(btn);
  }
  daysEl.replaceChildren(frag);
}

function openDatepicker(target, anchorEl, currentIso) {
  const dp = document.getElementById('rice-datepicker');
  if (!dp) return;
  hideHoverTip();
  dpTarget = target;
  dpCurrentIso = currentIso || '';

  // Move popover inside active modal <dialog> when triggered from modal so it is not marked inert by showModal()
  const hostDlg = anchorEl?.closest?.('dialog[open]');
  const targetHost = hostDlg || document.body;
  if (dp.parentElement !== targetHost) {
    try {
      if (dp.matches(':popover-open')) dp.hidePopover();
    } catch { /* ignore */ }
    targetHost.append(dp);
  }

  const base = currentIso && /^\d{4}-\d{2}-\d{2}$/.test(currentIso)
    ? new Date(`${currentIso}T00:00:00`)
    : new Date();
  dpViewYear = base.getFullYear();
  dpViewMonth = base.getMonth();
  renderDatepickerCalendar(dpCurrentIso);

  try {
    dp.showPopover();
  } catch {
    dp.classList.add(':popover-open');
  }

  const rect = anchorEl.getBoundingClientRect();
  const w = dp.offsetWidth || 268;
  const h = dp.offsetHeight || 290;
  const pad = 10;
  let top = rect.bottom + 6;
  if (top + h > window.innerHeight - pad) top = Math.max(pad, rect.top - h - 6);
  const left = Math.max(pad, Math.min(rect.left, window.innerWidth - w - pad));
  dp.style.top = `${Math.round(top)}px`;
  dp.style.left = `${Math.round(left)}px`;
}

export function openExternalDatepicker(anchorEl, currentIso, onSelect) {
  openDatepicker({ type: 'external', onSelect }, anchorEl, currentIso);
}

function closeDatepicker() {
  const dp = document.getElementById('rice-datepicker');
  if (!dp) return;
  try {
    if (dp.matches(':popover-open')) dp.hidePopover();
  } catch {
    dp.classList.remove(':popover-open');
  }
}

function applyDateSelection(iso) {
  if (!dpTarget) return;
  dpCurrentIso = iso;
  if (dpTarget.type === 'row') {
    const it = items.find((x) => x.id === dpTarget.id);
    if (it && it.deadline !== iso) {
      recordUndo('изменение срока');
      it.deadline = iso;
      it.isSample = false;
      saveToStorageIfNeeded();
      renderAll();
      if (it.isRisk) hooks.onRiskInitiativeEdited({ ...it });
      hooks.onStateChange();
    }
  } else if (dpTarget.type === 'modal') {
    const inp = document.getElementById('rice-d-deadline');
    const lbl = document.getElementById('rice-d-deadline-lbl');
    const btn = document.getElementById('rice-d-deadline-btn');
    if (inp) inp.value = iso;
    if (lbl) lbl.textContent = formatDateRu(iso) || 'Выбрать дату';
    if (btn) btn.classList.toggle('is-empty', !iso);
  } else if (dpTarget.type === 'external' && typeof dpTarget.onSelect === 'function') {
    dpTarget.onSelect(iso);
  }
  closeDatepicker();
}

/* ==========================================================================
   Floating Tooltip (Headers & Table Cells)
   ========================================================================== */
function showHoverTip(anchorEl, title, body) {
  const tip = document.getElementById('rice-hover-tip');
  if (!tip || (!title && !body)) return;
  tip.replaceChildren();
  if (title) {
    const st = document.createElement('strong');
    st.textContent = title;
    tip.append(st);
  }
  if (body) {
    tip.append(document.createTextNode(body));
  }
  tip.hidden = false;

  const rect = anchorEl.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const pad = 10;

  let top = rect.bottom + 8;
  if (top + th > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - th - 8);
  }
  let left = rect.left + (rect.width - tw) / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - tw - pad));

  tip.style.top = `${Math.round(top)}px`;
  tip.style.left = `${Math.round(left)}px`;
}

function hideHoverTip() {
  const tip = document.getElementById('rice-hover-tip');
  if (tip) tip.hidden = true;
}

function getCellTooltipContent(cellEl) {
  const col = cellEl.dataset.tipCell;
  const id = Number(cellEl.dataset.id);
  const it = items.find((x) => x.id === id);
  if (!it) return null;

  if (col === 'reach') {
    if (it.reach == null) return { title: 'Reach = —', body: 'Оценка охвата не задана.' };
    return {
      title: `Reach = ${it.reach}`,
      body: it.reachDesc || (scaleMode === 'template'
        ? (it.reach === 3 ? 'Вся клиентская база' : it.reach === 2 ? 'Часть клиентов / внутренние пользователи' : 'Узкий сегмент / команда')
        : `Охват: ${it.reach} за период (обоснование не заполнено)`)
    };
  }
  if (col === 'impact') {
    if (it.impact == null) return { title: 'Impact = —', body: 'Оценка эффекта не задана.' };
    return {
      title: `Impact = ${it.impact}`,
      body: it.impactDesc || 'Обоснование эффекта не заполнено (можно добавить в «Деталях»).'
    };
  }
  if (col === 'confidence') {
    if (it.confidence == null) return { title: 'Confidence = —', body: 'Оценка уверенности не задана.' };
    const cLabel = scaleMode === 'classic' ? `${it.confidence}%` : String(it.confidence);
    return {
      title: `Confidence = ${cLabel}`,
      body: it.confidenceDesc || 'Обоснование уровня риска не заполнено (можно добавить в «Деталях»).'
    };
  }
  if (col === 'effort') {
    if (it.effort == null) return { title: 'Effort = —', body: 'Оценка трудозатрат не задана.' };
    return {
      title: `Effort = ${it.effort}`,
      body: it.effortDesc || 'Обоснование трудозатрат не заполнено (можно добавить в «Деталях»).'
    };
  }
  if (col === 'rice') {
    const ranked = computeRankedItems(items).find((x) => x.id === id);
    if (!hasCompleteRice(it)) {
      return {
        title: 'RICE score = —',
        body: 'Заполните все 4 параметра (R, I, C, E), чтобы рассчитать RICE.'
      };
    }
    const cPart = scaleMode === 'classic' ? `${it.confidence}%` : it.confidence;
    return {
      title: `RICE score = ${ranked ? formatScore(ranked.rice_score) : '—'}`,
      body: `Формула: ${it.reach} × ${it.impact} × ${cPart} / ${it.effort}`
    };
  }
  if (col === 'idea') {
    if (!it.idea && !it.resources && !it.comment && !it.riskTitle) return null;
    const parts = [];
    if (it.isRisk && it.riskTitle) parts.push(`Риск: ${it.riskTitle}`);
    if (it.idea) parts.push(it.idea);
    if (it.resources) parts.push(`Ресурсы:\n${it.resources}`);
    if (it.comment) parts.push(`${it.isRisk ? 'Описание риска' : 'Комментарий'}:\n${it.comment}`);
    return { title: it.isRisk ? 'Действие по риску (-Р)' : 'Идея', body: parts.join('\n\n') };
  }
  if (col === 'deadline') {
    const disp = formatDateRu(it.deadline) || 'не указана';
    return {
      title: it.isRisk ? 'Решение/действие необходимо до' : 'Срок реализации',
      body: `Дата: ${disp}`
    };
  }
  if (col === 'responsible') {
    if (!it.responsible) return null;
    return { title: 'Ответственный', body: it.responsible };
  }
  if (col === 'status') {
    return {
      title: `Статус: ${it.status}`,
      body: it.comment ? `Примечание:\n${it.comment}` : 'Нажмите, чтобы изменить статус или ввести свой («Другое…»).'
    };
  }
  return null;
}

/* ==========================================================================
   Excel-like Column Filter & Sort Popover (with Ideas/Risks filter on №!)
   ========================================================================== */
function syncSourceFilterButtons() {
  const srcBox = document.getElementById('rice-cm-source');
  if (!srcBox) return;
  srcBox.querySelectorAll('[data-cm-src]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.cmSrc === sourceFilter));
  });
}

function openColumnMenu(col, triggerBtn) {
  const menu = document.getElementById('rice-col-menu');
  if (!menu) return;
  hideHoverTip();
  activeMenuCol = col;

  const desc = getHeaderDescriptions()[col];
  const titleEl = document.getElementById('rice-cm-title');
  if (titleEl) titleEl.textContent = desc ? desc.title : col;

  menu.querySelectorAll('[data-cm-sort]').forEach((b) => {
    const isThis = Boolean(sortState && sortState.col === col && sortState.dir === b.dataset.cmSort);
    b.setAttribute('aria-pressed', String(isThis));
  });

  // Show Ideas / Risks filter buttons specifically on the № ('rank') column (Item 7)
  const srcBox = document.getElementById('rice-cm-source');
  if (srcBox) {
    srcBox.hidden = col !== 'rank';
    syncSourceFilterButtons();
  }

  const rankedAll = computeRankedItems(items);
  const scopedForCol = col === 'rank'
    ? rankedAll.filter((it) => {
        if (sourceFilter === 'ideas' && it.isRisk) return false;
        if (sourceFilter === 'risks' && !it.isRisk) return false;
        return true;
      })
    : rankedAll;

  const uniqueVals = [...new Set(scopedForCol.map((it) => colDisplayValue(it, col)))].sort((a, b) =>
    COLLATOR.compare(a, b)
  );
  activeMenuTotalUnique = uniqueVals.length;
  const activeSet = columnFilters[col];

  const listEl = document.getElementById('rice-cm-list');
  const searchEl = document.getElementById('rice-cm-search');
  const allCb = document.getElementById('rice-cm-all');
  if (searchEl) searchEl.value = '';

  const renderCheckboxes = (filterText = '') => {
    if (!listEl) return;
    const ft = filterText.trim().toLowerCase();
    const visibleVals = ft ? uniqueVals.filter((v) => v.toLowerCase().includes(ft)) : uniqueVals;
    const frag = document.createDocumentFragment();

    visibleVals.forEach((val) => {
      const checked = !activeSet || activeSet.size === 0 || activeSet.has(val);
      const lbl = document.createElement('label');
      lbl.className = 'rice-cm-opt';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = val;
      cb.checked = checked;
      const sp = document.createElement('span');
      sp.textContent = val;
      lbl.append(cb, sp);
      frag.append(lbl);
    });

    listEl.replaceChildren(frag);
    if (allCb) {
      const cbs = [...listEl.querySelectorAll('input[type="checkbox"]')];
      allCb.checked = cbs.length > 0 && cbs.every((c) => c.checked);
    }
  };
  renderCheckboxes();
  if (searchEl) {
    searchEl.oninput = () => renderCheckboxes(searchEl.value);
  }

  try {
    menu.showPopover();
  } catch {
    menu.classList.add(':popover-open');
  }

  const rect = triggerBtn.getBoundingClientRect();
  const mw = menu.offsetWidth || 260;
  const mh = menu.offsetHeight || 340;
  const pad = 10;
  let top = rect.bottom + 6;
  if (top + mh > window.innerHeight - pad) top = Math.max(pad, rect.top - mh - 6);
  const left = Math.max(pad, Math.min(rect.left, window.innerWidth - mw - pad));
  menu.style.top = `${Math.round(top)}px`;
  menu.style.left = `${Math.round(left)}px`;
}

function closeColumnMenu() {
  const menu = document.getElementById('rice-col-menu');
  hideHoverTip();
  if (!menu) return;
  try {
    if (menu.matches(':popover-open')) menu.hidePopover();
  } catch {
    menu.classList.remove(':popover-open');
  }
  requestAnimationFrame(hideHoverTip);
}

/* ==========================================================================
   Dual Simultaneous Plotly Charts (Bar + Quadrant Matrix)
   ========================================================================== */
const FIXED_LEGEND_STATUSES = ['Утверждено', 'Отклонено', 'На рассмотрении', 'Черновик'];

function renderChartLegend(filtered) {
  const host = document.getElementById('rice-chart-legend');
  if (!host) return;
  host.replaceChildren();

  const lbl = document.createElement('span');
  lbl.className = 'rice-leg-lbl';
  lbl.textContent = 'Статус:';
  host.append(lbl);

  const customStatuses = [...new Set(
    filtered.map((x) => x.status).filter((st) => st && !FIXED_LEGEND_STATUSES.includes(st))
  )];
  const statuses = [...FIXED_LEGEND_STATUSES, ...customStatuses];
  statuses.forEach((st) => {
    const item = document.createElement('span');
    item.className = 'rice-leg-item';
    const dot = document.createElement('span');
    dot.className = 'rice-leg-dot';
    dot.style.background = statusColor(st);
    item.append(dot, document.createTextNode(st));
    host.append(item);
  });

  const sep = document.createElement('span');
  sep.className = 'rice-leg-sep';
  sep.setAttribute('aria-hidden', 'true');
  sep.textContent = '·';

  const sizeWrap = document.createElement('span');
  sizeWrap.className = 'rice-leg-size';
  sizeWrap.title = 'Размер точки на матрице пропорционален итоговому баллу RICE';
  const bubbles = document.createElement('span');
  bubbles.className = 'rice-leg-bubbles';
  bubbles.setAttribute('aria-hidden', 'true');
  bubbles.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
  const sizeTxt = document.createElement('span');
  sizeTxt.textContent = 'Размер = RICE score';
  sizeWrap.append(bubbles, sizeTxt);

  host.append(sep, sizeWrap);
}

function quadrantLabel(it, midEff, midImp) {
  const highImp = Number(it.impact) >= midImp;
  const lowEff = Number(it.effort) <= midEff;
  if (highImp && lowEff) return 'Быстрые победы';
  if (highImp && !lowEff) return 'Стратегические';
  if (!highImp && lowEff) return 'Рутина';
  return 'Отложить';
}

function showChartTip(it, evt, midEff, midImp) {
  const tip = document.getElementById('rice-chart-tip');
  if (!tip || !it) return;
  tip.replaceChildren();

  const cDisp = scaleMode === 'classic' ? `${it.confidence}%` : String(it.confidence);
  const quad = quadrantLabel(it, midEff, midImp);
  const stCol = statusColor(it.status);
  const commShort = it.comment
    ? (it.comment.length > 130 ? `${it.comment.slice(0, 129)}…` : it.comment)
    : '';

  const hd = document.createElement('div');
  hd.className = 'rct-hd';
  const rnk = document.createElement('span');
  rnk.className = 'rct-rank';
  rnk.textContent = `№${formatRankDisplay(it)}`;
  const stSpan = document.createElement('span');
  stSpan.className = 'rct-status';
  stSpan.style.borderInlineStart = `3px solid ${stCol}`;
  stSpan.textContent = it.status;
  hd.append(rnk, stSpan);

  const titleEl = document.createElement('div');
  titleEl.className = 'rct-title';
  titleEl.textContent = it.idea || 'Без названия';

  const metrics = document.createElement('div');
  metrics.className = 'rct-metrics';
  [
    ['Reach', String(it.reach), false],
    ['Impact', String(it.impact), false],
    ['Conf', cDisp, false],
    ['Effort', String(it.effort), false],
    ['RICE', formatScore(it.rice_score), true]
  ].forEach(([k, v, isScore]) => {
    const m = document.createElement('div');
    m.className = `rct-m${isScore ? ' is-score' : ''}`;
    const sp = document.createElement('span');
    sp.textContent = k;
    const b = document.createElement('b');
    b.textContent = v;
    m.append(sp, b);
    metrics.append(m);
  });

  const meta = document.createElement('div');
  meta.className = 'rct-meta';
  if (it.responsible) {
    const d1 = document.createElement('div');
    d1.append(document.createTextNode('Ответственный: '));
    const b1 = document.createElement('b');
    b1.textContent = it.responsible;
    d1.append(b1);
    meta.append(d1);
  }
  const d2 = document.createElement('div');
  if (it.deadline) {
    const dateLbl = it.isRisk ? 'Необходимо до: ' : 'Срок: ';
    d2.append(document.createTextNode(dateLbl));
    const bd = document.createElement('b');
    bd.textContent = formatDateRu(it.deadline);
    d2.append(bd, document.createTextNode(' · Квадрант: '));
  } else {
    d2.append(document.createTextNode('Квадрант: '));
  }
  const bq = document.createElement('b');
  bq.textContent = quad;
  d2.append(bq);
  meta.append(d2);

  tip.append(hd, titleEl, metrics, meta);

  if (commShort) {
    const comm = document.createElement('div');
    comm.className = 'rct-comm';
    comm.textContent = commShort;
    tip.append(comm);
  }

  const foot = document.createElement('div');
  foot.className = 'rct-foot';
  foot.textContent = 'Клик — открыть карточку детализации';
  tip.append(foot);

  tip.hidden = false;

  const clientX = evt?.clientX ?? window.innerWidth / 2;
  const clientY = evt?.clientY ?? window.innerHeight / 2;
  const tw = tip.offsetWidth || 340;
  const th = tip.offsetHeight || 180;
  const pad = 12;
  let left = clientX + 14;
  if (left + tw > window.innerWidth - pad) left = Math.max(pad, clientX - tw - 14);
  let top = clientY - th / 2;
  top = Math.max(pad, Math.min(top, window.innerHeight - th - pad));
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function hideChartTip() {
  const tip = document.getElementById('rice-chart-tip');
  if (tip) tip.hidden = true;
}

export function rerenderRiceChart() {
  const barEl = document.getElementById('rice-chart-bar');
  const matEl = document.getElementById('rice-chart-matrix');
  if ((!barEl && !matEl) || typeof window.Plotly === 'undefined') return;
  hideChartTip();

  const rankedAll = computeRankedItems(items);
  const filtered = getFilteredAndSorted(rankedAll);
  const chartItems = filtered.filter((x) => hasCompleteRice(x) && x.rice_score !== null);
  const byId = new Map(chartItems.map((x) => [x.id, x]));
  renderChartLegend(filtered);

  if (!chartItems.length) {
    [barEl, matEl].forEach((el) => {
      if (!el) return;
      window.Plotly.purge(el);
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'rice-chart-empty';
      emptyDiv.textContent = filtered.length
        ? 'Нет инициатив с заполненными оценками R, I, C, E для построения графика.'
        : 'Нет данных для построения графика.';
      el.replaceChildren(emptyDiv);
    });
    return;
  }

  const barW = barEl?.clientWidth || 0;
  const matW = matEl?.clientWidth || 0;
  if (!barW && !matW) return;

  const dark = hooks.isDarkMode();
  const textColor = dark ? '#ECEEF2' : '#1D2025';
  const mutedColor = dark ? '#9397A1' : '#5F6368';
  const gridColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(29,32,37,0.08)';
  const medianLineColor = dark ? 'rgba(255,255,255,0.22)' : 'rgba(29,32,37,0.22)';
  const shorten = (s, max = 24) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

  const chartHeight = Math.max(300, Math.min(440, chartItems.length * 44 + 90));
  const maxEff = scaleMode === 'template' ? 3.62 : Math.max(...chartItems.map((x) => x.effort), 3) * 1.22;
  const maxImp = scaleMode === 'template' ? 3.65 : Math.max(...chartItems.map((x) => x.impact), 3) * 1.22;
  const midEff = scaleMode === 'template' ? 2 : maxEff / 2;
  const midImp = scaleMode === 'template' ? 2 : maxImp / 2;

  const wireBiEvents = (el) => {
    if (typeof el.removeAllListeners === 'function') {
      el.removeAllListeners('plotly_click');
      el.removeAllListeners('plotly_hover');
      el.removeAllListeners('plotly_unhover');
    }
    el.on?.('plotly_hover', (data) => {
      const id = data?.points?.[0]?.customdata?.[0];
      const it = byId.get(Number(id));
      if (it) showChartTip(it, data.event, midEff, midImp);
    });
    el.on?.('plotly_unhover', hideChartTip);
    el.on?.('plotly_click', (evt) => {
      hideChartTip();
      const id = evt?.points?.[0]?.customdata?.[0];
      if (id != null) openDetailsModal(Number(id));
    });
    if (!el.dataset.tipLeaveBound) {
      el.dataset.tipLeaveBound = '1';
      el.addEventListener('pointerleave', hideChartTip);
    }
  };

  if (barEl && barW > 0) {
    barEl.querySelector('.rice-chart-empty')?.remove();
    const rev = chartItems.toReversed();
    const maxVal = Math.max(...rev.map((x) => x.rice_score), 1);
    const barTrace = {
      type: 'bar',
      orientation: 'h',
      width: 0.56,
      y: rev.map((x) => `${formatRankDisplay(x)} ${shorten(x.idea || 'Без названия', 24)}`),
      x: rev.map((x) => x.rice_score),
      text: rev.map((x) => ` ${formatScore(x.rice_score)}`),
      textposition: 'outside',
      textfont: { family: 'IBM Plex Mono, monospace', size: 11.5, color: textColor },
      cliponaxis: false,
      hoverinfo: 'none',
      marker: {
        color: rev.map((x) => statusColor(x.status)),
        cornerradius: 6
      },
      customdata: rev.map((x) => [x.id])
    };
    window.Plotly.react(barEl, [barTrace], {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, system-ui, sans-serif', color: textColor, size: 11.5 },
      autosize: true,
      width: barW,
      height: chartHeight,
      margin: { t: 10, r: 42, b: 46, l: 170 },
      xaxis: {
        title: { text: 'RICE score →', font: { size: 11.5, color: mutedColor }, standoff: 8 },
        range: [0, maxVal * 1.22],
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        tickfont: { color: mutedColor }
      },
      yaxis: {
        title: { text: 'Инициативы и риски', font: { size: 11.5, color: mutedColor }, standoff: 8 },
        automargin: true,
        tickfont: { color: textColor }
      }
    }, { displayModeBar: false, responsive: true });
    wireBiEvents(barEl);
  }

  if (matEl && matW > 0) {
    matEl.querySelector('.rice-chart-empty')?.remove();
    const maxScore = Math.max(...chartItems.map((x) => x.rice_score), 1);
    const coordBuckets = Object.groupBy(chartItems, (x) => `${x.effort}_${x.impact}`);
    const stepX = scaleMode === 'template' ? 0.20 : Math.max(maxEff * 0.055, 0.15);
    const stepY = scaleMode === 'template' ? 0.07 : Math.max(maxImp * 0.02, 0.05);
    const jitterById = new Map();
    for (const group of Object.values(coordBuckets)) {
      if (!group) continue;
      const k = group.length;
      group.forEach((it, idx) => {
        if (k === 1) {
          jitterById.set(it.id, { x: it.effort, y: it.impact, pos: 'top center' });
        } else {
          const dx = (idx - (k - 1) / 2) * stepX;
          const dy = k > 2 ? ((idx % 2 === 0 ? 1 : -1) * stepY) : 0;
          const pos = k > 2 && idx % 2 === 1 ? 'bottom center' : 'top center';
          jitterById.set(it.id, { x: it.effort + dx, y: it.impact + dy, pos });
        }
      });
    }

    const matTrace = {
      type: 'scatter',
      mode: 'markers+text',
      x: chartItems.map((x) => jitterById.get(x.id)?.x ?? x.effort),
      y: chartItems.map((x) => jitterById.get(x.id)?.y ?? x.impact),
      text: chartItems.map((x) => formatRankDisplay(x)),
      textposition: chartItems.map((x) => jitterById.get(x.id)?.pos ?? 'top center'),
      textfont: { family: 'IBM Plex Mono, monospace', size: 11, color: textColor },
      hoverinfo: 'none',
      marker: {
        size: chartItems.map((x) => Math.max(15, Math.min(34, 13 + (x.rice_score / maxScore) * 21))),
        color: chartItems.map((x) => statusColor(x.status)),
        opacity: 0.9,
        line: { width: 2, color: dark ? '#141619' : '#FFFFFF' }
      },
      customdata: chartItems.map((x) => [x.id])
    };
    window.Plotly.react(matEl, [matTrace], {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, system-ui, sans-serif', color: textColor, size: 11.5 },
      autosize: true,
      width: matW,
      height: chartHeight,
      margin: { t: 14, r: 18, b: 46, l: 50 },
      xaxis: {
        title: { text: 'Усилия (Effort) →', font: { size: 11.5, color: mutedColor }, standoff: 8 },
        range: [0.4, maxEff],
        gridcolor: gridColor,
        zeroline: false,
        tickfont: { color: mutedColor }
      },
      yaxis: {
        title: { text: 'Эффект (Impact) →', font: { size: 11.5, color: mutedColor }, standoff: 8 },
        range: [0.4, maxImp],
        gridcolor: gridColor,
        zeroline: false,
        tickfont: { color: mutedColor }
      },
      shapes: [
        { type: 'line', x0: midEff, x1: midEff, y0: 0.4, y1: maxImp, line: { color: medianLineColor, width: 1, dash: 'dot' } },
        { type: 'line', x0: 0.4, x1: maxEff, y0: midImp, y1: midImp, line: { color: medianLineColor, width: 1, dash: 'dot' } }
      ],
      annotations: [
        { x: 0.52, y: maxImp - 0.12, text: 'Быстрые победы', showarrow: false, xanchor: 'left', font: { size: 10.5, color: mutedColor } },
        { x: maxEff - 0.08, y: maxImp - 0.12, text: 'Стратегические', showarrow: false, xanchor: 'right', font: { size: 10.5, color: mutedColor } },
        { x: 0.52, y: 0.54, text: 'Рутина', showarrow: false, xanchor: 'left', font: { size: 10.5, color: mutedColor } },
        { x: maxEff - 0.08, y: 0.54, text: 'Отложить', showarrow: false, xanchor: 'right', font: { size: 10.5, color: mutedColor } }
      ]
    }, { displayModeBar: false, responsive: true });
    wireBiEvents(matEl);
  }
}

function renderAll(opts = {}) {
  const rankedAll = computeRankedItems(items);
  const filtered = getFilteredAndSorted(rankedAll);
  syncToolbarControls();
  renderSummary(rankedAll, filtered.length);
  renderTable(filtered, opts);
  rerenderRiceChart();
}

/* ==========================================================================
   12-Field Detail Dialog (Edit Existing OR Create New)
   ========================================================================== */
function syncDetailSelectTints() {
  const pairs = [
    ['reach', scaleMode === 'template' ? 'rice-d-reach-sel' : 'rice-d-reach-num'],
    ['impact', 'rice-d-impact-sel'],
    ['confidence', 'rice-d-conf-sel'],
    ['effort', scaleMode === 'template' ? 'rice-d-effort-sel' : 'rice-d-effort-num']
  ];
  pairs.forEach(([field, elId]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('rice-tint-good', 'rice-tint-mid', 'rice-tint-low');
    const cls = metricTintClass(field, el.value);
    if (cls) el.classList.add(cls);
  });
}

function fillSelectOptions(selEl, optionsData) {
  if (!selEl) return;
  selEl.replaceChildren();
  optionsData.forEach(([val, tint, label]) => {
    const opt = document.createElement('option');
    opt.value = String(val);
    opt.dataset.tint = tint;
    opt.textContent = label;
    selEl.append(opt);
  });
}

function populateDetailMetricControls(it) {
  const rSel = document.getElementById('rice-d-reach-sel');
  const rNum = document.getElementById('rice-d-reach-num');
  const iSel = document.getElementById('rice-d-impact-sel');
  const cSel = document.getElementById('rice-d-conf-sel');
  const eSel = document.getElementById('rice-d-effort-sel');
  const eNum = document.getElementById('rice-d-effort-num');

  if (scaleMode === 'template') {
    if (rSel) rSel.hidden = false;
    if (rNum) rNum.hidden = true;
    if (eSel) eSel.hidden = false;
    if (eNum) eNum.hidden = true;

    fillSelectOptions(rSel, [
      ['', '', '— (не задано)'],
      [1, 'low', '1 — Узкий сегмент'],
      [2, 'mid', '2 — Часть клиентов'],
      [3, 'good', '3 — Вся база']
    ]);
    fillSelectOptions(iSel, [
      ['', '', '— (не задано)'],
      [1, 'low', '1 — Умеренный'],
      [2, 'mid', '2 — Заметный'],
      [3, 'good', '3 — Стратегический']
    ]);
    fillSelectOptions(cSel, [
      ['', '', '— (не задано)'],
      [1, 'low', '1 — Высокий риск'],
      [2, 'mid', '2 — Умеренный риск'],
      [3, 'good', '3 — Низкий риск']
    ]);
    fillSelectOptions(eSel, [
      ['', '', '— (не задано)'],
      [1, 'good', '1 — Малые усилия'],
      [2, 'mid', '2 — Средние усилия'],
      [3, 'low', '3 — Большие / RnD']
    ]);
    if (rSel) rSel.value = it.reach == null ? '' : String(it.reach);
    if (iSel) iSel.value = it.impact == null ? '' : String(it.impact);
    if (cSel) cSel.value = it.confidence == null ? '' : String(it.confidence);
    if (eSel) eSel.value = it.effort == null ? '' : String(it.effort);
  } else {
    if (rSel) rSel.hidden = true;
    if (rNum) { rNum.hidden = false; rNum.value = it.reach == null ? '' : String(it.reach); rNum.placeholder = '—'; }
    if (eSel) eSel.hidden = true;
    if (eNum) { eNum.hidden = false; eNum.value = it.effort == null ? '' : String(it.effort); eNum.placeholder = '—'; }

    fillSelectOptions(iSel, [
      ['', '', '— (не задано)'],
      [0.25, 'low', '0.25 — Минимальный'],
      [0.5, 'low', '0.5 — Низкий'],
      [1, 'mid', '1 — Средний'],
      [2, 'good', '2 — Высокий'],
      [3, 'good', '3 — Прорывной']
    ]);
    fillSelectOptions(cSel, [
      ['', '', '— (не задано)'],
      [50, 'low', '50% — Низкая'],
      [80, 'mid', '80% — Средняя'],
      [100, 'good', '100% — Высокая']
    ]);
    if (iSel) iSel.value = it.impact == null ? '' : String(it.impact);
    if (cSel) cSel.value = it.confidence == null ? '' : String(it.confidence);
  }
  syncDetailSelectTints();
}

function updateDetailScorePreview() {
  const prev = document.getElementById('rice-d-score-preview');
  syncDetailSelectTints();
  if (!prev) return;
  const r = parseOptionalMetric(scaleMode === 'template' ? document.getElementById('rice-d-reach-sel')?.value : document.getElementById('rice-d-reach-num')?.value);
  const i = parseOptionalMetric(document.getElementById('rice-d-impact-sel')?.value);
  const cRaw = parseOptionalMetric(document.getElementById('rice-d-conf-sel')?.value);
  const e = parseOptionalMetric(scaleMode === 'template' ? document.getElementById('rice-d-effort-sel')?.value : document.getElementById('rice-d-effort-num')?.value);
  if (r == null || i == null || cRaw == null || e == null) {
    prev.textContent = 'RICE score: —';
    return;
  }
  const c = scaleMode === 'classic' ? cRaw / 100 : cRaw;
  const score = Math.round(((r * i * c) / Math.max(0.1, e)) * 100) / 100;
  prev.textContent = `RICE score: ${formatScore(score)}`;
}

function openDetailsModal(id = null) {
  const isNew = id === null;
  const it = isNew
    ? normalizeItem({
        id: 0,
        idea: '',
        responsible: '',
        deadline: '',
        resources: '',
        reach: null,
        impact: null,
        confidence: null,
        effort: null,
        status: 'Черновик'
      })
    : items.find((x) => x.id === id);

  const dlg = document.getElementById('rice-detail-dlg');
  if (!it || !dlg) return;
  hideHoverTip();
  editingId = isNew ? null : id;

  const titleEl = document.getElementById('rice-detail-title');
  const submitBtn = document.getElementById('rice-detail-submit');
  const ideaFieldLbl = document.getElementById('rice-d-idea-field-lbl');
  const dateFieldLbl = document.getElementById('rice-d-deadline-field-lbl');
  const commFieldLbl = document.getElementById('rice-d-comm-field-lbl');

  if (titleEl) {
    titleEl.textContent = isNew
      ? 'Новая инициатива'
      : (it.isRisk ? 'Детали действия по риску (-Р)' : 'Детали инициативы');
  }
  if (submitBtn) submitBtn.textContent = isNew ? 'Добавить в таблицу' : 'Сохранить изменения';
  if (ideaFieldLbl) ideaFieldLbl.textContent = it.isRisk ? 'Решение / действие (идея)' : 'Идея';
  if (dateFieldLbl) dateFieldLbl.textContent = it.isRisk ? 'Решение/действие необходимо до' : 'Срок реализации';
  if (commFieldLbl) commFieldLbl.textContent = it.isRisk ? 'Описание риска / комментарий' : 'Комментарий';

  const setVal = (elId, v) => {
    const el = document.getElementById(elId);
    if (el) el.value = v ?? '';
  };
  setVal('rice-d-idea', it.idea);
  setVal('rice-d-resp', it.responsible);
  setVal('rice-d-deadline', it.deadline);
  const dLbl = document.getElementById('rice-d-deadline-lbl');
  const dBtn = document.getElementById('rice-d-deadline-btn');
  if (dLbl) dLbl.textContent = formatDateRu(it.deadline) || 'Выбрать дату';
  if (dBtn) dBtn.classList.toggle('is-empty', !it.deadline);

  setVal('rice-d-resources', it.resources);
  setVal('rice-d-reach-desc', it.reachDesc);
  setVal('rice-d-impact-desc', it.impactDesc);
  setVal('rice-d-conf-desc', it.confidenceDesc);
  setVal('rice-d-effort-desc', it.effortDesc);
  setVal('rice-d-comment', it.comment);

  const stSel = document.getElementById('rice-d-status');
  const stCust = document.getElementById('rice-d-status-custom');
  if (stSel && stCust) {
    if (PRESET_STATUSES.includes(it.status)) {
      stSel.value = it.status;
      stCust.hidden = true;
      stCust.value = '';
    } else {
      stSel.value = '__custom__';
      stCust.hidden = false;
      stCust.value = it.status;
    }
  }

  populateDetailMetricControls(it);
  updateDetailScorePreview();
  dlg.returnValue = '';
  dlg.showModal();
  if (isNew) document.getElementById('rice-d-idea')?.focus();
}

function saveDetailsModal(e) {
  e.preventDefault();
  const dlg = document.getElementById('rice-detail-dlg');
  const getVal = (elId) => document.getElementById(elId)?.value ?? '';

  const stVal = getVal('rice-d-status');
  const resolvedStatus = stVal === '__custom__'
    ? (getVal('rice-d-status-custom').trim() || 'Черновик')
    : normalizeStatus(stVal);

  const payload = {
    idea: getVal('rice-d-idea').trim(),
    responsible: getVal('rice-d-resp').trim(),
    deadline: getVal('rice-d-deadline'),
    status: resolvedStatus,
    resources: getVal('rice-d-resources').trim(),
    reach: parseOptionalMetric(getVal(scaleMode === 'template' ? 'rice-d-reach-sel' : 'rice-d-reach-num')),
    reachDesc: getVal('rice-d-reach-desc').trim(),
    impact: parseOptionalMetric(getVal('rice-d-impact-sel')),
    impactDesc: getVal('rice-d-impact-desc').trim(),
    confidence: parseOptionalMetric(getVal('rice-d-conf-sel')),
    confidenceDesc: getVal('rice-d-conf-desc').trim(),
    effort: parseOptionalMetric(getVal(scaleMode === 'template' ? 'rice-d-effort-sel' : 'rice-d-effort-num')),
    effortDesc: getVal('rice-d-effort-desc').trim(),
    comment: getVal('rice-d-comment').trim(),
    isSample: false
  };

  let editedRiskItem = null;
  if (editingId === null) {
    recordUndo('добавление инициативы');
    items.push(normalizeItem({ ...payload, id: nextId++ }));
    hooks.toast('Инициатива добавлена');
  } else {
    const it = items.find((x) => x.id === editingId);
    if (it) {
      recordUndo('редактирование инициативы');
      Object.assign(it, payload);
      if (it.isRisk) editedRiskItem = { ...it };
      hooks.toast('Инициатива сохранена');
    }
  }

  saveToStorageIfNeeded();
  renderAll();
  if (editedRiskItem) hooks.onRiskInitiativeEdited(editedRiskItem);
  hooks.onStateChange();
  if (dlg?.open) dlg.close();
}

/* ==========================================================================
   XLSX Export & Import
   ========================================================================== */
async function exportRiceToXlsx() {
  if (!items.length) return;
  const ranked = computeRankedItems(items);
  const matrix = [XLSX_HEADERS];
  ranked.forEach((it) => {
    const cDisp = it.confidence == null ? '—' : (scaleMode === 'classic' ? `${it.confidence}%` : String(it.confidence));
    const rDisp = it.reach == null ? '—' : String(it.reach);
    const iDisp = it.impact == null ? '—' : String(it.impact);
    const eDisp = it.effort == null ? '—' : String(it.effort);
    const expr = hasCompleteRice(it)
      ? `${rDisp}*${iDisp}*${cDisp}/${eDisp}=${formatScore(it.rice_score)}`
      : '—';
    matrix.push([
      formatRankDisplay(it),
      it.idea,
      it.responsible,
      it.deadline,
      it.resources,
      it.reachDesc || rDisp,
      it.impactDesc || iDisp,
      it.confidenceDesc || cDisp,
      it.effortDesc || eDisp,
      expr,
      it.comment,
      it.status
    ]);
  });

  const { buildXlsxBytes } = await import('./xlsx_export.js?v=3.9.0');
  const bytes = buildXlsxBytes(matrix, 'Приоритизация RICE');
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Приоритизация_RICE.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  hooks.toast('Экспортировано в Приоритизация_RICE.xlsx');
}

function parseRiceExpression(str) {
  const s = String(str ?? '').replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)(%?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return {
    reach: Number(m[1]),
    impact: Number(m[2]),
    confidence: Number(m[3]),
    isClassicPct: m[4] === '%',
    effort: Number(m[5])
  };
}

function dedupeKey(it) {
  const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${norm(it.idea)}||${norm(it.responsible)}||${norm(it.deadline)}`;
}

async function importRiceFromXlsx(file, mode = 'append') {
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    const { parseXlsxBuffer } = await import('./file_import.js?v=3.8.0');
    const rows = await parseXlsxBuffer(buffer);
    if (!Array.isArray(rows) || rows.length < 2) {
      hooks.toast('Файл не содержит строк с инициативами');
      return;
    }

    const header = rows[0].map((h) => String(h ?? '').trim().toLowerCase());
    const findCol = (patterns, fallbackIdx) => {
      const idx = header.findIndex((h) => patterns.some((p) => h.includes(p)));
      return idx >= 0 ? idx : fallbackIdx;
    };

    const cRank = findCol(['приоритет', '№', 'ранг'], 0);
    const cIdea = findCol(['идея', 'инициатив', 'idea'], 1);
    const cResp = findCol(['ответствен', 'owner'], 2);
    const cDate = findCol(['срок', 'deadline', 'дат', 'необходимо до'], 3);
    const cRes = findCol(['необходимые ресурсы', 'ресурс'], 4);
    const cReach = findCol(['reach', 'охват'], 5);
    const cImpact = findCol(['impact', 'эффект'], 6);
    const cConf = findCol(['confidence', 'риск', 'уверен'], 7);
    const cEffort = findCol(['effort', 'объем ресурсов', 'усил'], 8);
    const cScore = findCol(['rice', 'score'], 9);
    const cComm = findCol(['коммент', 'comment'], 10);
    const cSt = findCol(['статус', 'утвержд', 'approved'], 11);

    const parsed = [];
    let detectedClassic = false;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!Array.isArray(r)) continue;
      const idea = String(r[cIdea] ?? '').trim();
      if (!idea || idea === '…' || idea === '...') continue;

      const rankRaw = String(r[cRank] ?? '').trim();
      const isRiskRow = /-\s*[рp]$/i.test(rankRaw);

      const expr = parseRiceExpression(r[cScore]);
      if (expr?.isClassicPct || (expr && expr.reach > 10)) detectedClassic = true;

      const reachRaw = String(r[cReach] ?? '').trim();
      const impactRaw = String(r[cImpact] ?? '').trim();
      const confRaw = String(r[cConf] ?? '').trim();
      const effortRaw = String(r[cEffort] ?? '').trim();

      const numFrom = (txt, fb) => {
        const n = Number(String(txt).replace(',', '.'));
        return Number.isFinite(n) && n > 0 ? n : fb;
      };

      parsed.push(normalizeItem({
        id: nextId++,
        idea,
        responsible: String(r[cResp] ?? '').trim(),
        deadline: String(r[cDate] ?? '').trim().slice(0, 10),
        resources: String(r[cRes] ?? '').trim(),
        reach: expr ? expr.reach : parseOptionalMetric(reachRaw),
        reachDesc: parseOptionalMetric(reachRaw) !== null ? '' : (reachRaw === '—' ? '' : reachRaw),
        impact: expr ? expr.impact : parseOptionalMetric(impactRaw),
        impactDesc: parseOptionalMetric(impactRaw) !== null ? '' : (impactRaw === '—' ? '' : impactRaw),
        confidence: expr ? expr.confidence : parseOptionalMetric(confRaw),
        confidenceDesc: parseOptionalMetric(confRaw) !== null ? '' : (confRaw === '—' ? '' : confRaw),
        effort: expr ? expr.effort : parseOptionalMetric(effortRaw),
        effortDesc: parseOptionalMetric(effortRaw) !== null ? '' : (effortRaw === '—' ? '' : effortRaw),
        comment: String(r[cComm] ?? '').trim(),
        status: normalizeStatus(r[cSt]),
        isRisk: isRiskRow,
        isSample: false
      }, parsed.length));
    }

    if (!parsed.length) {
      hooks.toast('Не удалось найти заполненные инициативы в файле');
      return;
    }

    recordUndo(mode === 'overwrite' ? 'импорт (перезапись)' : 'импорт (добавление)');
    if (detectedClassic) scaleMode = 'classic';
    columnFilters = {};
    sourceFilter = 'all';

    if (mode === 'overwrite') {
      items = parsed;
      hooks.toast(`Список перезаписан: загружено ${parsed.length} ${pluralIdeas(parsed.length)}`);
    } else {
      const existingKeys = new Set(items.map(dedupeKey));
      let added = 0;
      let skipped = 0;
      parsed.forEach((it) => {
        const k = dedupeKey(it);
        if (existingKeys.has(k)) {
          skipped++;
        } else {
          existingKeys.add(k);
          items.push(it);
          added++;
        }
      });
      hooks.toast(`Добавлено: ${added}${skipped ? ` · пропущено дубликатов: ${skipped}` : ''}`);
    }

    saveToStorageIfNeeded();
    renderAll();
    hooks.onStateChange();
  } catch (err) {
    console.error('[RICE] XLSX import error:', err);
    hooks.toast(`Ошибка импорта .xlsx: ${err.message}`);
  }
}

function wireToolbarKeyboardFallback() {
  if ('focusGroup' in HTMLElement.prototype) return;
  const bar = document.querySelector('section[data-v="rice"] .rice-toolbar');
  if (!bar) return;
  const controls = [...bar.querySelectorAll('button, input')];
  if (!controls.length) return;
  controls.forEach((el, i) => { el.tabIndex = i === 0 ? 0 : -1; });
  bar.addEventListener('focusin', ({ target }) => {
    if (controls.includes(target)) {
      controls.forEach((el) => { el.tabIndex = el === target ? 0 : -1; });
    }
  });
  bar.addEventListener('keydown', (e) => {
    if (document.activeElement?.tagName === 'INPUT') return;
    const idx = controls.indexOf(document.activeElement);
    if (idx < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % controls.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + controls.length) % controls.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = controls.length - 1;
    if (next >= 0) {
      e.preventDefault();
      controls[next].focus();
    }
  });
}

/* ==========================================================================
   Init
   ========================================================================== */
export function initRiceTool(options = {}) {
  hooks = { ...hooks, ...options };
  loadInitialState();
  wireToolbarKeyboardFallback();

  const loadSampleWithConfirm = async () => {
    if (items.length > 0) {
      const ok = await hooks.confirmAction({
        title: 'Загрузить примеры инициатив и рисков?',
        description: `Текущий список (${items.length} шт.) будет заменён на демонстрационный набор (6 идей + 2 действия по рискам с меткой «-Р») в упрощённой шкале 1–3. Действие можно вернуть кнопкой «Назад».`,
        confirmLabel: 'Загрузить примеры',
        danger: true
      });
      if (!ok) return;
      recordUndo('загрузка примеров');
    }
    scaleMode = 'template';
    columnFilters = {};
    sourceFilter = 'all';
    items = createSampleInitiatives().map(normalizeItem);
    nextId = items.length + 1;
    saveToStorageIfNeeded();
    renderAll();
    hooks.onStateChange();
    hooks.toast('Загружены примеры инициатив и рисков');
  };

  const confirmAndClear = async () => {
    if (!items.length) return;
    const ok = await hooks.confirmAction({
      title: 'Очистить список приоритизации RICE?',
      description: persistEnabled
        ? `Все записи (${items.length} шт.) будут удалены из таблицы и из localStorage. Последнее состояние можно вернуть кнопкой «Назад».`
        : `Все записи (${items.length} шт.) будут удалены из таблицы в памяти (RAM). Последнее состояние можно вернуть кнопкой «Назад».`,
      confirmLabel: 'Очистить список',
      danger: true
    });
    if (!ok) return;
    clearRiceData({ trackUndo: true });
    hooks.toast('Список инициатив очищен');
  };

  document.getElementById('btn-rice-add')?.addEventListener('click', () => openDetailsModal(null));
  document.getElementById('btn-rice-undo')?.addEventListener('click', () => {
    if (undoSnap) performUndo();
  });
  document.getElementById('btn-rice-redo')?.addEventListener('click', () => {
    if (redoSnap) performRedo();
  });
  document.getElementById('btn-rice-sample')?.addEventListener('click', loadSampleWithConfirm);
  document.getElementById('btn-rice-clear')?.addEventListener('click', () => {
    if (document.getElementById('btn-rice-clear')?.getAttribute('aria-disabled') === 'true') return;
    confirmAndClear();
  });

  document.addEventListener('keydown', (e) => {
    if (!document.querySelector('[data-v="rice"]')?.classList.contains('on')) return;
    if (document.querySelector('dialog[open]')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (undoSnap) { e.preventDefault(); performUndo(); }
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      if (redoSnap) { e.preventDefault(); performRedo(); }
    }
  });

  const searchWrap = document.getElementById('rice-search-wrap');
  const searchBtn = document.getElementById('btn-rice-search-toggle');
  const searchInp = document.getElementById('rice-search');
  const setSearchOpen = (open) => {
    if (!searchInp) return;
    searchInp.hidden = !open;
    if (searchBtn) {
      searchBtn.hidden = open;
      searchBtn.setAttribute('aria-expanded', String(open));
    }
    searchWrap?.classList.toggle('is-open', open);
  };
  searchBtn?.addEventListener('click', () => {
    setSearchOpen(true);
    searchInp?.focus();
  });
  searchInp?.addEventListener('input', (e) => {
    searchQuery = e.target.value || '';
    renderAll();
  });
  searchInp?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchQuery) {
        searchQuery = '';
        searchInp.value = '';
        renderAll();
      }
      setSearchOpen(false);
      searchBtn?.focus();
    }
  });
  searchInp?.addEventListener('blur', () => {
    if (!searchInp.value.trim()) {
      setSearchOpen(false);
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!searchWrap?.classList.contains('is-open')) return;
    if (searchWrap.contains(e.target)) return;
    if (!searchInp?.value.trim()) {
      setSearchOpen(false);
    }
  });

  // Export dialog
  const expDlg = document.getElementById('rice-export-dlg');
  document.getElementById('btn-rice-export')?.addEventListener('click', () => {
    if (document.getElementById('btn-rice-export')?.getAttribute('aria-disabled') === 'true') return;
    expDlg?.showModal();
  });
  document.getElementById('rice-export-close')?.addEventListener('click', () => expDlg?.close());
  document.getElementById('rice-export-cancel')?.addEventListener('click', () => expDlg?.close());
  document.getElementById('rice-export-confirm')?.addEventListener('click', async () => {
    expDlg?.close();
    await exportRiceToXlsx();
  });

  // Import dialog
  const impDlg = document.getElementById('rice-import-dlg');
  const impFile = document.getElementById('rice-import-file');
  document.getElementById('btn-rice-import')?.addEventListener('click', () => impDlg?.showModal());
  document.getElementById('rice-import-close')?.addEventListener('click', () => impDlg?.close());
  document.getElementById('rice-import-cancel')?.addEventListener('click', () => impDlg?.close());
  document.getElementById('rice-import-pick')?.addEventListener('click', () => impFile?.click());
  impFile?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    const mode = document.querySelector('input[name="rice-import-mode"]:checked')?.value || 'append';
    impDlg?.close();
    if (file) await importRiceFromXlsx(file, mode);
    e.target.value = '';
  });

  // View toggles
  document.querySelectorAll('[data-rice-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.riceView === 'table') {
        showTable = !showTable;
      } else {
        showCharts = !showCharts;
      }
      syncToolbarControls();
      if (showCharts && btn.dataset.riceView === 'charts') {
        rerenderRiceChart();
      }
    });
  });

  // Scale & storage toggles
  document.querySelectorAll('[data-rice-scale]').forEach((btn) => {
    btn.addEventListener('click', () => convertScale(btn.dataset.riceScale));
  });

  document.querySelectorAll('[data-rice-storage]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const toDisk = btn.dataset.riceStorage === 'localstorage';
      if (toDisk === persistEnabled) return;
      const ok = await hooks.confirmAction({
        title: toDisk ? 'Сохранять инициативы RICE в localStorage?' : 'Перевести RICE в память сессии (RAM)?',
        description: toDisk
          ? 'Список инициатив будет сохраняться в localStorage браузера и переживёт перезагрузку страницы.'
          : 'Сохранённые инициативы будут удалены из localStorage и останутся только в RAM до закрытия вкладки.',
        confirmLabel: toDisk ? 'Включить localStorage' : 'Перевести в RAM'
      });
      if (!ok) return;
      setRicePersistence(toDisk);
      hooks.toast(toDisk ? 'Приоритизация (RICE): сохранение на диске (localStorage)' : 'Приоритизация (RICE): режим сессии (RAM)');
    });
  });

  // Datepicker events
  document.getElementById('rice-dp-prev')?.addEventListener('click', () => {
    dpViewMonth--;
    if (dpViewMonth < 0) { dpViewMonth = 11; dpViewYear--; }
    renderDatepickerCalendar(dpCurrentIso);
  });
  document.getElementById('rice-dp-next')?.addEventListener('click', () => {
    dpViewMonth++;
    if (dpViewMonth > 11) { dpViewMonth = 0; dpViewYear++; }
    renderDatepickerCalendar(dpCurrentIso);
  });
  document.getElementById('rice-dp-days')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dp-iso]');
    if (btn) applyDateSelection(btn.dataset.dpIso);
  });
  document.querySelectorAll('[data-dp-quick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.dpQuick;
      const now = new Date();
      if (q === 'clear') applyDateSelection('');
      else if (q === 'today') applyDateSelection(toIsoDate(now));
      else if (q === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        applyDateSelection(toIsoDate(d));
      } else if (q === 'quarter') {
        const qEndMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
        const d = new Date(now.getFullYear(), qEndMonth, 0);
        applyDateSelection(toIsoDate(d));
      }
    });
  });

  // Table header click (Excel menu) & hover/focus (tooltip)
  const table = document.getElementById('rice-table');
  table?.querySelector('thead')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rice-col]');
    if (!btn) return;
    openColumnMenu(btn.dataset.riceCol, btn);
  });

  table?.addEventListener('pointerover', (e) => {
    const thBtn = e.target.closest('[data-rice-col]');
    if (thBtn) {
      const d = getHeaderDescriptions()[thBtn.dataset.riceCol];
      if (d) showHoverTip(thBtn, d.title, d.body);
      return;
    }
    const cell = e.target.closest('[data-tip-cell]');
    if (cell) {
      const info = getCellTooltipContent(cell);
      if (info) showHoverTip(cell, info.title, info.body);
    }
  });

  table?.addEventListener('pointerout', (e) => {
    const from = e.target.closest('[data-rice-col], [data-tip-cell]');
    if (!from) return;
    if (!from.contains(e.relatedTarget)) hideHoverTip();
  });

  table?.addEventListener('pointerleave', hideHoverTip);

  table?.addEventListener('focusin', (e) => {
    const thBtn = e.target.closest('[data-rice-col]');
    if (thBtn && thBtn.matches(':focus-visible')) {
      const d = getHeaderDescriptions()[thBtn.dataset.riceCol];
      if (d) showHoverTip(thBtn, d.title, d.body);
    }
  });
  table?.addEventListener('focusout', hideHoverTip);

  // Excel column menu controls
  const colMenu = document.getElementById('rice-col-menu');
  document.getElementById('rice-cm-close')?.addEventListener('click', closeColumnMenu);

  // Ideas / Risks quick filter buttons inside № column menu (Item 7)
  document.getElementById('rice-cm-source')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cm-src]');
    if (!btn) return;
    const nextSrc = btn.dataset.cmSrc || 'all';
    recordUndo('фильтр идей/рисков');
    sourceFilter = nextSrc === sourceFilter && nextSrc !== 'all' ? 'all' : nextSrc;
    delete columnFilters.rank;
    syncSourceFilterButtons();

    // Refresh checkboxes list inside open № menu to match selected source type
    const rankedAll = computeRankedItems(items).filter((it) => {
      if (sourceFilter === 'ideas' && it.isRisk) return false;
      if (sourceFilter === 'risks' && !it.isRisk) return false;
      return true;
    });
    const vals = [...new Set(rankedAll.map((it) => colDisplayValue(it, 'rank')))].sort((a, b) =>
      COLLATOR.compare(a, b)
    );
    activeMenuTotalUnique = vals.length;
    const listEl = document.getElementById('rice-cm-list');
    const allCb = document.getElementById('rice-cm-all');
    if (listEl) {
      const frag = document.createDocumentFragment();
      vals.forEach((val) => {
        const lbl = document.createElement('label');
        lbl.className = 'rice-cm-opt';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = val;
        cb.checked = true;
        const sp = document.createElement('span');
        sp.textContent = val;
        lbl.append(cb, sp);
        frag.append(lbl);
      });
      listEl.replaceChildren(frag);
      if (allCb) allCb.checked = vals.length > 0;
    }

    renderAll();
  });

  colMenu?.querySelectorAll('[data-cm-sort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!activeMenuCol) return;
      const dir = btn.dataset.cmSort;
      const alreadyActive = Boolean(sortState && sortState.col === activeMenuCol && sortState.dir === dir);
      recordUndo(alreadyActive ? 'отключение сортировки' : 'изменение сортировки');
      if (alreadyActive) {
        const currentVisual = getFilteredAndSorted(computeRankedItems(items));
        const visualIds = new Set(currentVisual.map((x) => x.id));
        const byId = new Map(items.map((x) => [x.id, x]));
        items = [
          ...currentVisual.map((x) => byId.get(x.id)).filter(Boolean),
          ...items.filter((x) => !visualIds.has(x.id))
        ];
        sortState = null;
        hooks.toast('Сортировка отключена — строки можно перетаскивать за №');
      } else {
        sortState = { col: activeMenuCol, dir };
      }
      closeColumnMenu();
      renderAll({ animate: true });
    });
  });

  document.getElementById('rice-cm-all')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('#rice-cm-list input[type="checkbox"]').forEach((cb) => {
      cb.checked = checked;
    });
  });

  document.getElementById('rice-cm-apply')?.addEventListener('click', () => {
    if (!activeMenuCol) return;
    const cbs = [...document.querySelectorAll('#rice-cm-list input[type="checkbox"]')];
    const checked = cbs.filter((c) => c.checked).map((c) => c.value);
    const searchVal = document.getElementById('rice-cm-search')?.value?.trim() || '';

    recordUndo('изменение фильтра');
    if (checked.length === 0) {
      delete columnFilters[activeMenuCol];
    } else if (!searchVal && checked.length >= activeMenuTotalUnique) {
      delete columnFilters[activeMenuCol];
    } else {
      columnFilters[activeMenuCol] = new Set(checked);
    }
    closeColumnMenu();
    renderAll();
  });

  document.getElementById('rice-cm-reset')?.addEventListener('click', () => {
    if (activeMenuCol) {
      recordUndo('сброс фильтра');
      delete columnFilters[activeMenuCol];
      if (activeMenuCol === 'rank') {
        sourceFilter = 'all';
        syncSourceFilterButtons();
      }
    }
    closeColumnMenu();
    renderAll();
  });

  // Table body edits, datepicker trigger, details, confirmed delete
  const tbody = document.getElementById('rice-tbody');
  tbody?.addEventListener('change', (e) => {
    const customInp = e.target.closest('[data-rice-custom-status]');
    if (customInp) {
      const id = Number(customInp.dataset.riceCustomStatus);
      const it = items.find((x) => x.id === id);
      if (it) {
        recordUndo('изменение статуса');
        const v = customInp.value.trim();
        it.status = v || 'Черновик';
        it.isSample = false;
        saveToStorageIfNeeded();
        renderAll();
        if (it.isRisk) hooks.onRiskInitiativeEdited({ ...it });
        hooks.onStateChange();
      }
      return;
    }

    const target = e.target.closest('[data-rice-edit]');
    if (!target) return;
    const id = Number(target.dataset.id);
    const field = target.dataset.riceEdit;
    const it = items.find((x) => x.id === id);
    if (!it) return;

    if (field === 'status' && target.value === '__custom__') {
      const cust = target.parentElement?.querySelector('[data-rice-custom-status]');
      if (cust) {
        cust.hidden = false;
        cust.value = PRESET_STATUSES.includes(it.status) ? '' : it.status;
        cust.focus();
      }
      return;
    }

    recordUndo(`изменение поля «${field}»`);
    if (['reach', 'impact', 'confidence', 'effort'].includes(field)) {
      it[field] = parseOptionalMetric(target.value);
    } else {
      it[field] = target.value;
    }
    it.isSample = false;
    saveToStorageIfNeeded();
    renderAll({ animate: true, movedId: id });
    if (it.isRisk) hooks.onRiskInitiativeEdited({ ...it });
    hooks.onStateChange();
  });

  // Manual drag-and-drop by № cell when sorting is OFF
  let dragRowId = null;
  tbody?.addEventListener('pointerdown', (e) => {
    const tr = e.target.closest('tr[data-rice-row]');
    if (!tr) return;
    tr.draggable = Boolean(sortState === null && e.target.closest('.rice-rank-cell'));
  });
  tbody?.addEventListener('dragstart', (e) => {
    const tr = e.target.closest('tr[data-rice-row]');
    if (!tr || sortState !== null || !tr.draggable) {
      e.preventDefault();
      return;
    }
    dragRowId = Number(tr.dataset.riceRow);
    tr.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragRowId));
  });
  tbody?.addEventListener('dragover', (e) => {
    if (dragRowId == null || sortState !== null) return;
    const tr = e.target.closest('tr[data-rice-row]');
    if (!tr || Number(tr.dataset.riceRow) === dragRowId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = tr.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    tbody.querySelectorAll('.is-drop-before, .is-drop-after').forEach((r) => {
      if (r !== tr) r.classList.remove('is-drop-before', 'is-drop-after');
    });
    tr.classList.toggle('is-drop-before', !after);
    tr.classList.toggle('is-drop-after', after);
  });
  tbody?.addEventListener('dragleave', (e) => {
    const tr = e.target.closest('tr[data-rice-row]');
    if (tr && !tr.contains(e.relatedTarget)) {
      tr.classList.remove('is-drop-before', 'is-drop-after');
    }
  });
  tbody?.addEventListener('drop', (e) => {
    if (dragRowId == null || sortState !== null) return;
    e.preventDefault();
    const targetTr = e.target.closest('tr[data-rice-row]');
    const targetId = targetTr ? Number(targetTr.dataset.riceRow) : null;
    const placeAfter = targetTr?.classList.contains('is-drop-after');
    tbody.querySelectorAll('.is-dragging, .is-drop-before, .is-drop-after').forEach((r) => {
      r.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
    });
    if (targetId == null || targetId === dragRowId) {
      dragRowId = null;
      return;
    }
    const fromIdx = items.findIndex((x) => x.id === dragRowId);
    const toIdxOrig = items.findIndex((x) => x.id === targetId);
    if (fromIdx >= 0 && toIdxOrig >= 0) {
      recordUndo('ручная перестановка строк');
      const [moved] = items.splice(fromIdx, 1);
      let insertIdx = items.findIndex((x) => x.id === targetId);
      if (placeAfter) insertIdx += 1;
      items.splice(insertIdx, 0, moved);
      saveToStorageIfNeeded();
      renderAll({ animate: true, movedId: moved.id });
      hooks.onStateChange();
    }
    dragRowId = null;
  });
  tbody?.addEventListener('dragend', () => {
    dragRowId = null;
    tbody.querySelectorAll('tr[data-rice-row]').forEach((r) => {
      r.draggable = false;
      r.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
    });
  });

  tbody?.addEventListener('click', async (e) => {
    const dateBtn = e.target.closest('[data-rice-date-btn]');
    if (dateBtn) {
      const id = Number(dateBtn.dataset.riceDateBtn);
      const it = items.find((x) => x.id === id);
      if (it) openDatepicker({ type: 'row', id }, dateBtn, it.deadline);
      return;
    }
    const detBtn = e.target.closest('[data-rice-details]');
    if (detBtn) {
      openDetailsModal(Number(detBtn.dataset.riceDetails));
      return;
    }
    const delBtn = e.target.closest('[data-rice-del]');
    if (delBtn) {
      const id = Number(delBtn.dataset.riceDel);
      const it = items.find((x) => x.id === id);
      if (!it) return;
      const shortIdea = it.idea ? `«${it.idea.slice(0, 70)}${it.idea.length > 70 ? '…' : ''}»` : 'без названия';
      const ok = await hooks.confirmAction({
        title: it.isRisk ? 'Убрать действие по риску из RICE?' : 'Удалить инициативу?',
        description: it.isRisk
          ? `Действие ${shortIdea} будет убрано из таблицы RICE (сам риск останется на вкладках «Фреймворк» и «Карта рисков»).`
          : `Инициатива ${shortIdea} будет удалена из таблицы и графиков. Последнее удаление можно отменить кнопкой «Назад».`,
        confirmLabel: 'Удалить',
        danger: true
      });
      if (!ok) return;
      recordUndo('удаление записи');
      items = items.filter((x) => x.id !== id);
      saveToStorageIfNeeded();
      renderAll();
      hooks.onStateChange();
      hooks.toast(it.isRisk ? 'Действие по риску убрано из RICE' : 'Инициатива удалена');
    }
  });

  document.getElementById('rice-empty')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-rice-empty-add]')) openDetailsModal(null);
    if (e.target.closest('[data-rice-empty-sample]')) loadSampleWithConfirm();
    if (e.target.closest('[data-rice-empty-reset]')) {
      columnFilters = {};
      sourceFilter = 'all';
      searchQuery = '';
      if (searchInp) searchInp.value = '';
      renderAll();
    }
  });

  // Detail modal events
  const dlg = document.getElementById('rice-detail-dlg');
  document.getElementById('rice-detail-form')?.addEventListener('submit', saveDetailsModal);
  document.getElementById('rice-detail-close')?.addEventListener('click', () => dlg?.close());
  document.getElementById('rice-detail-cancel')?.addEventListener('click', () => dlg?.close());
  dlg?.addEventListener('close', () => { dlg.returnValue = ''; });
  document.getElementById('rice-d-deadline-btn')?.addEventListener('click', (e) => {
    const cur = document.getElementById('rice-d-deadline')?.value || '';
    openDatepicker({ type: 'modal' }, e.currentTarget, cur);
  });
  document.getElementById('rice-d-status')?.addEventListener('change', (e) => {
    const cust = document.getElementById('rice-d-status-custom');
    if (!cust) return;
    const isCustom = e.target.value === '__custom__';
    cust.hidden = !isCustom;
    if (isCustom) cust.focus();
  });
  ['rice-d-reach-sel', 'rice-d-reach-num', 'rice-d-impact-sel', 'rice-d-conf-sel', 'rice-d-effort-sel', 'rice-d-effort-num']
    .forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updateDetailScorePreview);
      document.getElementById(id)?.addEventListener('change', updateDetailScorePreview);
    });

  if (typeof ResizeObserver !== 'undefined') {
    let lastBarW = 0;
    let lastMatW = 0;
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const barEl = document.getElementById('rice-chart-bar');
        const matEl = document.getElementById('rice-chart-matrix');
        const bw = barEl?.clientWidth || 0;
        const mw = matEl?.clientWidth || 0;
        if ((bw > 0 && bw !== lastBarW) || (mw > 0 && mw !== lastMatW)) {
          lastBarW = bw;
          lastMatW = mw;
          rerenderRiceChart();
        }
      });
    });
    const barHost = document.getElementById('rice-chart-bar');
    const matHost = document.getElementById('rice-chart-matrix');
    if (barHost) ro.observe(barHost);
    if (matHost) ro.observe(matHost);
  }

  renderAll();
  hooks.onStateChange();
}
