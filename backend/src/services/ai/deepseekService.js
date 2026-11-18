const OpenAI = require('openai');
const config = require('../../config/env');

/**
 * Servicio centralizado para DeepSeek API (compatible con OpenAI SDK).
 * Endpoint: https://api.deepseek.com | Modelo: deepseek-flash
 * Toda llamada pasa exclusivamente por el backend; ninguna clave se expone al frontend.
 */

let tokenStats = {
  totalCalls: 0,
  liveCalls: 0,
  fallbackCalls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  lastError: null,
  lastLatencyMs: 0
};

function getClients() {
  const clients = [];
  if (config.deepseek.apiKey) {
    clients.push({
      keyName: 'Principal',
      keyPreview: `${config.deepseek.apiKey.slice(0, 7)}...${config.deepseek.apiKey.slice(-4)}`,
      client: new OpenAI({
        apiKey: config.deepseek.apiKey,
        baseURL: config.deepseek.baseURL,
        timeout: config.deepseek.timeoutMs
      })
    });
  }
  if (config.deepseek.secondaryApiKey) {
    clients.push({
      keyName: 'Secundaria',
      keyPreview: `${config.deepseek.secondaryApiKey.slice(0, 7)}...${config.deepseek.secondaryApiKey.slice(-4)}`,
      client: new OpenAI({
        apiKey: config.deepseek.secondaryApiKey,
        baseURL: config.deepseek.baseURL,
        timeout: config.deepseek.timeoutMs
      })
    });
  }
  return clients;
}

function isConfigured() {
  return Boolean(
    (config.deepseek.apiKey && config.deepseek.apiKey.length > 8) ||
    (config.deepseek.secondaryApiKey && config.deepseek.secondaryApiKey.length > 8)
  );
}

async function checkAvailability() {
  if (!isConfigured()) {
    return {
      configured: false,
      available: false,
      mode: 'local_fallback_no_api_key',
      model: config.deepseek.model,
      baseURL: config.deepseek.baseURL,
      message: 'DEEPSEEK_API_KEY no configurada en backend/.env. Operando en modo sintetizador determinista local.'
    };
  }
  return {
    configured: true,
    available: true,
    mode: 'live_deepseek_api',
    model: config.deepseek.model,
    baseURL: config.deepseek.baseURL,
    message: 'DeepSeek API configurada con clave principal y secundaria.'
  };
}

/**
 * Ejecuta una completación controlada contra DeepSeek.
 * Intenta con la clave principal; si falla (401/429/timeout), intenta con la clave secundaria.
 * Si ambas fallan o no están configuradas, activa de forma transparente el respaldo local determinista.
 */
async function generateCompletion({
  systemPrompt,
  userPrompt,
  temperature = config.deepseek.temperature,
  maxTokens = config.deepseek.maxTokens,
  jsonMode = false
}) {
  const start = Date.now();
  tokenStats.totalCalls += 1;

  const clients = getClients();
  if (clients.length === 0) {
    tokenStats.fallbackCalls += 1;
    const latencyMs = Date.now() - start;
    tokenStats.lastLatencyMs = latencyMs;
    return {
      ok: false,
      usedFallback: true,
      model: `${config.deepseek.model} (fallback-local)`,
      content: null,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs,
      reason: 'DEEPSEEK_API_KEY no configurada'
    };
  }

  let lastErr = null;
  const candidateModels =
    config.deepseek.model === 'deepseek-chat'
      ? ['deepseek-chat']
      : [config.deepseek.model, 'deepseek-chat'];

  for (const { keyName, client } of clients) {
    for (const modelName of candidateModels) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.deepseek.timeoutMs);

        const effectiveMaxTokens = Math.max(Number(maxTokens || 1200), 1500);
        const payload = {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: effectiveMaxTokens
        };

        if (jsonMode) {
          payload.response_format = { type: 'json_object' };
        }

        const completion = await client.chat.completions.create(payload, {
          signal: controller.signal
        });
        clearTimeout(timer);

        const latencyMs = Date.now() - start;
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const text = (completion.choices?.[0]?.message?.content || '').trim();
        if (!text) {
          throw new Error('La respuesta del modelo llegó vacía tras el razonamiento.');
        }

        tokenStats.liveCalls += 1;
        tokenStats.promptTokens += Number(usage.prompt_tokens || 0);
        tokenStats.completionTokens += Number(usage.completion_tokens || 0);
        tokenStats.totalTokens += Number(usage.total_tokens || 0);
        tokenStats.lastLatencyMs = latencyMs;
        tokenStats.lastError = null;

        let parsedJson = null;
        if (jsonMode && text) {
          try {
            parsedJson = JSON.parse(text);
          } catch {
            parsedJson = null;
          }
        }

        return {
          ok: true,
          usedFallback: false,
          model: `${modelName} (${keyName})`,
          content: text,
          parsedJson,
          usage,
          latencyMs
        };
      } catch (err) {
        lastErr = err;
        // Si no es error de modelo inexistente, no insistir con otro nombre de modelo en esta misma clave
        if (!/model\s+not\s+exist/i.test(err.message || '')) {
          break;
        }
      }
    }
  }

  const latencyMs = Date.now() - start;
  tokenStats.fallbackCalls += 1;
  tokenStats.lastError = lastErr?.message || 'Error desconocido';
  tokenStats.lastLatencyMs = latencyMs;
  return {
    ok: false,
    usedFallback: true,
    model: `${config.deepseek.model} (fallback-local)`,
    content: null,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    latencyMs,
    reason: lastErr?.message || 'Proveedor no disponible'
  };
}

function getServiceStatus() {
  return {
    provider: 'DeepSeek API (OpenAI-compatible)',
    baseURL: config.deepseek.baseURL,
    model: config.deepseek.model,
    configured: isConfigured(),
    timeoutMs: config.deepseek.timeoutMs,
    maxTokens: config.deepseek.maxTokens,
    temperature: config.deepseek.temperature,
    stats: { ...tokenStats }
  };
}

module.exports = {
  isConfigured,
  checkAvailability,
  generateCompletion,
  getServiceStatus
};
