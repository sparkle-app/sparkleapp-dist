/**
 * Sparkle Level 2 Local Browser AI Service (WebGPU + Zero-Server Cache Lifecycle)
 * Provides commercially permissive open-weight models (Qwen3 0.6B/1.7B/4B/8B, Apache 2.0)
 * via WebLLM in a background Web Worker, optional custom S3 mirror URL,
 * and strict auto-purge on tab close by default.
 */

// Держите версию синхронной с импортом в local_llm_worker.js
const WEBLLM_VERSION = '0.2.89';
const WEBLLM_CDN = `https://esm.run/@mlc-ai/web-llm@${WEBLLM_VERSION}`;

export const LOCAL_MODEL_TIERS = {
  'qwen3-0.6b': {
    key: 'qwen3-0.6b',
    id: 'Qwen3-0.6B-q4f16_1-MLC',
    hfUrl: 'https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC',
    shortName: 'Qwen3 0.6B',
    group: 'Смартфоны и лёгкие ноутбуки',
    selectLabel: 'Qwen3 0.6B (~450 МБ · смартфоны / лёгкая)',
    sizeText: '~450 МБ',
    dlTimeText: '~1–2 мин',
    dlDetailText: '~1–2 мин (~450 МБ при 50 Мбит/с)',
    vramText: '~1,0 ГБ VRAM',
    vramShort: '~1 ГБ',
    qualityScore: 3.9,
    minRamGb: 2,
    minStorageGb: 0.6,
    minMaxBufferMb: 128,
    allowMobile: true,
    requiresF16: true,
    tpsText: '~65–110 ток/с',
    batchEtaText: '~2–4 мин / 1 000 товаров',
    speedDetailText: '~2–4 мин / 1 000 товаров (~65–110 ток/с)',
    qualityNote: 'Сверхлёгкий каркас для смартфонов и iOS Safari (дотягивается Wasm-словарями)',
    accuracyShort: '3.9/10 · Лёгкая (смартфоны)',
    license: 'Apache 2.0 (коммерция разрешена)',
    licenseShort: 'Apache 2.0 (коммерция разрешена)',
    licenseUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B/blob/main/LICENSE'
  },
  'qwen3-1.7b': {
    key: 'qwen3-1.7b',
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    hfUrl: 'https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC',
    shortName: 'Qwen3 1.7B',
    group: 'Смартфоны и лёгкие ноутбуки',
    selectLabel: 'Qwen3 1.7B (~1,1 ГБ · быстрая)',
    sizeText: '~1,1 ГБ',
    dlTimeText: '~3–4 мин',
    dlDetailText: '~3–4 мин (~1,1 ГБ при 50 Мбит/с)',
    vramText: '~2,0 ГБ VRAM',
    vramShort: '~2 ГБ',
    qualityScore: 5.4,
    minRamGb: 4,
    minStorageGb: 1.3,
    minMaxBufferMb: 256,
    allowMobile: true,
    requiresF16: true,
    tpsText: '~35–60 ток/с',
    batchEtaText: '~3–6 мин / 1 000 товаров',
    speedDetailText: '~3–6 мин / 1 000 товаров (~35–60 ток/с)',
    qualityNote: 'Хорошо справляется с базовым русским ритейлом (non-thinking + короткий XGrammar JSON)',
    accuracyShort: '5.4/10 · Базовая (типовые чеки)',
    license: 'Apache 2.0 (коммерция разрешена)',
    licenseShort: 'Apache 2.0 (коммерция разрешена)',
    licenseUrl: 'https://huggingface.co/Qwen/Qwen3-1.7B/blob/main/LICENSE'
  },
  'qwen3-4b': {
    key: 'qwen3-4b',
    id: 'Qwen3-4B-q4f16_1-MLC',
    hfUrl: 'https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC',
    shortName: 'Qwen3 4B',
    group: 'ПК и мощные ноутбуки',
    selectLabel: 'Qwen3 4B (~2,5 ГБ · баланс)',
    sizeText: '~2,5 ГБ',
    dlTimeText: '~6–9 мин',
    dlDetailText: '~6–9 мин (~2,5 ГБ при 50 Мбит/с)',
    vramText: '~3,4 ГБ VRAM',
    vramShort: '~3,4 ГБ',
    qualityScore: 6.7,
    minRamGb: 8,
    minStorageGb: 2.8,
    minMaxBufferMb: 512,
    allowMobile: false,
    requiresF16: true,
    tpsText: '~20–45 ток/с',
    batchEtaText: '~5–10 мин / 1 000 товаров',
    speedDetailText: '~5–10 мин / 1 000 товаров (~20–45 ток/с)',
    qualityNote: 'Оптимальный баланс скорости и точности на сложных чеках РФ (non-thinking + короткий XGrammar JSON)',
    accuracyShort: '6.7/10 · Баланс (сложные чеки)',
    license: 'Apache 2.0 (коммерция разрешена)',
    licenseShort: 'Apache 2.0 (коммерция разрешена)',
    licenseUrl: 'https://huggingface.co/Qwen/Qwen3-4B/blob/main/LICENSE'
  },
  'qwen3-8b': {
    key: 'qwen3-8b',
    id: 'Qwen3-8B-q4f16_1-MLC',
    hfUrl: 'https://huggingface.co/mlc-ai/Qwen3-8B-q4f16_1-MLC',
    shortName: 'Qwen3 8B',
    group: 'ПК и мощные ноутбуки',
    selectLabel: 'Qwen3 8B (~4,8 ГБ · высокая точность)',
    sizeText: '~4,8 ГБ',
    dlTimeText: '~12–16 мин',
    dlDetailText: '~12–16 мин (~4,8 ГБ при 50 Мбит/с)',
    vramText: '~6,0 ГБ VRAM (GPU ≥ 8 ГБ)',
    vramShort: '~6 ГБ',
    qualityScore: 7.5,
    minRamGb: 8,
    minStorageGb: 5.2,
    minMaxBufferMb: 1024,
    allowMobile: false,
    requiresF16: true,
    tpsText: '~20–50 ток/с',
    batchEtaText: '~6–12 мин / 1 000 товаров',
    speedDetailText: '~6–12 мин / 1 000 товаров (~20–50 ток/с)',
    qualityNote: 'Высокая локальная точность в браузере для дискретных GPU ≥ 8 ГБ VRAM (RTX 4060/5070, Mac ≥ 16 ГБ)',
    accuracyShort: '7.5/10 · Высокая (сложные чеки)',
    license: 'Apache 2.0 (коммерция разрешена)',
    licenseShort: 'Apache 2.0 (коммерция разрешена)',
    licenseUrl: 'https://huggingface.co/Qwen/Qwen3-8B/blob/main/LICENSE'
  }
};

function stripThinkTags(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

function normalizeMirrorUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.username || u.password) return '';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal)) return '';
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function isTrustedHfModelUrl(rawUrl, expectedHfUrl) {
  try {
    const actual = new URL(String(rawUrl || ''));
    const expected = new URL(expectedHfUrl);
    const actualPath = actual.pathname.replace(/\/+$/, '');
    const expectedPath = expected.pathname.replace(/\/+$/, '');
    return (
      !actual.username &&
      !actual.password &&
      actual.protocol === 'https:' &&
      actual.hostname === 'huggingface.co' &&
      expected.hostname === 'huggingface.co' &&
      expectedPath.startsWith('/mlc-ai/') &&
      (actualPath === expectedPath || actualPath.startsWith(`${expectedPath}/`))
    );
  } catch {
    return false;
  }
}

function isTrustedModelLibUrl(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ''));
    return (
      !u.username &&
      !u.password &&
      u.protocol === 'https:' &&
      u.hostname === 'raw.githubusercontent.com' &&
      u.pathname.startsWith('/mlc-ai/binary-mlc-llm-libs/') &&
      u.pathname.endsWith('.wasm')
    );
  } catch {
    return false;
  }
}

const STORAGE_KEYS = {
  MODEL_KEY: 'sparkle_local_model_key',
  CACHE_ENABLED: 'sparkle_local_cache_enabled',
  DIRTY_PURGE: 'sparkle_local_cache_dirty',
  MIRROR_URL: 'sparkle_local_mirror_url'
};

class LocalLlmService {
  constructor() {
    this.worker = null;
    this.engine = null;
    this.loadedModelId = '';
    this.webllm = null;
    this.aborted = false;
    this.isBusy = false;

    this.modelKey = this.getStoredModelKey();
    this.cacheEnabled = this.getStoredCacheEnabled();
    this.mirrorUrl = this.getStoredMirrorUrl();
    this.capabilities = null;
  }

  getStoredModelKey() {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.MODEL_KEY);
      return LOCAL_MODEL_TIERS[v] ? v : 'qwen3-4b';
    } catch {
      return 'qwen3-4b';
    }
  }

  setModelKey(key) {
    this.modelKey = LOCAL_MODEL_TIERS[key] ? key : 'qwen3-4b';
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_KEY, this.modelKey);
    } catch { /* ignore */ }
  }

  getStoredCacheEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CACHE_ENABLED) === '1';
    } catch {
      return false;
    }
  }

  setCacheEnabled(enabled) {
    this.cacheEnabled = Boolean(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.CACHE_ENABLED, this.cacheEnabled ? '1' : '0');
      if (this.cacheEnabled) {
        localStorage.removeItem(STORAGE_KEYS.DIRTY_PURGE);
      }
    } catch { /* ignore */ }
  }

  getStoredMirrorUrl() {
    try {
      return normalizeMirrorUrl(localStorage.getItem(STORAGE_KEYS.MIRROR_URL) || '');
    } catch {
      return '';
    }
  }

  setMirrorUrl(url) {
    const raw = String(url || '').trim();
    const normalized = normalizeMirrorUrl(raw);
    if (raw && !normalized) {
      console.warn('[LocalLlmService] Некорректный URL зеркала (требуется https://):', raw);
    }
    this.mirrorUrl = normalized;
    try {
      if (this.mirrorUrl) {
        localStorage.setItem(STORAGE_KEYS.MIRROR_URL, this.mirrorUrl);
      } else {
        localStorage.removeItem(STORAGE_KEYS.MIRROR_URL);
      }
    } catch { /* ignore */ }
    // Reset loaded worker if source mirror changed cleanly
    if (this.loadedModelId && !this.isBusy) {
      this.terminateWorker();
    }
  }

  getActiveModelSpec() {
    return LOCAL_MODEL_TIERS[this.modelKey] || LOCAL_MODEL_TIERS['qwen3-4b'];
  }

  isEngineReadyForCurrentModel() {
    const spec = this.getActiveModelSpec();
    return Boolean(this.engine && this.loadedModelId === spec.id);
  }

  getDirtyFlag() {
    try {
      return localStorage.getItem(STORAGE_KEYS.DIRTY_PURGE) === '1';
    } catch {
      return false;
    }
  }

  markDirtyIfEphemeral() {
    if (!this.cacheEnabled) {
      try {
        localStorage.setItem(STORAGE_KEYS.DIRTY_PURGE, '1');
      } catch { /* ignore */ }
    }
  }

  async ensureWebLlmLoaded() {
    if (!this.webllm) {
      this.webllm = await import(WEBLLM_CDN);
    }
    return this.webllm;
  }

  async checkWebGpuSupport() {
    if (!('gpu' in navigator) || typeof navigator.gpu?.requestAdapter !== 'function') {
      return { ok: false, reason: 'Браузер не поддерживает WebGPU (нужен современный Chrome/Edge или Safari с WebGPU).' };
    }
    try {
      const adapter = (await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }))
        || (await navigator.gpu.requestAdapter());
      if (!adapter) {
        return { ok: false, reason: 'Не найден совместимый GPU-адаптер WebGPU.' };
      }
      const maxBufferBytes = adapter.limits?.maxBufferSize || null;
      const maxStorageBytes = adapter.limits?.maxStorageBufferBindingSize || null;
      const hasF16 = Boolean(adapter.features && typeof adapter.features.has === 'function' && adapter.features.has('shader-f16'));
      let info = adapter.info || null;
      if (!info && typeof adapter.requestAdapterInfo === 'function') {
        try { info = await adapter.requestAdapterInfo(); } catch { /* ignore */ }
      }
      const rawVendor = String(info?.vendor || '').trim();
      const rawArch = String(info?.architecture || '').trim();
      const rawDesc = String(info?.description || '').trim();
      const vendorMap = { nvidia: 'NVIDIA', amd: 'AMD', intel: 'Intel', apple: 'Apple', qualcomm: 'Qualcomm', arm: 'ARM' };
      const vendorNice = vendorMap[rawVendor.toLowerCase()] || (rawVendor ? rawVendor.toUpperCase() : '');
      const gpuLabel = rawDesc && rawDesc.length <= 36
        ? rawDesc
        : [vendorNice, rawArch].filter(Boolean).join(' ').trim();

      return {
        ok: true,
        maxBufferMb: maxBufferBytes ? Math.round(maxBufferBytes / (1024 * 1024)) : null,
        maxStorageMb: maxStorageBytes ? Math.round(maxStorageBytes / (1024 * 1024)) : null,
        hasF16,
        gpuVendor: rawVendor.toLowerCase(),
        gpuLabel
      };
    } catch (err) {
      return { ok: false, reason: `Ошибка инициализации WebGPU: ${err.message}` };
    }
  }

  async inspectDeviceCapabilities(force = false) {
    if (this.capabilities && !force) return this.capabilities;

    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && typeof screen !== 'undefined' && Math.min(screen.width, screen.height) <= 820);

    // Note: Chromium caps navigator.deviceMemory at 8 GB for privacy even on 32/64 GB PCs.
    const deviceMemoryGb = (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number' && navigator.deviceMemory > 0)
      ? navigator.deviceMemory
      : null;

    const gpu = await this.checkWebGpuSupport();

    let freeStorageGb = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
        const est = await navigator.storage.estimate();
        if (typeof est.quota === 'number' && typeof est.usage === 'number') {
          freeStorageGb = Math.max(0, (est.quota - est.usage) / (1024 ** 3));
        }
      }
    } catch { /* ignore */ }

    const models = {};
    for (const [key, spec] of Object.entries(LOCAL_MODEL_TIERS)) {
      if (!gpu.ok) {
        models[key] = { available: false, reason: gpu.reason || 'WebGPU недоступен' };
      } else if (spec.requiresF16 && !gpu.hasF16) {
        models[key] = { available: false, reason: 'GPU/драйвер WebGPU не поддерживает shader-f16 (нужно для q4f16_1)' };
      } else if (isMobile && !spec.allowMobile) {
        models[key] = { available: false, reason: 'Мобильный браузер: высокий риск OOM (используйте 1.7B или 0.6B)' };
      } else if (deviceMemoryGb !== null && deviceMemoryGb < spec.minRamGb) {
        models[key] = { available: false, reason: `Мало ОЗУ (${deviceMemoryGb} ГБ, нужно ≥ ${spec.minRamGb} ГБ)` };
      } else if (gpu.maxBufferMb !== null && gpu.maxBufferMb < spec.minMaxBufferMb) {
        models[key] = { available: false, reason: `Лимит буфера WebGPU ${gpu.maxBufferMb} МБ (нужно ≥ ${spec.minMaxBufferMb} МБ)` };
      } else if (freeStorageGb !== null && freeStorageGb < spec.minStorageGb) {
        models[key] = { available: false, reason: `Мало места в кэше браузера (${freeStorageGb.toFixed(1)} ГБ, нужно ≥ ${spec.minStorageGb} ГБ)` };
      } else {
        models[key] = { available: true, reason: '' };
      }
    }

    let recommendedModelKey = 'qwen3-4b';
    if (isMobile) {
      recommendedModelKey = (!isIos && deviceMemoryGb !== null && deviceMemoryGb >= 6 && models['qwen3-1.7b']?.available)
        ? 'qwen3-1.7b'
        : (models['qwen3-0.6b']?.available ? 'qwen3-0.6b' : 'qwen3-1.7b');
    } else if (!models['qwen3-4b']?.available) {
      recommendedModelKey = models['qwen3-1.7b']?.available ? 'qwen3-1.7b' : 'qwen3-0.6b';
    }

    // Auto-fallback if currently selected model is not supported on this device
    if (!models[this.modelKey]?.available && models[recommendedModelKey]?.available) {
      this.modelKey = recommendedModelKey;
    }

    this.capabilities = {
      webgpuOk: gpu.ok,
      webgpuReason: gpu.reason || '',
      isMobile,
      deviceMemoryGb,
      maxBufferMb: gpu.maxBufferMb || null,
      maxStorageMb: gpu.maxStorageMb || null,
      hasF16: Boolean(gpu.hasF16),
      gpuVendor: gpu.gpuVendor || '',
      gpuLabel: gpu.gpuLabel || '',
      freeStorageGb,
      models,
      recommendedModelKey
    };
    return this.capabilities;
  }

  async inspectCacheStatus() {
    let webllmKeysCount = 0;
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const name of keys) {
          if (name.startsWith('webllm')) {
            const cache = await caches.open(name);
            const entries = await cache.keys();
            webllmKeysCount += entries.length;
          }
        }
      }
    } catch { /* ignore */ }

    if (webllmKeysCount > 0) {
      return { cached: true, entries: webllmKeysCount };
    }

    try {
      if (this.webllm) {
        for (const spec of Object.values(LOCAL_MODEL_TIERS)) {
          if (await this.webllm.hasModelInCache(spec.id)) {
            return { cached: true, entries: 1, model: spec.shortName };
          }
        }
      }
    } catch { /* ignore */ }

    return { cached: false, entries: 0 };
  }

  terminateWorker() {
    this.aborted = true;
    this.isBusy = false;
    if (this.engine && typeof this.engine.unload === 'function') {
      try {
        this.engine.unload();
      } catch { /* ignore */ }
    }
    this.engine = null;
    this.loadedModelId = '';
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch { /* ignore */ }
      this.worker = null;
    }
  }

  purgeStorageBestEffortSync() {
    this.terminateWorker();
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.filter((n) => n.startsWith('webllm')).forEach((n) => caches.delete(n));
        }).catch(() => {});
      }
      if ('indexedDB' in window) {
        ['webllm/model', 'webllm/config', 'webllm/wasm'].forEach((dbName) => {
          try { indexedDB.deleteDatabase(dbName); } catch { /* ignore */ }
        });
        if (typeof indexedDB.databases === 'function') {
          indexedDB.databases().then((dbs) => {
            dbs.filter((d) => d.name && d.name.includes('webllm')).forEach((d) => {
              try { indexedDB.deleteDatabase(d.name); } catch { /* ignore */ }
            });
          }).catch(() => {});
        }
      }
    } catch { /* ignore */ }
  }

  async purgeCacheFilesOnly() {
    try {
      if (this.webllm?.deleteModelAllInfoInCache) {
        for (const spec of Object.values(LOCAL_MODEL_TIERS)) {
          await this.webllm.deleteModelAllInfoInCache(spec.id).catch(() => {});
        }
      }
    } catch { /* ignore */ }

    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(
          names.filter((n) => n.startsWith('webllm')).map((n) => caches.delete(n))
        );
      }
    } catch { /* ignore */ }

    try {
      if ('indexedDB' in window) {
        const candidateDbs = new Set(['webllm/model', 'webllm/config', 'webllm/wasm']);
        if (typeof indexedDB.databases === 'function') {
          const dbs = await indexedDB.databases();
          dbs.forEach((d) => {
            if (d.name && d.name.includes('webllm')) candidateDbs.add(d.name);
          });
        }
        await Promise.all([...candidateDbs].map((name) => new Promise((resolve) => {
          try {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        })));
      }
    } catch { /* ignore */ }

    try {
      localStorage.removeItem(STORAGE_KEYS.DIRTY_PURGE);
    } catch { /* ignore */ }
  }

  async purgeAllLocalCaches() {
    this.terminateWorker();
    await this.purgeCacheFilesOnly();
  }

  buildAppConfig(webllm, modelId) {
    const spec = Object.values(LOCAL_MODEL_TIERS).find((t) => t.id === modelId);
    if (!spec) {
      throw new Error(`Неизвестная локальная модель: ${modelId}`);
    }

    const baseCfg = {
      ...webllm.prebuiltAppConfig,
      useIndexedDBCache: false
    };

    const entry = (baseCfg.model_list || []).find((item) => item.model_id === modelId);
    if (!entry) {
      throw new Error(`Модель ${modelId} не найдена в webllm.prebuiltAppConfig.`);
    }

    if (!isTrustedModelLibUrl(entry.model_lib)) {
      throw new Error(`Отклонён недоверенный адрес WebGPU-шейдера (.wasm): ${entry.model_lib}`);
    }

    const mirrorClean = normalizeMirrorUrl(this.mirrorUrl);
    if (!mirrorClean) {
      if (!isTrustedHfModelUrl(entry.model, spec.hfUrl)) {
        throw new Error(`Отклонён недоверенный адрес весов модели: ${entry.model}`);
      }
      return {
        ...baseCfg,
        model_list: [entry]
      };
    }

    // При активном зеркале веса берутся с mirrorClean, а .wasm-шейдер остаётся с официального GitHub mlc-ai.
    return {
      ...baseCfg,
      model_list: [{ ...entry, model: `${mirrorClean}/${modelId}` }]
    };
  }

  async initEngine(onProgress) {
    const gpuCheck = await this.checkWebGpuSupport();
    if (!gpuCheck.ok) {
      throw new Error(gpuCheck.reason);
    }

    const spec = this.getActiveModelSpec();
    if (spec.requiresF16 && !gpuCheck.hasF16) {
      throw new Error('Ваш GPU или драйвер WebGPU не поддерживает расширение shader-f16, необходимое для моделей q4f16_1.');
    }
    if (this.engine && this.loadedModelId === spec.id) {
      return this.engine;
    }

    this.terminateWorker();
    this.aborted = false;
    this.markDirtyIfEphemeral();

    if (onProgress) {
      onProgress({ pct: 2, stage: `Загружаем движок WebLLM для ${spec.shortName}…` });
    }

    const webllm = await this.ensureWebLlmLoaded();
    if (this.aborted) throw new Error('Операция отменена пользователем.');

    const appConfig = this.buildAppConfig(webllm, spec.id);
    const workerUrl = new URL('./local_llm_worker.js?v=3.9.2', import.meta.url);
    this.worker = new Worker(workerUrl, { type: 'module' });
    const startTime = Date.now();

    this.engine = await webllm.CreateWebWorkerMLCEngine(
      this.worker,
      spec.id,
      {
        appConfig,
        initProgressCallback: (report) => {
          if (this.aborted) return;
          const pct = Math.min(99, Math.max(2, Math.round((report.progress || 0) * 100)));
          const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000);
          let etaStr = '';
          if (pct > 5 && pct < 98 && elapsedSec > 3) {
            const remSec = Math.round((elapsedSec / pct) * (100 - pct));
            etaStr = remSec >= 60 ? ` · ~${Math.ceil(remSec / 60)} мин` : ` · ~${remSec} сек`;
          }
          if (onProgress) {
            onProgress({ pct, stage: `Загрузка ${spec.shortName} (${pct}%): ${report.text || 'подготовка весов…'}${etaStr}` });
          }
        }
      }
    );

    if (this.aborted) {
      this.terminateWorker();
      throw new Error('Загрузка отменена пользователем.');
    }

    this.loadedModelId = spec.id;
    return this.engine;
  }

  async extractAttributes(headers, productLines, { draftExtractor = null, customInstructions = '', onProgress = null, prefilledByProduct = null } = {}) {
    this.aborted = false;
    this.isBusy = true;
    const spec = this.getActiveModelSpec();
    const hasPrefilled = Boolean(prefilledByProduct && prefilledByProduct.size > 0);

    try {
      const engine = await this.initEngine(onProgress);

      const uniqueMap = new Map();
      productLines.forEach((raw) => {
        const key = raw.trim();
        if (key && !uniqueMap.has(key)) {
          const draft = draftExtractor ? draftExtractor(key) : null;
          const prefilled = hasPrefilled ? (prefilledByProduct.get(key) || null) : null;
          uniqueMap.set(key, { raw: key, draft, prefilled, attrs: null, disputes: {} });
        }
      });

      const uniqueItems = [...uniqueMap.values()];
      const batchSize = 4;
      const totalBatches = Math.max(1, Math.ceil(uniqueItems.length / batchSize));
      const tInferStart = Date.now();

      for (let b = 0; b < totalBatches; b++) {
        if (this.aborted) throw new Error('Обработка отменена пользователем.');

        const slice = uniqueItems.slice(b * batchSize, (b + 1) * batchSize);
        const rowsPrompt = slice.map((item, idx) => {
          const pfPairs = item.prefilled
            ? Object.entries(item.prefilled).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`)
            : [];
          const pfStr = pfPairs.length ? ` [уже указано: ${pfPairs.join(', ')}]` : '';
          const hintStr = item.draft
            ? ` (подсказка Wasm: ${headers.map((h) => `${h}=${item.draft[h] || '—'}`).join(', ')})`
            : '';
          return `${idx}: ${item.raw}${pfStr}${hintStr}`;
        }).join('\n');

        const pct = Math.min(90, Math.round((b / totalBatches) * 85) + 5);
        if (onProgress) {
          const doneCount = b * batchSize;
          const elapsedSec = (Date.now() - tInferStart) / 1000;
          let eta = '';
          if (b >= 1 && elapsedSec > 1) {
            const perBatch = elapsedSec / b;
            const remSec = Math.round(perBatch * (totalBatches - b));
            eta = remSec >= 60 ? ` · осталось ~${Math.ceil(remSec / 60)} мин` : ` · ~${remSec} сек`;
          }
          onProgress({
            pct,
            stage: `${spec.shortName} (${pct}%): обработка ${doneCount}/${uniqueItems.length} товаров${eta}`
          });
        }

        const parsedBatch = await this.inferBatchJson(engine, headers, rowsPrompt, slice, '', customInstructions, hasPrefilled);
        slice.forEach((item, idx) => {
          const res = parsedBatch[idx] || { attrs: {}, disputes: {} };
          item.attrs = res.attrs || {};
          item.disputes = res.disputes || {};
          if (item.prefilled) {
            headers.forEach((h) => {
              if (item.prefilled[h]) item.attrs[h] = item.prefilled[h];
            });
          }
        });
      }

      // Pass 2: Consistency verification against file glossary
      const glossaryCats = new Set();
      const glossaryBrands = new Set();
      uniqueItems.forEach((it) => {
        headers.forEach((h) => {
          const v = it.attrs?.[h];
          if (v && v !== '—') {
            if (h.toLowerCase().includes('категор')) glossaryCats.add(v);
            if (h.toLowerCase().includes('бренд') || h.toLowerCase().includes('марк')) glossaryBrands.add(v);
          }
        });
      });

      const unresolved = uniqueItems.filter((it) =>
        headers.some((h) => !it.attrs?.[h] || it.attrs[h] === '—')
      );

      if (unresolved.length > 0 && unresolved.length < uniqueItems.length && (glossaryCats.size || glossaryBrands.size)) {
        if (onProgress) {
          onProgress({ pct: 92, stage: `${spec.shortName}: сверка ${unresolved.length} спорных позиций по словарю прайса…` });
        }
        const recheckBatches = Math.ceil(unresolved.length / batchSize);
        for (let b = 0; b < recheckBatches; b++) {
          if (this.aborted) break;
          const slice = unresolved.slice(b * batchSize, (b + 1) * batchSize);
          const extraContext = [
            glossaryCats.size ? `Категории файла: ${[...glossaryCats].slice(0, 20).join(', ')}` : '',
            glossaryBrands.size ? `Бренды файла: ${[...glossaryBrands].slice(0, 20).join(', ')}` : ''
          ].filter(Boolean).join('. ');

          const rowsPrompt = slice.map((item, idx) => `${idx}: ${item.raw}`).join('\n');
          const refined = await this.inferBatchJson(engine, headers, rowsPrompt, slice, extraContext, customInstructions, false);
          slice.forEach((item, idx) => {
            const attrs = refined[idx]?.attrs || {};
            headers.forEach((h) => {
              if ((!item.attrs[h] || item.attrs[h] === '—') && attrs[h] && attrs[h] !== '—') {
                item.attrs[h] = attrs[h];
              }
            });
          });
        }
      }

      if (onProgress) {
        onProgress({ pct: 100, stage: `Готово (${spec.shortName})` });
      }

      return productLines.map((orig) => {
        const entry = uniqueMap.get(orig.trim());
        const attributes = {};
        headers.forEach((h) => {
          attributes[h] = entry?.attrs?.[h] || '—';
        });
        return { raw: orig, attributes, disputes: entry?.disputes || {} };
      });
    } finally {
      this.isBusy = false;
      if (!this.cacheEnabled) {
        if (this.aborted) {
          await this.purgeAllLocalCaches().catch(() => {});
        } else {
          await this.purgeCacheFilesOnly().catch(() => {});
        }
      }
    }
  }

  buildBatchJsonSchema(headers, rowCount, verifyPrefilled = false) {
    // Rigid index-keyed object ("0", "1", ..., "N-1") with short column keys (c0, c1, ...):
    // ~2x fewer output tokens AND 100% immune to array index drift on small models (0.6B/1.7B).
    const itemProps = {};
    const requiredCols = [];
    headers.forEach((_, idx) => {
      const k = `c${idx}`;
      itemProps[k] = { type: 'string' };
      requiredCols.push(k);
    });
    if (verifyPrefilled) {
      itemProps.d = {
        type: 'object',
        additionalProperties: { type: 'string' }
      };
    }
    const rowSchema = {
      type: 'object',
      properties: itemProps,
      required: requiredCols,
      additionalProperties: false
    };
    const rootProps = {};
    const requiredRows = [];
    for (let r = 0; r < rowCount; r++) {
      const rk = String(r);
      rootProps[rk] = rowSchema;
      requiredRows.push(rk);
    }
    return JSON.stringify({
      type: 'object',
      properties: rootProps,
      required: requiredRows,
      additionalProperties: false
    });
  }

  async inferBatchJson(engine, headers, rowsPrompt, slice, extraContext = '', customInstructions = '', verifyPrefilled = false) {
    const extraInstrBlock = customInstructions && customInstructions.trim()
      ? `\nДополнительные инструкции пользователя:\n${customInstructions.trim()}`
      : '';
    const verifyBlock = verifyPrefilled
      ? '\nЕсли в строке есть [уже указано: Столбец=Значение], проверь его корректность. Если оно противоречит товару, укажи это в объекте "d": {"Столбец": "Ожидаемое значение"}, сохранив исходное значение в соответствующем ключе cN.'
      : '';

    const keyLegend = headers.map((h, idx) => `c${idx}=${h}`).join(', ');
    const exampleObjShape = headers.map((_, idx) => `"c${idx}":"..."`).join(',');

    // Keep system prompt 100% invariant across all batches (no slice.length) for WebLLM KV-cache prefix reuse
    const glossaryBlock = `Словарь сокращений РФ: БЗМЖ=без заменителя молочного жира, ЗМЖ=с заменителем молочного жира, м.д.ж.=жирность, ж/б=жестяная банка, ст/б=стеклянная банка/бутылка, пэт или пл/б=ПЭТ-бутылка, т/п=тетрапак, д/п=дой-пак, ф/п=флоу-пак, п/п=пакет/полипропилен, в/у=вакуумная упаковка, с/м=свежемороженое, охл=охлаждённое, г/к=горячего копчения, х/к=холодного копчения, с/с=слабосолёное, в/с=высший сорт, б/с=без сахара, б/к=без кости или без кофеина, н/г=негазированная, г/г=газированная.
Примеры разбора:
1) "Сметана Простоквашино 20% 300г ст/б БЗМЖ" -> Категория: Сметана, Бренд: Простоквашино, Жирность: 20%, Вес/Объём: 300 г, Упаковка: Стеклянная банка.
2) "Напиток Добрый Кола 1л пэт б/с" -> Категория: Газированный напиток, Бренд: Добрый, Вкус: Кола без сахара, Вес/Объём: 1 л, Упаковка: ПЭТ-бутылка.
3) "Форель с/с Русское море 150г в/у филе-кусок" -> Категория: Рыба слабосолёная, Бренд: Русское море, Вес/Объём: 150 г, Упаковка: Вакуумная упаковка.`;

    const sysPrompt = `Ты точный аналитический парсер русскоязычной розничной и чековой номенклатуры FMCG.
${glossaryBlock}
Короткие ключи столбцов: ${keyLegend}.
Верни строго валидный JSON-объект, где ключи — номера строк ("0", "1", ...), например {"0":{${exampleObjShape}${verifyPrefilled ? ',"d":{}' : ''}},"1":{...}} ровно для всех переданных строк (без поля raw). Если параметр определить нельзя, укажи "—".${verifyBlock}${extraInstrBlock}`;

    const userPrompt = `${extraContext ? `${extraContext}\n\n` : ''}Строки (ключи "0".."${slice.length - 1}"):\n${rowsPrompt}\n/no_think`;

    const schemaStr = this.buildBatchJsonSchema(headers, slice.length, verifyPrefilled);
    const reqBase = {
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.05,
      max_tokens: Math.max(220, slice.length * 80),
      extra_body: { enable_thinking: false }
    };

    let completion;
    try {
      // Constrained Decoding via WebLLM XGrammar JSON Schema
      completion = await engine.chat.completions.create({
        ...reqBase,
        response_format: { type: 'json_object', schema: schemaStr }
      });
    } catch {
      // Graceful fallback for older WebLLM builds without schema parameter
      completion = await engine.chat.completions.create({
        ...reqBase,
        response_format: { type: 'json_object' }
      });
    }

    const text = stripThinkTags(completion?.choices?.[0]?.message?.content || '{}');
    let jsonObj = {};
    try {
      jsonObj = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try { jsonObj = JSON.parse(m[0]); } catch { jsonObj = {}; }
      }
    }

    const fallbackArr = Array.isArray(jsonObj.i)
      ? jsonObj.i
      : (Array.isArray(jsonObj.items) ? jsonObj.items : (Array.isArray(jsonObj.rows) ? jsonObj.rows : null));

    return slice.map((item, idx) => {
      const src = (jsonObj && typeof jsonObj[String(idx)] === 'object' && jsonObj[String(idx)] !== null)
        ? jsonObj[String(idx)]
        : (fallbackArr ? (fallbackArr[idx] || {}) : {});
      const attrs = {};
      headers.forEach((h, hIdx) => {
        const shortKey = `c${hIdx}`;
        const val = src[shortKey] !== undefined ? src[shortKey] : src[h];
        attrs[h] = (val !== undefined && val !== null && String(val).trim() !== '') ? String(val).trim() : '—';
      });
      const disputes = {};
      const rawDisputes = (src.d && typeof src.d === 'object') ? src.d : (src.disputed && typeof src.disputed === 'object' ? src.disputed : null);
      if (rawDisputes) {
        Object.entries(rawDisputes).forEach(([k, v]) => {
          const resolvedKey = /^c\d+$/.test(k) ? (headers[Number(k.slice(1))] || k) : k;
          if (resolvedKey && v && String(v).trim() !== '') disputes[resolvedKey] = String(v).trim();
        });
      }
      return { attrs, disputes };
    });
  }

  /**
   * Generate strategic Margin Map insights locally via WebGPU LLM (supports large files via top-35 SKU summary).
   */
  async analyzeMarginMap(margMap, { onProgress = null } = {}) {
    this.aborted = false;
    this.isBusy = true;
    const spec = this.getActiveModelSpec();

    try {
      const engine = await this.initEngine(onProgress);
      const items = (margMap?.items || [])
        .toSorted((a, b) => (b.sales_rub || 0) - (a.sales_rub || 0))
        .slice(0, 35);

      const lines = items.map((it) => {
        const profit = Number.isFinite(it.profit_rub) ? it.profit_rub : ((it.sales_rub || 0) - (it.costs_rub || 0));
        const quad = it.quadrant_ru || it.quadrant || '—';
        let line = `${it.category} | ${it.product} | Выручка: ${Math.round(it.sales_rub || 0)} ₽ | Прибыль: ${Math.round(profit)} ₽ | Маржа: ${(it.margin_pct || 0).toFixed(1)}% | Группа: ${quad}`;
        if (it.elasticity) {
          const el = it.elasticity;
          line += ` | E≈${el.elast.toFixed(1)} (${el.status}) | Ср.цена: ${Math.round(el.avgPrice)} ₽ (${Math.round(el.minPrice)}–${Math.round(el.maxPrice)} ₽) | Ср.объём: ${Math.round(el.avgVol)} шт | ${el.advice}`;
        }
        if (it.seasonality && Number.isFinite(it.seasonality.maxS)) {
          line += ` | Пик продаж: мес.${it.seasonality.maxSM} (×${it.seasonality.maxS.toFixed(2)})`;
        }
        return line;
      }).join('\n');

      const periodInfo = margMap?.periodRange
        ? `матрица за ${margMap.year || ''} г., эластичность за ${margMap.periodRange}`
        : `за ${margMap?.year || ''} год`;

      if (onProgress) {
        onProgress({ pct: 65, stage: `${spec.shortName}: анализ матрицы и эластичности (${items.length} SKU)…` });
      }

      const completion = await engine.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты ведущий коммерческий аналитик по ассортименту, ценообразованию и росту прибыли. Учитывай маржинальность, группу матрицы, коэффициент эластичности E (E<-1 — лучше акции; -1<E<0 — можно плавно поднять цену; E≈0 — цена почти не влияет; E>0 — проверить сезон/дефицит), среднюю цену, диапазон цен и объём. Отвечай кратко, простым языком на русском.'
          },
          {
            role: 'user',
            content: `Проанализируй товары (${periodInfo}) и выдели:\n1) Топ-3 товара с наибольшим потенциалом роста прибыли (с учётом E, цен и маржи);\n2) Конкретные действия по ценам и акциям для каждого.\n\nДанные:\n${lines}\n/no_think`
          }
        ],
        temperature: 0.25,
        max_tokens: 1000,
        extra_body: { enable_thinking: false }
      });

      if (onProgress) {
        onProgress({ pct: 100, stage: `Готово (${spec.shortName})` });
      }
      return stripThinkTags(completion?.choices?.[0]?.message?.content || '');
    } finally {
      this.isBusy = false;
      if (!this.cacheEnabled) {
        if (this.aborted) {
          await this.purgeAllLocalCaches().catch(() => {});
        } else {
          await this.purgeCacheFilesOnly().catch(() => {});
        }
      }
    }
  }

  /**
   * Analyze intersections of PESTEL / Horizon Scanning signals locally via WebGPU LLM.
   */
  async analyzeRiskIntersections(signals = [], { onProgress = null } = {}) {
    const list = (signals || []).slice(0, 18);
    if (list.length < 2) {
      throw new Error('Для анализа стыков нужно минимум 2 сигнала в выборке.');
    }

    this.aborted = false;
    this.isBusy = true;
    const spec = this.getActiveModelSpec();

    try {
      const engine = await this.initEngine(onProgress);
      const lines = list.map((s, idx) =>
        `${idx + 1}. [${s.pestelLabel || s.pestel} | ${s.curveLabel || s.curve}${s.period ? ` | ${s.period}` : ''}] ${s.title}${s.impact ? ` — ${s.impact}` : ''}`
      ).join('\n');

      if (onProgress) {
        onProgress({ pct: 65, stage: `${spec.shortName}: поиск рисков на стыках (${list.length} сигналов)…` });
      }

      const completion = await engine.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты риск-менеджер по Horizon Scanning и PESTEL. Найди 3 конкретных риска на стыках 2–3 сигналов. Верни СТРОГО валидный JSON-объект {"risks":[{"title":"краткий риск до 90 символов","signals":"какие сигналы пересекаются","rationale":"почему это опасно для бизнеса (1-2 предложения)","probability":0|1|2,"impact":0|1|2}]} где probability 0=Вероятно,1=Возможно,2=Маловероятно; impact 0=Небольшое,1=Умеренное,2=Существенное. Отвечай на русском.'
          },
          {
            role: 'user',
            content: `Сигналы внешней среды:\n${lines}\n/no_think`
          }
        ],
        temperature: 0.25,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        extra_body: { enable_thinking: false }
      });

      if (onProgress) {
        onProgress({ pct: 100, stage: `Готово (${spec.shortName})` });
      }

      const text = stripThinkTags(completion?.choices?.[0]?.message?.content || '{}');
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
        }
      }
      const arr = Array.isArray(parsed?.risks) ? parsed.risks : (Array.isArray(parsed) ? parsed : []);
      const clean = arr
        .filter((x) => x && typeof x === 'object' && String(x.title || '').trim())
        .slice(0, 4)
        .map((x) => ({
          title: String(x.title).trim().slice(0, 140),
          signals: String(x.signals || 'Стык выбранных сигналов').trim().slice(0, 180),
          rationale: String(x.rationale || '').trim().slice(0, 320),
          probability: [0, 1, 2].includes(Number(x.probability)) ? Number(x.probability) : 1,
          impact: [0, 1, 2].includes(Number(x.impact)) ? Number(x.impact) : 1
        }));

      if (!clean.length) {
        throw new Error('Локальная модель не смогла сформировать список рисков. Попробуйте ещё раз.');
      }
      return clean;
    } finally {
      this.isBusy = false;
      if (!this.cacheEnabled) {
        if (this.aborted) {
          await this.purgeAllLocalCaches().catch(() => {});
        } else {
          await this.purgeCacheFilesOnly().catch(() => {});
        }
      }
    }
  }
}

export const localLlmService = new LocalLlmService();
