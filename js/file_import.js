/**
 * Sparkle Zero-Server File Importer (.xlsx, .csv, .txt) — v3.8.0
 * Pure client-side parser with strict Zip-bomb, file-size, row-count,
 * XXE/DOCTYPE, and encoding safeguards. Zero external CDN dependencies.
 */

export const IMPORT_LIMITS = {
  MAX_FILE_BYTES: 15 * 1024 * 1024,      // 15 MB raw upload limit
  MAX_XML_BYTES: 40 * 1024 * 1024,       // 40 MB decompressed XML limit (zip-bomb guard)
  MAX_ROWS: 100_000,                     // 100k rows max
  MAX_COLS: 100,                         // 100 columns max
  MAX_CELL_LEN: 2000                     // 2k chars per cell
};

const PRODUCT_HEADER_RE = /^(название(\s+товара)?|наименование|товар|позиция|номенклатура|sku|product(\s+name)?|item(\s+name)?|name)$/i;
const PARAM_HEADER_RE = /(категор|бренд|марк|жирн|упаков|тар|вес|об[ъь]?[её]м|цен|вкус|сорт|вид|стран|производ|фасов|бзмж|сахар|размер|цвет|материал|аромат|объем|тип\s+товар)/i;
const SECONDARY_HEADER_RE = /(выручк|прибыл|затрат|себестоим|марж|рентаб|магазин|точк|тт|месяц|год|дат|период|недел|квартал|продаж|оборот|шт|количеств|кол-во|остат|артикул|штрих|код|id|регион|город|канал|сеть)/i;

function cleanCell(val) {
  return String(val ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim()
    .slice(0, IMPORT_LIMITS.MAX_CELL_LEN);
}

function splitHeaderString(str) {
  return cleanCell(str)
    .split(/[,;\t#]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, IMPORT_LIMITS.MAX_COLS);
}

export function decodeTextWithFallback(buffer) {
  const bytes = new Uint8Array(buffer);
  // Strip UTF-8 BOM if present
  const slice = (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
    ? bytes.subarray(3)
    : bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(slice);
  } catch {
    try {
      return new TextDecoder('windows-1251').decode(slice);
    } catch {
      return new TextDecoder('utf-8').decode(slice);
    }
  }
}

export function detectDelimiter(line) {
  const candidates = [';', '\t', '#', ','];
  let best = ',';
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return bestCount > 0 ? best : ',';
}

export function parseDelimitedRows(text, delimiter, onProgress = null) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const len = text.length;
  const reportStep = Math.max(65536, Math.floor(len / 24));
  let nextReport = reportStep;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cleanCell(field));
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cleanCell(field));
      field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      if (rows.length >= IMPORT_LIMITS.MAX_ROWS + 1) break;
    } else {
      field += ch;
    }

    if (onProgress && i >= nextReport) {
      const pct = 22 + Math.floor((i / len) * 63);
      onProgress(Math.min(84, pct));
      nextReport += reportStep;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(cleanCell(field));
    if (row.some((c) => c !== '')) rows.push(row);
  }
  if (onProgress) onProgress(85);
  return rows;
}

function classifyColumnName(name, existingColsLower) {
  const low = name.toLowerCase().trim();
  if (existingColsLower.has(low)) return 'param';
  if (SECONDARY_HEADER_RE.test(low)) return 'secondary';
  if (PARAM_HEADER_RE.test(low)) return 'param';
  return 'secondary';
}

/**
 * Parse a 2D table (from XLSX, CSV, or TXT) into rich structured metadata
 * supporting Simple Import, Use-Data Import, and Preserve-Secondary-Data merge.
 */
export function analyzeTableRows(rows, existingCols = []) {
  const nonEmptyRows = rows.filter((r) => r.some((c) => c !== ''));
  if (nonEmptyRows.length < 2) {
    throw new Error('Файл должен содержать строку заголовков и хотя бы одно название товара.');
  }

  const existingLower = new Set(existingCols.map((c) => String(c || '').toLowerCase().trim()).filter(Boolean));
  const firstRow = nonEmptyRows[0].map(cleanCell);
  const dataRows = nonEmptyRows.slice(1, IMPORT_LIMITS.MAX_ROWS + 1);
  const maxCols = Math.min(
    IMPORT_LIMITS.MAX_COLS,
    Math.max(firstRow.length, ...dataRows.slice(0, 50).map((r) => r.length))
  );

  const a1 = firstRow[0] || '';
  const a1Packed = /[,;\t#]/.test(a1) && !PRODUCT_HEADER_RE.test(a1);
  const packedHeaders = a1Packed ? splitHeaderString(a1) : [];

  const columns = [];
  let productColIdx = 0;

  if (!a1Packed) {
    const foundProdIdx = firstRow.findIndex((h) => PRODUCT_HEADER_RE.test(h));
    if (foundProdIdx >= 0) productColIdx = foundProdIdx;
  }

  for (let ci = 0; ci < maxCols; ci++) {
    const rawName = firstRow[ci] || `Столбец ${ci + 1}`;
    let nonEmptyCount = 0;
    let sample = '';
    for (let r = 0; r < dataRows.length; r++) {
      const val = cleanCell(dataRows[r]?.[ci] || '');
      if (val) {
        nonEmptyCount++;
        if (!sample) sample = val.length > 42 ? `${val.slice(0, 41)}…` : val;
      }
    }

    if (ci === productColIdx) {
      columns.push({
        index: ci,
        name: a1Packed ? 'Название товара (столбец A)' : rawName,
        role: 'product',
        nonEmptyCount,
        sample
      });
    } else {
      const role = classifyColumnName(rawName, existingLower);
      columns.push({
        index: ci,
        name: rawName,
        role,
        nonEmptyCount,
        sample
      });
    }
  }

  // If no explicit param columns were detected and A1 wasn't packed, treat all non-product columns as param by default
  if (!a1Packed && !columns.some((c) => c.role === 'param') && columns.length > 1) {
    columns.forEach((c) => {
      if (c.role !== 'product') c.role = 'param';
    });
  }

  return {
    packedHeaders,
    productColIdx,
    columns,
    dataRows
  };
}

/**
 * Build final import payload from analyzed table + user-selected mode & column roles.
 */
export function buildImportPayload(analyzed, { mode = 'simple', preserveSecondary = false, columnRoles = null, targetHeaders = null } = {}) {
  const { fileName, packedHeaders, productColIdx, columns, dataRows } = analyzed;
  const effectiveCols = columns.map((c) => ({
    ...c,
    role: columnRoles && Object.prototype.hasOwnProperty.call(columnRoles, c.index)
      ? columnRoles[c.index]
      : c.role
  }));

  const selectedProductCol = effectiveCols.find((c) => c.role === 'product');
  const effectiveProductColIdx = selectedProductCol ? selectedProductCol.index : productColIdx;
  const paramColDefs = effectiveCols.filter((c) => c.role === 'param');
  const secondaryColDefs = preserveSecondary
    ? effectiveCols.filter((c) => c.role === 'secondary')
    : [];

  let headers;
  if (Array.isArray(targetHeaders)) {
    const seen = new Set();
    headers = [];
    for (const h of targetHeaders) {
      const cleaned = cleanCell(h);
      const low = cleaned.toLowerCase();
      if (cleaned && !seen.has(low)) {
        seen.add(low);
        headers.push(cleaned);
      }
    }
  } else {
    headers = [
      ...packedHeaders,
      ...paramColDefs.map((c) => c.name)
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);
  }

  const secondaryHeaders = secondaryColDefs.map((c) => c.name);
  const rows = [];
  const products = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const raw = cleanCell(r[effectiveProductColIdx] || '');
    if (!raw) continue;

    const prefilled = {};
    if (mode === 'use-data') {
      paramColDefs.forEach((c) => {
        const val = cleanCell(r[c.index] || '');
        if (val && val !== '—' && val !== '-') {
          prefilled[c.name] = val;
        }
      });
    }

    const secondary = {};
    if (preserveSecondary) {
      secondaryColDefs.forEach((c) => {
        secondary[c.name] = cleanCell(r[c.index] || '');
      });
    }

    products.push(raw);
    rows.push({ raw, prefilled, secondary });
  }

  if (!products.length) {
    throw new Error('В файле не найдено ни одного названия товара начиная со 2-й строки.');
  }

  return {
    fileName,
    mode,
    preserveSecondary,
    headers,
    secondaryHeaders,
    products,
    rows
  };
}

/* ==========================================================================
   Minimal Hardened PKZIP + OOXML (.xlsx) Reader
   ========================================================================== */
async function inflateRawBounded(compressedBytes, maxBytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Ваш браузер не поддерживает DecompressionStream для чтения .xlsx. Сохраните файл как .csv или обновите браузер.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressedBytes);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error('Файл .xlsx превышает безопасный лимит распаковки (защита от zip-бомбы).');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Некорректный файл .xlsx (повреждённая структура ZIP).');
  }

  // Locate End of Central Directory (EOCD) scanning backwards
  let eocdPos = -1;
  const minPos = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minPos; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) {
    throw new Error('Не найден каталог архива .xlsx.');
  }

  const entryCount = view.getUint16(eocdPos + 10, true);
  const cdOffset = view.getUint32(eocdPos + 16, true);
  const decoder = new TextDecoder('utf-8');
  const entries = new Map();

  let pos = cdOffset;
  for (let i = 0; i < entryCount && pos + 46 <= bytes.length; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const lfhOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

    entries.set(name, { method, compSize, uncompSize, lfhOffset });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  async function extractText(entryName) {
    const info = entries.get(entryName);
    if (!info) return null;
    if (info.uncompSize > IMPORT_LIMITS.MAX_XML_BYTES) {
      throw new Error('Внутренний XML-лист превышает безопасный размер (40 МБ).');
    }
    const lfhNameLen = view.getUint16(info.lfhOffset + 26, true);
    const lfhExtraLen = view.getUint16(info.lfhOffset + 28, true);
    const dataStart = info.lfhOffset + 30 + lfhNameLen + lfhExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + info.compSize);

    let unpacked;
    if (info.method === 0) {
      unpacked = rawSlice;
    } else if (info.method === 8) {
      unpacked = await inflateRawBounded(rawSlice, IMPORT_LIMITS.MAX_XML_BYTES);
    } else {
      throw new Error(`Неподдерживаемый метод сжатия ZIP (${info.method}).`);
    }
    const xmlStr = decoder.decode(unpacked);
    if (/<!DOCTYPE|<!ENTITY/i.test(xmlStr)) {
      throw new Error('Обнаружены небезопасные XML-объявления (DOCTYPE/ENTITY). Импорт заблокирован.');
    }
    return xmlStr;
  }

  return { entries, extractText };
}

function colRefToIndex(ref) {
  const m = String(ref || '').match(/^([A-Z]+)/i);
  if (!m) return -1;
  let idx = 0;
  const letters = m[1].toUpperCase();
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

export async function parseXlsxBuffer(buffer) {
  const { entries, extractText } = await readZipEntries(buffer);
  const parser = new DOMParser();

  // Shared strings table (optional)
  const sharedStrings = [];
  const ssXml = await extractText('xl/sharedStrings.xml');
  if (ssXml) {
    const ssDoc = parser.parseFromString(ssXml, 'application/xml');
    const siNodes = ssDoc.getElementsByTagName('si');
    for (let i = 0; i < siNodes.length; i++) {
      const tNodes = siNodes[i].getElementsByTagName('t');
      let combined = '';
      for (let k = 0; k < tNodes.length; k++) combined += tNodes[k].textContent || '';
      sharedStrings.push(cleanCell(combined));
    }
  }

  // Locate first worksheet
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (!entries.has(sheetPath)) {
    const found = [...entries.keys()].find((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k));
    if (!found) throw new Error('В книге .xlsx не найден ни один лист с данными.');
    sheetPath = found;
  }

  const sheetXml = await extractText(sheetPath);
  const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
  const rowNodes = sheetDoc.getElementsByTagName('row');
  const table = [];

  for (let r = 0; r < rowNodes.length && table.length <= IMPORT_LIMITS.MAX_ROWS; r++) {
    const cellNodes = rowNodes[r].getElementsByTagName('c');
    const rowArr = [];
    for (let c = 0; c < cellNodes.length; c++) {
      const cell = cellNodes[c];
      const colIdx = colRefToIndex(cell.getAttribute('r'));
      const targetIdx = colIdx >= 0 ? colIdx : rowArr.length;
      if (targetIdx >= IMPORT_LIMITS.MAX_COLS) continue;

      const type = cell.getAttribute('t') || '';
      let val = '';
      if (type === 's') {
        const vNode = cell.getElementsByTagName('v')[0];
        const idx = Number(vNode?.textContent);
        val = Number.isInteger(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
      } else if (type === 'inlineStr') {
        const tNodes = cell.getElementsByTagName('t');
        for (let k = 0; k < tNodes.length; k++) val += tNodes[k].textContent || '';
      } else {
        const vNode = cell.getElementsByTagName('v')[0];
        val = vNode?.textContent || '';
      }
      rowArr[targetIdx] = cleanCell(val);
    }
    if (rowArr.some((x) => x)) {
      table.push(rowArr.map((x) => x || ''));
    }
  }

  return table;
}

/**
 * Parse an uploaded .xlsx, .csv, or .txt File object into analyzed table structure.
 */
export async function analyzeAttributesFile(file, { existingCols = [] } = {}) {
  if (!file) throw new Error('Файл не выбран.');
  if (file.size > IMPORT_LIMITS.MAX_FILE_BYTES) {
    throw new Error(`Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ). Лимит — 15 МБ.`);
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['xlsx', 'csv', 'txt'].includes(ext)) {
    throw new Error('Поддерживаются только файлы .xlsx, .csv и .txt.');
  }

  const buffer = await file.arrayBuffer();
  let table;

  if (ext === 'xlsx') {
    table = await parseXlsxBuffer(buffer);
  } else {
    const text = decodeTextWithFallback(buffer);
    const firstNonEmptyLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    if (!firstNonEmptyLine) {
      throw new Error('Файл пустой.');
    }
    const delim = detectDelimiter(firstNonEmptyLine);
    table = parseDelimitedRows(text, delim);
  }

  const analyzed = analyzeTableRows(table, existingCols);
  return { ...analyzed, fileName: file.name };
}

/**
 * Worker-backed non-blocking file analysis with honest 0..100% progress updates
 * and AbortSignal cancellation. Falls back to main-thread analyzeAttributesFile if Workers unavailable.
 */
export function analyzeAttributesFileWithProgress(file, { existingCols = [], onProgress = null, signal = null } = {}) {
  if (typeof Worker === 'undefined') {
    onProgress?.(10, 'Чтение файла…');
    return analyzeAttributesFile(file, { existingCols }).then((res) => {
      onProgress?.(100, 'Готово');
      return res;
    });
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Загрузка файла отменена', 'AbortError'));
      return;
    }

    const workerUrl = new URL('./file_import_worker.js?v=3.12.0', import.meta.url);
    const worker = new Worker(workerUrl, { type: 'module' });
    let settled = false;

    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
      worker.terminate();
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Загрузка файла отменена', 'AbortError'));
    };

    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    worker.onmessage = (e) => {
      const msg = e.data || {};
      if (msg.type === 'progress') {
        onProgress?.(msg.pct, msg.stage || 'Обработка…');
      } else if (msg.type === 'done') {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(msg.analyzed);
      } else if (msg.type === 'error') {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(msg.message || 'Ошибка чтения файла.'));
      }
    };

    worker.onerror = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(err?.message || 'Ошибка фонового обработчика импорта.'));
    };

    worker.postMessage({ file, existingCols });
  });
}
