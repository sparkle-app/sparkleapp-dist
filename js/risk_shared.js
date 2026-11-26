/**
 * Unified Risk Workspace Store, Modals & Hover Popover (v3.48.0)
 * Single source of truth for #risk-framework (PESTEL + Horizon Scanning),
 * #risk-map (3x3 Wasm Matrix), and bidirectional sync with #rice Prioritization.
 * Zero innerHTML: 100% pure DOM APIs.
 */

const RK_PERSIST_KEY = 'sparkle_rk_persist_v1';
const LEGACY_RM_PERSIST_KEY = 'sparkle_rm_persist';
const LEGACY_RF_PERSIST_KEY = 'sparkle_rf_persist';
const RK_IDB_NAME = 'sparkle_unified_risks_db';
const RK_IDB_STORE = 'state';
const MAX_HISTORY = 25;

export const COLLATOR = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export const PESTEL_ORDER = ['P', 'E', 'S', 'T', 'Env', 'L'];

export const PESTEL_META = {
  P: { code: 'P', letter: 'P', short: 'P', label: 'Политика', full: 'P · Политика', hint: 'Регулирование торговли, тарифы, ВЭД' },
  E: { code: 'E', letter: 'E', short: 'E', label: 'Экономика', full: 'E · Экономика', hint: 'Ставка, инфляция, курс, оборотка' },
  S: { code: 'S', letter: 'S', short: 'S', label: 'Социум', full: 'S · Социум', hint: 'Трафик, доходы, кадры, привычки' },
  T: { code: 'T', letter: 'T', short: 'T', label: 'Технологии', full: 'T · Технологии', hint: 'Автоматизация, ИИ, ИТ-контур' },
  Env: { code: 'Env', letter: 'E', short: 'Env', label: 'Экология', full: 'E · Экология', hint: 'Упаковка, РОП, экосбор, климат' },
  L: { code: 'L', letter: 'L', short: 'L', label: 'Право', full: 'L · Право', hint: 'Маркировка, 152-ФЗ, налоги, штрафы' }
};

export const CURVE_ORDER = ['black_swan', 'trend', 'event', 'news', 'weak'];

export const CURVE_META = {
  black_swan: {
    label: 'Чёрный лебедь',
    short: 'Шок',
    pill: 'Чёрный лебедь · шок',
    dotCls: 'is-swan',
    order: 1,
    desc: 'Редкое внезапное событие с высокой силой удара и минимальным временем на реакцию.'
  },
  trend: {
    label: 'Тренд',
    short: 'Тренд',
    pill: 'Тренд · 6+ лет',
    dotCls: 'is-trend',
    order: 2,
    desc: 'Устойчивый долгосрочный сдвиг рынка, технологий или экономики (горизонт 6+ лет).'
  },
  event: {
    label: 'Событие',
    short: 'Событие',
    pill: 'Событие · ~4 года',
    dotCls: 'is-event',
    order: 3,
    desc: 'Предсказуемое системное изменение: реформы, законы, перестройка логистики (~4 года).'
  },
  news: {
    label: 'Инфоповод',
    short: 'Инфо',
    pill: 'Инфоповод · 6–12 мес',
    dotCls: 'is-news',
    order: 4,
    desc: 'Заметные рыночные новости и краткосрочные колебания спроса (6–12 месяцев).'
  },
  weak: {
    label: 'Слабый сигнал',
    short: 'Сигнал',
    pill: 'Слабый сигнал · 1–3 г.',
    dotCls: 'is-weak',
    order: 5,
    desc: 'Ранний предвестник будущих изменений, пока незаметный большинству рынка (1–3 года).'
  }
};

export const PROB_LABELS = ['Вероятно', 'Возможно', 'Маловероятно'];
export const IMP_LABELS = ['Небольшое', 'Умеренное', 'Существенное'];
export const STRAT_LABELS = ['Снижение', 'Перенос', 'Уклонение', 'Принятие'];
export const STRAT_SHORT = ['Сниж.', 'Перен.', 'Уклон.', 'Принят.'];
export const PRESET_STATUSES = ['Черновик', 'На рассмотрении', 'Утверждено', 'Отклонено'];

export const DEFAULT_SCALES = {
  period: '2025–2028 гг.',
  prob: ['> 70%', '30–70%', '< 30%'],
  imp: ['< 1 млн ₽', '1–5 млн ₽', '> 5 млн ₽']
};

export const SEV_META = {
  2: { cls: 'is-high', text: '••• Высокий', short: '••• Выс.' },
  1: { cls: 'is-med', text: '•• Средний', short: '•• Ср.' },
  0: { cls: 'is-low', text: '• Низкий', short: '• Низ.' }
};

export const DEMO_UNIFIED_RISKS = [
  {
    id: 1,
    title: 'Срыв поставок ключевого сырья и рост плеча логистики',
    description: 'Перестройка трансграничных расчётов и логистических коридоров увеличивает срок доставки и волатильность закупочных цен по импортным SKU.',
    pestel: 'P',
    curve: 'event',
    r: 0,
    c: 2,
    s: 0,
    action: 'Квалифицировать 2 резервных поставщика и сформировать буфер запаса 21 день по SKU группы A',
    owner: 'Директор по закупкам',
    deadline: '2026-06-15',
    status: 'Утверждено',
    resources: 'Отдел ВЭД, оборотный лимит под страховой запас на центральном РЦ',
    reach: 3,
    reachDesc: 'Весь импортный ассортимент группы A (42% выручки)',
    riceImpact: 3,
    impactDesc: 'Защита непрерывности поставок и сохранение валовой маржи на пике спроса',
    confidence: 3,
    confidenceDesc: 'Предварительные оферты от альтернативных поставщиков уже получены',
    effort: 2,
    effortDesc: '1.5 месяца на аудит партий и перенастройку автозаказа'
  },
  {
    id: 2,
    title: 'Высокая стоимость заёмного капитала и заморозка оборотки',
    description: 'Дорогие кредитные линии делают хранение неликвида критичным: замороженный сток обходится бизнесу свыше 20% годовых.',
    pestel: 'E',
    curve: 'event',
    r: 0,
    c: 2,
    s: 2,
    action: 'Вывести убыточные хвостовые SKU и ввести жёсткий лимит оборачиваемости склада до 45 дней',
    owner: 'Финансовый директор',
    deadline: '2026-05-30',
    status: 'Утверждено',
    resources: 'Финансовый контроллинг, категорийные менеджеры, ERP-отчётность',
    reach: 3,
    reachDesc: 'Все товарные категории с оборачиваемостью свыше 45 дней',
    impactDesc: 'Высвобождение до 35 млн ₽ оборотного капитала и снижение процентных расходов',
    riceImpact: 3,
    confidence: 3,
    confidenceDesc: 'Данные факторного анализа VMPC-INO полностью подтверждают расчёт',
    effort: 1,
    effortDesc: '3 недели на распродажу остатков и блокировку повторных заказов'
  },
  {
    id: 3,
    title: 'Опережающий рост закупочных цен и сжатие валовой маржи',
    description: 'Индексация прайсов поставщиками опережает пересмотр розничных цен, размывая маржинальность регулярной матрицы.',
    pestel: 'E',
    curve: 'trend',
    r: 0,
    c: 1,
    s: 0,
    action: 'Настроить ежемесячный пересмотр цен по неэластичным SKU (-1 < E < 0) и формульную индексацию контрактов',
    owner: 'Коммерческий директор',
    deadline: '2026-07-10',
    status: 'На рассмотрении',
    resources: 'Команда RGM-аналитики и коммерческий департамент',
    reach: 2,
    reachDesc: 'Ключевые категории регулярного спроса',
    riceImpact: 2,
    impactDesc: 'Удержание целевой маржинальности +0.8 п.п. без потери трафика',
    confidence: 3,
    confidenceDesc: 'Эластичность рассчитана на исторических данных чеков',
    effort: 1,
    effortDesc: 'Регламент ежемесячного ценового комитета'
  },
  {
    id: 4,
    title: 'Дефицит линейного персонала (курьеры, комплектовщики)',
    description: 'Структурная нехватка кадров на последней миле и РЦ ведёт к росту стоимости смены и срывам SLA в пиковые часы.',
    pestel: 'S',
    curve: 'trend',
    r: 0,
    c: 2,
    s: 0,
    action: 'Запустить гибкую тарификацию слотов доставки и гибридный пул самозанятых курьеров на пиковые часы',
    owner: 'Операционный директор',
    deadline: '2026-08-20',
    status: 'На рассмотрении',
    resources: 'HR-операции, диспетчеризация последней мили, ИТ-модуль слотов',
    reach: 3,
    reachDesc: 'Все дарксторы и зоны экспресс-доставки',
    riceImpact: 3,
    impactDesc: 'Снижение доли опозданий в пик на 40% и стабилизация CPoD',
    confidence: 2,
    confidenceDesc: 'Требуется пилот на 2 кластерах для калибровки ставок',
    effort: 2,
    effortDesc: '2 месяца на доработку биллинга смен и онбординг'
  },
  {
    id: 5,
    title: 'Смещение спроса в дискаунтеры, СТМ и мелкую фасовку',
    description: 'Рационализация покупок снижает конверсию в среднем ценовом сегменте и усиливает промо-давление.',
    pestel: 'S',
    curve: 'news',
    r: 1,
    c: 1,
    s: 0,
    action: 'Ввести линейку первой цены (СТМ) и компактные упаковки в топ-15 трафикообразующих SKU',
    owner: 'Директор по маркетингу и СТМ',
    deadline: '2026-09-15',
    status: 'На рассмотрении',
    resources: 'Команда СТМ, дизайн упаковки, контрактное производство',
    reach: 2,
    reachDesc: 'Чувствительный к цене сегмент покупателей (~35% чеков)',
    riceImpact: 2,
    impactDesc: 'Удержание частоты покупок и защита доли кошелька',
    confidence: 2,
    confidenceDesc: 'Зависит от сроков запуска фасовки у подрядчиков',
    effort: 2,
    effortDesc: '3 месяца от тендера до постановки на полку'
  },
  {
    id: 6,
    title: 'Отставание в автоматизации ценообразования и складской аналитики',
    description: 'Конкуренты внедряют динамический прайсинг и автопополнение; ручное управление ведёт к OOS и потерям маржи.',
    pestel: 'T',
    curve: 'trend',
    r: 1,
    c: 1,
    s: 0,
    action: 'Автоматизировать расчёт промо-эластичности и триггеров переоценки в едином контуре аналитики',
    owner: 'Руководитель аналитики',
    deadline: '2026-07-31',
    status: 'Утверждено',
    resources: 'Бизнес-аналитик, интеграция выгрузок ERP/WMS',
    reach: 2,
    reachDesc: 'Все категорийные менеджеры и аналитики ценообразования',
    riceImpact: 2,
    impactDesc: 'Сокращение цикла реакции на просадку маржи с 2 недель до 1 дня',
    confidence: 3,
    confidenceDesc: 'Методология и расчётное ядро уже протестированы',
    effort: 1,
    effortDesc: '4 недели настройки регулярных пайплайнов'
  },
  {
    id: 7,
    title: 'Массовый сбой платёжных шлюзов, ЭДО или облачного контура',
    description: 'Внезапная недоступность внешнего провайдера способна остановить приём онлайн-заказов и отгрузку со складов.',
    pestel: 'T',
    curve: 'black_swan',
    r: 2,
    c: 2,
    s: 1,
    action: 'Подключить резервный эквайринг с автопереключением и офлайн-очередь накладных на складах',
    owner: 'Технический директор (CTO)',
    deadline: '2026-06-30',
    status: 'На рассмотрении',
    resources: 'DevOps, платёжная команда, резервный шлюз',
    reach: 3,
    reachDesc: '100% онлайн-оплат и складских отгрузок',
    riceImpact: 3,
    impactDesc: 'Исключение прямых потерь выручки при падении основного провайдера',
    confidence: 3,
    confidenceDesc: 'Стандартная схема отказоустойчивости с понятной архитектурой',
    effort: 2,
    effortDesc: '6 недель интеграции и нагрузочных учений'
  },
  {
    id: 8,
    title: 'Расширение обязательной маркировки («Честный ЗНАК») и риск блокировки отгрузок',
    description: 'Расхождения кодов маркировки в УПД при поштучной приёмке ведут к простоям ворот РЦ, штрафам и остановке продаж.',
    pestel: 'L',
    curve: 'trend',
    r: 1,
    c: 1,
    s: 1,
    action: 'Внедрить автосверку кодов маркировки в УПД до приёмки на РЦ и переложить штрафы в SLA 3PL-оператора',
    owner: 'Руководитель логистики',
    deadline: '2026-06-01',
    status: 'Утверждено',
    resources: 'Складской ИТ-контур, ТСД-сканеры, юристы по договорам 3PL',
    reach: 2,
    reachDesc: 'Все маркируемые товарные группы на РЦ и в рознице',
    riceImpact: 2,
    impactDesc: 'Снижение возвратов приёмки и обнуление регуляторных штрафов',
    confidence: 3,
    confidenceDesc: 'Пилотная валидация УПД уже работает на 1 складе',
    effort: 1,
    effortDesc: '3 недели тиражирования и допсоглашения с 3PL'
  },
  {
    id: 9,
    title: 'Рост ставок экосбора и ужесточение нормативов утилизации тары (РОП)',
    description: 'Повышение коэффициентов экосбора увеличивает себестоимость неперерабатываемой пластиковой и композитной упаковки.',
    pestel: 'Env',
    curve: 'weak',
    r: 2,
    c: 0,
    s: 3,
    action: 'Провести аудит спецификаций упаковки СТМ и подготовить переход на мономатериал с 2027 года',
    owner: 'Менеджер по качеству и закупкам тары',
    deadline: '2026-11-30',
    status: 'На рассмотрении',
    resources: 'Технолог упаковки, запрос котировок у производителей тары',
    reach: 1,
    reachDesc: 'Линейка СТМ в композитной упаковке (~12% SKU)',
    riceImpact: 1,
    impactDesc: 'Сдерживание роста себестоимости упаковки на горизонте 2027 г.',
    confidence: 2,
    confidenceDesc: 'Финальные подзаконные коэффициенты ещё уточняются',
    effort: 1,
    effortDesc: 'Плановый аудит без капитальных затрат в текущем году'
  }
];

export function computeScoreFallback(r, c) {
  if (r == null || c == null) return { score: null, severity: null };
  const score = 2 - r + c;
  const severity = score < 2 ? 0 : (score === 2 ? 1 : 2);
  return { score, severity };
}

export function formatDateRu(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function formatDateShortRu(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export function normalizeDateInput(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ruMatch = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ruMatch) {
    const [, dd, mm, yyyy] = ruMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
}

export function normalizeStatus(raw) {
  const s = String(raw ?? '').trim();
  const low = s.toLowerCase();
  if (!s || low === 'draft' || low === 'черновик') return 'Черновик';
  if (low === 'pending' || low === 'review' || low === 'на рассмотрении') return 'На рассмотрении';
  if (low === 'yes' || low === 'да' || low === 'утверждено' || low === 'true' || low === '1') return 'Утверждено';
  if (low === 'no' || low === 'нет' || low === 'отклонено' || low === 'false' || low === '0') return 'Отклонено';
  return s;
}

export function parsePestelCode(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === '—' || s === '-') return null;
  if (s.startsWith('экол') || s === 'env' || s.includes('environment')) return 'Env';
  if (s.startsWith('пол') || s === 'p' || s.startsWith('p ') || s.startsWith('p·')) return 'P';
  if (s.startsWith('экон') || s === 'e' || s.startsWith('e ') || s.startsWith('e·')) return 'E';
  if (s.startsWith('соц') || s === 's' || s.startsWith('s ')) return 'S';
  if (s.startsWith('тех') || s === 't' || s.startsWith('t ')) return 'T';
  if (s.startsWith('прав') || s.startsWith('закон') || s === 'l' || s.startsWith('l ')) return 'L';
  return null;
}

export function parseCurveCode(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === '—' || s === '-') return null;
  if (s.includes('лебед') || s.includes('шок') || s.includes('swan')) return 'black_swan';
  if (s.includes('событ') || s.includes('event') || s.includes('4 год')) return 'event';
  if (s.includes('слаб') || s.includes('ранн') || s.includes('сигнал') || s.includes('weak')) return 'weak';
  if (s.includes('инфо') || s.includes('новост') || s.includes('news') || s.includes('6–12') || s.includes('6-12')) return 'news';
  if (s.includes('тренд') || s.includes('trend') || s.includes('6+')) return 'trend';
  return null;
}

export function parseProbIndex(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === '—' || s === '-') return null;
  if (s === '0' || s.startsWith('вероятн') || s.includes('высок') || s.includes('high')) return 0;
  if (s === '1' || s.startsWith('возможн') || s.includes('средн') || s.includes('med')) return 1;
  if (s === '2' || s.startsWith('мало') || s.includes('низк') || s.includes('low')) return 2;
  return null;
}

export function parseImpIndex(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === '—' || s === '-') return null;
  if (s === '0' || s.startsWith('небольш') || s.includes('низк') || s.includes('мал')) return 0;
  if (s === '1' || s.startsWith('умерен') || s.includes('средн') || s.includes('med')) return 1;
  if (s === '2' || s.startsWith('существ') || s.includes('высок') || s.includes('крит')) return 2;
  return null;
}

export function parseStratIndex(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === '—' || s === '-') return null;
  if (s === '0' || s.includes('сниж') || s.includes('mitig')) return 0;
  if (s === '1' || s.includes('перен') || s.includes('страх') || s.includes('transfer')) return 1;
  if (s === '2' || s.includes('уклон') || s.includes('отказ') || s.includes('avoid')) return 2;
  if (s === '3' || s.includes('принят') || s.includes('accept')) return 3;
  return null;
}

function parseOptionalIndex(val, allowed) {
  if (val === null || val === undefined || val === '' || val === '—') return null;
  const n = Number(val);
  return Number.isInteger(n) && allowed.includes(n) ? n : null;
}

function parseOptionalPosNum(val) {
  if (val === null || val === undefined || val === '' || val === '—') return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeRisk(raw, fallbackId = 1, _scaleMode = 'template') {
  const r = parseOptionalIndex(raw?.r, [0, 1, 2]);
  const c = parseOptionalIndex(raw?.c, [0, 1, 2]);
  const s = parseOptionalIndex(raw?.s, [0, 1, 2, 3]);

  const pestel = (raw?.pestel === null || raw?.pestel === '' || raw?.pestel === '—')
    ? null
    : (PESTEL_META[raw?.pestel] ? raw.pestel : parsePestelCode(raw?.pestel));
  const curve = (raw?.curve === null || raw?.curve === '' || raw?.curve === '—')
    ? null
    : (CURVE_META[raw?.curve] ? raw.curve : parseCurveCode(raw?.curve));

  const parsedId = Number(raw?.id);
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.trunc(parsedId) : fallbackId;

  return {
    id,
    title: String(raw?.title ?? raw?.t ?? '').trim(),
    description: String(raw?.description ?? raw?.impact ?? '').trim(),
    pestel,
    curve,
    r,
    c,
    s,
    action: String(raw?.action ?? raw?.plan ?? '').trim(),
    owner: String(raw?.owner ?? raw?.responsible ?? '').trim(),
    deadline: normalizeDateInput(raw?.deadline),
    status: normalizeStatus(raw?.status),
    resources: String(raw?.resources ?? '').trim(),
    reach: parseOptionalPosNum(raw?.reach),
    reachDesc: String(raw?.reachDesc ?? '').trim(),
    riceImpact: parseOptionalPosNum(raw?.riceImpact),
    impactDesc: String(raw?.impactDesc ?? '').trim(),
    confidence: parseOptionalPosNum(raw?.confidence),
    confidenceDesc: String(raw?.confidenceDesc ?? '').trim(),
    effort: parseOptionalPosNum(raw?.effort),
    effortDesc: String(raw?.effortDesc ?? '').trim(),
    isAi: Boolean(raw?.isAi)
  };
}

function cloneRisks(arr) {
  return arr.map((x) => ({ ...x }));
}

function cloneScales(sc) {
  return {
    period: sc?.period || DEFAULT_SCALES.period,
    prob: [...(sc?.prob || DEFAULT_SCALES.prob)],
    imp: [...(sc?.imp || DEFAULT_SCALES.imp)]
  };
}

export function csvSafeCell(val) {
  let s = String(val ?? '').replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[;"]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function createSvgIcon(paths, size = 13) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const list = Array.isArray(paths) ? paths : [paths];
  list.forEach((d) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
  });
  return svg;
}

export function reorderDomNodes(container, orderedNodes) {
  const move = Object.hasOwn(Element.prototype, 'moveBefore')
    ? (node) => container.moveBefore(node, null)
    : (node) => container.append(node);
  for (const node of orderedNodes) move(node);
}

export function bindToolbarRovingTabindex(toolbar) {
  if (!toolbar || 'focusGroup' in HTMLElement.prototype) return;
  const getItems = () => [...toolbar.querySelectorAll('button:not([hidden]):not(:disabled), input:not([hidden]):not(:disabled)')];
  const sync = () => {
    const items = getItems();
    if (!items.length) return;
    if (!items.some((el) => el.tabIndex === 0)) {
      items.forEach((el, idx) => { el.tabIndex = idx === 0 ? 0 : -1; });
    }
  };
  sync();
  toolbar.addEventListener('focusin', ({ target }) => {
    const items = getItems();
    if (items.includes(target)) {
      items.forEach((el) => { el.tabIndex = el === target ? 0 : -1; });
    }
  });
  toolbar.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input')) return;
    const items = getItems();
    const idx = items.indexOf(document.activeElement);
    if (idx < 0) return;
    const rtl = getComputedStyle(toolbar).direction === 'rtl';
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + (rtl ? -1 : 1) + items.length) % items.length;
    else if (e.key === 'ArrowLeft') next = (idx + (rtl ? 1 : -1) + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      items[next].focus();
    }
  });
}

function openUnifiedIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен в этом браузере.'));
      return;
    }
    const req = indexedDB.open(RK_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RK_IDB_STORE)) {
        db.createObjectStore(RK_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Не удалось открыть IndexedDB.'));
  });
}

async function saveUnifiedIdb(record) {
  try {
    const db = await openUnifiedIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RK_IDB_STORE, 'readwrite');
      tx.objectStore(RK_IDB_STORE).put(record, 'current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[RiskWorkspace] IndexedDB save warning:', err);
  }
}

async function loadUnifiedIdb() {
  try {
    const db = await openUnifiedIdb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(RK_IDB_STORE, 'readonly');
      const req = tx.objectStore(RK_IDB_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

async function clearUnifiedIdb() {
  try {
    const db = await openUnifiedIdb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RK_IDB_STORE, 'readwrite');
      tx.objectStore(RK_IDB_STORE).delete('current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* ignore */ }
}

export function createRiskWorkspaceStore({
  runWasmRiskMatrix,
  toast,
  confirmDataAction,
  riceBridge,
  onAnyChange
}) {
  let persistDisk = false;
  try {
    persistDisk = localStorage.getItem(RK_PERSIST_KEY) === '1'
      || localStorage.getItem(LEGACY_RM_PERSIST_KEY) === '1'
      || localStorage.getItem(LEGACY_RF_PERSIST_KEY) === '1';
  } catch {
    persistDisk = false;
  }

  let risks = DEMO_UNIFIED_RISKS.map((r, i) => normalizeRisk(r, i + 1, 'template'));
  let scales = cloneScales(DEFAULT_SCALES);
  let isDemo = true;
  let nextId = 100;
  let undoStack = [];
  let redoStack = [];
  const aiCache = new Map();
  let lastAiRisks = [];
  const subscribers = new Set();

  // Strictly pointer-bound Hover Popover state (Item 10, 11, 12)
  let activeHoverCard = null;
  const hoverPopEl = document.getElementById('risk-hover-pop');

  function hideRiskHoverPop() {
    activeHoverCard = null;
    if (!hoverPopEl) return;
    try {
      if (hoverPopEl.matches(':popover-open')) hoverPopEl.hidePopover();
    } catch { /* ignore */ }
    hoverPopEl.classList.remove(':popover-open');
    hoverPopEl.hidden = true;
  }

  function buildHoverPopDom(risk) {
    if (!hoverPopEl) return;
    hoverPopEl.replaceChildren();

    const pMeta = risk.pestel ? PESTEL_META[risk.pestel] : null;
    const cMeta = risk.curve ? CURVE_META[risk.curve] : null;
    const inRice = Boolean(riceBridge?.hasRisk?.(risk.id));

    // Row 1: Badges row (.rhp-badges)
    const hd = document.createElement('div');
    hd.className = 'rhp-badges';

    if (risk.severity != null && SEV_META[risk.severity]) {
      const sev = SEV_META[risk.severity];
      const sevBadge = document.createElement('span');
      sevBadge.className = `rf-sev-badge ${sev.cls}`;
      sevBadge.textContent = `${sev.text} · ${risk.score}`;
      hd.append(sevBadge);
    } else {
      const unmBadge = document.createElement('span');
      unmBadge.className = 'rhp-pill is-unmapped';
      unmBadge.textContent = 'Без оценки';
      hd.append(unmBadge);
    }

    if (risk.isAi) {
      const aiB = document.createElement('span');
      aiB.className = 'rk-ai-badge';
      aiB.textContent = 'AI';
      hd.append(aiB);
    }

    if (pMeta) {
      const pestelBadge = document.createElement('span');
      pestelBadge.className = 'rhp-pill';
      pestelBadge.textContent = pMeta.full;
      hd.append(pestelBadge);
    }

    if (cMeta) {
      const curveBadge = document.createElement('span');
      curveBadge.className = 'rhp-pill';
      const dot = document.createElement('span');
      dot.className = `rf-cdot ${cMeta.dotCls}`;
      dot.setAttribute('aria-hidden', 'true');
      curveBadge.append(dot, document.createTextNode(cMeta.label));
      hd.append(curveBadge);
    }

    if (inRice) {
      const riceBadge = document.createElement('span');
      riceBadge.className = 'rhp-pill is-rice';
      riceBadge.textContent = '✓ В RICE';
      hd.append(riceBadge);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'rhp-title';
    titleEl.textContent = risk.title;

    hoverPopEl.append(hd, titleEl);

    if (risk.description) {
      const descEl = document.createElement('div');
      descEl.className = 'rhp-desc';
      descEl.textContent = risk.description;
      hoverPopEl.append(descEl);
    }

    const grid = document.createElement('div');
    grid.className = 'rhp-grid';

    const addRow = (label, value) => {
      const row = document.createElement('div');
      row.className = 'rhp-row';
      const k = document.createElement('span');
      k.className = 'rhp-k';
      k.textContent = label;
      const v = document.createElement('span');
      v.className = 'rhp-v';
      v.textContent = value;
      row.append(k, v);
      grid.append(row);
    };

    const coordText = (risk.r != null && risk.c != null)
      ? `${PROB_LABELS[risk.r]} × ${IMP_LABELS[risk.c]}`
      : 'Не оценено (—)';
    addRow('Вероятность × Влияние', coordText);
    addRow('Стратегия', risk.s != null ? (STRAT_LABELS[risk.s] || '—') : '—');
    if (risk.action) addRow('Решение / действие', risk.action);
    if (risk.owner) addRow('Ответственный', risk.owner);
    if (risk.deadline) addRow('Решение/действие необходимо до', formatDateRu(risk.deadline));
    if (risk.status) addRow('Статус', risk.status);

    hoverPopEl.append(grid);
  }

  function showRiskHoverPop(cardEl, risk) {
    if (!hoverPopEl || !cardEl || !risk) return;
    if (document.querySelector('dialog[open]')) return;
    activeHoverCard = cardEl;
    buildHoverPopDom(risk);
    hoverPopEl.hidden = false;
    try {
      if (!hoverPopEl.matches(':popover-open')) hoverPopEl.showPopover();
    } catch {
      hoverPopEl.classList.add(':popover-open');
    }

    const rect = cardEl.getBoundingClientRect();
    const pw = hoverPopEl.offsetWidth || 320;
    const ph = hoverPopEl.offsetHeight || 160;
    const pad = 10;
    const gap = 8;

    let top = rect.bottom + gap;
    if (top + ph > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - ph - gap);
    }
    let left = rect.left;
    if (left + pw > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pw - pad);
    }
    left = Math.max(pad, left);

    hoverPopEl.style.top = `${Math.round(top)}px`;
    hoverPopEl.style.left = `${Math.round(left)}px`;
  }

  // Global strict boundary enforcement (Item 12: disappears immediately when pointer leaves risk block, even if over popover area)
  document.addEventListener('pointermove', (e) => {
    if (!activeHoverCard) return;
    if (!activeHoverCard.isConnected) {
      hideRiskHoverPop();
      return;
    }
    const r = activeHoverCard.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      hideRiskHoverPop();
    }
  }, { passive: true });

  window.addEventListener('scroll', hideRiskHoverPop, { capture: true, passive: true });
  window.addEventListener('hashchange', hideRiskHoverPop);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideRiskHoverPop();
  });

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function notifyAll() {
    hideRiskHoverPop();
    subscribers.forEach((fn) => {
      try { fn(); } catch (err) { console.error('[RiskWorkspace] subscriber error:', err); }
    });
    onAnyChange?.();
  }

  function getScaleMode() {
    return riceBridge?.getScaleMode?.() || 'template';
  }

  function evaluateRisks() {
    const mappedOnly = risks.filter((x) => x.r != null && x.c != null);
    const wasmPayload = mappedOnly.map((x) => ({
      id: x.id,
      t: x.title,
      r: x.r,
      c: x.c,
      s: x.s ?? 0
    }));
    const wasmRes = wasmPayload.length ? runWasmRiskMatrix?.(wasmPayload) : null;
    const byId = new Map();
    if (wasmRes && Array.isArray(wasmRes.risks)) {
      wasmRes.risks.forEach((w) => byId.set(Number(w.id), w));
    }

    const enriched = risks.map((x) => {
      const isUnmapped = x.r == null || x.c == null;
      if (isUnmapped) {
        return {
          ...x,
          isUnmapped: true,
          score: null,
          severity: null,
          inRice: Boolean(riceBridge?.hasRisk?.(x.id))
        };
      }
      const w = byId.get(x.id);
      const fb = computeScoreFallback(x.r, x.c);
      return {
        ...x,
        isUnmapped: false,
        score: w ? Number(w.score) : fb.score,
        severity: w ? Number(w.severity_level) : fb.severity,
        inRice: Boolean(riceBridge?.hasRisk?.(x.id))
      };
    });

    return {
      enriched,
      usedWasm: Boolean(wasmRes && Array.isArray(wasmRes.risks))
    };
  }

  function toRicePayload(risk) {
    const cleanAction = (risk.action || '').trim() || `Меры по риску: ${risk.title}`;
    return {
      sourceRiskId: risk.id,
      riskTitle: risk.title,
      idea: cleanAction,
      responsible: risk.owner || '',
      deadline: risk.deadline || '',
      status: risk.status || 'Черновик',
      resources: risk.resources || '',
      comment: risk.description || '',
      reach: risk.reach ?? null,
      reachDesc: risk.reachDesc || '',
      impact: risk.riceImpact ?? null,
      impactDesc: risk.impactDesc || '',
      confidence: risk.confidence ?? null,
      confidenceDesc: risk.confidenceDesc || '',
      effort: risk.effort ?? null,
      effortDesc: risk.effortDesc || ''
    };
  }

  function pushUndoSnapshot() {
    undoStack.push({
      risks: cloneRisks(risks),
      scales: cloneScales(scales),
      isDemo
    });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  async function persistIfDisk() {
    if (!persistDisk) return;
    await saveUnifiedIdb({
      risks,
      scales,
      isDemo,
      nextId,
      aiCache: Object.fromEntries(aiCache),
      lastAiRisks
    });
  }

  async function syncLinkedRisksToRice(prevRisks, currentRisks) {
    if (!riceBridge?.hasRisk || !riceBridge?.upsertRisk) return;
    const curIds = new Set(currentRisks.map((x) => x.id));
    prevRisks.forEach((oldRisk) => {
      if (!curIds.has(oldRisk.id) && riceBridge.hasRisk(oldRisk.id)) {
        riceBridge.removeRisk?.(oldRisk.id, { silent: true });
      }
    });
    currentRisks.forEach((rk) => {
      if (riceBridge.hasRisk(rk.id)) {
        riceBridge.upsertRisk(toRicePayload(rk), { silent: true });
      }
    });
  }

  async function undo() {
    if (!undoStack.length) return;
    const prevSnapshot = undoStack.pop();
    const beforeUndo = cloneRisks(risks);
    redoStack.push({
      risks: beforeUndo,
      scales: cloneScales(scales),
      isDemo
    });
    risks = prevSnapshot.risks;
    scales = prevSnapshot.scales;
    isDemo = prevSnapshot.isDemo;
    await syncLinkedRisksToRice(beforeUndo, risks);
    await persistIfDisk();
    notifyAll();
    toast('Действие отменено');
  }

  async function redo() {
    if (!redoStack.length) return;
    const nextSnapshot = redoStack.pop();
    const beforeRedo = cloneRisks(risks);
    undoStack.push({
      risks: beforeRedo,
      scales: cloneScales(scales),
      isDemo
    });
    risks = nextSnapshot.risks;
    scales = nextSnapshot.scales;
    isDemo = nextSnapshot.isDemo;
    await syncLinkedRisksToRice(beforeRedo, risks);
    await persistIfDisk();
    notifyAll();
    toast('Действие возвращено');
  }

  // Global keyboard Ctrl+Z / Ctrl+Y when either Risk tab is active
  document.addEventListener('keydown', (e) => {
    const fwOn = document.querySelector('section[data-v="risk-framework"]')?.classList.contains('on');
    const rmOn = document.querySelector('section[data-v="risk-map"]')?.classList.contains('on');
    if (!fwOn && !rmOn) return;
    if (e.isComposing) return;
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      if (undoStack.length) {
        e.preventDefault();
        undo();
      }
    } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
      if (redoStack.length) {
        e.preventDefault();
        redo();
      }
    }
  });

  async function setStorageMode(toDisk, { confirm = true, silent = false } = {}) {
    if (toDisk && typeof indexedDB === 'undefined') {
      if (!silent) toast('IndexedDB недоступен — используется режим RAM.');
      persistDisk = false;
      notifyAll();
      return false;
    }
    if (confirm) {
      const ok = await confirmDataAction({
        title: toDisk ? 'Сохранять единый реестр рисков в IndexedDB?' : 'Перевести реестр рисков в память сессии (RAM)?',
        description: toDisk
          ? 'Все риски (PESTEL, горизонты, матрица 3×3, планы действий, пороги шкал и кэш AI-стыков) будут сохраняться локально в IndexedDB браузера и переживут перезагрузку (F5).'
          : 'Сохранённые риски будут удалены из IndexedDB и останутся только в оперативной памяти до закрытия вкладки.',
        confirmLabel: toDisk ? 'Включить IndexedDB' : 'Перевести в RAM'
      });
      if (!ok) return false;
    }

    persistDisk = Boolean(toDisk);
    try {
      if (persistDisk) {
        localStorage.setItem(RK_PERSIST_KEY, '1');
      } else {
        localStorage.removeItem(RK_PERSIST_KEY);
      }
      localStorage.removeItem(LEGACY_RM_PERSIST_KEY);
      localStorage.removeItem(LEGACY_RF_PERSIST_KEY);
    } catch { /* ignore */ }

    if (persistDisk) {
      await persistIfDisk();
      if (!silent) toast('Хранение рисков (Фреймворк и Карта): Disk (IndexedDB)');
    } else {
      await clearUnifiedIdb();
      if (!silent) toast('Хранение рисков (Фреймворк и Карта): RAM');
    }
    notifyAll();
    return true;
  }

  async function clearAllData({ silent = false, syncRice = true } = {}) {
    if (risks.length) pushUndoSnapshot();
    const removedIds = risks.map((x) => x.id);
    risks = [];
    isDemo = false;
    aiCache.clear();
    lastAiRisks = [];
    if (syncRice && riceBridge?.removeRisk) {
      removedIds.forEach((id) => riceBridge.removeRisk(id, { silent: true }));
    }
    await clearUnifiedIdb();
    notifyAll();
    if (!silent) toast('Единый реестр рисков очищен');
  }

  async function loadDemoSample() {
    pushUndoSnapshot();
    const scale = getScaleMode();
    risks = DEMO_UNIFIED_RISKS.map((r, i) => normalizeRisk(r, i + 1, scale));
    scales = cloneScales(DEFAULT_SCALES);
    isDemo = true;
    nextId = Math.max(100, ...risks.map((x) => x.id + 1));
    risks.forEach((rk) => {
      if (riceBridge?.hasRisk?.(rk.id)) {
        riceBridge.upsertRisk?.(toRicePayload(rk), { silent: true });
      }
    });
    await persistIfDisk();
    notifyAll();
    toast('Загружен единый демо-набор рисков (PESTEL + Карта 3×3)');
  }

  async function moveRiskToCell(riskId, targetR, targetC) {
    const item = risks.find((x) => x.id === riskId);
    if (!item) return false;
    const nr = Math.max(0, Math.min(2, targetR));
    const nc = Math.max(0, Math.min(2, targetC));
    if (item.r === nr && item.c === nc) return false;

    pushUndoSnapshot();
    risks = risks.map((x) => (x.id === riskId ? { ...x, r: nr, c: nc } : x));
    isDemo = false;
    await persistIfDisk();
    notifyAll();
    toast(`Перемещено: ${PROB_LABELS[nr]} × ${IMP_LABELS[nc]}`);
    return true;
  }

  async function updateRiskFields(riskId, patch, toastMsg = '') {
    const existing = risks.find((x) => x.id === riskId);
    if (!existing) return false;
    pushUndoSnapshot();
    const updated = normalizeRisk({ ...existing, ...patch, id: riskId }, riskId, getScaleMode());
    risks = risks.map((x) => (x.id === riskId ? updated : x));
    isDemo = false;
    if (riceBridge?.hasRisk?.(riskId)) {
      riceBridge.upsertRisk?.(toRicePayload(updated), { silent: true });
    }
    await persistIfDisk();
    notifyAll();
    if (toastMsg) toast(toastMsg);
    return true;
  }

  async function deleteRiskWithConfirm(risk) {
    const target = risks.find((x) => x.id === risk?.id);
    if (!target) return false;
    const linkedRice = Boolean(riceBridge?.hasRisk?.(target.id));
    const ok = await confirmDataAction({
      title: 'Удалить риск?',
      description: linkedRice
        ? `Риск «${target.title}» будет удалён с вкладок «Фреймворк» и «Карта рисков», а связанное действие будет убрано из таблицы приоритизации RICE (отмена Ctrl+Z).`
        : `Риск «${target.title}» будет удалён с вкладок «Фреймворк» и «Карта рисков» (отмена Ctrl+Z).`,
      confirmLabel: 'Удалить',
      danger: true
    });
    if (!ok) return false;

    pushUndoSnapshot();
    risks = risks.filter((x) => x.id !== target.id);
    isDemo = false;
    if (linkedRice) {
      riceBridge?.removeRisk?.(target.id, { silent: true });
    }
    await persistIfDisk();
    notifyAll();
    toast('Риск удалён');
    return true;
  }

  async function transferOrFocusInRice(riskId) {
    const target = risks.find((x) => x.id === riskId);
    if (!target || !riceBridge?.upsertRisk) return null;

    if (riceBridge.hasRisk?.(target.id)) {
      riceBridge.focusRisk?.(target.id);
      return { alreadyInRice: true };
    }

    // Ensure action text is populated so 1-click transfer always succeeds cleanly
    let riskToSync = target;
    if (!(target.action || '').trim()) {
      const autoAction = `Меры по риску: ${target.title}`;
      riskToSync = { ...target, action: autoAction };
      risks = risks.map((x) => (x.id === target.id ? riskToSync : x));
      isDemo = false;
      await persistIfDisk();
    }

    const res = riceBridge.upsertRisk(toRicePayload(riskToSync), { silent: true });
    notifyAll();
    if (res) {
      toast(`Перенесено в таблицу RICE (${res.rank}-Р)`);
    }
    return res;
  }

  async function removeRiskFromRice(riskId) {
    const remover = riceBridge?.removeFromRice || riceBridge?.removeRisk;
    if (!remover || !riceBridge?.hasRisk?.(riskId)) return false;
    remover(riskId, { silent: true });
    notifyAll();
    toast('Удалено из таблицы RICE');
    return true;
  }

  // Called by rice_tool.js when user edits a *-Р initiative directly in #rice
  async function syncFromRiceItem(riceItem) {
    if (!riceItem || !riceItem.isRisk || riceItem.sourceRiskId == null) return;
    const rid = Number(riceItem.sourceRiskId);
    const existing = risks.find((x) => x.id === rid);
    if (!existing) return;

    const merged = normalizeRisk({
      ...existing,
      action: riceItem.idea || existing.action,
      owner: riceItem.responsible ?? existing.owner,
      deadline: riceItem.deadline ?? existing.deadline,
      status: riceItem.status ?? existing.status,
      resources: riceItem.resources ?? existing.resources,
      description: riceItem.comment ?? existing.description,
      reach: riceItem.reach,
      reachDesc: riceItem.reachDesc ?? existing.reachDesc,
      riceImpact: riceItem.impact,
      impactDesc: riceItem.impactDesc ?? existing.impactDesc,
      confidence: riceItem.confidence,
      confidenceDesc: riceItem.confidenceDesc ?? existing.confidenceDesc,
      effort: riceItem.effort,
      effortDesc: riceItem.effortDesc ?? existing.effortDesc
    }, rid, getScaleMode());

    risks = risks.map((x) => (x.id === rid ? merged : x));
    isDemo = false;
    await persistIfDisk();
    notifyAll();
  }

  async function convertRiskRiceScale(fromScale, toScale) {
    if (fromScale === toScale) return;
    risks = risks.map((it) => {
      const next = { ...it };
      if (fromScale === 'template' && toScale === 'classic') {
        if (it.reach != null) next.reach = it.reach >= 3 ? 5000 : (it.reach >= 2 ? 1000 : 250);
        if (it.riceImpact != null) next.riceImpact = it.riceImpact >= 3 ? 3 : (it.riceImpact >= 2 ? 1 : 0.5);
        if (it.confidence != null) next.confidence = it.confidence >= 3 ? 100 : (it.confidence >= 2 ? 80 : 50);
        if (it.effort != null) next.effort = it.effort >= 3 ? 4 : (it.effort >= 2 ? 2 : 1);
      } else if (fromScale === 'classic' && toScale === 'template') {
        if (it.reach != null) next.reach = it.reach >= 3000 ? 3 : (it.reach >= 600 ? 2 : 1);
        if (it.riceImpact != null) next.riceImpact = it.riceImpact >= 2 ? 3 : (it.riceImpact >= 1 ? 2 : 1);
        if (it.confidence != null) next.confidence = it.confidence >= 90 ? 3 : (it.confidence >= 65 ? 2 : 1);
        if (it.effort != null) next.effort = it.effort >= 3 ? 3 : (it.effort >= 1.5 ? 2 : 1);
      }
      return next;
    });
    await persistIfDisk();
    notifyAll();
  }

  // Add AI-generated intersection risk directly to unified store
  async function addAiIntersectionRisk({ title, rationale, pestel = 'T', curve = 'event', prob = 1, imp = 1 }) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return null;
    const existing = risks.find((x) => x.title.toLowerCase() === cleanTitle.toLowerCase());
    if (existing) {
      toast('Такой риск уже есть в едином реестре');
      return existing;
    }
    pushUndoSnapshot();
    const created = normalizeRisk({
      id: nextId++,
      title: cleanTitle,
      description: String(rationale || '').trim(),
      pestel: PESTEL_META[pestel] ? pestel : (parsePestelCode(pestel) || 'T'),
      curve: CURVE_META[curve] ? curve : (parseCurveCode(curve) || 'event'),
      r: [0, 1, 2].includes(Number(prob)) ? Number(prob) : 1,
      c: [0, 1, 2].includes(Number(imp)) ? Number(imp) : 1,
      s: 0,
      action: `Разработать план реагирования: ${cleanTitle}`,
      status: 'Черновик',
      isAi: true
    }, nextId, getScaleMode());
    risks = [created, ...risks];
    isDemo = false;
    await persistIfDisk();
    notifyAll();
    toast('Риск от AI добавлен во Фреймворк и Карту 3×3');
    return created;
  }

  // Batch add AI-generated risks directly to unified store with isAi: true
  async function addAiGeneratedRisks(items = []) {
    if (!Array.isArray(items) || !items.length) return { addedCount: 0, added: [] };
    const existingTitles = new Set(risks.map((x) => x.title.toLowerCase()));
    const scale = getScaleMode();
    const toAdd = [];

    items.forEach((raw) => {
      const cleanTitle = String(raw?.title || '').trim().slice(0, 180);
      if (!cleanTitle || existingTitles.has(cleanTitle.toLowerCase())) return;
      existingTitles.add(cleanTitle.toLowerCase());
      const pestelCode = PESTEL_META[raw?.pestel] ? raw.pestel : (parsePestelCode(raw?.pestel) || 'T');
      const curveCode = CURVE_META[raw?.curve] ? raw.curve : (parseCurveCode(raw?.curve) || 'event');
      const prob = parseOptionalIndex(raw?.probability ?? raw?.r, [0, 1, 2]);
      const imp = parseOptionalIndex(raw?.impact ?? raw?.c, [0, 1, 2]);
      const descParts = [];
      if (raw?.signals) descParts.push(`Стык: ${String(raw.signals).trim()}`);
      if (raw?.rationale || raw?.description) descParts.push(String(raw.rationale || raw.description).trim());

      toAdd.push(normalizeRisk({
        id: nextId++,
        title: cleanTitle,
        description: descParts.join(' · ').slice(0, 420),
        pestel: pestelCode,
        curve: curveCode,
        r: prob,
        c: imp,
        s: parseOptionalIndex(raw?.s, [0, 1, 2, 3]),
        action: String(raw?.action || '').trim().slice(0, 400),
        status: 'Черновик',
        isAi: true
      }, nextId, scale));
    });

    if (!toAdd.length) return { addedCount: 0, added: [] };
    pushUndoSnapshot();
    risks = [...toAdd, ...risks];
    isDemo = false;
    await persistIfDisk();
    notifyAll();
    return { addedCount: toAdd.length, added: toAdd };
  }

  // =========================================================================
  // Shared Action Group Builder (Transfer/Open RICE | Remove from RICE × | Delete)
  // =========================================================================
  function createRiskActionButtons(risk) {
    const acts = document.createElement('div');
    acts.className = 'rk-card-acts';

    const inRice = Boolean(riceBridge?.hasRisk?.(risk.id));
    const riceBtn = document.createElement('button');
    riceBtn.type = 'button';
    riceBtn.dataset.act = 'rice';
    riceBtn.className = `rk-act-btn is-rice${inRice ? ' is-synced' : ''}`;
    riceBtn.title = inRice
      ? 'Уже в таблице RICE — нажмите, чтобы перейти к строке'
      : 'Перенести действие в таблицу приоритизации RICE (1 клик)';
    riceBtn.setAttribute(
      'aria-label',
      inRice ? `Открыть в таблице RICE: ${risk.title}` : `Перенести в таблицу RICE: ${risk.title}`
    );
    if (inRice) {
      riceBtn.append(createSvgIcon(['M3 8.5l3.2 3.2L13.5 4.5'], 13));
    } else {
      riceBtn.append(createSvgIcon(['M2.5 4.5h6', 'M2.5 8h4.5', 'M2.5 11.5h4.5', 'M9.5 8h4.5', 'M11.8 5.8 14 8l-2.2 2.2'], 13));
    }
    riceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideRiskHoverPop();
      transferOrFocusInRice(risk.id);
    });
    acts.append(riceBtn);

    if (inRice) {
      const unriceBtn = document.createElement('button');
      unriceBtn.type = 'button';
      unriceBtn.dataset.act = 'unrice';
      unriceBtn.className = 'rk-act-btn rk-act-unrice';
      unriceBtn.title = 'Удалить из RICE';
      unriceBtn.setAttribute('aria-label', `Удалить из RICE: ${risk.title}`);
      unriceBtn.textContent = '×';
      unriceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideRiskHoverPop();
        removeRiskFromRice(risk.id);
      });
      acts.append(unriceBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.dataset.act = 'del';
    delBtn.className = 'rk-act-btn is-del';
    delBtn.title = 'Удалить риск';
    delBtn.setAttribute('aria-label', `Удалить риск: ${risk.title}`);
    delBtn.append(createSvgIcon(['M3 4.5h10', 'M6 4.5V3h4v1.5', 'M5 4.5l.6 8.5h4.8l.6-8.5'], 13));
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideRiskHoverPop();
      deleteRiskWithConfirm(risk);
    });

    acts.append(delBtn);
    return acts;
  }

  // =========================================================================
  // Ultra-Compact Risk Block Builder (#risk-framework & #risk-map)
  // Entire card is clickable to open #rk-detail-dlg (no edit pencil button).
  // =========================================================================
  function createCompactRiskCard(risk, { context = 'framework', draggable = false, onDragStart, onDragEnd } = {}) {
    const isUnmapped = Boolean(risk.isUnmapped || risk.r == null || risk.c == null);
    const card = document.createElement('article');
    card.className = `rk-card is-ctx-${context}${isUnmapped ? ' is-unmapped' : ''}`;
    card.dataset.riskId = String(risk.id);

    card.addEventListener('click', (e) => {
      if (e.target.closest?.('.rk-card-acts')) return;
      hideRiskHoverPop();
      openRiskModal(risk);
    });

    if (draggable) {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        hideRiskHoverPop();
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(risk.id));
        onDragStart?.(risk.id, e);
      });
      card.addEventListener('dragend', (e) => {
        card.classList.remove('is-dragging');
        onDragEnd?.(risk.id, e);
      });
    }

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'rk-card-main';
    mainBtn.setAttribute('aria-label', `${risk.title}. Нажмите для редактирования`);

    if (context === 'map' && !isUnmapped) {
      mainBtn.addEventListener('keydown', (e) => {
        if (!e.altKey) return;
        let dr = 0;
        let dc = 0;
        if (e.key === 'ArrowUp') dr = -1;
        else if (e.key === 'ArrowDown') dr = 1;
        else if (e.key === 'ArrowLeft') dc = -1;
        else if (e.key === 'ArrowRight') dc = 1;
        if (dr !== 0 || dc !== 0) {
          e.preventDefault();
          moveRiskToCell(risk.id, risk.r + dr, risk.c + dc).then((moved) => {
            if (moved) {
              requestAnimationFrame(() => {
                document.querySelector(`.rk-card[data-risk-id="${risk.id}"] .rk-card-main`)?.focus();
              });
            }
          });
        }
      });
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'rk-card-title';
    titleEl.textContent = risk.title;
    mainBtn.append(titleEl);

    const foot = document.createElement('div');
    foot.className = 'rk-card-foot';

    const badges = document.createElement('div');
    badges.className = 'rk-card-badges';

    if (context === 'framework') {
      if (risk.severity != null && SEV_META[risk.severity]) {
        const sev = SEV_META[risk.severity];
        const sevB = document.createElement('span');
        sevB.className = `rk-mini-badge ${sev.cls}`;
        sevB.textContent = sev.short;
        badges.append(sevB);
      } else {
        const unmB = document.createElement('span');
        unmB.className = 'rk-mini-badge is-unmapped';
        unmB.textContent = 'Без оценки';
        badges.append(unmB);
      }
    } else if (risk.pestel && PESTEL_META[risk.pestel]) {
      const pMeta = PESTEL_META[risk.pestel];
      const pB = document.createElement('span');
      pB.className = 'rk-mini-badge is-pestel';
      pB.textContent = pMeta.short;
      badges.append(pB);
    }

    if (risk.isAi) {
      const aiB = document.createElement('span');
      aiB.className = 'rk-ai-badge';
      aiB.textContent = 'AI';
      badges.append(aiB);
    }

    foot.append(badges, createRiskActionButtons(risk));
    card.append(mainBtn, foot);

    // Strict hover-only popover trigger
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      const fresh = evaluateRisks().enriched.find((x) => x.id === risk.id) || risk;
      showRiskHoverPop(card, fresh);
    });
    card.addEventListener('pointerleave', () => {
      hideRiskHoverPop();
    });
    mainBtn.addEventListener('focus', () => {
      if (mainBtn.matches(':focus-visible')) {
        const fresh = evaluateRisks().enriched.find((x) => x.id === risk.id) || risk;
        showRiskHoverPop(card, fresh);
      }
    });
    mainBtn.addEventListener('blur', hideRiskHoverPop);

    return card;
  }

  // =========================================================================
  // Unified Risk + RICE Detail Dialog (#rk-detail-dlg — Item 3, 6, 17)
  // =========================================================================
  const rkDlg = document.getElementById('rk-detail-dlg');
  const rkForm = document.getElementById('rk-detail-form');
  const rkDlgTitle = document.getElementById('rk-dlg-title');
  const rkSevBadge = document.getElementById('rk-dlg-sev-badge');
  const rkRicePreview = document.getElementById('rk-dlg-rice-preview');
  const rkIdInp = document.getElementById('rk-f-id');
  const rkTitleInp = document.getElementById('rk-f-title');
  const rkTitleErr = document.getElementById('rk-f-title-err');
  const rkDescInp = document.getElementById('rk-f-desc');
  const rkPestelInp = document.getElementById('rk-f-pestel');
  const rkCurveInp = document.getElementById('rk-f-curve');
  const rkMiniGrid = document.getElementById('rk-mini-grid');
  const rkProbInp = document.getElementById('rk-f-prob');
  const rkImpInp = document.getElementById('rk-f-imp');
  const rkActionInp = document.getElementById('rk-f-action');
  const rkStratInp = document.getElementById('rk-f-strat');
  const rkStatusSel = document.getElementById('rk-f-status');
  const rkStatusCustom = document.getElementById('rk-f-status-custom');
  const rkOwnerInp = document.getElementById('rk-f-owner');
  const rkDeadlineInp = document.getElementById('rk-f-deadline');
  const rkDeadlineBtn = document.getElementById('rk-f-deadline-btn');
  const rkDeadlineLbl = document.getElementById('rk-f-deadline-lbl');
  const rkResourcesInp = document.getElementById('rk-f-resources');

  const rkReachSel = document.getElementById('rk-f-reach-sel');
  const rkReachNum = document.getElementById('rk-f-reach-num');
  const rkRiceImpSel = document.getElementById('rk-f-rice-imp');
  const rkConfSel = document.getElementById('rk-f-conf');
  const rkEffortSel = document.getElementById('rk-f-effort-sel');
  const rkEffortNum = document.getElementById('rk-f-effort-num');

  const rkReachDesc = document.getElementById('rk-f-reach-desc');
  const rkImpactDesc = document.getElementById('rk-f-impact-desc');
  const rkConfDesc = document.getElementById('rk-f-conf-desc');
  const rkEffortDesc = document.getElementById('rk-f-effort-desc');
  const rkJustDetails = document.getElementById('rk-just-details');

  const rkDelBtn = document.getElementById('rk-dlg-del');
  const rkToRiceBtn = document.getElementById('rk-dlg-to-rice');
  const rkSaveBtn = document.getElementById('rk-dlg-save');

  function setTitleValidation(show) {
    if (!rkTitleInp || !rkTitleErr) return;
    const invalid = show && !rkTitleInp.checkValidity();
    rkTitleInp.setAttribute('aria-invalid', String(invalid));
    rkTitleInp.classList.toggle('user-invalid-fallback', invalid);
    rkTitleErr.hidden = !invalid;
    if (invalid) rkTitleInp.setAttribute('aria-describedby', 'rk-f-title-err');
    else rkTitleInp.removeAttribute('aria-describedby');
  }

  rkTitleInp?.addEventListener('blur', () => setTitleValidation(true));
  rkTitleInp?.addEventListener('input', () => setTitleValidation(false));

  function buildUnifiedMiniGrid() {
    if (!rkMiniGrid) return;
    rkMiniGrid.replaceChildren();
    PROB_LABELS.forEach((pLbl, r) => {
      IMP_LABELS.forEach((iLbl, c) => {
        const { severity } = computeScoreFallback(r, c);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `rf-mini-cell is-sev-${severity}`;
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);
        btn.setAttribute('aria-label', `${pLbl} × ${iLbl}`);
        btn.title = `${pLbl} × ${iLbl}`;
        btn.textContent = `${pLbl[0]}×${iLbl[0]}`;
        btn.addEventListener('click', () => {
          if (rkProbInp) rkProbInp.value = String(r);
          if (rkImpInp) rkImpInp.value = String(c);
          updateModalPreviews();
        });
        rkMiniGrid.append(btn);
      });
    });
  }
  buildUnifiedMiniGrid();

  function populateModalRiceControls(riskData) {
    const scale = getScaleMode();
    const fillOptions = (selEl, optionsList) => {
      if (!selEl) return;
      selEl.replaceChildren();
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '—';
      selEl.append(emptyOpt);
      optionsList.forEach(([val, txt]) => {
        const opt = document.createElement('option');
        opt.value = String(val);
        opt.textContent = txt;
        selEl.append(opt);
      });
    };

    if (scale === 'template') {
      if (rkReachSel) rkReachSel.hidden = false;
      if (rkReachNum) rkReachNum.hidden = true;
      if (rkEffortSel) rkEffortSel.hidden = false;
      if (rkEffortNum) rkEffortNum.hidden = true;

      fillOptions(rkReachSel, [
        [1, '1 — Узкий сегмент'],
        [2, '2 — Часть клиентов'],
        [3, '3 — Вся база']
      ]);
      fillOptions(rkRiceImpSel, [
        [1, '1 — Умеренный'],
        [2, '2 — Заметный'],
        [3, '3 — Стратегический']
      ]);
      fillOptions(rkConfSel, [
        [1, '1 — Высокий риск'],
        [2, '2 — Умеренный риск'],
        [3, '3 — Низкий риск']
      ]);
      fillOptions(rkEffortSel, [
        [1, '1 — Малые усилия'],
        [2, '2 — Средние усилия'],
        [3, '3 — Большие / RnD']
      ]);

      if (rkReachSel) rkReachSel.value = riskData.reach != null ? String(Math.min(3, Math.max(1, Math.round(riskData.reach)))) : '';
      if (rkRiceImpSel) rkRiceImpSel.value = riskData.riceImpact != null ? String(Math.min(3, Math.max(1, Math.round(riskData.riceImpact)))) : '';
      if (rkConfSel) rkConfSel.value = riskData.confidence != null ? String(Math.min(3, Math.max(1, Math.round(riskData.confidence)))) : '';
      if (rkEffortSel) rkEffortSel.value = riskData.effort != null ? String(Math.min(3, Math.max(1, Math.round(riskData.effort)))) : '';
    } else {
      if (rkReachSel) rkReachSel.hidden = true;
      if (rkReachNum) {
        rkReachNum.hidden = false;
        rkReachNum.value = riskData.reach != null ? String(riskData.reach) : '';
      }
      if (rkEffortSel) rkEffortSel.hidden = true;
      if (rkEffortNum) {
        rkEffortNum.hidden = false;
        rkEffortNum.value = riskData.effort != null ? String(riskData.effort) : '';
      }

      fillOptions(rkRiceImpSel, [
        [0.25, '0.25 — Минимальный'],
        [0.5, '0.5 — Низкий'],
        [1, '1 — Средний'],
        [2, '2 — Высокий'],
        [3, '3 — Прорывной']
      ]);
      fillOptions(rkConfSel, [
        [50, '50% — Низкая'],
        [80, '80% — Средняя'],
        [100, '100% — Высокая']
      ]);
      if (rkRiceImpSel) rkRiceImpSel.value = riskData.riceImpact != null ? String(riskData.riceImpact) : '';
      if (rkConfSel) rkConfSel.value = riskData.confidence != null ? String(riskData.confidence) : '';
    }
  }

  function updateModalPreviews() {
    const r = parseOptionalIndex(rkProbInp?.value, [0, 1, 2]);
    const c = parseOptionalIndex(rkImpInp?.value, [0, 1, 2]);

    if (r != null && c != null) {
      const { severity, score } = computeScoreFallback(r, c);
      const sMeta = SEV_META[severity] || SEV_META[1];
      if (rkSevBadge) {
        rkSevBadge.className = `rf-sev-badge ${sMeta.cls}`;
        rkSevBadge.textContent = `${sMeta.text} · ${score}`;
      }
    } else if (rkSevBadge) {
      rkSevBadge.className = 'rf-sev-badge is-unmapped';
      rkSevBadge.textContent = 'Без оценки';
    }

    rkMiniGrid?.querySelectorAll('.rf-mini-cell').forEach((btn) => {
      const on = r != null && c != null && Number(btn.dataset.r) === r && Number(btn.dataset.c) === c;
      btn.setAttribute('aria-pressed', String(on));
    });

    const scale = getScaleMode();
    const reachVal = parseOptionalPosNum(scale === 'template' ? rkReachSel?.value : rkReachNum?.value);
    const impVal = parseOptionalPosNum(rkRiceImpSel?.value);
    const confRaw = parseOptionalPosNum(rkConfSel?.value);
    const effVal = parseOptionalPosNum(scale === 'template' ? rkEffortSel?.value : rkEffortNum?.value);

    if (rkRicePreview) {
      if (reachVal == null || impVal == null || confRaw == null || effVal == null) {
        rkRicePreview.textContent = 'RICE: —';
      } else {
        const confVal = scale === 'classic' ? confRaw / 100 : confRaw;
        const riceScore = Math.round(((reachVal * impVal * confVal) / Math.max(0.1, effVal)) * 100) / 100;
        const disp = Number.isInteger(riceScore) ? String(riceScore) : riceScore.toFixed(2).replace(/\.?0+$/, '');
        rkRicePreview.textContent = `RICE: ${disp}`;
      }
    }
  }

  [rkProbInp, rkImpInp, rkReachSel, rkReachNum, rkRiceImpSel, rkConfSel, rkEffortSel, rkEffortNum].forEach((el) => {
    el?.addEventListener('change', updateModalPreviews);
    el?.addEventListener('input', updateModalPreviews);
  });

  rkStatusSel?.addEventListener('change', () => {
    if (!rkStatusCustom) return;
    const isCust = rkStatusSel.value === '__custom__';
    rkStatusCustom.hidden = !isCust;
    if (isCust) rkStatusCustom.focus();
  });

  rkDeadlineBtn?.addEventListener('click', () => {
    const cur = rkDeadlineInp?.value || '';
    riceBridge?.openDatepicker?.(rkDeadlineBtn, cur, (iso) => {
      if (rkDeadlineInp) rkDeadlineInp.value = iso;
      if (rkDeadlineLbl) rkDeadlineLbl.textContent = formatDateRu(iso) || 'Выбрать дату';
      rkDeadlineBtn.classList.toggle('is-empty', !iso);
    });
  });

  function openRiskModal(existing = null, defaults = {}) {
    if (!rkDlg) return;
    hideRiskHoverPop();
    rkForm?.reset();
    setTitleValidation(false);

    const scale = getScaleMode();
    const base = existing
      ? normalizeRisk(existing, existing.id, scale)
      : normalizeRisk({
          id: 0,
          title: '',
          description: '',
          pestel: defaults.pestel ?? null,
          curve: defaults.curve ?? null,
          r: defaults.r ?? null,
          c: defaults.c ?? null,
          s: defaults.s ?? null,
          action: '',
          owner: '',
          deadline: '',
          status: 'Черновик',
          resources: '',
          reach: null,
          riceImpact: null,
          confidence: null,
          effort: null
        }, 0, scale);

    if (rkDlgTitle) rkDlgTitle.textContent = existing ? 'Детали риска и действия' : 'Новый риск';
    if (rkIdInp) rkIdInp.value = existing ? String(existing.id) : '';
    if (rkTitleInp) rkTitleInp.value = base.title;
    if (rkDescInp) rkDescInp.value = base.description;
    if (rkPestelInp) rkPestelInp.value = base.pestel ?? '';
    if (rkCurveInp) rkCurveInp.value = base.curve ?? '';
    if (rkProbInp) rkProbInp.value = base.r != null ? String(base.r) : '';
    if (rkImpInp) rkImpInp.value = base.c != null ? String(base.c) : '';
    if (rkActionInp) rkActionInp.value = base.action;
    if (rkStratInp) rkStratInp.value = base.s != null ? String(base.s) : '';
    if (rkOwnerInp) rkOwnerInp.value = base.owner;
    if (rkDeadlineInp) rkDeadlineInp.value = base.deadline;
    if (rkDeadlineLbl) rkDeadlineLbl.textContent = formatDateRu(base.deadline) || 'Выбрать дату';
    rkDeadlineBtn?.classList.toggle('is-empty', !base.deadline);
    if (rkResourcesInp) rkResourcesInp.value = base.resources;

    if (rkStatusSel && rkStatusCustom) {
      if (PRESET_STATUSES.includes(base.status)) {
        rkStatusSel.value = base.status;
        rkStatusCustom.hidden = true;
        rkStatusCustom.value = '';
      } else {
        rkStatusSel.value = '__custom__';
        rkStatusCustom.hidden = false;
        rkStatusCustom.value = base.status;
      }
    }

    populateModalRiceControls(base);
    if (rkReachDesc) rkReachDesc.value = base.reachDesc;
    if (rkImpactDesc) rkImpactDesc.value = base.impactDesc;
    if (rkConfDesc) rkConfDesc.value = base.confidenceDesc;
    if (rkEffortDesc) rkEffortDesc.value = base.effortDesc;
    if (rkJustDetails) {
      rkJustDetails.open = Boolean(base.reachDesc || base.impactDesc || base.confidenceDesc || base.effortDesc);
    }

    if (rkDelBtn) rkDelBtn.hidden = !existing;
    if (rkToRiceBtn) {
      const inRice = Boolean(existing && riceBridge?.hasRisk?.(existing.id));
      rkToRiceBtn.textContent = inRice ? '✓ Открыть в RICE' : 'Сохранить и в RICE →';
    }

    updateModalPreviews();
    rkDlg.returnValue = '';
    rkDlg.showModal();
    if (!existing) rkTitleInp?.focus();
  }

  function readModalFormPayload(editId) {
    const scale = getScaleMode();
    const existing = editId ? risks.find((x) => x.id === editId) : null;
    const stVal = rkStatusSel?.value || 'Черновик';
    const resolvedStatus = stVal === '__custom__'
      ? ((rkStatusCustom?.value || '').trim() || 'Черновик')
      : normalizeStatus(stVal);

    return normalizeRisk({
      id: editId || nextId++,
      title: (rkTitleInp?.value || '').trim(),
      description: (rkDescInp?.value || '').trim(),
      pestel: rkPestelInp?.value || null,
      curve: rkCurveInp?.value || null,
      r: parseOptionalIndex(rkProbInp?.value, [0, 1, 2]),
      c: parseOptionalIndex(rkImpInp?.value, [0, 1, 2]),
      s: parseOptionalIndex(rkStratInp?.value, [0, 1, 2, 3]),
      action: (rkActionInp?.value || '').trim(),
      owner: (rkOwnerInp?.value || '').trim(),
      deadline: rkDeadlineInp?.value || '',
      status: resolvedStatus,
      resources: (rkResourcesInp?.value || '').trim(),
      reach: parseOptionalPosNum(scale === 'template' ? rkReachSel?.value : rkReachNum?.value),
      reachDesc: (rkReachDesc?.value || '').trim(),
      riceImpact: parseOptionalPosNum(rkRiceImpSel?.value),
      impactDesc: (rkImpactDesc?.value || '').trim(),
      confidence: parseOptionalPosNum(rkConfSel?.value),
      confidenceDesc: (rkConfDesc?.value || '').trim(),
      effort: parseOptionalPosNum(scale === 'template' ? rkEffortSel?.value : rkEffortNum?.value),
      effortDesc: (rkEffortDesc?.value || '').trim(),
      isAi: Boolean(existing?.isAi)
    }, editId || nextId, scale);
  }

  async function saveModalForm({ alsoTransferToRice = false } = {}) {
    const titleVal = (rkTitleInp?.value || '').trim();
    if (rkTitleInp) rkTitleInp.value = titleVal;
    if (!rkTitleInp?.checkValidity()) {
      setTitleValidation(true);
      rkTitleInp?.focus();
      return;
    }

    if (rkSaveBtn) rkSaveBtn.disabled = true;
    try {
      const editId = Number(rkIdInp?.value || 0);
      const alreadyInRice = Boolean(editId && riceBridge?.hasRisk?.(editId));

      if (alsoTransferToRice && alreadyInRice) {
        // Save edits first, then jump to RICE
        pushUndoSnapshot();
        const saved = readModalFormPayload(editId);
        risks = risks.map((x) => (x.id === editId ? saved : x));
        isDemo = false;
        riceBridge?.upsertRisk?.(toRicePayload(saved), { silent: true });
        await persistIfDisk();
        rkDlg?.close('save');
        notifyAll();
        riceBridge?.focusRisk?.(editId);
        return;
      }

      pushUndoSnapshot();
      const saved = readModalFormPayload(editId);
      if (alsoTransferToRice && !(saved.action || '').trim()) {
        saved.action = `Меры по риску: ${saved.title}`;
      }

      if (editId) {
        risks = risks.map((x) => (x.id === editId ? saved : x));
      } else {
        risks = [saved, ...risks];
      }
      isDemo = false;

      if (alreadyInRice || alsoTransferToRice) {
        const res = riceBridge?.upsertRisk?.(toRicePayload(saved), { silent: true });
        if (alsoTransferToRice && res) {
          toast(`Сохранено и перенесено в RICE (${res.rank}-Р)`);
        } else {
          toast('Риск и строка RICE синхронизированы');
        }
      } else {
        toast(editId ? 'Риск обновлён' : 'Риск добавлен');
      }

      rkDlg?.close('save');
      await persistIfDisk();
      notifyAll();
    } finally {
      if (rkSaveBtn) rkSaveBtn.disabled = false;
    }
  }

  document.getElementById('rk-dlg-close')?.addEventListener('click', () => rkDlg?.close('cancel'));
  document.getElementById('rk-dlg-cancel')?.addEventListener('click', () => rkDlg?.close('cancel'));
  rkDlg?.addEventListener('close', () => { rkDlg.returnValue = ''; });

  rkForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveModalForm({ alsoTransferToRice: false });
  });

  rkToRiceBtn?.addEventListener('click', () => {
    saveModalForm({ alsoTransferToRice: true });
  });

  rkDelBtn?.addEventListener('click', async () => {
    const id = Number(rkIdInp?.value || 0);
    const target = risks.find((x) => x.id === id);
    if (!target) return;
    rkDlg?.close('delete');
    await deleteRiskWithConfirm(target);
  });

  // =========================================================================
  // Scales & Period Dialog (#rm-scales-dlg)
  // =========================================================================
  const scalesDlg = document.getElementById('rm-scales-dlg');
  const scalesForm = document.getElementById('rm-scales-form');
  const scPeriodInp = document.getElementById('rm-sc-period');

  function openScalesDialog() {
    if (!scalesDlg) return;
    hideRiskHoverPop();
    if (scPeriodInp) scPeriodInp.value = scales.period || DEFAULT_SCALES.period;
    [0, 1, 2].forEach((i) => {
      const pEl = document.getElementById(`rm-sc-p${i}`);
      const iEl = document.getElementById(`rm-sc-i${i}`);
      if (pEl) pEl.value = scales.prob[i] || '';
      if (iEl) iEl.value = scales.imp[i] || '';
    });
    scalesDlg.returnValue = '';
    scalesDlg.showModal();
  }

  document.getElementById('rm-scales-x')?.addEventListener('click', () => scalesDlg?.close('cancel'));
  document.getElementById('rm-scales-cancel')?.addEventListener('click', () => scalesDlg?.close('cancel'));
  scalesDlg?.addEventListener('close', () => { scalesDlg.returnValue = ''; });

  document.getElementById('rm-scales-reset')?.addEventListener('click', async () => {
    pushUndoSnapshot();
    scales = cloneScales(DEFAULT_SCALES);
    scalesDlg?.close('reset');
    await persistIfDisk();
    notifyAll();
    toast('Шкалы матрицы сброшены по умолчанию');
  });

  scalesForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    pushUndoSnapshot();
    scales = {
      period: (scPeriodInp?.value || '').trim() || DEFAULT_SCALES.period,
      prob: [0, 1, 2].map((i) => (document.getElementById(`rm-sc-p${i}`)?.value || '').trim()),
      imp: [0, 1, 2].map((i) => (document.getElementById(`rm-sc-i${i}`)?.value || '').trim())
    };
    scalesDlg?.close('save');
    await persistIfDisk();
    notifyAll();
    toast('Шкалы и период обновлены');
  });

  // =========================================================================
  // Unified Export & Import (.xlsx / .csv / Paste — #rk-import-dlg)
  // =========================================================================
  const EXPORT_HEADERS = [
    'Риск',
    'Описание риска',
    'Категория PESTEL',
    'Тип / горизонт',
    'Уровень критичности',
    'Индекс (0–4)',
    'Вероятность',
    'Влияние',
    'Стратегия',
    'Решение / действие (для RICE)',
    'Ответственный',
    'Решение/действие необходимо до',
    'Статус',
    'Необходимые ресурсы',
    'Reach',
    'Impact',
    'Confidence',
    'Effort',
    'В таблице RICE'
  ];

  function buildExportRows(filteredEnriched) {
    return filteredEnriched.map((x) => [
      x.title,
      x.description || '',
      x.pestel ? (PESTEL_META[x.pestel]?.full || x.pestel) : '—',
      x.curve ? (CURVE_META[x.curve]?.pill || x.curve) : '—',
      x.severity != null ? (SEV_META[x.severity]?.text || '').replace(/^[•●▲○]+\s*/, '') : 'Без оценки',
      x.score != null ? x.score : '—',
      x.r != null ? `${PROB_LABELS[x.r]}${scales.prob[x.r] ? ` (${scales.prob[x.r]})` : ''}` : '—',
      x.c != null ? `${IMP_LABELS[x.c]}${scales.imp[x.c] ? ` (${scales.imp[x.c]})` : ''}` : '—',
      x.s != null ? (STRAT_LABELS[x.s] || '—') : '—',
      x.action || '',
      x.owner || '',
      x.deadline || '',
      x.status || 'Черновик',
      x.resources || '',
      x.reach ?? '—',
      x.riceImpact ?? '—',
      x.confidence ?? '—',
      x.effort ?? '—',
      x.inRice ? 'Да' : 'Нет'
    ]);
  }

  async function exportRisksXlsx(filteredEnriched, filename = 'Реестр_рисков.xlsx') {
    if (!filteredEnriched.length) {
      toast('Нет рисков для экспорта');
      return;
    }
    try {
      const matrix = [EXPORT_HEADERS, ...buildExportRows(filteredEnriched)];
      const { buildXlsxBytes } = await import('./xlsx_export.js?v=3.9.0');
      const bytes = buildXlsxBytes(matrix, 'Реестр рисков');
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Экспортировано в Excel: ${filteredEnriched.length}`);
    } catch (err) {
      toast(`Ошибка экспорта XLSX: ${err.message}`);
    }
  }

  function exportRisksCsv(filteredEnriched, filename = 'Реестр_рисков.csv') {
    if (!filteredEnriched.length) {
      toast('Нет рисков для экспорта');
      return;
    }
    const fmtCsvCell = (v) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        return String(v).replace('.', ',');
      }
      return csvSafeCell(v);
    };
    const lines = [
      EXPORT_HEADERS.map(csvSafeCell).join(';'),
      ...buildExportRows(filteredEnriched).map((row) => row.map(fmtCsvCell).join(';'))
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Экспортировано в CSV: ${filteredEnriched.length}`);
  }

  const impDlg = document.getElementById('rk-import-dlg');
  const impFileInp = document.getElementById('rk-imp-file');
  const impFileLbl = document.getElementById('rk-imp-file-lbl');
  const impPasteInp = document.getElementById('rk-imp-paste');
  const impPreviewEl = document.getElementById('rk-imp-preview');
  let pendingImportedRisks = null;
  let importMode = 'append';

  function parseUnifiedRowsMatrix(rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    const first = rows[0].map((c) => String(c ?? '').trim().toLowerCase());
    const hasHeader = first.some((h) => /риск|сигнал|pestel|линз|вероятн|горизонт|решен|действ|ответств/.test(h));
    const startIdx = hasHeader ? 1 : 0;

    const find = (re, fb = -1) => {
      if (!hasHeader) return fb;
      const idx = first.findIndex((h) => re.test(h));
      return idx >= 0 ? idx : fb;
    };

    const cTitle = hasHeader ? find(/^(риск|сигнал|формулир|назван)/, find(/риск|сигнал/, 0)) : 0;
    const cDesc = find(/описан|эффект на|влияние на бизнес/, -1);
    const cPestel = find(/pestel|линз|категор/, hasHeader ? -1 : 1);
    const cCurve = find(/горизонт|крив|тип/, hasHeader ? -1 : 2);
    const cProb = find(/вероятн|prob/, -1);
    const cImp = find(/^влияние$|ущерб|последств/, -1);
    const cStrat = find(/стратег|обработ/, -1);
    const cAction = find(/решен|действ|план|мер/, -1);
    const cOwner = find(/ответств|владел|owner/, -1);
    const cDeadline = find(/необходимо до|срок|дат|deadline/, -1);
    const cStatus = find(/статус/, -1);
    const cRes = find(/ресурс/, -1);

    const scale = getScaleMode();
    const out = [];
    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i].map((c) => String(c ?? '').trim());
      if (!r.some(Boolean)) continue;
      if (r.length === 1 || (!hasHeader && r.filter(Boolean).length === 1)) {
        const single = r.find(Boolean);
        if (single && single.length >= 3) {
          out.push(normalizeRisk({ id: nextId++, title: single.slice(0, 180) }, nextId, scale));
        }
        continue;
      }
      const title = (cTitle >= 0 ? r[cTitle] : '') || r[0] || '';
      if (title.length < 3) continue;
      out.push(normalizeRisk({
        id: nextId++,
        title: title.slice(0, 180),
        description: cDesc >= 0 ? r[cDesc].slice(0, 400) : '',
        pestel: cPestel >= 0 ? parsePestelCode(r[cPestel]) : null,
        curve: cCurve >= 0 ? parseCurveCode(r[cCurve]) : null,
        r: cProb >= 0 ? parseProbIndex(r[cProb]) : null,
        c: cImp >= 0 ? parseImpIndex(r[cImp]) : null,
        s: cStrat >= 0 ? parseStratIndex(r[cStrat]) : null,
        action: cAction >= 0 ? r[cAction].slice(0, 400) : '',
        owner: cOwner >= 0 ? r[cOwner].slice(0, 80) : '',
        deadline: cDeadline >= 0 ? normalizeDateInput(r[cDeadline]) : '',
        status: cStatus >= 0 ? normalizeStatus(r[cStatus]) : 'Черновик',
        resources: cRes >= 0 ? r[cRes].slice(0, 240) : ''
      }, nextId, scale));
    }
    return out;
  }

  async function parsePasteText(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const { detectDelimiter, parseDelimitedRows } = await import('./file_import.js?v=3.8.0');
    const firstLine = raw.split(/\r?\n/)[0] || '';
    if (!/[;\t]/.test(firstLine)) {
      const scale = getScaleMode();
      return raw
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .map((line) => normalizeRisk({ id: nextId++, title: line.slice(0, 180) }, nextId, scale));
    }
    const delim = detectDelimiter(firstLine);
    return parseUnifiedRowsMatrix(parseDelimitedRows(raw, delim));
  }

  async function refreshImportPreview() {
    const parsed = pendingImportedRisks || await parsePasteText(impPasteInp?.value || '');
    if (impPreviewEl) impPreviewEl.textContent = `Готово к импорту рисков: ${parsed.length}`;
    return parsed;
  }

  function openImportDialog() {
    if (!impDlg) return;
    hideRiskHoverPop();
    pendingImportedRisks = null;
    if (impFileInp) impFileInp.value = '';
    if (impFileLbl) impFileLbl.textContent = 'Или вставьте строки из Excel ниже';
    if (impPasteInp) impPasteInp.value = '';
    if (impPreviewEl) impPreviewEl.textContent = 'Готово к импорту рисков: 0';
    impDlg.returnValue = '';
    impDlg.showModal();
  }

  document.getElementById('rk-imp-x')?.addEventListener('click', () => impDlg?.close('cancel'));
  document.getElementById('rk-imp-cancel')?.addEventListener('click', () => impDlg?.close('cancel'));
  impDlg?.addEventListener('close', () => { impDlg.returnValue = ''; });
  document.getElementById('rk-imp-choose')?.addEventListener('click', () => impFileInp?.click());

  impFileInp?.addEventListener('change', async () => {
    const file = impFileInp.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const { parseXlsxBuffer, decodeTextWithFallback, detectDelimiter, parseDelimitedRows } = await import('./file_import.js?v=3.8.0');
      let rows;
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        rows = await parseXlsxBuffer(buf);
      } else {
        const txt = decodeTextWithFallback(buf);
        rows = parseDelimitedRows(txt, detectDelimiter(txt.split(/\r?\n/)[0] || ';'));
      }
      pendingImportedRisks = parseUnifiedRowsMatrix(rows);
      if (impFileLbl) impFileLbl.textContent = `Файл: ${file.name}`;
      if (impPreviewEl) impPreviewEl.textContent = `Готово к импорту из файла: ${pendingImportedRisks.length}`;
    } catch (err) {
      toast(`Ошибка чтения файла: ${err.message}`);
    }
  });

  impPasteInp?.addEventListener('input', () => {
    pendingImportedRisks = null;
    refreshImportPreview();
  });

  impDlg?.querySelectorAll('[data-rk-imp-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      importMode = btn.dataset.rkImpMode === 'replace' ? 'replace' : 'append';
      impDlg.querySelectorAll('[data-rk-imp-mode]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.rkImpMode === importMode));
      });
    });
  });

  document.getElementById('rk-imp-apply')?.addEventListener('click', async () => {
    const parsed = await refreshImportPreview();
    if (!parsed.length) {
      toast('Нет данных для импорта — выберите файл или вставьте строки');
      return;
    }
    if (importMode === 'replace' && risks.length && !isDemo) {
      const ok = await confirmDataAction({
        title: 'Заменить единый реестр рисков?',
        description: `Текущие риски (${risks.length}) будут заменены импортируемыми (${parsed.length}) на обеих вкладках.`,
        confirmLabel: 'Заменить',
        danger: true
      });
      if (!ok) return;
    }
    pushUndoSnapshot();
    if (importMode === 'replace') {
      risks = parsed;
    } else {
      const existingKeys = new Set(risks.map((r) => r.title.toLowerCase()));
      const uniqueNew = parsed.filter((p) => !existingKeys.has(p.title.toLowerCase()));
      risks = [...uniqueNew, ...risks];
    }
    isDemo = false;
    impDlg?.close('apply');
    await persistIfDisk();
    notifyAll();
    toast(`Импортировано рисков: ${parsed.length}`);
  });

  function getStats() {
    const hasCustom = !isDemo && risks.length > 0;
    const riceSyncedCount = risks.filter((r) => Boolean(riceBridge?.hasRisk?.(r.id))).length;
    const aiCnt = aiCache.size;
    const aiSuffix = aiCnt > 0 ? ` · AI-кэш: ${aiCnt}` : '';
    let status;
    if (risks.length === 0 && aiCnt === 0 && !persistDisk) {
      status = { level: 'empty', text: 'Пусто' };
    } else if (persistDisk) {
      status = {
        level: 'disk',
        text: isDemo ? 'Демо-набор' : `На диске · рисков: ${risks.length}${aiSuffix}`
      };
    } else if (isDemo && risks.length > 0) {
      status = { level: 'ram', text: 'Демо-набор' };
    } else {
      status = { level: 'ram', text: `В памяти · рисков: ${risks.length}${aiSuffix}` };
    }
    return {
      persist: persistDisk,
      count: risks.length,
      riceSyncedCount,
      isDemo,
      aiCacheCount: aiCnt,
      hasCustom,
      status
    };
  }

  // Hydrate from IndexedDB if Disk mode is enabled
  if (persistDisk) {
    loadUnifiedIdb().then((saved) => {
      if (!saved) return;
      const scale = getScaleMode();
      if (Array.isArray(saved.risks)) {
        risks = saved.risks.map((r, i) => normalizeRisk(r, i + 1, scale));
      }
      if (saved.scales?.prob && saved.scales?.imp) scales = cloneScales(saved.scales);
      if (typeof saved.isDemo === 'boolean') isDemo = saved.isDemo;
      if (Number.isFinite(saved.nextId)) nextId = Math.max(nextId, saved.nextId);
      if (saved.aiCache && typeof saved.aiCache === 'object') {
        Object.entries(saved.aiCache).forEach(([k, v]) => {
          if (Array.isArray(v)) aiCache.set(k, v);
        });
      }
      if (Array.isArray(saved.lastAiRisks)) lastAiRisks = saved.lastAiRisks;
      notifyAll();
    }).catch(() => {});
  }

  return {
    subscribe,
    notifyExternalSync: notifyAll,
    getRisks: () => risks,
    getScales: () => scales,
    isPersistDisk: () => persistDisk,
    isDemoMode: () => isDemo,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    undo,
    redo,
    evaluateRisks,
    setStorageMode,
    clearAllData,
    loadDemoSample,
    moveRiskToCell,
    updateRiskFields,
    deleteRiskWithConfirm,
    transferOrFocusInRice,
    removeRiskFromRice,
    syncFromRiceItem,
    convertRiskRiceScale,
    addAiIntersectionRisk,
    addAiGeneratedRisks,
    getAiCache: () => aiCache,
    getLastAiRisks: () => lastAiRisks,
    setLastAiRisks: async (list) => {
      lastAiRisks = Array.isArray(list) ? list : [];
      await persistIfDisk();
    },
    createRiskActionButtons,
    createCompactRiskCard,
    openRiskModal,
    openScalesDialog,
    openImportDialog,
    exportRisksXlsx,
    exportRisksCsv,
    hideRiskHoverPop,
    getStats,
    getStorageStats: getStats
  };
}
