/**
 * Sparkle WebAssembly Module Loader
 * Handles dynamic import of wasm_core bindings with strict contract validation.
 */

let wasmEngine = null;
let isWasmLoaded = false;
let wasmInitPromise = null;

export async function initWasmEngine() {
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    // Relative paths from /js/wasm_loader.js to wasm distribution
    const candidatePaths = [
      '../wasm/wasm_core.js',
      '../pkg/wasm_core.js',
      './wasm/wasm_core.js',
      './pkg/wasm_core.js'
    ];

    for (const path of candidatePaths) {
      try {
        const module = await import(path);
        
        // 1. Initialize wasm memory
        if (typeof module.default === 'function') {
          await module.default();
        }

        // 2. Strict validation of SparkleEngine class
        let engine = null;
        if (typeof module.SparkleEngine === 'function') {
          engine = new module.SparkleEngine();
        } else if (typeof module.analyzeExcel === 'function') {
          engine = module;
        }

        // 3. Verify analyzeExcel function presence
        if (engine && typeof engine.analyzeExcel === 'function') {
          wasmEngine = engine;
          isWasmLoaded = true;
          window.sparkleWasmReady = true;
          window.sparkleEngine = wasmEngine;
          console.log(`[Sparkle Wasm] Successfully initialized SparkleEngine from: ${path}`);
          dispatchWasmStatusEvent(true, path);
          return wasmEngine;
        } else {
          console.warn(`[Sparkle Wasm] Module at ${path} lacks SparkleEngine / analyzeExcel. Skipping.`);
        }
      } catch (err) {
        // Try next candidate path
      }
    }

    console.error('[Sparkle Wasm] Critical: Genuine WebAssembly module could not be initialized.');
    isWasmLoaded = false;
    wasmEngine = null;
    window.sparkleWasmReady = false;
    dispatchWasmStatusEvent(false, null);
    return null;
  })();

  return wasmInitPromise;
}

export function isWasmReady() {
  return isWasmLoaded && wasmEngine !== null;
}

export function getWasmEngine() {
  return wasmEngine;
}

function dispatchWasmStatusEvent(ready, path) {
  window.dispatchEvent(new CustomEvent('sparkle:wasm_status', {
    detail: { ready, path }
  }));
}

/**
 * High-level wrapper to run Excel analytics via Wasm
 * @param {Uint8Array} fileBytes 
 * @param {number} [topCategories=2] 
 * @returns {Promise<object>} parsed JSON analytics
 */
export async function runWasmAnalytics(fileBytes, topCategories = 2) {
  if (!isWasmReady()) {
    await initWasmEngine();
  }

  if (!wasmEngine) {
    throw new Error('WebAssembly модуль недоступен или не скомпилирован.');
  }

  try {
    const res = wasmEngine.analyzeExcel(fileBytes, topCategories);
    return typeof res === 'string' ? JSON.parse(res) : res;
  } catch (err) {
    console.error('[Sparkle Wasm] Analytics calculation error:', err);
    throw err;
  }
}

/**
 * High-level wrapper to run Risk Matrix calculation via Wasm
 * @param {Array<object>} risks 
 * @returns {object|null}
 */
export function runWasmRiskMatrix(risks) {
  if (!isWasmReady() || !wasmEngine) return null;
  try {
    if (typeof wasmEngine.calculateRiskMatrix === 'function') {
      const res = wasmEngine.calculateRiskMatrix(JSON.stringify({ risks }));
      return typeof res === 'string' ? JSON.parse(res) : res;
    }
  } catch (err) {
    console.error('[Sparkle Wasm] Risk matrix calculation error:', err);
  }
  return null;
}
