/**
 * Sparkle File Import Web Worker (Zero-Server, 60 FPS Progress)
 * Streams file bytes, parses .xlsx via Rust WebAssembly (calamine) with honest
 * row-level progress callbacks (or CSV/TXT with cursor progress), and analyzes columns.
 */
import {
  IMPORT_LIMITS,
  decodeTextWithFallback,
  detectDelimiter,
  parseDelimitedRows,
  parseXlsxBuffer,
  analyzeTableRows
} from './file_import.js?v=3.12.0';

let wasmEnginePromise = null;

async function getWorkerWasmEngine() {
  if (wasmEnginePromise) return wasmEnginePromise;
  wasmEnginePromise = (async () => {
    const mod = await import('../pkg/wasm_core.js?v=3.12.0');
    if (typeof mod.default === 'function') {
      const wasmUrl = new URL('../pkg/wasm_core_bg.wasm?v=3.12.0', import.meta.url);
      await mod.default(wasmUrl);
    }
    if (typeof mod.SparkleEngine === 'function') {
      return new mod.SparkleEngine();
    }
    return null;
  })().catch(() => null);
  return wasmEnginePromise;
}

function reportProgress(pct, stage) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  self.postMessage({ type: 'progress', pct: clamped, stage });
}

async function readFileBytesWithProgress(file) {
  const total = file.size || 0;
  if (typeof file.stream !== 'function' || total === 0) {
    reportProgress(10, 'Чтение файла…');
    const buf = await file.arrayBuffer();
    reportProgress(20, 'Файл прочитан');
    return new Uint8Array(buf);
  }

  const reader = file.stream().getReader();
  const chunks = [];
  let loaded = 0;
  let lastReported = -1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    const pct = Math.min(20, Math.floor((loaded / total) * 20));
    if (pct > lastReported) {
      lastReported = pct;
      reportProgress(pct, 'Чтение файла…');
    }
  }

  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  reportProgress(20, 'Файл прочитан');
  return out;
}

self.onmessage = async (e) => {
  const { file, existingCols = [] } = e.data || {};
  try {
    if (!file) throw new Error('Файл не выбран.');
    if (file.size > IMPORT_LIMITS.MAX_FILE_BYTES) {
      throw new Error(`Файл слишком большой (${(file.size / (1024 * 1024)).toFixed(1)} МБ). Лимит — 15 МБ.`);
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'csv', 'txt'].includes(ext)) {
      throw new Error('Поддерживаются только файлы .xlsx, .csv и .txt.');
    }

    reportProgress(2, 'Чтение файла…');
    const bytes = await readFileBytesWithProgress(file);
    let table;

    if (ext === 'xlsx') {
      reportProgress(22, 'Инициализация Excel-парсера (WebAssembly)…');
      const engine = await getWorkerWasmEngine();
      if (engine && typeof engine.parseSpreadsheetTable === 'function') {
        table = engine.parseSpreadsheetTable(
          bytes,
          IMPORT_LIMITS.MAX_ROWS,
          IMPORT_LIMITS.MAX_COLS,
          (pct) => reportProgress(pct, 'Разбор Excel (WebAssembly)…')
        );
      } else {
        reportProgress(35, 'Разбор Excel…');
        table = await parseXlsxBuffer(bytes.buffer);
        reportProgress(85, 'Лист прочитан');
      }
    } else {
      reportProgress(22, 'Декодирование текста…');
      const text = decodeTextWithFallback(bytes.buffer);
      const firstNonEmptyLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
      if (!firstNonEmptyLine) {
        throw new Error('Файл пустой.');
      }
      const delim = detectDelimiter(firstNonEmptyLine);
      table = parseDelimitedRows(text, delim, (pct) => reportProgress(pct, 'Разбор таблицы…'));
    }

    reportProgress(90, 'Анализ колонок и автоопределение ролей…');
    const analyzed = analyzeTableRows(table, existingCols);
    reportProgress(100, 'Готово');

    self.postMessage({
      type: 'done',
      analyzed: { ...analyzed, fileName: file.name }
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err?.message || String(err)
    });
  }
};
