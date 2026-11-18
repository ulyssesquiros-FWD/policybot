# Prompt Registry: Agente Datos del Colaborador (v1.0)

- **Agente:** Agente 3 — Datos del Colaborador
- **Versión:** v1.0
- **Archivo fuente:** `backend/src/agents/employeeDataAgent.js`

## Contrato de Seguridad
- Este agente es determinista sobre SQL parametrizado para evitar alucinaciones de saldos o fechas personales.
- Fuente de identidad obligatoria: `userContext.colaboradorId` extraído exclusivamente del token JWT verificado en el servidor.
- Campos permitidos: código, puesto, departamento, modalidad, fecha de ingreso, cumpleaños, próxima evaluación, último score, saldo de vacaciones, solicitudes propias, incapacidades propias y movimientos autorizados.
- Campo excluido por minimización en chat general: salario numérico de terceros.
