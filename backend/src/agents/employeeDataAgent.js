const hrRepo = require('../services/db/hrRepository');

/**
 * Agente 3: Datos del Colaborador
 * REGLA FUNDAMENTAL DE SEGURIDAD:
 * - El colaborador_id DEBE provenir exclusivamente del contexto JWT autenticado en backend (authenticatedColaboradorId).
 * - NUNCA acepta ni usa un ID enviado libremente desde el cuerpo de la petición o texto del usuario para consultar a terceros.
 */

async function queryOwnEmployeeData({ authenticatedColaboradorId, question = '' }) {
  if (!authenticatedColaboradorId) {
    throw new Error('Identidad de colaborador no verificada en el token de sesión.');
  }

  const profile = await hrRepo.getCollaboratorCompleteProfile(authenticatedColaboradorId);
  if (!profile) {
    return {
      agent: 'Agente Datos Colaborador',
      found: false,
      answerDraft: 'No se encontró un expediente activo vinculado a su usuario autenticado.',
      dataSnapshot: null
    };
  }

  const { colaborador, saldoVacaciones, solicitudes, incapacidades, movimientos } = profile;
  const qNorm = String(question || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const aprobadas = solicitudes.filter((s) => s.estado === 'APROBADA');
  const rech = solicitudes.filter((s) => s.estado === 'RECHAZADA');
  const incapActivas = incapacidades.filter((i) => i.estado === 'ACTIVA');

  const sections = [];
  sections.push(`**Resumen personal autorizado para ${colaborador.nombre} ${colaborador.apellidos} (${colaborador.codigo_empleado}):**`);

  const askVac = /vacacion|saldo|dias|disponib|venc/.test(qNorm) || qNorm.length < 5;
  const askSol = /solicitud|permiso|pendiente|aprobad|rechazad|tramite/.test(qNorm);
  const askIncap = /incapacidad|boleta|ccss|ins|enfermedad/.test(qNorm);
  const askFechas = /fecha|cumple|evaluacion|desempeno|score|calificacion|movimiento|ascenso|puesto|modalidad|ingreso/.test(qNorm);

  if (askVac || (!askSol && !askIncap && !askFechas)) {
    if (saldoVacaciones) {
      sections.push(
        `- **Saldo de Vacaciones (${saldoVacaciones.periodo}):** Tienes **${saldoVacaciones.dias_disponibles} días disponibles** (${saldoVacaciones.dias_acumulados} acumulados, ${saldoVacaciones.dias_disfrutados} disfrutados, próximo vencimiento: ${String(saldoVacaciones.fecha_proximo_vencimiento).slice(0, 10)}).`
      );
    }
  }

  if (askSol || (!askVac && !askIncap && !askFechas)) {
    sections.push(
      `- **Solicitudes registradas:** ${solicitudes.length} en total (${pendientes.length} pendientes, ${aprobadas.length} aprobadas, ${rech.length} rechazadas).`
    );
    if (solicitudes.length > 0) {
      const latest = solicitudes[0];
      sections.push(
        `  Última solicitud: **${latest.tipo}** del ${String(latest.fecha_inicio).slice(0, 10)} al ${String(latest.fecha_fin).slice(0, 10)} (${latest.dias_solicitados} días) — Estado: **${latest.estado}**.`
      );
    }
  }

  if (askIncap) {
    if (incapacidades.length === 0) {
      sections.push('- **Incapacidades:** No registras incapacidades en tu historial reciente.');
    } else {
      sections.push(
        `- **Incapacidades:** ${incapacidades.length} registradas (${incapActivas.length} activas). Última boleta: ${incapacidades[0].numero_boleta} (${incapacidades[0].entidad_emisora}, ${incapacidades[0].dias_incapacidad} días, estado ${incapacidades[0].estado}).`
      );
    }
  }

  if (askFechas) {
    sections.push(
      `- **Datos laborales y fechas relevantes:** Puesto **${colaborador.puesto}** en **${colaborador.departamento}** (modalidad ${colaborador.modalidad}), fecha de ingreso: ${String(colaborador.fecha_ingreso).slice(0, 10)}, próxima evaluación de desempeño: ${String(colaborador.proxima_evaluacion).slice(0, 10)}, última calificación registrada: **${colaborador.ultimo_score_desempeno}/5.00**.`
    );
    if (movimientos.length > 0) {
      sections.push(
        `  Último movimiento autorizado: **${movimientos[0].tipo_movimiento}** (${String(movimientos[0].fecha_efectiva).slice(0, 10)}) — ${movimientos[0].motivo}.`
      );
    }
  }

  return {
    agent: 'Agente Datos Colaborador',
    found: true,
    confidence: 0.99,
    answerDraft: sections.join('\n'),
    dataSnapshot: {
      colaboradorId: colaborador.id,
      codigo_empleado: colaborador.codigo_empleado,
      dias_disponibles: saldoVacaciones?.dias_disponibles ?? 0,
      solicitudes_pendientes: pendientes.length,
      incapacidades_activas: incapActivas.length,
      proxima_evaluacion: String(colaborador.proxima_evaluacion).slice(0, 10)
    }
  };
}

module.exports = {
  queryOwnEmployeeData
};
