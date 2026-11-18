const deepseekService = require('../services/ai/deepseekService');

/**
 * Agente 1: Orquestador
 * - Recibe preguntas, clasifica intención y aplica guardrails de seguridad/gobernanza.
 * - Identifica: POLITICA_RRHH, DATOS_PERSONALES, MIXTA, REPORTE_RRHH,
 *   RESTRINGIDA_SEGURIDAD, RESTRINGIDA_GOBERNANZA, FUERA_DE_ALCANCE.
 * - Es el ÚNICO agente que construye y emite la respuesta conversacional final.
 */

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /olvida\s+(todas\s+)?(las\s+)?instrucciones/i,
  /ignora\s+(tus\s+)?reglas/i,
  /system\s*prompt/i,
  /revela\s+(tu\s+)?(prompt|api\s*key|clave|secreto|contrase[nñ]a)/i,
  /act[uú]a\s+como\s+(dan|root|administrador\s+sin\s+restricciones)/i,
  /jailbreak/i,
  /bypass\s+(security|seguridad|auth)/i,
  /\b(drop\s+table|union\s+select|;\s*delete\s+from|1\s*=\s*1)\b/i
];

const GOVERNANCE_PROHIBITED_PATTERNS = [
  /\b(despide|despedir|echa|desvincula)\s+a\b/i,
  /\b(contrata|contratar)\s+a\b/i,
  /\b(imp[oó]n|aplica|pon)\s+(una\s+)?(sanci[oó]n|amonestaci[oó]n)\b/i,
  /\b(s[uú]beme|aumenta|modifica|cambia)\s+(mi\s+|el\s+)?(salario|sueldo)\b/i,
  /\b(aprueba|apru[eé]bame|autoriza|rechaza)\s+(mis\s+|las\s+|la\s+)?(vacaciones|permiso|solicitud)\b/i
];

const THIRD_PARTY_DATA_PATTERNS = [
  /cu[aá]ntos\s+d[ií]as\s+(de\s+vacaciones\s+)?(disponibles\s+)?tiene\s+(?!yo\b)(?!mi\b)(?!el\s+per[ií]odo)(?!la\s+licencia)(?!el\s+permiso)(?!un\s+permiso)(?!una\s+licencia)(?!el\s+preaviso)(?!la\s+empresa)(el\s+gerente|la\s+gerente|el\s+director|la\s+directora|mi\s+jefe|mi\s+compa[nñ]er[oa]|otro\s+colaborador|otra\s+colaboradora|otro\s+empleado|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/i,
  /(vacaciones|saldo|d[ií]as\s+disponibles)\s+(actuales\s+)?de\s+(mi\s+compa[nñ]er[oa]|mi\s+jefe|otro\s+colaborador|otra\s+persona|el\s+gerente|la\s+directora|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/i,
  /(salario|sueldo|remuneraci[oó]n)\s+(de|del|de\s+la)\s+(gerente|director|directora|jefe|jefatura|compa[nñ]er[oa]|otro|otra|todos|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/i,
  /cu[aá]nto\s+gana\s+(el|la|mi\s+jefe|mi\s+compa[nñ]er[oa]|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/i,
  /incapacidad(es)?\s+(activas?\s+)?de\s+(?!m[ií]\b)(mi\s+compa[nñ]er[oa]|otro\s+colaborador|el\s+gerente|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})/i,
  /dame\s+(la\s+c[eé]dula|el\s+salario|el\s+sueldo|los\s+datos|el\s+expediente|el\s+diagn[oó]stico)\s+de\b/i,
  /lista\s+(completa\s+)?de\s+(salarios|c[eé]dulas|diagn[oó]sticos)/i
];

const OUT_OF_SCOPE_PATTERNS = [
  /arroz\s+con\s+pollo|receta\s+de\s+cocina/i,
  /qui[eé]n\s+gan[oó]\s+el\s+partido|f[uú]tbol|champions|mundial/i,
  /pron[oó]stico\s+del\s+clima|temperatura\s+de\s+hoy/i,
  /cu[eé]ntame\s+un\s+chiste|hor[oó]scopo|capital\s+de\s+francia/i,
  /escribe\s+un\s+poema|programa\s+en\s+python/i
];

const GREETING_OR_ASSISTANT_PATTERNS = [
  /^(hola|buen(os|as)\s+(d[ií]as|tardes|noches)|saludos|hey|holi|qu[eé]\s+tal|c[oó]mo\s+est[aá]s)\b[!.?,\s]*$/i,
  /^(hola|buen(os|as)\s+(d[ií]as|tardes|noches))[!,.?\s]+(c[oó]mo\s+est[aá]s|en\s+qu[eé]\s+me\s+ayudas|qu[eé]\s+tal)/i,
  /\b(qu[eé]\s+ia\s+(usa|usas|utiliza|utilizas|eres)|qu[eé]\s+modelo\s+(usa|usas|eres)|qui[eé]n\s+eres|cu[eé]ntame\s+sobre\s+(este\s+)?proyecto|qu[eé]\s+es\s+policybot|qu[eé]\s+puedes\s+hacer|c[oó]mo\s+funciona\s+este\s+(portal|chat|sistema)|muchas\s+gracias|gracias)\b/i
];

function detectTopic(question) {
  const q = String(question || '').toLowerCase();
  if (/vacacion|saldo|vencimiento/.test(q)) return 'Vacaciones';
  if (/incapacidad|ccss|ins|boleta|subsidio/.test(q)) return 'Incapacidades CCSS/INS';
  if (/permiso|licencia|maternidad|paternidad|duelo|matrimonio/.test(q)) return 'Permisos y Licencias';
  if (/teletrabajo|jornada|horario|hora extra|feriado|desconexi/.test(q)) return 'Teletrabajo y Jornada';
  if (/salario|pago|quincena|aguinaldo|deducci|constancia/.test(q)) return 'Salarios y Aguinaldo';
  if (/beneficio|solidarista|seguro|beca|cumplea/.test(q)) return 'Beneficios';
  if (/onboarding|inducci|prueba|buddy/.test(q)) return 'Onboarding';
  if (/salida|renuncia|despido|preaviso|cesant|liquidaci/.test(q)) return 'Salida y Liquidación';
  if (/evaluaci|desempe|okr|pip/.test(q)) return 'Evaluación de Desempeño';
  if (/privacidad|datos|hostigamiento|acoso|conducta|gobernanza|ia/.test(q)) return 'Conducta y Privacidad';
  if (/reporte|rotaci|pendiente|latencia|kpi/.test(q)) return 'Analítica RRHH';
  return 'Consulta General RRHH';
}

function classifyIntent(question, userContext) {
  const q = String(question || '').trim();
  const qLower = q.toLowerCase();

  // 1. Prompt injection / SQL injection / extracción maliciosa
  if (PROMPT_INJECTION_PATTERNS.some((rx) => rx.test(q))) {
    return {
      intent: 'RESTRINGIDA_SEGURIDAD',
      topic: 'Seguridad e Inyección',
      reason: 'Intento de prompt injection, inyección SQL o extracción de credenciales/instrucciones del sistema.'
    };
  }

  // 2. Acceso a datos personales o salarios de terceros (Ley N° 8968)
  if (THIRD_PARTY_DATA_PATTERNS.some((rx) => rx.test(q))) {
    return {
      intent: 'RESTRINGIDA_SEGURIDAD',
      topic: 'Privacidad Ley 8968',
      reason: 'Solicitud de información personal o salarial de terceros protegida por la Ley N° 8968.'
    };
  }

  // 3. Acciones laborales prohibidas para la IA (Gobernanza)
  if (GOVERNANCE_PROHIBITED_PATTERNS.some((rx) => rx.test(q))) {
    return {
      intent: 'RESTRINGIDA_GOBERNANZA',
      topic: 'Gobernanza IA',
      reason: 'Solicitud de decisión laboral autónoma prohibida por las políticas de gobernanza.'
    };
  }

  // 4. Saludos y preguntas informativas sobre PolicyBot HR / IA utilizada
  if (GREETING_OR_ASSISTANT_PATTERNS.some((rx) => rx.test(q))) {
    return {
      intent: 'SALUDO_ASISTENTE',
      topic: 'Asistente PolicyBot HR',
      reason: 'Saludo o consulta general sobre las capacidades y arquitectura de PolicyBot HR.'
    };
  }

  // 5. Preguntas claramente fuera del alcance de RRHH
  if (OUT_OF_SCOPE_PATTERNS.some((rx) => rx.test(q))) {
    return {
      intent: 'FUERA_DE_ALCANCE',
      topic: 'Fuera de Alcance',
      reason: 'La consulta no pertenece al dominio de Recursos Humanos ni políticas de TicoTech S.A.'
    };
  }

  // 5. Consultas de métricas agregadas / reportes organizacionales
  const isPersonalScope = /\b(mi|mis)\b/i.test(qLower);
  const asksAggregateHr =
    !isPersonalScope &&
    /(tasa\s+de\s+rotaci[oó]n|reporte\s+diario|indicadores?\s+(de\s+)?rrhh|cu[aá]ntos\s+colaboradores|solicitudes\s+pendientes|ausencias\s+(actuales|por\s+departamento)|incapacidades\s+activas|acumuladas\s+en\s+el\s+mes|latencia\s+promedio\s+del\s+chatbot|temas\s+m[aá]s\s+consultados)/i.test(
      qLower
    );

  if (asksAggregateHr) {
    if (userContext.rol !== 'ADMIN_RRHH') {
      return {
        intent: 'RESTRINGIDA_SEGURIDAD',
        topic: 'Control de Acceso RBAC',
        reason: 'Las métricas agregadas e indicadores organizacionales de RRHH están restringidos al rol ADMIN_RRHH.'
      };
    }
    return {
      intent: 'REPORTE_RRHH',
      topic: 'Analítica RRHH',
      reason: 'Consulta de indicadores organizacionales autorizada para ADMIN_RRHH.'
    };
  }

  // 6. Detección de intención Personal vs Política vs Mixta
  const asksPersonalData =
    /\b(mi|mis|tengo|me\s+quedan|disponibles\s+tengo|mi\s+saldo|mis\s+vacaciones|mis\s+solicitudes|mis\s+incapacidades|mi\s+pr[oó]xima\s+evaluaci[oó]n|mi\s+cumplea[nñ]os|mi\s+puesto|mi\s+fecha\s+de\s+ingreso|mis\s+movimientos|mi\s+calificaci[oó]n)\b/i.test(
      qLower
    );

  const asksPolicyRule =
    /\b(pol[ií]tica|reglamento|procedimiento|ley|c[oó]digo\s+de\s+trabajo|seg[uú]n|anticipaci[oó]n|requisitos?|cu[aá]ntos\s+d[ií]as\s+corresponden|c[oó]mo\s+se\s+(paga|tramita|solicita|calcula)|plazo|tope|porcentaje|subsidio|aguinaldo|cesant[ií]a|preaviso|teletrabajo|solidarista|beneficio|maternidad|paternidad|duelo|matrimonio|onboarding|desconexi[oó]n)\b/i.test(
      qLower
    );

  if (asksPersonalData && asksPolicyRule) {
    return {
      intent: 'MIXTA',
      topic: detectTopic(q),
      reason: 'Combina consulta de expediente personal autenticado con normativa/política interna.'
    };
  }

  if (asksPersonalData) {
    return {
      intent: 'DATOS_PERSONALES',
      topic: detectTopic(q),
      reason: 'Consulta de información personal del colaborador autenticado.'
    };
  }

  return {
    intent: 'POLITICA_RRHH',
    topic: detectTopic(q),
    reason: 'Consulta normativa o procedimental sobre políticas de RRHH.'
  };
}

function buildSecurityOrGovernanceRejection(classification) {
  if (classification.intent === 'RESTRINGIDA_GOBERNANZA') {
    return (
      'No puedo ejecutar esa acción. Por **Gobernanza de IA de TicoTech S.A.**, PolicyBot HR tiene estrictamente prohibido despedir o contratar colaboradores, imponer sanciones, modificar salarios o aprobar/rechazar permisos y vacaciones por cuenta propia. Todas las decisiones laborales deben ser ejecutadas por personas humanas autorizadas en el flujo correspondiente.'
    );
  }
  if (classification.intent === 'FUERA_DE_ALCANCE') {
    return (
      'Esta consulta está fuera del ámbito de **PolicyBot HR**. Estoy especializado exclusivamente en políticas laborales de TicoTech S.A. (Costa Rica), consultas sobre su expediente personal autorizado y analítica de RRHH. Si necesita ayuda laboral o normativa, indíqueme su consulta.'
    );
  }
  return (
    `Consulta bloqueada por políticas de seguridad y privacidad (Ley N° 8968 y control de acceso RBAC): ${classification.reason} Solo puede acceder a sus propios datos personales autenticados o a políticas generales de la organización.`
  );
}

/**
 * Construye la respuesta conversacional final (único punto de emisión hacia el usuario).
 */
async function synthesizeFinalResponse({
  question,
  classification,
  userContext,
  ragResult,
  employeeResult,
  reportsResult,
  validationResult
}) {
  if (
    ['RESTRINGIDA_SEGURIDAD', 'RESTRINGIDA_GOBERNANZA', 'FUERA_DE_ALCANCE'].includes(
      classification.intent
    )
  ) {
    return {
      answer: buildSecurityOrGovernanceRejection(classification),
      tokensUsed: 0,
      modelUsed: 'guardrail-orchestrator-determinista'
    };
  }

  if (classification.intent === 'SALUDO_ASISTENTE') {
    const fallbackWelcome = `¡Hola ${userContext?.nombreCompleto || ''}! Soy **PolicyBot HR**, el asistente multiagente de Recursos Humanos de **TicoTech S.A. (Costa Rica)**.

Utilizo **DeepSeek (\`deepseek-flash\`)** orquestado con **LangGraph.js**, base de datos relacional **MySQL (\`policybot_rrhh\`)**, búsqueda vectorial **RAG (Qdrant + embeddings BGE-M3)** y sincronización documental con **Google Drive API v3**.

Puedo ayudarte con:
1. **Políticas laborales y legislación de Costa Rica** (vacaciones, incapacidades CCSS/INS, aguinaldo, teletrabajo Ley N° 9738, licencias y salida) con citas verificables.
2. **Tu expediente personal autorizado** (saldo de vacaciones, solicitudes y próxima evaluación).
${userContext?.rol === 'ADMIN_RRHH' ? '3. **Analítica y reportes ejecutivos de RRHH** (tasa de rotación, ausencias, solicitudes >3 días y KPIs diarios).\n' : ''}
¿En qué te puedo ayudar hoy?`;

    if (deepseekService.isConfigured()) {
      const aiRes = await deepseekService.generateCompletion({
        systemPrompt: `Eres PolicyBot HR, el asistente inteligente de Recursos Humanos de TicoTech S.A. (Costa Rica).
Responde de forma amable, clara y precisa en español sobre quién eres, la tecnología que usas o responde al saludo del usuario.
Hechos reales de tu arquitectura (no inventes otros):
- Modelo LLM: DeepSeek (deepseek-flash).
- Orquestación: LangGraph.js con 5 agentes obligatorios (Orquestador, Políticas RAG, Datos del Colaborador, Analista de Reportes, Ingesta y Sincronización) + Agente Validador + Escalamiento Humano.
- Datos y RAG: MySQL (policybot_rrhh), Qdrant, embeddings BGE-M3 (Ollama) y Google Drive API v3.
- Gobernanza: Supervisión humana obligatoria (la IA nunca despide, contrata, sanciona, modifica salarios ni aprueba vacaciones por sí sola) y cumplimiento de la Ley N° 8968 de Costa Rica.
- Usuario actual autenticado: ${userContext?.nombreCompleto || 'Colaborador'} (Rol: ${userContext?.rol || 'COLABORADOR'}).`,
        userPrompt: question,
        temperature: 0.3,
        maxTokens: 1600
      });
      if (aiRes.ok && aiRes.content) {
        return {
          answer: aiRes.content,
          tokensUsed: aiRes.usage?.total_tokens || 0,
          modelUsed: aiRes.model
        };
      }
    }

    return {
      answer: fallbackWelcome,
      tokensUsed: 0,
      modelUsed: 'orchestrator-assistant-fallback'
    };
  }

  if (!validationResult.approved) {
    return {
      answer: validationResult.finalValidatedText,
      tokensUsed: 0,
      modelUsed: 'validator-guard'
    };
  }

  if (classification.intent === 'POLITICA_RRHH') {
    return {
      answer: ragResult.answerDraft,
      tokensUsed: ragResult.tokensUsed || 0,
      modelUsed: ragResult.modelUsed || 'rag-evidence'
    };
  }

  if (classification.intent === 'DATOS_PERSONALES') {
    return {
      answer: employeeResult.answerDraft,
      tokensUsed: 0,
      modelUsed: 'sql-authenticated-context'
    };
  }

  if (classification.intent === 'REPORTE_RRHH') {
    return {
      answer: reportsResult.answerDraft,
      tokensUsed: 0,
      modelUsed: 'sql-hr-analytics'
    };
  }

  // MIXTA: combinar datos personales + política RAG (usando DeepSeek si está disponible, o síntesis estructurada)
  if (classification.intent === 'MIXTA') {
    const combinedFallback = [
      employeeResult?.answerDraft || '',
      '',
      '**Marco normativo aplicable según políticas indexadas:**',
      ragResult?.answerDraft || ''
    ]
      .filter(Boolean)
      .join('\n');

    if (deepseekService.isConfigured() && ragResult?.hasEvidence) {
      const aiRes = await deepseekService.generateCompletion({
        systemPrompt:
          'Eres el Agente Orquestador de PolicyBot HR. Integra en una respuesta clara y concisa los datos personales verificados del colaborador con la política aplicable, sin alterar ningún número ni omitir la referencia documental.',
        userPrompt: `Pregunta: ${question}\n\nDatos personales SQL:\n${employeeResult?.answerDraft}\n\nEvidencia política RAG:\n${ragResult?.answerDraft}`,
        temperature: 0.15,
        maxTokens: 700
      });
      if (aiRes.ok && aiRes.content) {
        return {
          answer: aiRes.content,
          tokensUsed: (ragResult.tokensUsed || 0) + (aiRes.usage?.total_tokens || 0),
          modelUsed: aiRes.model
        };
      }
    }

    return {
      answer: combinedFallback,
      tokensUsed: ragResult?.tokensUsed || 0,
      modelUsed: ragResult?.modelUsed || 'orchestrator-mixed-synthesis'
    };
  }

  return {
    answer: 'No fue posible procesar su consulta. Por favor intente reformularla o escale a RRHH.',
    tokensUsed: 0,
    modelUsed: 'orchestrator-default'
  };
}

module.exports = {
  classifyIntent,
  detectTopic,
  buildSecurityOrGovernanceRejection,
  synthesizeFinalResponse
};
