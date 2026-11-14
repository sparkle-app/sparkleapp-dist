/**
 * Sparkle Client-Side Excel Handler
 * HTML5 FileReader (readAsArrayBuffer -> Uint8Array) and dataset management.
 */

import { runWasmAnalytics } from './wasm_loader.js';

let currentDatasetBundle = null;
let currentFileName = '';

export function getCurrentDataset() {
  return currentDatasetBundle;
}

export function getCurrentFileName() {
  return currentFileName;
}

export function setCurrentDataset(bundle, fileName = '') {
  currentDatasetBundle = bundle;
  if (fileName) currentFileName = fileName;
}

/**
 * Read File object as Uint8Array
 */
export function readFileAsUint8Array(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      resolve(new Uint8Array(buffer));
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Fetch a local sample Excel file as Uint8Array
 */
export async function fetchSampleAsUint8Array(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Fetch precomputed demo JSON (for fallback demonstration only)
 */
export async function fetchPrecomputedDemo(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
  return await resp.json();
}

/**
 * Process Excel file: strictly runs Wasm analytics on bytes
 * @param {Uint8Array} bytes 
 * @param {string} fileName 
 * @param {object} [options] 
 */
export async function processExcelData(bytes, fileName, options = {}) {
  currentFileName = fileName;

  // Real in-memory parsing via WebAssembly calamine crate
  const resultBundle = await runWasmAnalytics(bytes, options.topCategories || 2);
  if (!resultBundle) {
    throw new Error('WebAssembly не смог рассчитать аналитику для переданного файла.');
  }

  currentDatasetBundle = resultBundle;
  window.dispatchEvent(new CustomEvent('sparkle:data_ready', {
    detail: { bundle: resultBundle, fileName }
  }));

  return resultBundle;
}

/**
 * Setup wizard interactions in #prep and #market
 */
export function setupExcelWizard(containerSelector = '#prep .wiz') {
  const wiz = document.querySelector(containerSelector);
  if (!wiz) return;

  const setStep = (s) => {
    wiz.dataset.s = s;
    wiz.querySelectorAll('.steps li').forEach((l, i) => {
      l.className = i < s ? 'done' : i === s ? 'on' : '';
    });
  };

  const handleProcess = async (name, loadPromise) => {
    wiz.querySelectorAll('.fn').forEach(el => el.textContent = `«${name}»`);
    setStep(1); // Processing step

    try {
      const bytes = await loadPromise();
      await processExcelData(bytes, name);
      setTimeout(() => setStep(2), 500); // Done step
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('sparkle:toast', {
        detail: `Ошибка обработки файла: ${err.message}`
      }));
      setStep(0);
    }
  };

  // Demo buttons: fetch genuine xlsx binary files and parse via Wasm
  const demoButtons = wiz.querySelectorAll('.ex');
  demoButtons.forEach((btn, idx) => {
    btn.onclick = () => {
      const isTest3 = idx === 2; // Пример 3
      const sampleUrl = isTest3
        ? 'assets/samples/test_data_3.xlsx'
        : 'assets/samples/test_data_fixed.xlsx';
      const sampleName = isTest3 ? 'test_data_3.xlsx' : 'test_data_fixed.xlsx';

      handleProcess(sampleName, () => fetchSampleAsUint8Array(sampleUrl));
    };
  });

  // Dropzone and file input
  const dropzone = wiz.querySelector('.drop');
  const fileInput = wiz.querySelector('.drop input[type="file"]');

  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        const file = files[0];
        handleProcess(file.name, () => readFileAsUint8Array(file));
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleProcess(file.name, () => readFileAsUint8Array(file));
      }
    });
  }

  // Again button
  const againBtn = wiz.querySelector('.again');
  if (againBtn) {
    againBtn.onclick = () => {
      if (fileInput) fileInput.value = '';
      setStep(0);
    };
  }

  // Dashboard navigation button ("Открыть в браузере")
  const openDashBtn = wiz.querySelector('.btn-open-dash');
  if (openDashBtn) {
    openDashBtn.onclick = () => {
      location.hash = '#dash';
    };
  }

  // Download presentation button
  const downloadPptxBtn = wiz.querySelector('.btn-download-pptx');
  if (downloadPptxBtn) {
    downloadPptxBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = 'assets/samples/download_template.pptx';
      a.download = `Sparkle_Стратегическая_сессия_${currentFileName || 'аналитика'}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.dispatchEvent(new CustomEvent('sparkle:toast', {
        detail: 'Презентация сформирована и загружается.'
      }));
    };
  }

  setStep(0);
}
