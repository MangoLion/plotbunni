export const AI_HORDE_OAI_BASE_URL = 'https://oai.aihorde.net/v1/chat/completions';

const HORDE_MODELS_URL = 'https://aihorde.net/api/v2/status/models?type=text';
const HORDE_WORKERS_URL = 'https://aihorde.net/api/v2/workers?type=text';
const HORDE_OAI_MODELS_URL = 'https://oai.aihorde.net/v1/models';

/**
 * Aggregates data from AI Horde's three API endpoints into a unified model list.
 * @param {Array} statusModels - From /api/v2/status/models?type=text
 * @param {Array} workers - From /api/v2/workers?type=text
 * @param {object|null} oaiData - From /v1/models (OpenAI-compatible listing)
 * @returns {Array} Sorted array of aggregated model objects
 */
export function aggregateHordeModels(statusModels, workers, oaiData) {
  const modelMap = {};

  // Initialize from status/models (worker count, performance, queue)
  for (const model of statusModels) {
    if (model.type !== 'text') continue;
    modelMap[model.name] = {
      id: model.name,
      cleanName: model.name,
      size: null,
      quant: null,
      backend: null,
      workerCount: model.count || 0,
      performance: model.performance || 0,
      queued: model.queued || 0,
      eta: model.eta || 0,
      maxContextLength: 0,
      maxOutputTokens: 0,
    };
  }

  // Aggregate per-model limits from worker data (use max across all online workers)
  for (const worker of workers) {
    if (!worker.online || worker.maintenance_mode) continue;
    for (const modelName of (worker.models || [])) {
      if (modelMap[modelName]) {
        modelMap[modelName].maxContextLength = Math.max(
          modelMap[modelName].maxContextLength,
          worker.max_context_length || 0
        );
        modelMap[modelName].maxOutputTokens = Math.max(
          modelMap[modelName].maxOutputTokens,
          worker.max_length || 0
        );
      }
    }
  }

  // Enrich with OAI metadata (clean name, size, quant, backend)
  const oaiModels = oaiData?.data || [];
  const oaiMap = {};
  for (const m of oaiModels) {
    oaiMap[m.id] = m;
  }
  for (const id of Object.keys(modelMap)) {
    const oaiEntry = oaiMap[id];
    if (oaiEntry) {
      modelMap[id].cleanName = oaiEntry.clean_name || oaiEntry.name || id;
      modelMap[id].size = oaiEntry.size || null;
      modelMap[id].quant = oaiEntry.quant || null;
      modelMap[id].backend = oaiEntry.backend || null;
    }
  }

  // Return sorted by workerCount descending, then by cleanName
  return Object.values(modelMap).sort((a, b) => {
    if (b.workerCount !== a.workerCount) return b.workerCount - a.workerCount;
    return a.cleanName.localeCompare(b.cleanName);
  });
}

/**
 * Fetches model data from all three AI Horde endpoints in parallel and returns
 * the aggregated, enriched model list.
 * @returns {Promise<Array>} Aggregated model list
 */
export async function fetchHordeModels() {
  const [statusResult, workersResult, oaiResult] = await Promise.allSettled([
    fetch(HORDE_MODELS_URL).then(r => r.ok ? r.json() : Promise.reject(new Error(`Status ${r.status}`))),
    fetch(HORDE_WORKERS_URL).then(r => r.ok ? r.json() : Promise.reject(new Error(`Status ${r.status}`))),
    fetch(HORDE_OAI_MODELS_URL).then(r => r.ok ? r.json() : Promise.reject(new Error(`Status ${r.status}`))),
  ]);

  if (statusResult.status === 'rejected') {
    throw new Error(`Failed to fetch AI Horde models: ${statusResult.reason}`);
  }

  const statusModels = statusResult.value || [];
  const workers = workersResult.status === 'fulfilled' ? workersResult.value || [] : [];
  const oaiData = oaiResult.status === 'fulfilled' ? oaiResult.value : null;

  return aggregateHordeModels(statusModels, workers, oaiData);
}
