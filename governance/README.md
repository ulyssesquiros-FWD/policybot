# Gobernanza de Inteligencia Artificial y Seguridad — PolicyBot HR

Este directorio documenta el marco de gobernanza, arquitectura, privacidad de datos, registro de riesgos, matriz de control de acceso, registro de prompts y evaluación automatizada del sistema **PolicyBot HR** de TicoTech S.A. (Costa Rica).

## Principios Rectores
1. **Supervisión Humana Obligatoria (*Human-in-the-Loop*):** La IA informa y sintetiza evidencia documental/SQL, pero jamás toma decisiones laborales vinculantes.
2. **Privacidad por Diseño (Ley N° 8968):** Aislamiento estricto de datos personales mediante verificación de identidad por JWT en el backend; prohibición total de consultar información de terceros.
3. **Trazabilidad Verificable:** Cada consulta, documento recuperado, agente invocado, tiempo de respuesta, escalamiento o bloqueo se registra en `audit_logs` y `consultas_chat`.
4. **Fidelidad Documental y Numérica:** Las respuestas de políticas requieren citas con documento, sección, versión y enlace; las cifras de reportes provienen exclusivamente de consultas SQL parametrizadas.

## Estructura del Marco de Gobernanza
- [inventario.md](./inventario.md) — Inventario de agentes, modelos, fuentes de datos e integraciones.
- [ADR-001-decision-modelo-IA.md](./ADR-001-decision-modelo-IA.md) — Selección de DeepSeek (`deepseek-flash`), Ollama (`bge-m3`) y LangGraph.js.
- [ADR-002-decisiones-IA-vs-persona.md](./ADR-002-decisiones-IA-vs-persona.md) — Límites entre automatización IA y autoridad humana.
- [ADR-003-arquitectura-de-datos.md](./ADR-003-arquitectura-de-datos.md) — Arquitectura relacional MySQL (`policybot_rrhh`) y vectorial Qdrant.
- [AGENTS.md](./AGENTS.md) — Especificación formal de los 5 agentes obligatorios y el Agente Validador.
- [risk-register.md](./risk-register.md) — Registro de riesgos identificados y controles técnicos implementados.
- [data-classification.md](./data-classification.md) — Clasificación (Público, Interno, Confidencial, Sensible) y retención.
- [access-control-matrix.md](./access-control-matrix.md) — Matriz RBAC por rol y recurso API.
- [threat-model.md](./threat-model.md) — Modelo de amenazas (STRIDE / OWASP LLM Top 10).
- [incident-response.md](./incident-response.md) — Protocolo de respuesta ante incidentes de IA y privacidad.
- `prompt-registry/` — Versionado auditable de prompts del sistema.
- `evaluations/` — Banco de 45 preguntas y resultados ejecutados.
