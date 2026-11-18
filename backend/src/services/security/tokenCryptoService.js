const crypto = require('crypto');
const config = require('../../config/env');

/**
 * Servicio de cifrado autenticado AES-256-GCM para refresh tokens de OAuth 2.0.
 * Utiliza GOOGLE_TOKEN_ENCRYPTION_KEY desde variables de entorno.
 * Nunca imprime ni registra llaves ni tokens en texto plano.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKeyBuffer() {
  const rawKey = config.googleDrive.tokenEncryptionKey;
  if (!rawKey || rawKey.length < 16) {
    throw new Error(
      'GOOGLE_TOKEN_ENCRYPTION_KEY no configurada o demasiado corta. Se requiere una clave segura en backend/.env.'
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
}

function encryptToken(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Token inválido para cifrar.');
  }
  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('Payload cifrado inválido.');
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de token cifrado inválido.');
  }
  const [ivHex, authTagHex, dataHex] = parts;
  const key = getEncryptionKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  encryptToken,
  decryptToken
};
