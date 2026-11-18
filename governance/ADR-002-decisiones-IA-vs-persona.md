# ADR-002: Delimitación de Decisiones entre IA y Personas Autorizadas

- **Estado:** Aceptado e Implementado
- **Fecha:** 2026-11-17

## Contexto
El uso de agentes autónomos en Recursos Humanos conlleva riesgos legales (Código de Trabajo de Costa Rica, Ley N° 8968) y éticos si la IA llegara a ejecutar actos con efectos contractuales o disciplinarios.

## Decisión
Se prohíbe técnica y normativamente que cualquier agente de PolicyBot HR tome decisiones laborales vinculantes:
1. **La IA NO puede despedir colaboradores.**
2. **La IA NO puede contratar colaboradores.**
3. **La IA NO puede imponer sanciones o amonestaciones.**
4. **La IA NO puede modificar salarios ni deducciones.**
5. **La IA NO puede aprobar ni rechazar permisos o vacaciones por su cuenta.**
6. **Toda decisión laboral requiere acción explícita de una persona humana autorizada** (a través de `PATCH /api/employee/admin/requests/:id` o procedimientos formales de RRHH).

## Implementación Técnica
- `orchestratorAgent.js` intercepta solicitudes que pidan ejecutar estas acciones (`RESTRINGIDA_GOBERNANZA`) y las rechaza antes de alcanzar el modelo generativo.
- `validatorAgent.js` inspecciona todas las salidas para garantizar que ningún borrador simule haber aprobado solicitudes o ejecutado acciones contractuales.
- El usuario `COLABORADOR` únicamente puede crear solicitudes en estado `PENDIENTE`.
