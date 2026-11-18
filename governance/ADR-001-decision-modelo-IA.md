# ADR-001: Selección de Modelos de IA, Orquestación y Embeddings

- **Estado:** Aceptado e Implementado
- **Fecha:** 2026-11-17

## Contexto
PolicyBot HR requiere respuestas rápidas en español sobre normativa laboral costarricense, baja latencia, control presupuestario de tokens, cero exposición de claves hacia el navegador y ejecución local de embeddings para documentos internos confidenciales.

## Decisión
1. **Modelo Generativo Centralizado:** DeepSeek API (`https://api.deepseek.com`, modelo `deepseek-flash`) consumido únicamente desde `backend/src/services/ai/deepseekService.js` mediante cliente compatible con OpenAI, con timeout de 15s, temperatura baja (`0.1`–`0.2`) y modo de degradación controlada cuando no hay API key configurada.
2. **Orquestación Multiagente:** `LangGraph.js` (`@langchain/langgraph`) mediante `StateGraph` determinista para separar responsabilidades entre clasificación, recuperación RAG, consulta SQL autenticada, analítica de reportes y validación.
3. **Embeddings Locales:** `Ollama` con el modelo multilingüe `bge-m3` (`backend/src/services/rag/embeddingService.js`), evitando enviar fragmentos completos de políticas internas a terceros para vectorización, con respaldo determinista local cuando Ollama no está activo.

## Consecuencias
- Cumplimiento estricto de minimización de datos hacia proveedores externos.
- Trazabilidad completa de tokens, latencia y estado de disponibilidad en el panel de Gobernanza.
