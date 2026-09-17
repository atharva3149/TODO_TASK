const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      userId: user.id,
      role: user.role,
      type: 'access',
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiry,
      algorithm: 'HS256',
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
  });
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshTokenExpiresAt() {
  return new Date(Date.now() + config.refreshExpiryDays * 24 * 60 * 60 * 1000);
}

function publicUser(user) {
  return {
    id: Number(user.id),
    email: user.email,
    role: user.role,
  };
}

module.exports = {
  createRefreshToken,
  hashRefreshToken,
  issueAccessToken,
  publicUser,
  refreshTokenExpiresAt,
  verifyAccessToken,
};
