/**
 * Sparkle Level 2 Local AI Web Worker
 * Loads MLC WebLLM lazily inside a dedicated background worker so UI remains responsive.
 */

// Держите версию синхронной с WEBLLM_VERSION в local_llm_service.js
import { WebWorkerMLCEngineHandler } from 'https://esm.run/@mlc-ai/web-llm@0.2.89';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg) => {
  handler.onmessage(msg);
};
