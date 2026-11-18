const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const hrRepo = require('../services/db/hrRepository');
const auditService = require('../services/audit/auditService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Debe ingresar correo electrónico y contraseña.' });
    }

    const user = await hrRepo.findUserByEmail(String(email).trim().toLowerCase());
    if (!user || !user.activo) {
      await auditService.logEvent({
        rol: 'ANONIMO',
        accion: 'LOGIN_FALLIDO',
        recurso: '/api/auth/login',
        resultado: 'BLOQUEADO_SEGURIDAD',
        detalle: `Intento de login con correo no registrado o inactivo: ${email}`,
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const validPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!validPassword) {
      await auditService.logEvent({
        usuarioId: user.id,
        colaboradorId: user.colaborador_id,
        rol: user.rol_nombre,
        accion: 'LOGIN_CONTRASENA_INCORRECTA',
        recurso: '/api/auth/login',
        resultado: 'BLOQUEADO_SEGURIDAD',
        detalle: 'Contraseña incorrecta suministrada.',
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const permisos = await hrRepo.getUserPermissions(user.rol_id);
    await hrRepo.updateUserLastLogin(user.id);

    const nombreCompleto = `${user.nombre} ${user.apellidos}`;
    const tokenPayload = {
      usuarioId: user.id,
      colaboradorId: user.colaborador_id,
      email: user.email,
      rol: user.rol_nombre,
      nombreCompleto,
      departamento: user.departamento,
      puesto: user.puesto,
      permisos
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    await auditService.logEvent({
      usuarioId: user.id,
      colaboradorId: user.colaborador_id,
      rol: user.rol_nombre,
      accion: 'LOGIN_EXITOSO',
      recurso: '/api/auth/login',
      resultado: 'EXITO',
      detalle: `Inicio de sesión exitoso (${user.rol_nombre}).`,
      ipAddress: req.ip
    });

    return res.json({
      token,
      user: {
        ...tokenPayload,
        codigoEmpleado: user.codigo_empleado,
        modalidad: user.modalidad,
        estado: user.estado
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, me };
