const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require(path.resolve(__dirname, '../../backend/node_modules/bcryptjs'));
const db = require(path.resolve(__dirname, '../../backend/src/config/database'));
const config = require(path.resolve(__dirname, '../../backend/src/config/env'));

/**
 * Seeder completo de PolicyBot HR:
 * - Roles y permisos
 * - 55 colaboradores ficticios costarricenses
 * - Usuarios demo (ADMIN_RRHH y COLABORADOR) con contraseñas bcrypt
 * - Saldos de vacaciones (incluyendo >12 colaboradores con >20 días acumulados)
 * - 3 meses de movimientos de personal (ingresos, salidas, ascensos, traslados)
 * - Solicitudes pendientes (varias >3 días), aprobadas y rechazadas
 * - Incapacidades activas y finalizadas (CCSS e INS)
 * - Historial inicial de chat, escalaciones, logs de auditoría y reportes diarios
 */

const DEPARTAMENTOS = [
  { nombre: 'Tecnología e Innovación', puestos: ['Desarrollador Backend', 'Desarrollador Frontend', 'Ingeniero QA', 'Arquitecto Cloud', 'Tech Lead'], baseSal: 1850000 },
  { nombre: 'Recursos Humanos', puestos: ['Directora de RRHH', 'Especialista de Talento', 'Analista de Nómina', 'Generalista de Bienestar'], baseSal: 1450000 },
  { nombre: 'Finanzas y Contabilidad', puestos: ['Analista Financiera', 'Contador General', 'Especialista Tributario', 'Auxiliar Contable'], baseSal: 1350000 },
  { nombre: 'Operaciones y Logística', puestos: ['Coordinador de Operaciones', 'Analista Logístico', 'Supervisor de Planta', 'Especialista de Calidad'], baseSal: 1150000 },
  { nombre: 'Comercial y Ventas', puestos: ['Ejecutivo de Cuenta', 'Gerente Comercial', 'Especialista en Mercadeo', 'Asesor B2B'], baseSal: 1300000 },
  { nombre: 'Servicio al Cliente', puestos: ['Especialista de Soporte', 'Líder de Experiencia', 'Agente Nivel 2', 'Analista de Retención'], baseSal: 950000 }
];

const NOMBRES = [
  'Ana', 'Carlos', 'María', 'José', 'Sofía', 'Diego', 'Lucía', 'Andrés', 'Valeria', 'Gabriel',
  'Camila', 'Esteban', 'Paula', 'Daniel', 'Natalia', 'Alejandro', 'Mariana', 'Felipe', 'Elena', 'Sebastián',
  'Laura', 'Ricardo', 'Andrea', 'Mateo', 'Fernanda', 'Luis', 'Carolina', 'Javier', 'Adriana', 'Rodrigo',
  'Mónica', 'Pablo', 'Raquel', 'Óscar', 'Silvia', 'Héctor', 'Rebeca', 'Mauricio', 'Tatiana', 'Eduardo',
  'Ximena', 'Cristian', 'Melissa', 'Fabián', 'Daniela', 'Roberto', 'Paola', 'Kenneth', 'Irene', 'Bryan',
  'Priscila', 'Álvaro', 'Yendry', 'Kendall', 'gloriana'
];

const APELLIDOS = [
  'Mora Solís', 'Rojas Jiménez', 'Vargas Quesada', 'Castillo Brenes', 'Araya Chacón',
  'Hernández Alfaro', 'Salazar Monge', 'Fernández Cordero', 'Alvarado Navarro', 'Ramírez Segura',
  'González Quirós', 'Sánchez Fallas', 'Calderón Núñez', 'Acuña Villalobos', 'Gutiérrez Méndez',
  'Morales Rodríguez', 'Chaves Barrantes', 'Murillo Céspedes', 'Bolaños Zamora', 'Fonseca Vega',
  'Espinoza Aguilar', 'Miranda Sibaja', 'Ureña Córdoba', 'Carvajal Lizano', 'Solano Matarrita'
];

function isoDate(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86400000);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86400000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildSeedDataset() {
  const roles = [
    { id: 1, nombre: 'ADMIN_RRHH', descripcion: 'Dirección y Administración integral de Recursos Humanos, reportes y gobernanza.' },
    { id: 2, nombre: 'COLABORADOR', descripcion: 'Acceso a datos propios, consulta de políticas RAG y solicitudes personales.' },
    { id: 3, nombre: 'AUDITOR', descripcion: 'Solo lectura de bitácoras de auditoría, riesgos y cumplimiento.' }
  ];

  const permisos = [
    { id: 1, codigo: 'CHAT_POLITICAS', modulo: 'Chat', descripcion: 'Consultar políticas internas vía RAG' },
    { id: 2, codigo: 'VER_DATOS_PROPIOS', modulo: 'Colaborador', descripcion: 'Ver saldo de vacaciones, solicitudes e incapacidades propias' },
    { id: 3, codigo: 'CREAR_SOLICITUD', modulo: 'Colaborador', descripcion: 'Registrar solicitudes de vacaciones o permisos' },
    { id: 4, codigo: 'VER_REPORTES_RRHH', modulo: 'Reportes', descripcion: 'Acceder al dashboard ejecutivo y métricas SQL agregadas' },
    { id: 5, codigo: 'GENERAR_REPORTES', modulo: 'Reportes', descripcion: 'Disparar generación manual de reportes diarios' },
    { id: 6, codigo: 'GESTIONAR_SOLICITUDES', modulo: 'RRHH', descripcion: 'Aprobar o rechazar solicitudes humanas' },
    { id: 7, codigo: 'ADMINISTRAR_DOCUMENTOS', modulo: 'RAG', descripcion: 'Sincronizar Google Drive e indexar documentos manualmente' },
    { id: 8, codigo: 'VER_GOBERNANZA_AUDITORIA', modulo: 'Gobernanza', descripcion: 'Consultar matriz de riesgos, prompts y audit_logs' }
  ];

  const rol_permisos = [
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((p) => ({ rol_id: 1, permiso_id: p })),
    ...[1, 2, 3].map((p) => ({ rol_id: 2, permiso_id: p })),
    ...[1, 8].map((p) => ({ rol_id: 3, permiso_id: p }))
  ];

  const colaboradores = [];
  const saldos_vacaciones = [];
  const usuarios = [];

  const adminHash = bcrypt.hashSync('AdminRRHH2026!', 10);
  const colabHash = bcrypt.hashSync('Colab2026!', 10);
  const auditorHash = bcrypt.hashSync('Auditor2026!', 10);

  // Colaboradores especiales para demo determinista (IDs 1, 2, 3, 4)
  const specialProfiles = [
    {
      id: 1,
      codigo_empleado: 'EMP-001',
      cedula: '1-1245-0891',
      nombre: 'Ulysses',
      apellidos: 'Quirós',
      correo: 'ana.mora@policybot.cr',
      departamento: 'Recursos Humanos',
      puesto: 'Principal Administrator',
      fecha_ingreso: '2019-03-15',
      fecha_salida: null,
      salario_mensual: 2950000,
      modalidad: 'HIBRIDO',
      jefe_directo_id: null,
      estado: 'ACTIVO',
      fecha_cumpleanos: '1988-06-14',
      proxima_evaluacion: isoDate(35),
      ultimo_score_desempeno: 4.85
    },
    {
      id: 2,
      codigo_empleado: 'EMP-002',
      cedula: '1-1567-0432',
      nombre: 'Carlos',
      apellidos: 'Rojas Jiménez',
      correo: 'carlos.rojas@policybot.cr',
      departamento: 'Tecnología e Innovación',
      puesto: 'Desarrollador Senior',
      fecha_ingreso: '2022-05-02',
      fecha_salida: null,
      salario_mensual: 2150000,
      modalidad: 'HIBRIDO',
      jefe_directo_id: 1,
      estado: 'ACTIVO',
      fecha_cumpleanos: '1994-12-03',
      proxima_evaluacion: isoDate(28),
      ultimo_score_desempeno: 4.45
    },
    {
      id: 3,
      codigo_empleado: 'EMP-003',
      cedula: '2-0789-0311',
      nombre: 'María',
      apellidos: 'Vargas Quesada',
      correo: 'maria.vargas@policybot.cr',
      departamento: 'Finanzas y Contabilidad',
      puesto: 'Analista Financiera',
      fecha_ingreso: '2020-08-10',
      fecha_salida: null,
      salario_mensual: 1650000,
      modalidad: 'HIBRIDO',
      jefe_directo_id: 1,
      estado: 'ACTIVO',
      fecha_cumpleanos: '1991-09-22',
      proxima_evaluacion: isoDate(28),
      ultimo_score_desempeno: 4.20
    },
    {
      id: 4,
      codigo_empleado: 'EMP-004',
      cedula: '1-1102-0998',
      nombre: 'Roberto',
      apellidos: 'Castillo Brenes',
      correo: 'roberto.castillo@policybot.cr',
      departamento: 'Operaciones y Logística',
      puesto: 'Gerente de Operaciones',
      fecha_ingreso: '2018-01-15',
      fecha_salida: null,
      salario_mensual: 3450000,
      modalidad: 'PRESENCIAL',
      jefe_directo_id: null,
      estado: 'ACTIVO',
      fecha_cumpleanos: '1984-04-11',
      proxima_evaluacion: isoDate(28),
      ultimo_score_desempeno: 4.60
    }
  ];

  for (const sp of specialProfiles) {
    colaboradores.push(sp);
  }

  // Generar hasta completar 55 colaboradores ficticios
  for (let i = 5; i <= 55; i++) {
    const depto = DEPARTAMENTOS[(i - 1) % DEPARTAMENTOS.length];
    const puesto = depto.puestos[(i - 1) % depto.puestos.length];
    const nom = capitalize(NOMBRES[(i - 1) % NOMBRES.length]);
    const ape = APELLIDOS[(i * 3) % APELLIDOS.length];
    const emailSlug = `${nom}.${ape.split(' ')[0]}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const correo = `${emailSlug}.${i}@policybot.cr`;

    // Distribuir estados realistas (4 salidas recientes, 4 en vacaciones, 3 incapacitados, resto activos)
    let estado = 'ACTIVO';
    let fechaSalida = null;
    let fechaIngreso = `${2019 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`;

    if (i >= 50 && i <= 52) {
      estado = 'INACTIVO';
      fechaSalida = isoDate(-(i - 48) * 18);
    } else if (i >= 53) {
      // Ingresos recientes en los últimos 75 días
      fechaIngreso = isoDate(-(56 - i) * 20);
    } else if ([7, 15, 24, 33].includes(i)) {
      estado = 'VACACIONES';
    } else if ([9, 19, 29].includes(i)) {
      estado = 'INCAPACITADO';
    }

    const modalidades = ['HIBRIDO', 'HIBRIDO', 'PRESENCIAL', 'TELETRABAJO'];
    const modalidad = modalidades[i % modalidades.length];
    const salario = depto.baseSal + ((i % 5) * 125000);

    colaboradores.push({
      id: i,
      codigo_empleado: `EMP-${String(i).padStart(3, '0')}`,
      cedula: `${(i % 7) + 1}-0${800 + i}-0${100 + (i * 7) % 899}`,
      nombre: nom,
      apellidos: ape,
      correo,
      departamento: depto.nombre,
      puesto,
      fecha_ingreso: fechaIngreso,
      fecha_salida: fechaSalida,
      salario_mensual: salario,
      modalidad,
      jefe_directo_id: i <= 6 ? 1 : ((i % 4) + 1),
      estado,
      fecha_cumpleanos: `${1985 + (i % 15)}-${String((i % 12) + 1).padStart(2, '0')}-${String(((i * 5) % 27) + 1).padStart(2, '0')}`,
      proxima_evaluacion: isoDate(20 + (i % 40)),
      ultimo_score_desempeno: Number((3.4 + ((i % 15) * 0.1)).toFixed(2))
    });
  }

  // Saldos de vacaciones (incluyendo 14 colaboradores > 20 días para indicador #8)
  for (const c of colaboradores) {
    let acumulados = 14 + (c.id % 6);
    let disfrutados = 2 + (c.id % 4);
    if (c.id === 2) {
      acumulados = 20;
      disfrutados = 4; // Carlos Rojas tiene exactamente 16 días disponibles
    } else if (c.id === 3 || (c.id >= 10 && c.id <= 22 && c.estado !== 'INACTIVO')) {
      acumulados = 24 + (c.id % 5);
      disfrutados = 1 + (c.id % 2); // > 20 días disponibles
    } else if (c.estado === 'INACTIVO') {
      acumulados = 8;
      disfrutados = 8;
    }
    const disponibles = Number(Math.max(0, acumulados - disfrutados).toFixed(2));
    saldos_vacaciones.push({
      id: c.id,
      colaborador_id: c.id,
      periodo: '2025-2026',
      dias_acumulados: acumulados,
      dias_disfrutados: disfrutados,
      dias_disponibles: disponibles,
      dias_vencidos: c.id % 9 === 0 ? 2 : 0,
      fecha_proximo_vencimiento: isoDate(90 + (c.id % 120))
    });
  }

  // Usuarios autenticables
  usuarios.push(
    { id: 1, colaborador_id: 1, rol_id: 1, email: 'ana.mora@policybot.cr', password_hash: adminHash, activo: 1, ultimo_login: isoDateTime(-1) },
    { id: 2, colaborador_id: 2, rol_id: 2, email: 'carlos.rojas@policybot.cr', password_hash: colabHash, activo: 1, ultimo_login: isoDateTime(-1) },
    { id: 3, colaborador_id: 3, rol_id: 2, email: 'maria.vargas@policybot.cr', password_hash: colabHash, activo: 1, ultimo_login: isoDateTime(-2) },
    { id: 4, colaborador_id: 4, rol_id: 3, email: 'roberto.castillo@policybot.cr', password_hash: auditorHash, activo: 1, ultimo_login: isoDateTime(-3) }
  );
  for (let i = 5; i <= 15; i++) {
    usuarios.push({
      id: i,
      colaborador_id: i,
      rol_id: 2,
      email: colaboradores[i - 1].correo,
      password_hash: colabHash,
      activo: 1,
      ultimo_login: null
    });
  }

  // Solicitudes (pendientes con >3 días, pendientes recientes, aprobadas y rechazadas)
  const solicitudes = [
    { id: 1, colaborador_id: 2, tipo: 'VACACIONES', fecha_solicitud: isoDateTime(-2), fecha_inicio: isoDate(18), fecha_fin: isoDate(21), dias_solicitados: 4, motivo: 'Viaje familiar programado a Guanacaste', estado: 'PENDIENTE', aprobador_id: null, comentario_resolucion: null },
    { id: 2, colaborador_id: 2, tipo: 'CONSTANCIA_SALARIAL', fecha_solicitud: isoDateTime(-14), fecha_inicio: isoDate(-14), fecha_fin: isoDate(-14), dias_solicitados: 1, motivo: 'Trámite de crédito bancario', estado: 'APROBADA', aprobador_id: 1, comentario_resolucion: 'Emitida en PDF por Nómina' },
    { id: 3, colaborador_id: 2, tipo: 'PERMISO_CON_GOCE', fecha_solicitud: isoDateTime(-30), fecha_inicio: isoDate(-28), fecha_fin: isoDate(-28), dias_solicitados: 1, motivo: 'Cita médica especializada CCSS', estado: 'APROBADA', aprobador_id: 1, comentario_resolucion: 'Comprobante validado' }
  ];

  const tiposSol = ['VACACIONES', 'PERMISO_CON_GOCE', 'PERMISO_SIN_GOCE', 'TELETRABAJO', 'CONSTANCIA_SALARIAL', 'LICENCIA_PATERNIDAD'];
  let solId = 4;
  for (let i = 5; i <= 36; i++) {
    const colabId = ((i * 2) % 45) + 3;
    let estado = 'APROBADA';
    let diasAtras = 15 + (i % 40);
    if (i <= 11) {
      estado = 'PENDIENTE';
      diasAtras = i <= 8 ? (5 + (i % 6)) : 1; // Varias solicitudes con > 3 días de espera
    } else if (i >= 32) {
      estado = 'RECHAZADA';
    }
    solicitudes.push({
      id: solId++,
      colaborador_id: colabId,
      tipo: tiposSol[i % tiposSol.length],
      fecha_solicitud: isoDateTime(-diasAtras),
      fecha_inicio: isoDate(10 + (i % 20)),
      fecha_fin: isoDate(12 + (i % 20)),
      dias_solicitados: (i % 3) + 1,
      motivo: estado === 'RECHAZADA' ? 'Solicitud con poca anticipación para cierre de mes' : 'Gestión personal planificada',
      estado,
      aprobador_id: estado === 'PENDIENTE' ? null : 1,
      comentario_resolucion: estado === 'PENDIENTE' ? null : (estado === 'APROBADA' ? 'Aprobada por jefatura y RRHH' : 'Reprogramar por cierre operativo')
    });
  }

  // Incapacidades (activas actuales + finalizadas del mes actual y anteriores)
  const incapacidades = [
    { id: 1, colaborador_id: 9, entidad_emisora: 'CCSS', numero_boleta: 'EDUS-2026-88412', tipo_incapacidad: 'ENFERMEDAD_COMUN', fecha_inicio: isoDate(-2), fecha_fin: isoDate(3), dias_incapacidad: 5, porcentaje_subsidio_patrono: 20, porcentaje_subsidio_entidad: 60, estado: 'ACTIVA' },
    { id: 2, colaborador_id: 19, entidad_emisora: 'INS', numero_boleta: 'INS-RT-2026-44109', tipo_incapacidad: 'RIESGO_TRABAJO', fecha_inicio: isoDate(-4), fecha_fin: isoDate(6), dias_incapacidad: 10, porcentaje_subsidio_patrono: 0, porcentaje_subsidio_entidad: 60, estado: 'ACTIVA' },
    { id: 3, colaborador_id: 29, entidad_emisora: 'CCSS', numero_boleta: 'EDUS-2026-88901', tipo_incapacidad: 'MATERNIDAD', fecha_inicio: isoDate(-10), fecha_fin: isoDate(80), dias_incapacidad: 90, porcentaje_subsidio_patrono: 50, porcentaje_subsidio_entidad: 50, estado: 'ACTIVA' },
    { id: 4, colaborador_id: 2, entidad_emisora: 'CCSS', numero_boleta: 'EDUS-2026-71022', tipo_incapacidad: 'ENFERMEDAD_COMUN', fecha_inicio: isoDate(-42), fecha_fin: isoDate(-40), dias_incapacidad: 3, porcentaje_subsidio_patrono: 80, porcentaje_subsidio_entidad: 0, estado: 'FINALIZADA' }
  ];

  for (let k = 5; k <= 16; k++) {
    const colabId = (k * 3) % 45 + 3;
    const isCurrentMonth = k <= 9;
    const startOffset = isCurrentMonth ? -(k + 1) : -(32 + k * 3);
    const dias = (k % 4) + 2;
    incapacidades.push({
      id: k,
      colaborador_id: colabId,
      entidad_emisora: k % 4 === 0 ? 'INS' : 'CCSS',
      numero_boleta: `EDUS-2026-${72000 + k * 13}`,
      tipo_incapacidad: k % 4 === 0 ? 'RIESGO_TRABAJO' : 'ENFERMEDAD_COMUN',
      fecha_inicio: isoDate(startOffset),
      fecha_fin: isoDate(startOffset + dias),
      dias_incapacidad: dias,
      porcentaje_subsidio_patrono: 80,
      porcentaje_subsidio_entidad: 0,
      estado: 'FINALIZADA'
    });
  }

  // Tres meses de movimientos de personal (ingresos, salidas, ascensos, traslados)
  const movimientos_personal = [
    { id: 1, colaborador_id: 53, tipo_movimiento: 'INGRESO', departamento_anterior: null, departamento_nuevo: 'Tecnología e Innovación', puesto_anterior: null, puesto_nuevo: 'Ingeniero QA', fecha_efectiva: isoDate(-60), motivo: 'Contratación para proyecto de automatización', autorizado_por: 'Ana Mora Solís (RRHH)' },
    { id: 2, colaborador_id: 54, tipo_movimiento: 'INGRESO', departamento_anterior: null, departamento_nuevo: 'Comercial y Ventas', puesto_anterior: null, puesto_nuevo: 'Ejecutivo de Cuenta', fecha_efectiva: isoDate(-40), motivo: 'Expansión cartera corporativa GAM', autorizado_por: 'Ana Mora Solís (RRHH)' },
    { id: 3, colaborador_id: 55, tipo_movimiento: 'INGRESO', departamento_anterior: null, departamento_nuevo: 'Servicio al Cliente', puesto_anterior: null, puesto_nuevo: 'Especialista de Soporte', fecha_efectiva: isoDate(-20), motivo: 'Refuerzo mesa de servicio B2B', autorizado_por: 'Ana Mora Solís (RRHH)' },
    { id: 4, colaborador_id: 50, tipo_movimiento: 'SALIDA_VOLUNTARIA', departamento_anterior: 'Comercial y Ventas', departamento_nuevo: null, puesto_anterior: 'Asesor B2B', puesto_nuevo: null, fecha_efectiva: isoDate(-36), motivo: 'Renuncia voluntaria por estudios en el extranjero', autorizado_por: 'Ana Mora Solís (RRHH)' },
    { id: 5, colaborador_id: 51, tipo_movimiento: 'SALIDA_VOLUNTARIA', departamento_anterior: 'Servicio al Cliente', departamento_nuevo: null, puesto_anterior: 'Agente Nivel 2', puesto_nuevo: null, fecha_efectiva: isoDate(-54), motivo: 'Renuncia voluntaria con preaviso completo', autorizado_por: 'Ana Mora Solís (RRHH)' },
    { id: 6, colaborador_id: 52, tipo_movimiento: 'DESPIDO_CON_RESPONSABILIDAD', departamento_anterior: 'Operaciones y Logística', departamento_nuevo: null, puesto_anterior: 'Analista Logístico', puesto_nuevo: null, fecha_efectiva: isoDate(-72), motivo: 'Reestructuración operativa de bodega oeste', autorizado_por: 'Comité Ejecutivo y RRHH' },
    { id: 7, colaborador_id: 2, tipo_movimiento: 'ASCENSO', departamento_anterior: 'Tecnología e Innovación', departamento_nuevo: 'Tecnología e Innovación', puesto_anterior: 'Desarrollador Mid', puesto_nuevo: 'Desarrollador Senior', fecha_efectiva: isoDate(-65), motivo: 'Resultado destacado en ciclo de evaluación 2025', autorizado_por: 'Dirección de Tecnología y RRHH' },
    { id: 8, colaborador_id: 12, tipo_movimiento: 'CAMBIO_DEPARTAMENTO', departamento_anterior: 'Servicio al Cliente', departamento_nuevo: 'Comercial y Ventas', puesto_anterior: 'Líder de Experiencia', puesto_nuevo: 'Ejecutivo de Cuenta', fecha_efectiva: isoDate(-28), motivo: 'Movilidad interna aprobada', autorizado_por: 'Ana Mora Solís (RRHH)' }
  ];

  // Consultas históricas de chat para KPIs iniciales
  const consultas_chat = [
    { id: 1, usuario_id: 2, colaborador_id: 2, sesion_id: 'seed-sess-1', pregunta: '¿Cuántos días de vacaciones me corresponden por ley y por política interna?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Vacaciones', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'Por Código de Trabajo corresponden mínimo 12 días hábiles; por política interna TicoTech otorga de 14 a 20 días según antigüedad.', citas_json: [{ document_id: 'POL-VAC-001', document_name: 'Política de Vacaciones Anuales', section: 'Sección 1', version: '2.3' }], documentos_recuperados: ['POL-VAC-001'], confianza: 0.94, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 420, tokens_usados: 310, validacion_aprobada: 1, created_at: isoDateTime(-5) },
    { id: 2, usuario_id: 3, colaborador_id: 3, sesion_id: 'seed-sess-2', pregunta: '¿Cómo se pagan los primeros 3 días de incapacidad por enfermedad común?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Incapacidades CCSS/INS', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'TicoTech cubre el 80% durante los días 1 al 3 y complementa un 20% adicional al 60% de la CCSS del día 4 al 30.', citas_json: [{ document_id: 'PRO-INC-003', document_name: 'Procedimiento de Incapacidades', section: 'Sección 2', version: '3.0' }], documentos_recuperados: ['PRO-INC-003'], confianza: 0.92, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 510, tokens_usados: 340, validacion_aprobada: 1, created_at: isoDateTime(-4) },
    { id: 3, usuario_id: 2, colaborador_id: 2, sesion_id: 'seed-sess-3', pregunta: '¿Cuál es mi saldo actual de vacaciones disponibles?', intencion_clasificada: 'DATOS_PERSONALES', tema_principal: 'Vacaciones', agente_primario: 'Agente Datos Colaborador', agentes_invocados: ['Agente Orquestador', 'Agente Datos Colaborador', 'Agente Validador'], respuesta: 'Actualmente dispones de 16 días hábiles de vacaciones.', citas_json: [], documentos_recuperados: [], confianza: 0.99, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 190, tokens_usados: 180, validacion_aprobada: 1, created_at: isoDateTime(-3) },
    { id: 4, usuario_id: 3, colaborador_id: 3, sesion_id: 'seed-sess-4', pregunta: '¿Qué días se deposita la quincena y el aguinaldo?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Salarios y Aguinaldo', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'Las quincenas se depositan los días 14 y 28 de cada mes y el aguinaldo el 10 de diciembre.', citas_json: [{ document_id: 'POL-SAL-005', document_name: 'Política Salarial y Calendario de Pagos', section: 'Sección 1 y 2', version: '1.9' }], documentos_recuperados: ['POL-SAL-005'], confianza: 0.95, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 380, tokens_usados: 295, validacion_aprobada: 1, created_at: isoDateTime(-2) },
    { id: 5, usuario_id: 5, colaborador_id: 5, sesion_id: 'seed-sess-5', pregunta: '¿Cuántos días de licencia de paternidad me corresponden?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Permisos y Licencias', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'Conforme a la Ley N° 10191 corresponden 2 días por semana durante las primeras 4 semanas (8 días hábiles).', citas_json: [{ document_id: 'POL-PER-002', document_name: 'Política de Permisos y Licencias', section: 'Sección 1', version: '2.1' }], documentos_recuperados: ['POL-PER-002'], confianza: 0.93, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 410, tokens_usados: 270, validacion_aprobada: 1, created_at: isoDateTime(-2) },
    { id: 6, usuario_id: 6, colaborador_id: 6, sesion_id: 'seed-sess-6', pregunta: '¿Cómo funciona la modalidad híbrida y el subsidio de internet?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Teletrabajo y Jornada', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'La modalidad estándar es 3 días teletrabajo y 2 presenciales, con un subsidio mensual de ₡18,000 CRC.', citas_json: [{ document_id: 'REG-TEL-004', document_name: 'Reglamento de Jornada Laboral y Teletrabajo', section: 'Sección 2', version: '2.4' }], documentos_recuperados: ['REG-TEL-004'], confianza: 0.90, resuelta_sin_escalamiento: 1, escalada: 0, latencia_ms: 460, tokens_usados: 325, validacion_aprobada: 1, created_at: isoDateTime(-1) },
    { id: 7, usuario_id: 7, colaborador_id: 7, sesion_id: 'seed-sess-7', pregunta: '¿Puedo solicitar un préstamo en dólares para vivienda fuera de la Asociación Solidarista?', intencion_clasificada: 'POLITICA_RRHH', tema_principal: 'Beneficios', agente_primario: 'Agente Políticas RAG', agentes_invocados: ['Agente Orquestador', 'Agente Políticas RAG', 'Agente Validador'], respuesta: 'No existe una política corporativa confirmada para préstamos directos de vivienda fuera de ASE-TICOTECH. Se escaló su consulta a RRHH.', citas_json: [], documentos_recuperados: [], confianza: 0.22, resuelta_sin_escalamiento: 0, escalada: 1, latencia_ms: 390, tokens_usados: 190, validacion_aprobada: 1, created_at: isoDateTime(-1) }
  ];

  const escalaciones_rrhh = [
    { id: 1, ticket_codigo: 'ESC-2026-1041', consulta_id: 7, colaborador_id: 7, pregunta_original: '¿Puedo solicitar un préstamo en dólares para vivienda fuera de la Asociación Solidarista?', motivo_escalamiento: 'Sin evidencia documental suficiente sobre créditos directos de vivienda fuera de ASE-TICOTECH.', categoria: 'BENEFICIOS_ESPECIALES', prioridad: 'MEDIA', estado: 'ABIERTO', asignado_a: 'Ana Mora (Dirección RRHH)', respuesta_rrhh: null, created_at: isoDateTime(-1), updated_at: isoDateTime(-1) },
    { id: 2, ticket_codigo: 'ESC-2026-1038', consulta_id: null, colaborador_id: 14, pregunta_original: 'Consulta sobre convalidación de incapacidad emitida en el extranjero durante viaje de trabajo.', motivo_escalamiento: 'Caso especial requiere revisión de Salud Ocupacional y CCSS.', categoria: 'INCAPACIDADES', prioridad: 'ALTA', estado: 'EN_REVISION', asignado_a: 'Ana Mora (Dirección RRHH)', respuesta_rrhh: null, created_at: isoDateTime(-3), updated_at: isoDateTime(-2) }
  ];

  const audit_logs = [
    { id: 1, usuario_id: 2, colaborador_id: 2, rol: 'COLABORADOR', accion: 'CONSULTA_CHAT_RAG', recurso: '/api/chat/query', agente_utilizado: 'Agente Políticas RAG', documentos_recuperados: ['POL-VAC-001'], tiempo_respuesta_ms: 420, resultado: 'EXITO', detalle: 'Consulta sobre política de vacaciones resuelta con cita verificable.', ip_address: '127.0.0.1', created_at: isoDateTime(-5) },
    { id: 2, usuario_id: 1, colaborador_id: 1, rol: 'ADMIN_RRHH', accion: 'GENERACION_REPORTE_DIARIO', recurso: '/api/reports/generate', agente_utilizado: 'Agente Analista de Reportes', documentos_recuperados: [], tiempo_respuesta_ms: 680, resultado: 'EXITO', detalle: 'Reporte diario ejecutado con 13 indicadores SQL verificados.', ip_address: '127.0.0.1', created_at: isoDateTime(-1) }
  ];

  return {
    roles,
    permisos,
    rol_permisos,
    colaboradores,
    usuarios,
    saldos_vacaciones,
    solicitudes,
    incapacidades,
    movimientos_personal,
    consultas_chat,
    escalaciones_rrhh,
    audit_logs
  };
}

async function seedDatabase() {
  const initRes = await db.initDatabase({ forceSchema: true });
  const data = buildSeedDataset();

  if (db.isMysql()) {
    const pool = db.getPool();
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'escalaciones_rrhh', 'audit_logs', 'reportes_diarios', 'consultas_chat',
      'movimientos_personal', 'incapacidades', 'solicitudes', 'saldos_vacaciones',
      'usuarios', 'colaboradores', 'rol_permisos', 'permisos', 'roles'
    ];
    for (const t of tables) {
      await pool.query(`TRUNCATE TABLE ${t}`);
    }

    for (const r of data.roles) {
      await pool.execute('INSERT INTO roles (id, nombre, descripcion) VALUES (?, ?, ?)', [r.id, r.nombre, r.descripcion]);
    }
    for (const p of data.permisos) {
      await pool.execute('INSERT INTO permisos (id, codigo, modulo, descripcion) VALUES (?, ?, ?, ?)', [p.id, p.codigo, p.modulo, p.descripcion]);
    }
    for (const rp of data.rol_permisos) {
      await pool.execute('INSERT INTO rol_permisos (rol_id, permiso_id) VALUES (?, ?)', [rp.rol_id, rp.permiso_id]);
    }
    for (const c of data.colaboradores) {
      await pool.execute(
        `INSERT INTO colaboradores
         (id, codigo_empleado, cedula, nombre, apellidos, correo, departamento, puesto, fecha_ingreso,
          fecha_salida, salario_mensual, modalidad, jefe_directo_id, estado, fecha_cumpleanos,
          proxima_evaluacion, ultimo_score_desempeno)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id, c.codigo_empleado, c.cedula, c.nombre, c.apellidos, c.correo, c.departamento, c.puesto,
          c.fecha_ingreso, c.fecha_salida, c.salario_mensual, c.modalidad, c.jefe_directo_id, c.estado,
          c.fecha_cumpleanos, c.proxima_evaluacion, c.ultimo_score_desempeno
        ]
      );
    }
    for (const u of data.usuarios) {
      await pool.execute(
        `INSERT INTO usuarios (id, colaborador_id, rol_id, email, password_hash, activo, ultimo_login)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.colaborador_id, u.rol_id, u.email, u.password_hash, u.activo, u.ultimo_login]
      );
    }
    for (const sv of data.saldos_vacaciones) {
      await pool.execute(
        `INSERT INTO saldos_vacaciones
         (id, colaborador_id, periodo, dias_acumulados, dias_disfrutados, dias_disponibles, dias_vencidos, fecha_proximo_vencimiento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sv.id, sv.colaborador_id, sv.periodo, sv.dias_acumulados, sv.dias_disfrutados, sv.dias_disponibles, sv.dias_vencidos, sv.fecha_proximo_vencimiento]
      );
    }
    for (const s of data.solicitudes) {
      await pool.execute(
        `INSERT INTO solicitudes
         (id, colaborador_id, tipo, fecha_solicitud, fecha_inicio, fecha_fin, dias_solicitados, motivo, estado, aprobador_id, comentario_resolucion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.colaborador_id, s.tipo, s.fecha_solicitud, s.fecha_inicio, s.fecha_fin, s.dias_solicitados, s.motivo, s.estado, s.aprobador_id, s.comentario_resolucion]
      );
    }
    for (const inc of data.incapacidades) {
      await pool.execute(
        `INSERT INTO incapacidades
         (id, colaborador_id, entidad_emisora, numero_boleta, tipo_incapacidad, fecha_inicio, fecha_fin, dias_incapacidad, porcentaje_subsidio_patrono, porcentaje_subsidio_entidad, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inc.id, inc.colaborador_id, inc.entidad_emisora, inc.numero_boleta, inc.tipo_incapacidad, inc.fecha_inicio, inc.fecha_fin, inc.dias_incapacidad, inc.porcentaje_subsidio_patrono, inc.porcentaje_subsidio_entidad, inc.estado]
      );
    }
    for (const m of data.movimientos_personal) {
      await pool.execute(
        `INSERT INTO movimientos_personal
         (id, colaborador_id, tipo_movimiento, departamento_anterior, departamento_nuevo, puesto_anterior, puesto_nuevo, fecha_efectiva, motivo, autorizado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.colaborador_id, m.tipo_movimiento, m.departamento_anterior, m.departamento_nuevo, m.puesto_anterior, m.puesto_nuevo, m.fecha_efectiva, m.motivo, m.autorizado_por]
      );
    }
    for (const ch of data.consultas_chat) {
      await pool.execute(
        `INSERT INTO consultas_chat
         (id, usuario_id, colaborador_id, sesion_id, pregunta, intencion_clasificada, tema_principal, agente_primario,
          agentes_invocados, respuesta, citas_json, documentos_recuperados, confianza, resuelta_sin_escalamiento,
          escalada, latencia_ms, tokens_usados, validacion_aprobada, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ch.id, ch.usuario_id, ch.colaborador_id, ch.sesion_id, ch.pregunta, ch.intencion_clasificada,
          ch.tema_principal, ch.agente_primario, JSON.stringify(ch.agentes_invocados), ch.respuesta,
          JSON.stringify(ch.citas_json), JSON.stringify(ch.documentos_recuperados), ch.confianza,
          ch.resuelta_sin_escalamiento, ch.escalada, ch.latencia_ms, ch.tokens_usados, ch.validacion_aprobada, ch.created_at
        ]
      );
    }
    for (const esc of data.escalaciones_rrhh) {
      await pool.execute(
        `INSERT INTO escalaciones_rrhh
         (id, ticket_codigo, consulta_id, colaborador_id, pregunta_original, motivo_escalamiento, categoria, prioridad, estado, asignado_a, respuesta_rrhh, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [esc.id, esc.ticket_codigo, esc.consulta_id, esc.colaborador_id, esc.pregunta_original, esc.motivo_escalamiento, esc.categoria, esc.prioridad, esc.estado, esc.asignado_a, esc.respuesta_rrhh, esc.created_at]
      );
    }
    for (const log of data.audit_logs) {
      await pool.execute(
        `INSERT INTO audit_logs
         (id, usuario_id, colaborador_id, rol, accion, recurso, agente_utilizado, documentos_recuperados, tiempo_respuesta_ms, resultado, detalle, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [log.id, log.usuario_id, log.colaborador_id, log.rol, log.accion, log.recurso, log.agente_utilizado, JSON.stringify(log.documentos_recuperados), log.tiempo_respuesta_ms, log.resultado, log.detalle, log.ip_address, log.created_at]
      );
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } else {
    const snap = db.getEmptySnapshot();
    Object.assign(snap, data);
    db.saveSnapshot(snap);
  }

  // Indexar las 10 políticas locales + generar 3 reportes históricos iniciales
  const ingestionAgent = require(path.resolve(__dirname, '../../backend/src/agents/ingestionSyncAgent'));
  const reportsAgent = require(path.resolve(__dirname, '../../backend/src/agents/reportsAnalystAgent'));

  const syncResult = await ingestionAgent.syncFromPoliciesFolder({ origen: 'LOCAL_SEED' });
  const reportResult = await reportsAgent.generateDailyReport({ generadoPor: 'SEED_INICIAL', fechaOverride: isoDate(-1) });
  const todayReport = await reportsAgent.generateDailyReport({ generadoPor: 'SEED_INICIAL', fechaOverride: isoDate(0) });

  return {
    dbMode: initRes.mode,
    mysqlConnected: initRes.connected,
    colaboradoresCount: data.colaboradores.length,
    usuariosCount: data.usuarios.length,
    solicitudesCount: data.solicitudes.length,
    incapacidadesCount: data.incapacidades.length,
    movimientosCount: data.movimientos_personal.length,
    documentosIndexados: syncResult.indexedDocuments,
    fragmentosTotales: syncResult.totalChunks,
    reportesIniciales: [reportResult.id, todayReport.id]
  };
}

if (require.main === module) {
  seedDatabase()
    .then((summary) => {
      console.log('Seed completado exitosamente:', JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error ejecutando seed:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
