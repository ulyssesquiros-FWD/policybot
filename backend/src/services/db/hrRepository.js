const db = require('../../config/database');
const models = require('../../models');
const {
  sequelize,
  Op,
  Role,
  Permission,
  RolePermission,
  Collaborator,
  User,
  VacationBalance,
  Request,
  Disability,
  PersonnelMovement,
  ChatConsultation,
  DailyReport,
  AuditLog,
  DocumentSyncState,
  HumanEscalation,
  GoogleDriveConnection
} = models;

/**
 * Repositorio unificado basado exclusivamente en el ORM Sequelize para MySQL.
 * Todas las operaciones de base de datos se ejecutan a través de los modelos del ORM
 * (User, Collaborator, Request, DailyReport, AuditLog, etc.), garantizando tipado,
 * abstracción de objetos, prevención contra inyección SQL y mantenimiento del snapshot híbrido.
 */

function nextId(arr) {
  return arr.length ? Math.max(...arr.map((x) => Number(x.id) || 0)) + 1 : 1;
}

function parseJsonSafe(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

async function findUserByEmail(email) {
  await db.ensureReady();
  if (db.isMysql()) {
    const user = await User.findOne({
      where: { email: String(email).trim() },
      include: [
        { model: Role, as: 'rol' },
        { model: Collaborator, as: 'colaborador' }
      ]
    });
    if (!user) return null;
    const json = user.toJSON();
    return {
      id: json.id,
      colaborador_id: json.colaborador_id,
      rol_id: json.rol_id,
      email: json.email,
      password_hash: json.password_hash,
      activo: json.activo,
      ultimo_login: json.ultimo_login,
      rol_nombre: json.rol ? json.rol.nombre : 'COLABORADOR',
      codigo_empleado: json.colaborador?.codigo_empleado,
      nombre: json.colaborador?.nombre,
      apellidos: json.colaborador?.apellidos,
      departamento: json.colaborador?.departamento,
      puesto: json.colaborador?.puesto,
      modalidad: json.colaborador?.modalidad,
      estado: json.colaborador?.estado
    };
  }
  const snap = db.loadSnapshot();
  const user = snap.usuarios.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return null;
  const rol = snap.roles.find((r) => r.id === user.rol_id);
  const colab = snap.colaboradores.find((c) => c.id === user.colaborador_id);
  return {
    ...user,
    rol_nombre: rol ? rol.nombre : 'COLABORADOR',
    codigo_empleado: colab?.codigo_empleado,
    nombre: colab?.nombre,
    apellidos: colab?.apellidos,
    departamento: colab?.departamento,
    puesto: colab?.puesto,
    modalidad: colab?.modalidad,
    estado: colab?.estado
  };
}

async function getUserPermissions(rolId) {
  await db.ensureReady();
  if (db.isMysql()) {
    const role = await Role.findByPk(Number(rolId), {
      include: [{ model: Permission, as: 'permisos', through: { attributes: [] } }]
    });
    if (!role || !role.permisos) return [];
    return role.permisos.map((p) => p.codigo);
  }
  const snap = db.loadSnapshot();
  const permIds = snap.rol_permisos.filter((rp) => rp.rol_id === rolId).map((rp) => rp.permiso_id);
  return snap.permisos.filter((p) => permIds.includes(p.id)).map((p) => p.codigo);
}

async function updateUserLastLogin(userId) {
  await db.ensureReady();
  if (db.isMysql()) {
    await User.update({ ultimo_login: new Date() }, { where: { id: Number(userId) } });
    return;
  }
  const snap = db.loadSnapshot();
  const u = snap.usuarios.find((x) => x.id === userId);
  if (u) {
    u.ultimo_login = new Date().toISOString();
    db.saveSnapshot(snap);
  }
}

async function getCollaboratorCompleteProfile(colaboradorId) {
  await db.ensureReady();
  const idNum = Number(colaboradorId);
  if (db.isMysql()) {
    const colab = await Collaborator.findByPk(idNum, {
      include: [
        { model: Collaborator, as: 'jefeDirecto', attributes: ['id', 'nombre', 'apellidos'] },
        { model: VacationBalance, as: 'saldoVacaciones' }
      ]
    });
    if (!colab) return null;

    const [solicitudes, incapacidades, movimientos] = await Promise.all([
      Request.findAll({
        where: { colaborador_id: idNum },
        order: [['fecha_solicitud', 'DESC']],
        limit: 15
      }),
      Disability.findAll({
        where: { colaborador_id: idNum },
        order: [['fecha_inicio', 'DESC']],
        limit: 10
      }),
      PersonnelMovement.findAll({
        where: { colaborador_id: idNum },
        order: [['fecha_efectiva', 'DESC']],
        limit: 10
      })
    ]);

    const colabJson = colab.toJSON();
    const { salario_mensual, ...safeColab } = colabJson;

    return {
      colaborador: {
        ...safeColab,
        jefe_nombre: colab.jefeDirecto?.nombre || null,
        jefe_apellidos: colab.jefeDirecto?.apellidos || null
      },
      saldoVacaciones: colab.saldoVacaciones ? colab.saldoVacaciones.toJSON() : null,
      solicitudes: solicitudes.map((s) => s.toJSON()),
      incapacidades: incapacidades.map((i) => i.toJSON()),
      movimientos: movimientos.map((m) => m.toJSON())
    };
  }

  const snap = db.loadSnapshot();
  const colab = snap.colaboradores.find((c) => Number(c.id) === idNum);
  if (!colab) return null;
  const jefe = colab.jefe_directo_id
    ? snap.colaboradores.find((c) => Number(c.id) === Number(colab.jefe_directo_id))
    : null;
  const { salario_mensual, ...safeColab } = colab;
  const saldo = snap.saldos_vacaciones.find((s) => Number(s.colaborador_id) === idNum) || null;
  const solicitudes = snap.solicitudes
    .filter((s) => Number(s.colaborador_id) === idNum)
    .sort((a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud))
    .slice(0, 15);
  const incapacidades = snap.incapacidades
    .filter((i) => Number(i.colaborador_id) === idNum)
    .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio))
    .slice(0, 10);
  const movimientos = snap.movimientos_personal
    .filter((m) => Number(m.colaborador_id) === idNum)
    .sort((a, b) => new Date(b.fecha_efectiva) - new Date(a.fecha_efectiva))
    .slice(0, 10);

  return {
    colaborador: {
      ...safeColab,
      jefe_nombre: jefe ? jefe.nombre : null,
      jefe_apellidos: jefe ? jefe.apellidos : null
    },
    saldoVacaciones: saldo,
    solicitudes,
    incapacidades,
    movimientos
  };
}

async function createSolicitud({ colaboradorId, tipo, fechaInicio, fechaFin, diasSolicitados, motivo }) {
  await db.ensureReady();
  const now = new Date();
  if (db.isMysql()) {
    const created = await Request.create({
      colaborador_id: Number(colaboradorId),
      tipo,
      fecha_solicitud: now,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_solicitados: Number(diasSolicitados),
      motivo,
      estado: 'PENDIENTE'
    });
    return created.toJSON();
  }
  const snap = db.loadSnapshot();
  const item = {
    id: nextId(snap.solicitudes),
    colaborador_id: Number(colaboradorId),
    tipo,
    fecha_solicitud: new Date().toISOString(),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    dias_solicitados: Number(diasSolicitados),
    motivo,
    estado: 'PENDIENTE',
    aprobador_id: null,
    comentario_resolucion: null,
    created_at: new Date().toISOString()
  };
  snap.solicitudes.push(item);
  db.saveSnapshot(snap);
  return item;
}

async function listSolicitudesAdmin() {
  await db.ensureReady();
  if (db.isMysql()) {
    const solicitudes = await Request.findAll({
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [
        sequelize.literal("FIELD(Request.estado, 'PENDIENTE', 'APROBADA', 'RECHAZADA')"),
        ['fecha_solicitud', 'ASC']
      ]
    });
    const now = Date.now();
    return solicitudes.map((s) => {
      const json = s.toJSON();
      const diasEspera = Math.floor((now - new Date(json.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...json,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento,
        puesto: json.colaborador?.puesto,
        codigo_empleado: json.colaborador?.codigo_empleado,
        dias_espera: Math.max(0, diasEspera)
      };
    });
  }
  const snap = db.loadSnapshot();
  const now = Date.now();
  return snap.solicitudes
    .map((s) => {
      const colab = snap.colaboradores.find((c) => Number(c.id) === Number(s.colaborador_id));
      const diasEspera = Math.floor((now - new Date(s.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...s,
        nombre: colab?.nombre,
        apellidos: colab?.apellidos,
        departamento: colab?.departamento,
        puesto: colab?.puesto,
        codigo_empleado: colab?.codigo_empleado,
        dias_espera: Math.max(0, diasEspera)
      };
    })
    .sort((a, b) => {
      const order = { PENDIENTE: 0, APROBADA: 1, RECHAZADA: 2 };
      if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
      return new Date(a.fecha_solicitud) - new Date(b.fecha_solicitud);
    });
}

async function resolveSolicitud({ solicitudId, estado, aprobadorId, comentario }) {
  await db.ensureReady();
  if (!['APROBADA', 'RECHAZADA'].includes(estado)) {
    throw new Error('Estado de resolución inválido.');
  }
  if (db.isMysql()) {
    await Request.update(
      {
        estado,
        aprobador_id: Number(aprobadorId),
        comentario_resolucion: comentario || ''
      },
      { where: { id: Number(solicitudId) } }
    );
    const updated = await Request.findByPk(Number(solicitudId));
    if (updated && estado === 'APROBADA' && updated.tipo === 'VACACIONES') {
      const saldo = await VacationBalance.findOne({ where: { colaborador_id: updated.colaborador_id } });
      if (saldo) {
        await saldo.update({
          dias_disfrutados: Number((Number(saldo.dias_disfrutados) + Number(updated.dias_solicitados)).toFixed(2)),
          dias_disponibles: Math.max(0, Number((Number(saldo.dias_disponibles) - Number(updated.dias_solicitados)).toFixed(2)))
        });
      }
    }
    return updated ? updated.toJSON() : null;
  }
  const snap = db.loadSnapshot();
  const sol = snap.solicitudes.find((s) => Number(s.id) === Number(solicitudId));
  if (!sol) return null;
  sol.estado = estado;
  sol.aprobador_id = Number(aprobadorId);
  sol.comentario_resolucion = comentario || '';
  if (estado === 'APROBADA' && sol.tipo === 'VACACIONES') {
    const saldo = snap.saldos_vacaciones.find((sv) => Number(sv.colaborador_id) === Number(sol.colaborador_id));
    if (saldo) {
      saldo.dias_disfrutados = Number((Number(saldo.dias_disfrutados) + Number(sol.dias_solicitados)).toFixed(2));
      saldo.dias_disponibles = Number(Math.max(0, Number(saldo.dias_disponibles) - Number(sol.dias_solicitados)).toFixed(2));
    }
  }
  db.saveSnapshot(snap);
  return sol;
}

async function saveChatConsultation(entry) {
  await db.ensureReady();
  if (db.isMysql()) {
    const rec = await ChatConsultation.create({
      usuario_id: Number(entry.usuarioId),
      colaborador_id: Number(entry.colaboradorId),
      sesion_id: entry.sesionId,
      pregunta: entry.pregunta,
      intencion_clasificada: entry.intencion,
      tema_principal: entry.temaPrincipal,
      agente_primario: entry.agentePrimario,
      agentes_invocados: entry.agentesInvocados || [],
      respuesta: entry.respuesta,
      citas_json: entry.citas || [],
      documentos_recuperados: entry.documentosRecuperados || [],
      confianza: Number(entry.confianza || 0),
      resuelta_sin_escalamiento: entry.resueltaSinEscalamiento ? 1 : 0,
      escalada: entry.escalada ? 1 : 0,
      latencia_ms: Number(entry.latenciaMs || 0),
      tokens_usados: Number(entry.tokensUsados || 0),
      validacion_aprobada: entry.validacionAprobada ? 1 : 0
    });
    return rec.toJSON();
  }
  const snap = db.loadSnapshot();
  const record = {
    id: nextId(snap.consultas_chat),
    usuario_id: Number(entry.usuarioId),
    colaborador_id: Number(entry.colaboradorId),
    sesion_id: entry.sesionId,
    pregunta: entry.pregunta,
    intencion_clasificada: entry.intencion,
    tema_principal: entry.temaPrincipal,
    agente_primario: entry.agentePrimario,
    agentes_invocados: entry.agentesInvocados || [],
    respuesta: entry.respuesta,
    citas_json: entry.citas || [],
    documentos_recuperados: entry.documentosRecuperados || [],
    confianza: Number(entry.confianza || 0),
    resuelta_sin_escalamiento: entry.resueltaSinEscalamiento ? 1 : 0,
    escalada: entry.escalada ? 1 : 0,
    latencia_ms: Number(entry.latenciaMs || 0),
    tokens_usados: Number(entry.tokensUsados || 0),
    validacion_aprobada: entry.validacionAprobada ? 1 : 0,
    created_at: new Date().toISOString()
  };
  snap.consultas_chat.push(record);
  db.saveSnapshot(snap);
  return record;
}

async function getChatHistoryByUser(usuarioId, limit = 30) {
  await db.ensureReady();
  if (db.isMysql()) {
    const rows = await ChatConsultation.findAll({
      where: { usuario_id: Number(usuarioId) },
      order: [['created_at', 'DESC']],
      limit: Number(limit)
    });
    return rows.map((r) => r.toJSON());
  }
  const snap = db.loadSnapshot();
  return snap.consultas_chat
    .filter((c) => Number(c.usuario_id) === Number(usuarioId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

async function saveAuditLog(entry) {
  await db.ensureReady();
  if (db.isMysql()) {
    const res = await AuditLog.create({
      usuario_id: entry.usuarioId ? Number(entry.usuarioId) : null,
      colaborador_id: entry.colaboradorId ? Number(entry.colaboradorId) : null,
      rol: entry.rol || 'ANONIMO',
      accion: entry.accion,
      recurso: entry.recurso,
      agente_utilizado: entry.agenteUtilizado || null,
      documentos_recuperados: entry.documentosRecuperados || [],
      tiempo_respuesta_ms: Number(entry.tiempoRespuestaMs || 0),
      resultado: entry.resultado,
      detalle: entry.detalle || null,
      ip_address: entry.ipAddress || null
    });
    return res.toJSON();
  }
  const snap = db.loadSnapshot();
  const item = {
    id: nextId(snap.audit_logs),
    usuario_id: entry.usuarioId ? Number(entry.usuarioId) : null,
    colaborador_id: entry.colaboradorId ? Number(entry.colaboradorId) : null,
    rol: entry.rol || 'ANONIMO',
    accion: entry.accion,
    recurso: entry.recurso,
    agente_utilizado: entry.agenteUtilizado || null,
    documentos_recuperados: entry.documentosRecuperados || [],
    tiempo_respuesta_ms: Number(entry.tiempoRespuestaMs || 0),
    resultado: entry.resultado,
    detalle: entry.detalle || null,
    ip_address: entry.ipAddress || null,
    created_at: new Date().toISOString()
  };
  snap.audit_logs.push(item);
  db.saveSnapshot(snap);
  return item;
}

async function listAuditLogs(limit = 100, resultado = null) {
  await db.ensureReady();
  if (db.isMysql()) {
    const where = resultado ? { resultado } : {};
    const rows = await AuditLog.findAll({
      where,
      include: [{ model: Collaborator, as: 'colaborador', attributes: ['id', 'nombre', 'apellidos'] }],
      order: [['created_at', 'DESC']],
      limit: Number(limit)
    });
    return rows.map((r) => {
      const json = r.toJSON();
      return {
        ...json,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        documentos_recuperados: parseJsonSafe(json.documentos_recuperados, [])
      };
    });
  }
  const snap = db.loadSnapshot();
  return snap.audit_logs
    .filter((a) => !resultado || a.resultado === resultado)
    .map((a) => {
      const colab = a.colaborador_id ? snap.colaboradores.find((c) => c.id === a.colaborador_id) : null;
      return { ...a, nombre: colab?.nombre, apellidos: colab?.apellidos };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

async function createEscalation({ consultaId, colaboradorId, preguntaOriginal, motivo, categoria, prioridad }) {
  await db.ensureReady();
  const ticketCodigo = `ESC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  if (db.isMysql()) {
    const esc = await HumanEscalation.create({
      ticket_codigo: ticketCodigo,
      consulta_id: consultaId ? Number(consultaId) : null,
      colaborador_id: Number(colaboradorId),
      pregunta_original: preguntaOriginal,
      motivo_escalamiento: motivo,
      categoria: categoria || 'CONSULTA_POLITICA',
      prioridad: prioridad || 'MEDIA',
      estado: 'ABIERTO',
      asignado_a: 'Ana Mora (Dirección RRHH)'
    });
    return { id: esc.id, ticket_codigo: ticketCodigo, estado: 'ABIERTO' };
  }
  const snap = db.loadSnapshot();
  const item = {
    id: nextId(snap.escalaciones_rrhh),
    ticket_codigo: ticketCodigo,
    consulta_id: consultaId ? Number(consultaId) : null,
    colaborador_id: Number(colaboradorId),
    pregunta_original: preguntaOriginal,
    motivo_escalamiento: motivo,
    categoria: categoria || 'CONSULTA_POLITICA',
    prioridad: prioridad || 'MEDIA',
    estado: 'ABIERTO',
    asignado_a: 'Ana Mora (Dirección RRHH)',
    respuesta_rrhh: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  snap.escalaciones_rrhh.push(item);
  db.saveSnapshot(snap);
  return item;
}

async function listEscalations() {
  await db.ensureReady();
  if (db.isMysql()) {
    const rows = await HumanEscalation.findAll({
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [
        sequelize.literal("FIELD(HumanEscalation.estado, 'ABIERTO', 'EN_REVISION', 'RESUELTO')"),
        ['created_at', 'DESC']
      ]
    });
    return rows.map((e) => {
      const json = e.toJSON();
      return {
        ...json,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento,
        correo: json.colaborador?.correo
      };
    });
  }
  const snap = db.loadSnapshot();
  return snap.escalaciones_rrhh
    .map((e) => {
      const colab = snap.colaboradores.find((c) => Number(c.id) === Number(e.colaborador_id));
      return {
        ...e,
        nombre: colab?.nombre,
        apellidos: colab?.apellidos,
        departamento: colab?.departamento,
        correo: colab?.correo
      };
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function resolveEscalation({ id, estado, respuestaRrhh }) {
  await db.ensureReady();
  if (db.isMysql()) {
    await HumanEscalation.update(
      { estado: estado || 'RESUELTO', respuesta_rrhh: respuestaRrhh || '' },
      { where: { id: Number(id) } }
    );
    const row = await HumanEscalation.findByPk(Number(id));
    return row ? row.toJSON() : null;
  }
  const snap = db.loadSnapshot();
  const esc = snap.escalaciones_rrhh.find((e) => Number(e.id) === Number(id));
  if (!esc) return null;
  esc.estado = estado || 'RESUELTO';
  esc.respuesta_rrhh = respuestaRrhh || '';
  esc.updated_at = new Date().toISOString();
  db.saveSnapshot(snap);
  return esc;
}

async function upsertDocumentSyncState(docState) {
  await db.ensureReady();
  if (db.isMysql()) {
    await DocumentSyncState.upsert({
      document_id: docState.document_id,
      document_name: docState.document_name,
      codigo_documento: docState.codigo_documento,
      version: docState.version,
      effective_date: docState.effective_date,
      responsable: docState.responsable,
      drive_file_id: docState.drive_file_id || null,
      drive_url: docState.drive_url,
      checksum_hash: docState.checksum_hash,
      chunks_count: Number(docState.chunks_count || 0),
      estado_indexacion: docState.estado_indexacion || 'INDEXADO',
      origen: docState.origen || 'LOCAL_SEED',
      ultima_sincronizacion: new Date()
    });
    return docState;
  }
  const snap = db.loadSnapshot();
  const idx = snap.document_sync_state.findIndex((d) => d.document_id === docState.document_id);
  const record = {
    id: idx >= 0 ? snap.document_sync_state[idx].id : nextId(snap.document_sync_state),
    ...docState,
    ultima_sincronizacion: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (idx >= 0) snap.document_sync_state[idx] = record;
  else snap.document_sync_state.push(record);
  db.saveSnapshot(snap);
  return record;
}

async function listDocumentSyncStates() {
  await db.ensureReady();
  if (db.isMysql()) {
    const docs = await DocumentSyncState.findAll({
      order: [['codigo_documento', 'ASC']]
    });
    return docs.map((d) => d.toJSON());
  }
  const snap = db.loadSnapshot();
  return [...snap.document_sync_state].sort((a, b) =>
    String(a.codigo_documento).localeCompare(String(b.codigo_documento))
  );
}

/**
 * Calcula las 13 métricas para el Reporte Diario (Agente 4) mediante el ORM Sequelize.
 */
async function computeHrReportMetrics() {
  await db.ensureReady();
  const now = new Date();
  const currentMonthPrefix = now.toISOString().slice(0, 7);

  if (db.isMysql()) {
    // 1. Ausencias actuales por tipo y departamento
    const ausenciasColabs = await Collaborator.findAll({
      where: { estado: { [Op.in]: ['VACACIONES', 'INCAPACITADO'] } },
      attributes: ['departamento', 'estado'],
      raw: true
    });
    const ausenciasMap = {};
    for (const c of ausenciasColabs) {
      const tipo = c.estado === 'VACACIONES' ? 'VACACIONES' : 'INCAPACIDAD';
      const key = `${c.departamento}|${tipo}`;
      if (!ausenciasMap[key]) {
        ausenciasMap[key] = { departamento: c.departamento, tipo_ausencia: tipo, total: 0 };
      }
      ausenciasMap[key].total += 1;
    }
    const ausenciasActuales = Object.values(ausenciasMap).sort((a, b) => b.total - a.total);

    // 2. Solicitudes pendientes
    const pendTotal = await Request.count({ where: { estado: 'PENDIENTE' } });

    // 3. Solicitudes con más de tres días de espera
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const pendMas3 = await Request.findAll({
      where: {
        estado: 'PENDIENTE',
        fecha_solicitud: { [Op.lt]: threeDaysAgo }
      },
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [['fecha_solicitud', 'ASC']]
    });
    const solMas3Dias = pendMas3.map((s) => {
      const json = s.toJSON();
      const diasEspera = Math.floor((now.getTime() - new Date(json.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: json.id,
        tipo: json.tipo,
        fecha_solicitud: json.fecha_solicitud,
        dias_solicitados: json.dias_solicitados,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento,
        dias_espera: diasEspera
      };
    });

    // 4. Incapacidades activas
    const incapActivasRows = await Disability.findAll({
      where: { estado: 'ACTIVA' },
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [['fecha_inicio', 'DESC']]
    });
    const incapActivas = incapActivasRows.map((i) => {
      const json = i.toJSON();
      return {
        id: json.id,
        entidad_emisora: json.entidad_emisora,
        numero_boleta: json.numero_boleta,
        tipo_incapacidad: json.tipo_incapacidad,
        fecha_inicio: json.fecha_inicio,
        fecha_fin: json.fecha_fin,
        dias_incapacidad: json.dias_incapacidad,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento
      };
    });

    // 5. Incapacidades acumuladas en el mes
    const monthStart = `${currentMonthPrefix}-01`;
    const incapMesRows = await Disability.findAll({
      where: { fecha_inicio: { [Op.gte]: monthStart } },
      attributes: ['id', 'dias_incapacidad'],
      raw: true
    });
    const incapacidadesMesTotal = incapMesRows.length;
    const incapacidadesMesDias = incapMesRows.reduce((acc, row) => acc + Number(row.dias_incapacidad || 0), 0);

    // 6. Ingresos y salidas (últimos 3 meses)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const movsRecientesRows = await PersonnelMovement.findAll({
      where: {
        fecha_efectiva: { [Op.gte]: ninetyDaysAgo },
        tipo_movimiento: { [Op.in]: ['INGRESO', 'SALIDA_VOLUNTARIA', 'DESPIDO_CON_RESPONSABILIDAD'] }
      },
      attributes: ['tipo_movimiento'],
      raw: true
    });
    let ingresos = 0;
    let salidas = 0;
    for (const m of movsRecientesRows) {
      if (m.tipo_movimiento === 'INGRESO') ingresos += 1;
      else salidas += 1;
    }

    // 7. Colaboradores activos y total
    const totalColaboradores = await Collaborator.count();
    const colaboradoresActivos = await Collaborator.count({
      where: { estado: { [Op.ne]: 'INACTIVO' } }
    });

    // 8. Vacaciones acumuladas superiores a 20 días
    const vacMas20Rows = await VacationBalance.findAll({
      where: {
        [Op.or]: [
          { dias_disponibles: { [Op.gt]: 20 } },
          { dias_acumulados: { [Op.gt]: 20 } }
        ]
      },
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [['dias_disponibles', 'DESC']]
    });
    const vacMas20 = vacMas20Rows.map((v) => {
      const json = v.toJSON();
      return {
        id: json.colaborador?.id,
        codigo_empleado: json.colaborador?.codigo_empleado,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento,
        dias_acumulados: json.dias_acumulados,
        dias_disponibles: json.dias_disponibles
      };
    });

    // 9, 10, 11. Consultas del chatbot, % resolución sin escalamiento, latencia promedio
    const chats = await ChatConsultation.findAll({
      attributes: ['id', 'resuelta_sin_escalamiento', 'latencia_ms'],
      raw: true
    });
    const totalConsultas = chats.length;
    const resueltasDirecto = chats.filter((c) => c.resuelta_sin_escalamiento).length;
    const sumLatencia = chats.reduce((acc, c) => acc + Number(c.latencia_ms || 0), 0);
    const latenciaPromedioMs = totalConsultas > 0 ? Math.round(sumLatencia / totalConsultas) : 0;
    const pctResolucion = totalConsultas > 0 ? Number(((resueltasDirecto / totalConsultas) * 100).toFixed(2)) : 100;

    // 12. Cinco temas más consultados
    const temasMap = {};
    for (const c of chats) {
      const t = c.tema_principal || 'General';
      temasMap[t] = (temasMap[t] || 0) + 1;
    }
    const topTemas = Object.entries(temasMap)
      .map(([tema, total]) => ({ tema, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 13. Preguntas no resueltas
    const noResueltasRows = await HumanEscalation.findAll({
      where: { estado: { [Op.ne]: 'RESUELTO' } },
      include: [{ model: Collaborator, as: 'colaborador' }],
      order: [['created_at', 'DESC']]
    });
    const noResueltas = noResueltasRows.map((e) => {
      const json = e.toJSON();
      return {
        ticket_codigo: json.ticket_codigo,
        pregunta_original: json.pregunta_original,
        motivo_escalamiento: json.motivo_escalamiento,
        estado: json.estado,
        created_at: json.created_at,
        nombre: json.colaborador?.nombre,
        apellidos: json.colaborador?.apellidos,
        departamento: json.colaborador?.departamento
      };
    });

    const tasaRotacion = Number(((salidas / (colaboradoresActivos || 1)) * 100).toFixed(2));

    return {
      fechaCalculo: now.toISOString(),
      totalColaboradores,
      colaboradoresActivos,
      ausenciasActualesPorTipoYDepto: ausenciasActuales,
      solicitudesPendientesTotal: pendTotal,
      solicitudesPendientesMas3Dias: solMas3Dias,
      incapacidadesActivasTotal: incapActivas.length,
      incapacidadesActivasDetalle: incapActivas,
      incapacidadesMesTotal,
      incapacidadesMesDias,
      movimientosUltimos3Meses: { ingresos, salidas },
      tasaRotacionTrimestralPct: tasaRotacion,
      vacacionesMasDe20Dias: vacMas20,
      vacacionesSuperiores20DiasTotal: vacMas20.length,
      vacacionesSuperiores20DiasDetalle: vacMas20,
      totalConsultasChat: totalConsultas,
      chatbotConsultasTotal: totalConsultas,
      porcentajeResolucionSinEscalamiento: pctResolucion,
      chatbotResolucionSinEscalamientoPct: pctResolucion,
      latenciaPromedioChatMs: latenciaPromedioMs,
      chatbotLatenciaPromedioMs: latenciaPromedioMs,
      cincoTemasMasConsultados: topTemas,
      top5TemasConsultados: topTemas,
      preguntasNoResueltas: noResueltas,
      preguntasNoResueltasTotal: noResueltas.length
    };
  }

  const snap = db.loadSnapshot();
  const ausencias = snap.colaboradores
    .filter((c) => ['VACACIONES', 'INCAPACITADO'].includes(c.estado))
    .reduce((acc, c) => {
      const key = `${c.departamento}|${c.estado}`;
      if (!acc[key]) acc[key] = { departamento: c.departamento, tipo_ausencia: c.estado, total: 0 };
      acc[key].total += 1;
      return acc;
    }, {});

  const pend = snap.solicitudes.filter((s) => s.estado === 'PENDIENTE');
  const nowMs = now.getTime();
  const solMas3 = pend
    .filter((s) => (nowMs - new Date(s.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24) > 3)
    .map((s) => {
      const c = snap.colaboradores.find((x) => x.id === s.colaborador_id);
      return {
        ...s,
        nombre: c?.nombre,
        apellidos: c?.apellidos,
        departamento: c?.departamento,
        dias_espera: Math.floor((nowMs - new Date(s.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24))
      };
    });

  const incapActivas = snap.incapacidades
    .filter((i) => i.estado === 'ACTIVA')
    .map((i) => {
      const c = snap.colaboradores.find((x) => x.id === i.colaborador_id);
      return { ...i, nombre: c?.nombre, apellidos: c?.apellidos, departamento: c?.departamento };
    });

  const incapMes = snap.incapacidades.filter(
    (i) => i.fecha_inicio && i.fecha_inicio.startsWith(currentMonthPrefix)
  );
  const incapMesDias = incapMes.reduce((acc, i) => acc + Number(i.dias_incapacidad || 0), 0);

  const ninetyDaysAgo = new Date(nowMs - 90 * 24 * 60 * 60 * 1000);
  const movs = snap.movimientos_personal.filter(
    (m) => new Date(m.fecha_efectiva) >= ninetyDaysAgo && ['INGRESO', 'SALIDA_VOLUNTARIA', 'DESPIDO_CON_RESPONSABILIDAD'].includes(m.tipo_movimiento)
  );
  const ingresos = movs.filter((m) => m.tipo_movimiento === 'INGRESO').length;
  const salidas = movs.filter((m) => m.tipo_movimiento !== 'INGRESO').length;
  const colabActivos = snap.colaboradores.filter((c) => c.estado !== 'INACTIVO').length;

  const vac20 = snap.saldos_vacaciones
    .filter((s) => Number(s.dias_disponibles) > 20 || Number(s.dias_acumulados) > 20)
    .map((s) => {
      const c = snap.colaboradores.find((x) => x.id === s.colaborador_id);
      return {
        id: c?.id,
        codigo_empleado: c?.codigo_empleado,
        nombre: c?.nombre,
        apellidos: c?.apellidos,
        departamento: c?.departamento,
        dias_acumulados: s.dias_acumulados,
        dias_disponibles: s.dias_disponibles
      };
    });

  const totalChat = snap.consultas_chat.length;
  const resueltasDir = snap.consultas_chat.filter((c) => c.resuelta_sin_escalamiento).length;
  const sumLat = snap.consultas_chat.reduce((acc, c) => acc + Number(c.latencia_ms || 0), 0);
  const avgLat = totalChat > 0 ? Math.round(sumLat / totalChat) : 0;
  const temasMap = snap.consultas_chat.reduce((acc, c) => {
    acc[c.tema_principal] = (acc[c.tema_principal] || 0) + 1;
    return acc;
  }, {});
  const topTemas = Object.entries(temasMap)
    .map(([tema, total]) => ({ tema, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const noResueltas = snap.escalaciones_rrhh
    .filter((e) => e.estado !== 'RESUELTO')
    .map((e) => {
      const c = snap.colaboradores.find((x) => x.id === e.colaborador_id);
      return { ...e, nombre: c?.nombre, apellidos: c?.apellidos, departamento: c?.departamento };
    });

  return {
    fechaCalculo: now.toISOString(),
    totalColaboradores: snap.colaboradores.length,
    colaboradoresActivos: colabActivos,
    ausenciasActualesPorTipoYDepto: Object.values(ausencias),
    solicitudesPendientesTotal: pend.length,
    solicitudesPendientesMas3Dias: solMas3,
    incapacidadesActivasTotal: incapActivas.length,
    incapacidadesActivasDetalle: incapActivas,
    incapacidadesMesTotal: incapMes.length,
    incapacidadesMesDias,
    movimientosUltimos3Meses: { ingresos, salidas },
    tasaRotacionTrimestralPct: Number(((salidas / (colabActivos || 1)) * 100).toFixed(2)),
    vacacionesMasDe20Dias: vac20,
    vacacionesSuperiores20DiasTotal: vac20.length,
    vacacionesSuperiores20DiasDetalle: vac20,
    totalConsultasChat: totalChat,
    chatbotConsultasTotal: totalChat,
    porcentajeResolucionSinEscalamiento: totalChat > 0 ? Number(((resueltasDir / totalChat) * 100).toFixed(2)) : 100,
    chatbotResolucionSinEscalamientoPct: totalChat > 0 ? Number(((resueltasDir / totalChat) * 100).toFixed(2)) : 100,
    latenciaPromedioChatMs: avgLat,
    chatbotLatenciaPromedioMs: avgLat,
    cincoTemasMasConsultados: topTemas,
    top5TemasConsultados: topTemas,
    preguntasNoResueltas: noResueltas,
    preguntasNoResueltasTotal: noResueltas.length
  };
}

async function saveDailyReport({
  fechaReporte,
  generadoPor = 'CRON_AUTOMATICO',
  metricas,
  resumenEjecutivo,
  modeloIa = 'deepseek-flash',
  latenciaMs = 0
}) {
  await db.ensureReady();
  if (db.isMysql()) {
    const rep = await DailyReport.create({
      fecha_reporte: fechaReporte,
      generado_por: generadoPor,
      metricas_json: metricas || {},
      resumen_ejecutivo: resumenEjecutivo,
      modelo_ia: modeloIa,
      latencia_ms: Number(latenciaMs || 0)
    });
    return rep.toJSON();
  }
  const snap = db.loadSnapshot();
  const item = {
    id: nextId(snap.reportes_diarios),
    fecha_reporte: fechaReporte,
    generado_por: generadoPor,
    metricas_json: metricas,
    resumen_ejecutivo: resumenEjecutivo,
    modelo_ia: modeloIa,
    latencia_ms: Number(latenciaMs || 0),
    created_at: new Date().toISOString()
  };
  snap.reportes_diarios.push(item);
  db.saveSnapshot(snap);
  return item;
}

async function listDailyReports(limit = 15) {
  await db.ensureReady();
  const safeLimit = Math.max(1, parseInt(typeof limit === 'object' && limit !== null ? limit.limit : limit, 10) || 15);
  if (db.isMysql()) {
    const rows = await DailyReport.findAll({
      order: [
        ['fecha_reporte', 'DESC'],
        ['id', 'DESC']
      ],
      limit: safeLimit
    });
    return rows.map((r) => {
      const json = r.toJSON();
      return {
        ...json,
        metricas_json: parseJsonSafe(json.metricas_json, {})
      };
    });
  }
  const snap = db.loadSnapshot();
  return [...snap.reportes_diarios]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id)
    .slice(0, safeLimit);
}

async function listCollaboratorsSummary() {
  await db.ensureReady();
  if (db.isMysql()) {
    const collabs = await Collaborator.findAll({
      attributes: ['id', 'codigo_empleado', 'nombre', 'apellidos', 'correo', 'departamento', 'puesto', 'modalidad', 'estado'],
      order: [['id', 'ASC']]
    });
    return collabs.map((c) => c.toJSON());
  }
  const snap = db.loadSnapshot();
  return snap.colaboradores.map(({ salario_mensual, cedula, ...safe }) => safe);
}

async function getActiveDriveConnection({ includeEncryptedToken = false } = {}) {
  await db.ensureReady();
  if (db.isMysql()) {
    const conn = await GoogleDriveConnection.findOne({
      order: [['id', 'DESC']],
      include: [{ model: User, as: 'connectedByUser', attributes: ['email'] }]
    });
    if (!conn) return null;
    const json = conn.toJSON();
    const base = {
      id: json.id,
      connected_by: json.connected_by,
      google_email: json.google_email,
      scopes: json.scopes,
      folder_id: json.folder_id,
      connection_status: json.connection_status,
      connected_at: json.connected_at,
      last_sync_at: json.last_sync_at,
      updated_at: json.updated_at,
      has_encrypted_token: Boolean(json.refresh_token_encrypted && json.refresh_token_encrypted.length > 0),
      admin_email: json.connectedByUser?.email || null
    };
    if (includeEncryptedToken) {
      base.refresh_token_encrypted = json.refresh_token_encrypted;
    }
    return base;
  }
  const snap = db.loadSnapshot();
  const list = snap.google_drive_connections || [];
  if (!list.length) return null;
  const latest = list[list.length - 1];
  const admin = snap.usuarios.find((u) => u.id === latest.connected_by);
  const base = {
    id: latest.id,
    connected_by: latest.connected_by,
    google_email: latest.google_email,
    scopes: latest.scopes,
    folder_id: latest.folder_id,
    connection_status: latest.connection_status,
    connected_at: latest.connected_at,
    last_sync_at: latest.last_sync_at,
    updated_at: latest.updated_at,
    has_encrypted_token: Boolean(latest.refresh_token_encrypted),
    admin_email: admin?.email || null
  };
  if (includeEncryptedToken) base.refresh_token_encrypted = latest.refresh_token_encrypted;
  return base;
}

async function saveDriveConnection({
  connectedBy,
  googleEmail,
  refreshTokenEncrypted,
  scopes,
  folderId,
  connectionStatus = 'CONNECTED'
}) {
  await db.ensureReady();
  if (db.isMysql()) {
    const existing = await GoogleDriveConnection.findOne({ order: [['id', 'DESC']] });
    const resolvedFolderId = folderId !== undefined ? folderId : (existing?.folder_id || null);
    if (existing) {
      await existing.update({
        connected_by: Number(connectedBy),
        google_email: googleEmail || null,
        refresh_token_encrypted: refreshTokenEncrypted || null,
        scopes,
        folder_id: resolvedFolderId,
        connection_status: connectionStatus,
        connected_at: new Date()
      });
      return getActiveDriveConnection();
    }
    await GoogleDriveConnection.create({
      connected_by: Number(connectedBy),
      google_email: googleEmail || null,
      refresh_token_encrypted: refreshTokenEncrypted || null,
      scopes,
      folder_id: resolvedFolderId,
      connection_status: connectionStatus,
      connected_at: new Date()
    });
    return getActiveDriveConnection();
  }

  const snap = db.loadSnapshot();
  if (!snap.google_drive_connections) snap.google_drive_connections = [];
  const existing = snap.google_drive_connections[0];
  const resolvedFolderId = folderId !== undefined ? folderId : (existing?.folder_id || null);
  const record = {
    id: existing ? existing.id : 1,
    connected_by: Number(connectedBy),
    google_email: googleEmail || null,
    refresh_token_encrypted: refreshTokenEncrypted || null,
    scopes,
    folder_id: resolvedFolderId,
    connection_status: connectionStatus,
    connected_at: new Date().toISOString(),
    last_sync_at: existing?.last_sync_at || null,
    updated_at: new Date().toISOString()
  };
  snap.google_drive_connections = [record];
  db.saveSnapshot(snap);
  return getActiveDriveConnection();
}

async function updateDriveFolderConfig({ folderId, connectedBy }) {
  await db.ensureReady();
  const cleanFolder = folderId ? String(folderId).trim() : null;
  if (db.isMysql()) {
    const existing = await GoogleDriveConnection.findOne({ order: [['id', 'DESC']] });
    if (existing) {
      await existing.update({ folder_id: cleanFolder });
    } else {
      await GoogleDriveConnection.create({
        connected_by: Number(connectedBy),
        scopes: 'https://www.googleapis.com/auth/drive.readonly',
        folder_id: cleanFolder,
        connection_status: 'DISCONNECTED'
      });
    }
    return getActiveDriveConnection();
  }
  const snap = db.loadSnapshot();
  if (!snap.google_drive_connections) snap.google_drive_connections = [];
  if (snap.google_drive_connections[0]) {
    snap.google_drive_connections[0].folder_id = cleanFolder;
    snap.google_drive_connections[0].updated_at = new Date().toISOString();
  } else {
    snap.google_drive_connections.push({
      id: 1,
      connected_by: Number(connectedBy),
      google_email: null,
      refresh_token_encrypted: null,
      scopes: 'https://www.googleapis.com/auth/drive.readonly',
      folder_id: cleanFolder,
      connection_status: 'DISCONNECTED',
      connected_at: null,
      last_sync_at: null,
      updated_at: new Date().toISOString()
    });
  }
  db.saveSnapshot(snap);
  return getActiveDriveConnection();
}

async function updateDriveSyncStatus({ connectionStatus = 'CONNECTED', updateSyncTimestamp = true } = {}) {
  await db.ensureReady();
  if (db.isMysql()) {
    const existing = await GoogleDriveConnection.findOne({ order: [['id', 'DESC']] });
    if (!existing) return null;
    const updates = { connection_status: connectionStatus };
    if (updateSyncTimestamp) updates.last_sync_at = new Date();
    await existing.update(updates);
    return getActiveDriveConnection();
  }
  const snap = db.loadSnapshot();
  const conn = snap.google_drive_connections?.[0];
  if (!conn) return null;
  conn.connection_status = connectionStatus;
  if (updateSyncTimestamp) conn.last_sync_at = new Date().toISOString();
  conn.updated_at = new Date().toISOString();
  db.saveSnapshot(snap);
  return getActiveDriveConnection();
}

async function disconnectDriveConnection(userId) {
  await db.ensureReady();
  if (db.isMysql()) {
    await GoogleDriveConnection.update(
      { connection_status: 'DISCONNECTED', refresh_token_encrypted: null },
      { where: { id: { [Op.gt]: 0 } } }
    );
    return getActiveDriveConnection();
  }
  const snap = db.loadSnapshot();
  if (snap.google_drive_connections?.[0]) {
    snap.google_drive_connections[0].connection_status = 'DISCONNECTED';
    snap.google_drive_connections[0].refresh_token_encrypted = null;
    snap.google_drive_connections[0].updated_at = new Date().toISOString();
    db.saveSnapshot(snap);
  }
  return getActiveDriveConnection();
}

module.exports = {
  findUserByEmail,
  getUserPermissions,
  updateUserLastLogin,
  getCollaboratorCompleteProfile,
  createSolicitud,
  listSolicitudesAdmin,
  resolveSolicitud,
  saveChatConsultation,
  getChatHistoryByUser,
  saveAuditLog,
  listAuditLogs,
  createEscalation,
  listEscalations,
  resolveEscalation,
  upsertDocumentSyncState,
  listDocumentSyncStates,
  computeHrReportMetrics,
  saveDailyReport,
  listDailyReports,
  listCollaboratorsSummary,
  getActiveDriveConnection,
  saveDriveConnection,
  updateDriveFolderConfig,
  updateDriveSyncStatus,
  disconnectDriveConnection
};
