/**
 * Sparkle Multi-Provider AI Client (Zero-Server, Browser-Only)
 * Implements ProxyAPI (https://proxyapi.ru/docs) by default, plus direct OpenAI,
 * Anthropic, Google Gemini, and custom OpenAI/Anthropic/Google-compatible endpoints.
 * API keys remain strictly inside localStorage on the user's device.
 */

export const THINKING_LEVELS = ['off', 'low', 'medium', 'high', 'xhigh'];
export const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4.1-flash-1017';

/**
 * Curated model catalog with real ProxyAPI model IDs, ruble pricing (with VAT, per 1M tokens),
 * and supported thinking levels per official provider / ProxyAPI documentation.
 */
export const LOCAL_MODELS_CATALOG = [
  {
    id: 'local/qwen3-0.6b',
    label: 'Qwen3 0.6B',
    qualityScore: 3.9
  },
  {
    id: 'local/qwen3-1.7b',
    label: 'Qwen3 1.7B',
    qualityScore: 5.4
  },
  {
    id: 'local/qwen3-4b',
    label: 'Qwen3 4B',
    qualityScore: 6.7
  },
  {
    id: 'local/qwen3-8b',
    label: 'Qwen3 8B',
    qualityScore: 7.5
  }
];

export const MODEL_CATALOG = [
  {
    id: 'deepseek/deepseek-v4.1-flash-1017',
    label: 'DeepSeek V4.1 Flash (1017)',
    company: 'DeepSeek',
    providers: ['proxyapi'],
    protocols: ['openai'],
    inputRub1M: 26,
    outputRub1M: 100,
    cacheHitRub1M: 2.6,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 9.2,
    thinkingLevels: ['off', 'low', 'medium', 'high'],
    defaultThinking: 'off'
  },
  {
    id: 'xiaomi/mimo-v2.6-flash',
    label: 'Xiaomi MiMo-V2.6-Flash',
    company: 'Xiaomi',
    providers: ['proxyapi'],
    protocols: ['openai'],
    inputRub1M: 19,
    outputRub1M: 38,
    cacheHitRub1M: 0.4,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 8.6,
    thinkingLevels: ['off', 'low', 'medium', 'high'],
    defaultThinking: 'off'
  },
  {
    id: 'google/gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen',
    company: 'Google',
    providers: ['proxyapi', 'google'],
    protocols: ['openai', 'google'],
    inputRub1M: 450,
    outputRub1M: 2250,
    cacheHitRub1M: 113,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 9.5,
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultThinking: 'low'
  },
  {
    id: 'google/gemini-4-neon',
    label: 'Gemini 4 Neon',
    company: 'Google',
    providers: ['proxyapi', 'google'],
    protocols: ['openai', 'google'],
    inputRub1M: 910,
    outputRub1M: 4550,
    cacheHitRub1M: 228,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 9.8,
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultThinking: 'low'
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    company: 'Google',
    providers: ['proxyapi', 'google'],
    protocols: ['openai', 'google'],
    inputRub1M: 455,
    outputRub1M: 2275,
    cacheHitRub1M: 114,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 8.8,
    thinkingLevels: ['off', 'low', 'medium', 'high'],
    defaultThinking: 'off'
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    company: 'OpenAI',
    providers: ['proxyapi', 'openai'],
    protocols: ['openai'],
    inputRub1M: 39,
    outputRub1M: 155,
    cacheHitRub1M: 19.5,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 8.2,
    thinkingLevels: ['off'],
    defaultThinking: 'off'
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    company: 'OpenAI',
    providers: ['proxyapi', 'openai'],
    protocols: ['openai'],
    inputRub1M: 104,
    outputRub1M: 413,
    cacheHitRub1M: 26,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 8.9,
    thinkingLevels: ['off'],
    defaultThinking: 'off'
  },
  {
    id: 'openai/gpt-6.2-sol',
    label: 'GPT-6.2 Sol',
    company: 'OpenAI',
    providers: ['proxyapi', 'openai'],
    protocols: ['openai'],
    inputRub1M: 420,
    outputRub1M: 1680,
    cacheHitRub1M: 105,
    cacheWriteNote: 'запись 0 ₽',
    qualityScore: 9.7,
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultThinking: 'low'
  },
  {
    id: 'anthropic/claude-haiku-5-5',
    label: 'Claude Haiku 5.5',
    company: 'Anthropic',
    providers: ['proxyapi', 'anthropic'],
    protocols: ['openai', 'anthropic'],
    inputRub1M: 30,
    outputRub1M: 150,
    cacheHitRub1M: 3,
    cacheWriteNote: 'запись +25%',
    qualityScore: 9.1,
    thinkingLevels: ['off', 'low', 'medium', 'high'],
    defaultThinking: 'off'
  },
  {
    id: 'anthropic/claude-sonnet-5-5',
    label: 'Claude Sonnet 5.5',
    company: 'Anthropic',
    providers: ['proxyapi', 'anthropic'],
    protocols: ['openai', 'anthropic'],
    inputRub1M: 500,
    outputRub1M: 2500,
    cacheHitRub1M: 50,
    cacheWriteNote: 'запись +25%',
    qualityScore: 9.6,
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultThinking: 'low'
  }
];

export function resolveModelIdForProvider(entry, providerId, protocolId) {
  if (!entry) return '';
  if (providerId === 'proxyapi' && protocolId === 'openai') return entry.id;
  // Direct vendor endpoints or native Anthropic/Google endpoints omit vendor prefix
  return entry.id.replace(/^(openai|anthropic|google|deepseek|xiaomi)\//i, '');
}

export function getModelCatalogEntry(modelId) {
  const norm = String(modelId || '').trim().toLowerCase();
  if (!norm) return null;
  return MODEL_CATALOG.find((m) =>
    m.id.toLowerCase() === norm ||
    m.id.replace(/^(openai|anthropic|google|deepseek|xiaomi)\//i, '').toLowerCase() === norm
  ) || null;
}

/**
 * Estimate ruble cost for processing ~1,000 unique SKU rows (20 batches x 50 items)
 * with index-keyed output (0#... without raw echo):
 * ~45,000 input tokens + ~25,000 output tokens (+ extra thinking output tokens when > off).
 */
export const THINKING_EXTRA_OUT_K = { off: 0, low: 12, medium: 32, high: 64, xhigh: 110 };
const THINKING_QUALITY_BONUS = { off: 0, low: 0.15, medium: 0.30, high: 0.40, xhigh: 0.45 };
const DASH_THINKING_OUT_TOKENS = { off: 0, low: 1000, medium: 3000, high: 7000, xhigh: 12000 };

/**
 * DeepSeek & Xiaomi auto-cache prefixes >= 64-128 tokens (~450 tok systemPrompt x 19 batches = ~9k cached).
 * OpenAI / Google / Anthropic require >= 1,024 tokens for prompt caching.
 */
export function isShortPromptCached(entry) {
  return Boolean(entry && (entry.company === 'DeepSeek' || entry.company === 'Xiaomi') && Number.isFinite(entry.cacheHitRub1M));
}

export function estimateCost1000Rub(entry, thinkingLevel = 'off') {
  if (!entry || !Number.isFinite(entry.inputRub1M) || !Number.isFinite(entry.outputRub1M)) return null;
  const thinkExtraTokens = (THINKING_EXTRA_OUT_K[thinkingLevel] || 0) * 1_000;
  const cached = isShortPromptCached(entry);
  const freshInTokens = cached ? 36_000 : 45_000;
  const cacheHitTokens = cached ? 9_000 : 0;
  const inputCost = (freshInTokens / 1_000_000) * entry.inputRub1M +
    (cacheHitTokens / 1_000_000) * (entry.cacheHitRub1M || 0);
  const outputCost = ((25_000 + thinkExtraTokens) / 1_000_000) * entry.outputRub1M;
  return inputCost + outputCost;
}

export function estimateQualityWithThinking(entry, thinkingLevel = 'off') {
  if (!entry || !Number.isFinite(entry.qualityScore)) return null;
  const baseLvl = entry.defaultThinking || 'off';
  const delta = (THINKING_QUALITY_BONUS[thinkingLevel] ?? 0) - (THINKING_QUALITY_BONUS[baseLvl] ?? 0);
  return Math.max(1.0, Math.min(9.9, Number((entry.qualityScore + delta).toFixed(1))));
}

/**
 * Estimate ruble cost for a single Dashboard strategic analysis call (~2k input + ~0.8k output + thinking).
 */
export function estimateDashboardCostRub(entry, thinkingLevel = 'medium') {
  if (!entry || !Number.isFinite(entry.inputRub1M) || !Number.isFinite(entry.outputRub1M)) return null;
  const thinkTok = DASH_THINKING_OUT_TOKENS[thinkingLevel] ?? 0;
  const inCost = (2_000 / 1_000_000) * entry.inputRub1M;
  const outCost = ((800 + thinkTok) / 1_000_000) * entry.outputRub1M;
  return inCost + outCost;
}

export const PROVIDER_PRESETS = {
  proxyapi: {
    id: 'proxyapi',
    label: 'ProxyAPI (proxyapi.ru)',
    defaultProtocol: 'openai',
    allowedProtocols: ['openai', 'anthropic', 'google'],
    urls: {
      openai: 'https://api.proxyapi.ru/v1',
      anthropic: 'https://api.proxyapi.ru',
      google: 'https://api.proxyapi.ru'
    },
    models: {
      openai: [
        'deepseek/deepseek-v4.1-flash-1017',
        'xiaomi/mimo-v2.6-flash',
        'anthropic/claude-haiku-5-5',
        'openai/gpt-4o-mini',
        'openai/gpt-4.1-mini',
        'google/gemini-4-hydrogen',
        'google/gemini-4-neon',
        'google/gemini-2.5-flash',
        'openai/gpt-6.2-sol',
        'anthropic/claude-sonnet-5-5'
      ],
      anthropic: [
        'claude-haiku-5-5',
        'claude-sonnet-5-5'
      ],
      google: [
        'gemini-4-hydrogen',
        'gemini-4-neon',
        'gemini-2.5-flash'
      ]
    }
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (официальный)',
    defaultProtocol: 'openai',
    allowedProtocols: ['openai'],
    urls: {
      openai: 'https://api.openai.com/v1'
    },
    models: {
      openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-6.2-sol']
    }
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (официальный)',
    defaultProtocol: 'anthropic',
    allowedProtocols: ['anthropic'],
    urls: {
      anthropic: 'https://api.anthropic.com'
    },
    models: {
      anthropic: ['claude-haiku-5-5', 'claude-sonnet-5-5']
    }
  },
  google: {
    id: 'google',
    label: 'Google Gemini (официальный)',
    defaultProtocol: 'google',
    allowedProtocols: ['google', 'openai'],
    urls: {
      google: 'https://generativelanguage.googleapis.com',
      openai: 'https://generativelanguage.googleapis.com/v1beta/openai'
    },
    models: {
      google: ['gemini-4-hydrogen', 'gemini-4-neon', 'gemini-2.5-flash'],
      openai: ['gemini-4-hydrogen', 'gemini-4-neon', 'gemini-2.5-flash']
    }
  },
  custom: {
    id: 'custom',
    label: 'Другой провайдер (Custom URL)',
    defaultProtocol: 'openai',
    allowedProtocols: ['openai', 'anthropic', 'google'],
    urls: {
      openai: 'https://api.proxyapi.ru/v1',
      anthropic: 'https://api.proxyapi.ru',
      google: 'https://api.proxyapi.ru'
    },
    models: {
      openai: ['gpt-4o-mini'],
      anthropic: ['claude-haiku-5-5'],
      google: ['gemini-2.5-flash']
    }
  }
};

export const PROTOCOL_LABELS = {
  openai: 'OpenAI (/v1/chat/completions)',
  anthropic: 'Anthropic (/v1/messages)',
  google: 'Google (/v1beta/...:generateContent)'
};

const STORAGE_KEYS = {
  PROVIDER: 'sparkle_ai_provider',
  PROTOCOL: 'sparkle_ai_protocol',
  API_KEY: 'sparkle_ai_api_key',
  KEY_PERSIST: 'sparkle_ai_key_persist',
  BASE_URL: 'sparkle_ai_base_url',
  MODEL: 'sparkle_ai_model',
  THINKING: 'sparkle_ai_thinking',
  PROFILES: 'sparkle_ai_profiles'
};

export const AI_TASK_DEFAULTS = {
  attributes: {
    id: 'attributes',
    label: 'Выделение параметров',
    defaultModel: DEFAULT_MODEL_ID,
    defaultThinking: 'off'
  },
  dashboard: {
    id: 'dashboard',
    label: 'Дашборд (выводы)',
    defaultModel: DEFAULT_MODEL_ID,
    defaultThinking: 'medium'
  },
  risk: {
    id: 'risk',
    label: 'Риск-менеджмент (анализ)',
    defaultModel: DEFAULT_MODEL_ID,
    defaultThinking: 'medium'
  }
};

export function getDefaultThinkingForTask(modelId, task = 'attributes') {
  const entry = getModelCatalogEntry(modelId);
  const isDeep = task === 'dashboard' || task === 'risk' || task === 'risks';
  const preferred = isDeep ? 'medium' : 'off';
  if (!entry) return preferred;
  if (entry.thinkingLevels.includes(preferred)) return preferred;
  if (isDeep) {
    for (const lvl of ['medium', 'low', 'high', 'off']) {
      if (entry.thinkingLevels.includes(lvl)) return lvl;
    }
  }
  return entry.defaultThinking || entry.thinkingLevels[0] || 'off';
}

export class AiService {
  constructor() {
    this.key = '';
    this.persistKey = false;
    this.thinkingLevel = 'off';
    this.profiles = {
      attributes: { model: DEFAULT_MODEL_ID, thinkingLevel: 'off' },
      dashboard: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' },
      risk: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' }
    };
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      this.provider = localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'proxyapi';
      const preset = PROVIDER_PRESETS[this.provider] || PROVIDER_PRESETS.proxyapi;
      this.protocol = localStorage.getItem(STORAGE_KEYS.PROTOCOL) || preset.defaultProtocol;
      const persistFlag = localStorage.getItem(STORAGE_KEYS.KEY_PERSIST);
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
      if (persistFlag === '1' || (persistFlag === null && storedKey)) {
        this.persistKey = true;
        this.key = storedKey;
      } else {
        this.persistKey = false;
        if (!this.key) this.key = '';
      }
      this.baseUrl = localStorage.getItem(STORAGE_KEYS.BASE_URL) || preset.urls[this.protocol] || preset.urls.openai;
      const defaultModel = (preset.models[this.protocol] || preset.models[preset.defaultProtocol] || [DEFAULT_MODEL_ID])[0];
      const legacyModel = localStorage.getItem(STORAGE_KEYS.MODEL) || defaultModel;
      const legacyThinking = localStorage.getItem(STORAGE_KEYS.THINKING);

      let parsedProfiles = null;
      const rawProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (rawProfiles) {
        try { parsedProfiles = JSON.parse(rawProfiles); } catch { parsedProfiles = null; }
      }

      const attrModel = parsedProfiles?.attributes?.model || legacyModel || defaultModel;
      const attrThinkRaw = parsedProfiles?.attributes?.thinkingLevel || legacyThinking;
      const attrThink = attrThinkRaw && THINKING_LEVELS.includes(attrThinkRaw)
        ? attrThinkRaw
        : getDefaultThinkingForTask(attrModel, 'attributes');

      const dashModel = parsedProfiles?.dashboard?.model || defaultModel;
      const dashThinkRaw = parsedProfiles?.dashboard?.thinkingLevel;
      const dashThink = dashThinkRaw && THINKING_LEVELS.includes(dashThinkRaw)
        ? dashThinkRaw
        : getDefaultThinkingForTask(dashModel, 'dashboard');

      const riskModel = parsedProfiles?.risk?.model || dashModel || defaultModel;
      const riskThinkRaw = parsedProfiles?.risk?.thinkingLevel;
      const riskThink = riskThinkRaw && THINKING_LEVELS.includes(riskThinkRaw)
        ? riskThinkRaw
        : getDefaultThinkingForTask(riskModel, 'risk');

      this.profiles = {
        attributes: { model: attrModel, thinkingLevel: attrThink },
        dashboard: { model: dashModel, thinkingLevel: dashThink },
        risk: { model: riskModel, thinkingLevel: riskThink }
      };
      this.model = this.profiles.attributes.model;
      this.thinkingLevel = this.profiles.attributes.thinkingLevel;
    } catch {
      this.provider = 'proxyapi';
      this.protocol = 'openai';
      this.persistKey = false;
      this.key = this.key || '';
      this.baseUrl = 'https://api.proxyapi.ru/v1';
      this.profiles = {
        attributes: { model: DEFAULT_MODEL_ID, thinkingLevel: 'off' },
        dashboard: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' },
        risk: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' }
      };
      this.model = DEFAULT_MODEL_ID;
      this.thinkingLevel = 'off';
    }
  }

  getTaskConfig(task = 'attributes') {
    const key = task === 'dashboard' ? 'dashboard' : ((task === 'risk' || task === 'risks') ? 'risk' : 'attributes');
    const prof = this.profiles?.[key];
    if (prof && prof.model) return { model: prof.model, thinkingLevel: prof.thinkingLevel || getDefaultThinkingForTask(prof.model, key) };
    return { model: this.model || DEFAULT_MODEL_ID, thinkingLevel: getDefaultThinkingForTask(this.model || DEFAULT_MODEL_ID, key) };
  }

  hasKey() {
    return Boolean(this.key && this.key.trim().length > 0);
  }

  getSummaryBadge(task = 'attributes') {
    const provShort = {
      proxyapi: 'ProxyAPI',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      custom: 'Custom'
    }[this.provider] || 'API';
    const cfg = this.getTaskConfig(task);
    const entry = getModelCatalogEntry(cfg.model);
    const modelShort = entry ? entry.label : (cfg.model || 'модель').replace(/^[^/]+\//, '');
    const thinkPart = cfg.thinkingLevel && cfg.thinkingLevel !== 'off' ? ` · ${cfg.thinkingLevel}` : '';
    return this.hasKey()
      ? `${provShort} · ${modelShort}${thinkPart}`
      : `${provShort} · ${modelShort}${thinkPart} (ключ не задан)`;
  }

  persistIfEnabled() {
    try {
      if (this.persistKey) {
        localStorage.setItem(STORAGE_KEYS.KEY_PERSIST, '1');
        localStorage.setItem(STORAGE_KEYS.PROVIDER, this.provider);
        localStorage.setItem(STORAGE_KEYS.PROTOCOL, this.protocol);
        localStorage.setItem(STORAGE_KEYS.BASE_URL, this.baseUrl);
        localStorage.setItem(STORAGE_KEYS.MODEL, this.profiles.attributes.model);
        localStorage.setItem(STORAGE_KEYS.THINKING, this.profiles.attributes.thinkingLevel || 'off');
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(this.profiles));
        if (this.key) {
          localStorage.setItem(STORAGE_KEYS.API_KEY, this.key);
        } else {
          localStorage.removeItem(STORAGE_KEYS.API_KEY);
        }
      } else {
        Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      }
    } catch { /* ignore */ }
  }

  setKeyPersistence(enabled) {
    this.persistKey = Boolean(enabled);
    this.persistIfEnabled();
  }

  saveConfig({ provider, protocol, apiKey, baseUrl, model, thinkingLevel, profiles }) {
    this.provider = provider || 'proxyapi';
    const preset = PROVIDER_PRESETS[this.provider] || PROVIDER_PRESETS.proxyapi;
    this.protocol = protocol || preset.defaultProtocol || 'openai';
    this.key = apiKey ? apiKey.trim() : '';
    this.baseUrl = (baseUrl ? baseUrl.trim() : preset.urls[this.protocol]).replace(/\/+$/, '');

    if (profiles && typeof profiles === 'object') {
      ['attributes', 'dashboard', 'risk'].forEach((k) => {
        const src = profiles[k] || this.profiles[k];
        const m = src?.model ? String(src.model).trim() : DEFAULT_MODEL_ID;
        const entry = getModelCatalogEntry(m);
        let t = src?.thinkingLevel;
        if (!t || !THINKING_LEVELS.includes(t) || (entry && !entry.thinkingLevels.includes(t))) {
          t = getDefaultThinkingForTask(m, k);
        }
        this.profiles[k] = { model: m, thinkingLevel: t };
      });
    } else if (model) {
      const m = model.trim();
      const entry = getModelCatalogEntry(m);
      let t = thinkingLevel;
      if (!t || !THINKING_LEVELS.includes(t) || (entry && !entry.thinkingLevels.includes(t))) {
        t = getDefaultThinkingForTask(m, 'attributes');
      }
      this.profiles.attributes = { model: m, thinkingLevel: t };
    }

    this.model = this.profiles.attributes.model;
    this.thinkingLevel = this.profiles.attributes.thinkingLevel;
    this.persistIfEnabled();
  }

  clearConfig() {
    this.key = '';
    try {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    } catch { /* ignore */ }
  }

  clearAllSettings() {
    this.provider = 'proxyapi';
    this.protocol = 'openai';
    this.key = '';
    this.persistKey = false;
    this.baseUrl = 'https://api.proxyapi.ru/v1';
    this.profiles = {
      attributes: { model: DEFAULT_MODEL_ID, thinkingLevel: 'off' },
      dashboard: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' },
      risk: { model: DEFAULT_MODEL_ID, thinkingLevel: 'medium' }
    };
    this.model = DEFAULT_MODEL_ID;
    this.thinkingLevel = 'off';
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }

  /**
   * Dispatch unified chat completion across OpenAI, Anthropic, or Google Gemini REST protocols.
   */
  async generateCompletion(messages, options = {}) {
    if (!this.hasKey()) {
      throw new Error('Укажите API-ключ в настройках подключения.');
    }

    const base = this.baseUrl.replace(/\/+$/, '');
    const taskCfg = options.task ? this.getTaskConfig(options.task) : null;
    const model = options.model || taskCfg?.model || this.model;
    const temp = options.temperature ?? 0.25;
    const maxTokens = options.max_tokens ?? 1800;
    const thinking = options.thinkingLevel ?? taskCfg?.thinkingLevel ?? this.thinkingLevel ?? 'off';
    const anthropicBudgets = { low: 1024, medium: 4096, high: 10240, xhigh: 16384 };

    if (this.protocol === 'anthropic') {
      const rootBase = base.replace(/\/v1(\/messages)?$/, '');
      const endpoint = `${rootBase}/v1/messages`;
      const sysMsg = messages.find((m) => m.role === 'system')?.content;
      const userMsgs = messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const headers = {
        'content-type': 'application/json',
        'x-api-key': this.key,
        'anthropic-version': '2023-06-01'
      };
      if (this.provider === 'anthropic') {
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }

      const body = { model, max_tokens: maxTokens, messages: userMsgs };
      if (thinking !== 'off' && anthropicBudgets[thinking]) {
        const budget = anthropicBudgets[thinking];
        body.thinking = { type: 'enabled', budget_tokens: budget };
        body.max_tokens = Math.max(maxTokens, budget + 1024);
      } else {
        body.temperature = temp;
      }
      if (sysMsg) {
        body.system = options.cacheSystem === false
          ? sysMsg
          : [{ type: 'text', text: sysMsg, cache_control: { type: 'ephemeral' } }];
      }

      const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(extractErrorMessage(resp, data));
      return (data.content || []).filter((c) => c.type !== 'thinking').map((c) => c.text || '').join('');
    }

    if (this.protocol === 'google') {
      const rootBase = base.replace(/\/v1beta.*$/, '');
      const cleanModel = model.replace(/^models\//, '');
      const endpoint = `${rootBase}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
      const sysMsg = messages.find((m) => m.role === 'system')?.content;
      const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const generationConfig = { temperature: temp, maxOutputTokens: maxTokens };
      if (/gemini-4/i.test(cleanModel)) {
        const lvl = thinking === 'off' ? 'low' : thinking;
        generationConfig.thinkingConfig = { thinkingLevel: lvl.toUpperCase() };
      } else if (/gemini-2\.5/i.test(cleanModel)) {
        const budgets = { off: 0, low: 1024, medium: 4096, high: 10240, xhigh: 16384 };
        generationConfig.thinkingConfig = { thinkingBudget: budgets[thinking] ?? 0 };
      }

      const body = { contents, generationConfig };
      if (sysMsg) body.systemInstruction = { parts: [{ text: sysMsg }] };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.key
        },
        body: JSON.stringify(body)
      });
      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(extractErrorMessage(resp, data));
      return (data.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    }

    // Default: OpenAI / Chat Completions compatible (including ProxyAPI unified endpoint)
    const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    const oaiBody = {
      model,
      messages,
      temperature: temp,
      max_tokens: maxTokens
    };
    if (thinking && thinking !== 'off') {
      oaiBody.reasoning_effort = thinking;
    }
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.key}`
      },
      body: JSON.stringify(oaiBody)
    });
    const data = await safeJson(resp);
    if (!resp.ok) throw new Error(extractErrorMessage(resp, data));
    return data.choices?.[0]?.message?.content || '';
  }

  async testConnection() {
    return this.generateCompletion(
      [{ role: 'user', content: 'Ответь одним словом: OK' }],
      { max_tokens: 16, temperature: 0 }
    );
  }

  /**
   * Generate strategic SKU & pricing recommendations from Margin Map + Elasticity + Seasonality.
   * Uses a stable invariant system prompt with cacheSystem: true for provider prompt caching.
   */
  async analyzeMarginMap(margMap) {
    const items = margMap?.items || [];
    const lines = items.map((it) => {
      const profit = Number.isFinite(it.profit_rub) ? it.profit_rub : ((it.sales_rub || 0) - (it.costs_rub || 0));
      const quad = it.quadrant_ru || it.quadrant || '—';
      let line = `${it.category} | ${it.product} | Выручка: ${Math.round(it.sales_rub || 0)} ₽ | Прибыль: ${Math.round(profit)} ₽ | Маржа: ${(it.margin_pct || 0).toFixed(1)}% | Группа: ${quad}`;
      if (it.elasticity) {
        const el = it.elasticity;
        line += ` | E≈${el.elast.toFixed(1)} (${el.status}) | Ср.цена: ${Math.round(el.avgPrice)} ₽ (диапазон ${Math.round(el.minPrice)}–${Math.round(el.maxPrice)} ₽) | Ср.объём: ${Math.round(el.avgVol)} шт (${el.count} т.) | Подсказка: ${el.advice}`;
      }
      if (it.seasonality && Number.isFinite(it.seasonality.maxS)) {
        const se = it.seasonality;
        line += ` | Сезонность: пик мес.${se.maxSM} (×${se.maxS.toFixed(2)}), спад мес.${se.minSM} (×${se.minS.toFixed(2)})`;
      }
      return line;
    }).join('\n');

    const periodInfo = margMap?.periodRange
      ? `матрица за ${margMap.year || ''} г., эластичность/сезонность за ${margMap.periodRange}`
      : `за ${margMap?.year || ''} год`;
    const filterInfo = margMap?.filterNote ? `\nАктивные фильтры: ${margMap.filterNote}` : '';

    // Stable invariant system prompt for automatic (DeepSeek/Xiaomi/OpenAI/Google) & explicit (Anthropic) prompt caching
    const systemPrompt = [
      'Ты ведущий коммерческий аналитик по управлению ассортиментом, ценообразованием и ростом прибыли.',
      'В данных по каждому товару (SKU) могут присутствовать: выручка, прибыль, маржа, группа матрицы (Звёзды, Повысить маржу, Растить продажи, Отстающие), ценовая эластичность E (средняя цена, диапазон цен, средний объём, реакция покупателей и базовая подсказка) и сезонность.',
      'Правила интерпретации эластичности E: E < -1 — сильная реакция на цену (выгоднее промо/акции, повышать цену опасно); -1 < E < 0 — устойчивый спрос (есть запас для плавного повышения цены); E ≈ 0 — цена почти не влияет (решают наличие, сезонность, трафик); E > 0 — нетипичный рост с ценой (проверить высокий сезон или дефицит).',
      'Пиши кратко, структурированно, простым и понятным языком на русском. Опирайся на конкретные цифры (выручку, маржу, E, диапазон цен и сезонность) из переданной таблицы, не выдумывая отсутствующие данные.'
    ].join('\n');

    return this.generateCompletion([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Проанализируй товары (${periodInfo})${filterInfo} и подготовь:\n1) Топ-3 товара с наибольшим потенциалом роста прибыли (с указанием E, цены и маржи);\n2) Конкретные действия по ценам, промо и ассортименту для каждого товара;\n3) На что обратить внимание по рискам (отстающие, сильная эластичность или аномалии E > 0).\n\nДанные (${items.length} SKU):\n${lines}`
      }
    ], { task: 'dashboard', cacheSystem: true });
  }

  /**
   * Extract arbitrary user-requested attributes from receipt strings via AI (ask_agent equivalent).
   * Uses index-keyed rows (0#val1#val2...) without echoing raw names (~35-40% fewer output tokens
   * and zero index drift), plus an invariant Russian FMCG glossary + few-shot prefix for prompt caching.
   */
  async extractAttributesWithAi(headers, productLines, customInstructions = '', { onProgress = null, batchSize = 50, prefilledByProduct = null } = {}) {
    const headerStr = headers.join(' | ');
    const extraInstr = customInstructions && customInstructions.trim()
      ? `\n\nДополнительные инструкции аналитика:\n${customInstructions.trim()}`
      : '';
    const hasPrefilled = Boolean(prefilledByProduct && prefilledByProduct.size > 0);
    const verifyRule = hasPrefilled
      ? '\nЕсли в конце строки указано [уже указано: Столбец=Значение], проверь его корректность (с учётом синонимов и укрупнённых категорий). Всегда сохраняй исходное указанное значение в соответствующем столбце и выделяй остальные. Если значение противоречит товару, добавь в конец строки #DISPUTED:Столбец=ОжидаемоеЗначение (несколько через ;).'
      : '';

    const glossaryBlock = [
      'Словарь сокращений РФ: БЗМЖ=без заменителя молочного жира, ЗМЖ=с заменителем молочного жира, м.д.ж.=жирность, ж/б=жестяная банка, ст/б=стеклянная банка/бутылка, пэт или пл/б=ПЭТ-бутылка, т/п=тетрапак, д/п=дой-пак, ф/п=флоу-пак, п/п=пакет/полипропилен, в/у=вакуумная упаковка, с/м=свежемороженое, охл=охлаждённое, г/к=горячего копчения, х/к=холодного копчения, с/с=слабосолёное, в/с=высший сорт, б/с=без сахара, б/к=без кости или без кофеина, н/г=негазированная, г/г=газированная.',
      'Примеры разбора:',
      '0: Сметана Простоквашино 20% 300г ст/б БЗМЖ -> Категория=Сметана, Бренд=Простоквашино, Жирность=20%, Вес/Объём=300 г, Упаковка=Стеклянная банка',
      '1: Напиток Добрый Кола 1л пэт б/с -> Категория=Газированный напиток, Бренд=Добрый, Вкус=Кола без сахара, Вес/Объём=1 л, Упаковка=ПЭТ-бутылка',
      '2: Форель с/с Русское море 150г в/у филе-кусок -> Категория=Рыба слабосолёная, Бренд=Русское море, Вес/Объём=150 г, Упаковка=Вакуумная упаковка'
    ].join('\n');

    // Invariant leading prefix for automatic (DeepSeek / OpenAI / Google) and explicit (Anthropic cache_control) prompt caching
    const systemPrompt = [
      'Ты точный аналитический парсер русскоязычных розничных и чековых номенклатур FMCG.',
      glossaryBlock,
      `Извлеки из каждой пронумерованной строки (0:, 1:, ...) параметры строго в порядке: [${headerStr}].`,
      `Формат ответа: ТОЛЬКО строки таблицы без заголовка и пояснений — по одной строке на товар, разделитель # (ровно ${headers.length + 1} полей: первый столбец — ТОЛЬКО номер строки 0, 1, 2... без повторения исходного названия, далее значения параметров по порядку). Если параметр не найден, поставь —.`
    ].join('\n') + verifyRule + extraInstr;

    const uniqueMap = new Map();
    productLines.forEach((raw) => {
      const key = raw.trim();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, null);
      }
    });

    const uniqueKeys = [...uniqueMap.keys()];
    const totalBatches = Math.max(1, Math.ceil(uniqueKeys.length / batchSize));
    const tStart = Date.now();

    for (let b = 0; b < totalBatches; b++) {
      const slice = uniqueKeys.slice(b * batchSize, (b + 1) * batchSize);
      if (onProgress) {
        const pct = Math.min(95, Math.max(5, Math.round((b / totalBatches) * 90) + 5));
        const elapsedSec = (Date.now() - tStart) / 1000;
        let eta = '';
        if (b >= 1 && elapsedSec > 1) {
          const remSec = Math.round((elapsedSec / b) * (totalBatches - b));
          eta = remSec >= 60 ? ` · ~${Math.ceil(remSec / 60)} мин` : ` · ~${remSec} сек`;
        }
        onProgress({
          pct,
          stage: `API-разбор (${pct}%): пакет ${b + 1}/${totalBatches} (${b * batchSize}/${uniqueKeys.length} товаров)${eta}`
        });
      }

      const batchLines = slice.map((key, idx) => {
        const pf = hasPrefilled ? prefilledByProduct.get(key) : null;
        if (!pf) return `${idx}: ${key}`;
        const pairs = Object.entries(pf).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
        return pairs.length ? `${idx}: ${key} [уже указано: ${pairs.join(', ')}]` : `${idx}: ${key}`;
      });

      const raw = await this.generateCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Строки (0..${slice.length - 1}):\n${batchLines.join('\n')}` }
      ], { task: 'attributes', temperature: 0.1, max_tokens: 4096, cacheSystem: true });

      const outLines = raw.split('\n').map((s) => s.trim()).filter((s) => s && s.includes('#'));
      // Map by explicit leading row index (0#...) to eliminate silent index drift
      const indexedParts = new Map();
      outLines.forEach((line, pos) => {
        const parts = line.split('#').map((x) => x.trim());
        const mIdx = parts[0].match(/^(\d+)/);
        if (mIdx) {
          const rowNum = Number(mIdx[1]);
          if (rowNum >= 0 && rowNum < slice.length && !indexedParts.has(rowNum)) {
            indexedParts.set(rowNum, parts);
            return;
          }
        }
        if (!indexedParts.has(pos) && pos < slice.length) {
          indexedParts.set(pos, parts);
        }
      });

      slice.forEach((orig, idx) => {
        const parts = indexedParts.get(idx) || [];
        const disputes = {};
        if (parts.length > headers.length + 1) {
          const tail = parts.slice(headers.length + 1).join('#');
          const m = tail.match(/DISPUTED:(.+)/i);
          if (m) {
            m[1].split(';').forEach((pair) => {
              const eqIdx = pair.indexOf('=');
              if (eqIdx > 0) {
                const col = pair.slice(0, eqIdx).trim();
                const exp = pair.slice(eqIdx + 1).trim();
                if (col) disputes[col] = exp || 'требует проверки';
              }
            });
          }
        }
        const pf = hasPrefilled ? prefilledByProduct.get(orig) : null;
        const attributes = {};
        headers.forEach((h, colIdx) => {
          if (pf && pf[h]) {
            attributes[h] = pf[h];
          } else {
            attributes[h] = parts[colIdx + 1] || '—';
          }
        });
        uniqueMap.set(orig, { attributes, disputes });
      });
    }

    if (onProgress) {
      onProgress({ pct: 100, stage: `Готово (100%): ${uniqueKeys.length} уник. товаров` });
    }

    return productLines.map((orig) => {
      const entry = uniqueMap.get(orig.trim());
      return {
        raw: orig,
        attributes: entry?.attributes || Object.fromEntries(headers.map((h) => [h, '—'])),
        disputes: entry?.disputes || {}
      };
    });
  }

  /**
   * Analyze intersections of PESTEL / Horizon Scanning signals and propose concrete risks for the 3x3 Risk Map.
   * Uses invariant system prompt with cacheSystem: true for prompt caching.
   */
  async analyzeRiskIntersections(signals = []) {
    const list = (signals || []).slice(0, 24);
    if (list.length < 2) {
      throw new Error('Для анализа стыков нужно минимум 2 сигнала в выборке.');
    }

    const systemPrompt = [
      'Ты ведущий риск-менеджер и стратег по методологии Horizon Scanning и PESTEL.',
      'Твоя задача — находить неочевидные операционные и финансовые риски на СТЫКАХ (пересечениях) 2–3 внешних сигналов.',
      'Верни СТРОГО валидный JSON-массив из 3–4 объектов без markdown-обёртки и пояснений.',
      'Формат каждого объекта:',
      '{"title":"Краткая формулировка риска (до 90 символов)","signals":"Какие 2–3 сигнала пересекаются","rationale":"Почему их стык опасен для маржи/операций (1–2 предложения)","probability":0|1|2,"impact":0|1|2}',
      'Где probability: 0=Вероятно (высокая), 1=Возможно (средняя), 2=Маловероятно (низкая); impact: 0=Небольшое, 1=Умеренное, 2=Существенное.',
      'Отвечай простым деловым русским языком.'
    ].join('\n');

    const lines = list.map((s, idx) =>
      `${idx + 1}. [${s.pestelLabel || s.pestel} | ${s.curveLabel || s.curve}${s.period ? ` | ${s.period}` : ''}] ${s.title}${s.impact ? ` — ${s.impact}` : ''}`
    ).join('\n');

    const raw = await this.generateCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Найди 3–4 ключевых риска на стыках этих сигналов:\n${lines}` }
    ], { task: 'risk', temperature: 0.3, max_tokens: 1200, cacheSystem: true });

    return parseRiskIntersectionsJson(raw);
  }
}

function parseRiskIntersectionsJson(raw) {
  const txt = String(raw || '').trim();
  const tryParse = (str) => {
    try {
      const parsed = JSON.parse(str);
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.risks) ? parsed.risks : null);
      if (!arr) return null;
      return arr
        .filter((x) => x && typeof x === 'object' && String(x.title || '').trim())
        .slice(0, 5)
        .map((x) => ({
          title: String(x.title).trim().slice(0, 140),
          signals: String(x.signals || '').trim().slice(0, 180),
          rationale: String(x.rationale || '').trim().slice(0, 320),
          probability: [0, 1, 2].includes(Number(x.probability)) ? Number(x.probability) : 1,
          impact: [0, 1, 2].includes(Number(x.impact)) ? Number(x.impact) : 1
        }));
    } catch {
      return null;
    }
  };

  const direct = tryParse(txt);
  if (direct?.length) return direct;

  const arrMatch = txt.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const parsed = tryParse(arrMatch[0]);
    if (parsed?.length) return parsed;
  }

  const objMatch = txt.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const parsed = tryParse(objMatch[0]);
    if (parsed?.length) return parsed;
  }

  // Fallback: split numbered lines if model ignored JSON
  const lines = txt.split('\n').map((s) => s.replace(/^[\d•\-*.)\s]+/, '').trim()).filter((s) => s.length > 8);
  if (lines.length) {
    return lines.slice(0, 4).map((line) => ({
      title: line.slice(0, 110),
      signals: 'Пересечение выбранных сигналов PESTEL',
      rationale: line.length > 110 ? line : 'Требует оценки влияния на маржу и цепочку поставок.',
      probability: 1,
      impact: 1
    }));
  }
  throw new Error('AI вернул пустой или нераспознаваемый ответ.');
}

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(resp, data) {
  return data?.error?.message || data?.message || `HTTP ${resp.status} ${resp.statusText}`;
}

export const aiService = new AiService();
