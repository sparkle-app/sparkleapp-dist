/**
 * Sparkle RGM Attribute Extraction Engine
 * Zero-server regex & dictionary rule-based extraction from receipt strings.
 */

const KNOWN_CATEGORIES = [
  'сыр', 'молоко', 'йогурт', 'творог', 'масло', 'колбаса',
  'хлеб', 'вода', 'сок', 'чай', 'кофе', 'шоколад', 'печенье',
  'мороженое', 'мясо', 'птица', 'рыба', 'крупа', 'макароны'
];

/**
 * Extract attribute value by header name from input text
 * @param {string} headerName (e.g., 'Категория', 'Вес', 'Цена')
 * @param {string} text
 * @returns {string|number}
 */
export function extractAttribute(headerName, text) {
  if (!text) return '';
  const hd = headerName.toLowerCase();
  const raw = text.toLowerCase();

  // Weight / Volume
  if (/вес|масс|объ|грамм|литр/.test(hd)) {
    const match = raw.match(/(\d+[.,]?\d*)\s*(кг|г|гр|мл|л)/i);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      const unit = match[2].toLowerCase();
      if (unit === 'кг' || unit === 'л') return num * 1000;
      return num;
    }
    return '';
  }

  // Price
  if (/цен|стоим|руб/.test(hd)) {
    const match = raw.match(/(\d+[.,]?\d*)\s*(₽|руб|р)/i);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return '';
  }

  // Category
  if (/категор|тип|вид|товар/.test(hd)) {
    const found = KNOWN_CATEGORIES.find(w => raw.includes(w));
    if (found) {
      return found.charAt(0).toUpperCase() + found.slice(1);
    }
    const wordMatch = raw.match(/[а-яёa-z]+/i);
    if (wordMatch) {
      const w = wordMatch[0];
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return '';
  }

  return '';
}

/**
 * Parse an array of receipt item lines given target headers
 * @param {string[]} lines
 * @param {string[]} headers
 * @returns {Array<{name: string, attributes: Object}>}
 */
export function parseReceiptBatch(lines, headers) {
  if (!lines || !Array.isArray(lines)) return [];
  return lines.map(line => {
    const attributes = {};
    (headers || []).forEach(h => {
      attributes[h] = extractAttribute(h, line);
    });
    return {
      name: line,
      attributes
    };
  });
}

/**
 * Initialize live preview box on home page
 */
export function initLivePreview(inputId = 'li', outputId = 'lo') {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (!input || !output) return;

  const update = () => {
    const val = input.value;
    const attrs = [
      { name: 'Категория', val: extractAttribute('Категория', val) },
      { name: 'Вес', val: extractAttribute('Вес', val) },
      { name: 'Цена', val: extractAttribute('Цена', val) }
    ];

    output.innerHTML = attrs.map(a => `
      <span class="chip">
        <small>${a.name}</small>
        ${a.val !== '' ? a.val : '—'}
      </span>
    `).join('');
  };

  input.addEventListener('input', update);
  update();
}

/**
 * Initialize batch attribute parsing tab (#attrs)
 */
export function initBatchAttributeParser(options = {}) {
  const textarea = document.getElementById(options.textareaId || 'ai');
  const resultDiv = document.getElementById(options.resultId || 'ares');
  const copyBtn = document.getElementById(options.copyBtnId || 'acp');
  const ex1 = document.getElementById('e1');
  const ex2 = document.getElementById('e2');

  let currentParsedData = [];

  const parseBatch = () => {
    if (!textarea || !resultDiv) return;
    const lines = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      currentParsedData = [];
      resultDiv.innerHTML = '<p class="mut">Введите строку заголовков через запятую и затем строки товаров.</p>';
      return;
    }

    const headers = lines[0].split(',').map(s => s.trim());
    const rows = lines.slice(1).map(line => {
      return headers.map(h => extractAttribute(h, line));
    });

    currentParsedData = [headers, ...rows];

    // Render table
    let tableHtml = '<table class="tb"><thead><tr>';
    tableHtml += headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
    tableHtml += '</tr></thead><tbody>';

    rows.forEach(r => {
      tableHtml += '<tr>' + r.map(c => `<td>${escapeHtml(String(c || '—'))}</td>`).join('') + '</tr>';
    });
    tableHtml += '</tbody></table>';

    resultDiv.innerHTML = tableHtml;
  };

  if (textarea) {
    textarea.addEventListener('input', parseBatch);
  }

  if (ex1) {
    ex1.onclick = () => {
      if (textarea) {
        textarea.value = 'Категория, вес, цена\nсырпарм200гготовкупотр599рСЫРЗАВОД';
        parseBatch();
      }
    };
  }

  if (ex2) {
    ex2.onclick = () => {
      if (textarea) {
        textarea.value = 'Категория, вес, цена\nмолоко 3,2% 930мл 89р\nйогурт клубника 125г 54р\nсыр сулугуни 300г 240р';
        parseBatch();
      }
    };
  }

  if (copyBtn) {
    copyBtn.onclick = async () => {
      if (!currentParsedData.length) {
        window.dispatchEvent(new CustomEvent('sparkle:toast', { detail: 'Сначала обработайте данные' }));
        return;
      }
      const tsv = currentParsedData.map(r => r.join('\t')).join('\n');
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
    };
  }

  if (ex1) ex1.click();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
