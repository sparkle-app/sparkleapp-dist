/**
 * Sparkle ProxyAPI Integration Module
 * Strictly client-side localStorage key storage with mandatory security compliance.
 */

export const DEFAULT_BASE_URL = 'https://api.proxyapi.ru/openai/v1';
export const DEFAULT_MODELS = [
  { id: 'mimo/mimo-v2.6-flash', name: 'Mimo Flash (v2.6)' },
  { id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek Flash (v4.1)' },
  { id: 'custom', name: 'Своя модель (указать вручную)' }
];

export const MANDATORY_CAPTIONS = {
  INPUT_CAPTION: 'Все ключи сохраняются исключительно в вашем браузере (localStorage) и передаются напрямую в API. Мы не собираем, не логируем и не храним ваши данные на сервере.',
  SAVE_MODAL_CONFIRMATION: 'Ключи успешно сохранены локально на вашем устройстве. В целях безопасности настоятельно рекомендуем после завершения работы с сервисом очистить/удалить сохранённые API-ключи через меню настроек, даже несмотря на то, что мы не храним и не собираем ваши данные.'
};

const STORAGE_KEYS = {
  API_KEY: 'sparkle_ai_api_key',
  BASE_URL: 'sparkle_ai_base_url',
  MODEL: 'sparkle_ai_model',
  CUSTOM_MODEL: 'sparkle_ai_custom_model'
};

export class AiService {
  constructor() {
    this.key = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    this.baseUrl = localStorage.getItem(STORAGE_KEYS.BASE_URL) || DEFAULT_BASE_URL;
    this.model = localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODELS[0].id;
    this.customModel = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || '';
  }

  hasKey() {
    return Boolean(this.key && this.key.trim().length > 0);
  }

  getActiveModel() {
    if (this.model === 'custom' && this.customModel) {
      return this.customModel.trim();
    }
    return this.model || DEFAULT_MODELS[0].id;
  }

  saveConfig(apiKey, baseUrl, model, customModel = '') {
    this.key = apiKey ? apiKey.trim() : '';
    this.baseUrl = baseUrl ? baseUrl.trim() : DEFAULT_BASE_URL;
    this.model = model || DEFAULT_MODELS[0].id;
    this.customModel = customModel ? customModel.trim() : '';

    localStorage.setItem(STORAGE_KEYS.API_KEY, this.key);
    localStorage.setItem(STORAGE_KEYS.BASE_URL, this.baseUrl);
    localStorage.setItem(STORAGE_KEYS.MODEL, this.model);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, this.customModel);

    return true;
  }

  clearConfig() {
    this.key = '';
    this.baseUrl = DEFAULT_BASE_URL;
    this.model = DEFAULT_MODELS[0].id;
    this.customModel = '';

    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    localStorage.removeItem(STORAGE_KEYS.MODEL);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODEL);
  }

  async testConnection() {
    if (!this.hasKey()) {
      throw new Error('API-ключ не указан. Введите ключ для проверки.');
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const modelToUse = this.getActiveModel();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.key}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: 'user', content: 'Ping. Ответь одним словом "OK".' }],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || response.statusText;
      } catch {
        errDetail = response.statusText;
      }
      throw new Error(`Ошибка API (${response.status}): ${errDetail}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Соединение успешно установлено.';
  }

  async generateCompletion(messages, options = {}) {
    if (!this.hasKey()) {
      throw new Error('API-ключ не настроен');
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const modelToUse = this.getActiveModel();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.key}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 2500
      })
    });

    if (!response.ok) {
      let msg = response.statusText;
      try {
        const err = await response.json();
        msg = err.error?.message || msg;
      } catch {}
      throw new Error(`API error: ${msg}`);
    }

    const res = await response.json();
    return res.choices?.[0]?.message?.content || '';
  }
}

export const aiService = new AiService();
