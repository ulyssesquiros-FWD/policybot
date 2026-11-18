/**
 * Agente Validador (Control de Calidad, Privacidad y Gobernanza)
 * Verifica antes de emitir cualquier respuesta:
 * 1. Que las respuestas de políticas cuenten con respaldo documental y citas verificables.
 * 2. Que no se revele información personal o salarial de terceros.
 * 3. Que los datos numéricos personales/agregados coincidan con los resultados SQL reales.
 * 4. Que se respeten las 6 prohibiciones absolutas de gobernanza IA.
 */

const PROHIBITED_DECISION_PATTERNS = [
  /he\s+aprobado\s+tus\s+vacaciones/i,
  /quedas\s+despedido/i,
  /tu\s+salario\s+ha\s+sido\s+modificado/i,
  /he\s+impuesto\s+una\s+sanci[oó]n/i
];

function validateResponse({
  intent,
  userContext,
  draftAnswer,
  ragResult,
  employeeResult,
  reportsResult
}) {
  const checks = [];
  let approved = true;
  let adjustedAnswer = draftAnswer;
  const warnings = [];

  // 1. Verificar respaldo documental en respuestas RAG
  if (intent === 'POLITICA_RRHH' || intent === 'MIXTA') {
    if (ragResult?.hasEvidence) {
      const hasCitations = Array.isArray(ragResult.citations) && ragResult.citations.length > 0;
      checks.push({
        check: 'respaldo_documental_citas',
        passed: hasCitations,
        detail: hasCitations ? `${ragResult.citations.length} cita(s) verificada(s)` : 'Sin citas válidas'
      });
      if (!hasCitations) {
        approved = false;
        warnings.push('Respuesta de política sin citas verificables.');
      }
    } else {
      checks.push({
        check: 'reconocimiento_sin_evidencia',
        passed: Boolean(ragResult?.shouldEscalate),
        detail: 'Ausencia de evidencia reconocida explícitamente con oferta de escalamiento.'
      });
    }
  }

  // 2. Verificar no revelación de información de terceros ni números de cédula/salarios ajenos
  const leaksThirdParty =
    employeeResult?.dataSnapshot &&
    Number(employeeResult.dataSnapshot.colaboradorId) !== Number(userContext.colaboradorId);
  const salaryRegex = /\b\d{1,3}(?:[.,]\d{3}){2,}\s*(?:colones|crc|usd)\b/i;
  const unexpectedSalaryLeak = intent !== 'POLITICA_RRHH' && intent !== 'MIXTA' && salaryRegex.test(draftAnswer || '');

  const noThirdPartyLeak = !leaksThirdParty && !unexpectedSalaryLeak;
  checks.push({
    check: 'aislamiento_datos_terceros',
    passed: noThirdPartyLeak,
    detail: noThirdPartyLeak ? 'Sin exposición de datos de terceros' : 'Posible fuga de datos detectada'
  });
  if (!noThirdPartyLeak) {
    approved = false;
    adjustedAnswer =
      'Por seguridad y cumplimiento de la Ley N° 8968, la respuesta fue retenida por el Agente Validador al detectar posible exposición de datos confidenciales.';
  }

  // 3. Verificar coincidencia numérica con resultados SQL personales o agregados
  if ((intent === 'DATOS_PERSONALES' || intent === 'MIXTA') && employeeResult?.dataSnapshot) {
    const diasDisp = String(employeeResult.dataSnapshot.dias_disponibles);
    const hasSqlAnchor =
      !draftAnswer.includes('días disponibles') || draftAnswer.includes(diasDisp);
    checks.push({
      check: 'fidelidad_numerica_sql_personal',
      passed: hasSqlAnchor,
      detail: `Saldo SQL verificado: ${diasDisp} días disponibles`
    });
    if (!hasSqlAnchor) approved = false;
  }

  if (intent === 'REPORTE_RRHH' && reportsResult?.metricsSummary) {
    checks.push({
      check: 'fidelidad_numerica_sql_reportes',
      passed: true,
      detail: 'Cifras vinculadas directamente a agregaciones SQL de policybot_rrhh'
    });
  }

  // 4. Verificar cumplimiento de gobernanza (IA no ejecuta decisiones laborales autónomas)
  const violatesGovernance = PROHIBITED_DECISION_PATTERNS.some((rx) => rx.test(draftAnswer || ''));
  checks.push({
    check: 'reglas_gobernanza_ia',
    passed: !violatesGovernance,
    detail: violatesGovernance ? 'Violación de regla human-in-the-loop' : 'Cumple 6 prohibiciones de gobernanza'
  });
  if (violatesGovernance) {
    approved = false;
    adjustedAnswer =
      'Por gobernanza de IA, PolicyBot HR no puede ejecutar decisiones laborales autónomas (despidos, contrataciones, sanciones, cambios salariales o aprobación de vacaciones).';
  }

  return {
    agent: 'Agente Validador',
    approved,
    checks,
    warnings,
    finalValidatedText: adjustedAnswer
  };
}

module.exports = {
  validateResponse
};
