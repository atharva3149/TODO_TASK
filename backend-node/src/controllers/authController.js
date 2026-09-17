const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const {
  createRefreshToken,
  hashRefreshToken,
  issueAccessToken,
  publicUser,
  refreshTokenExpiresAt,
} = require('../auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const DUMMY_PASSWORD_HASH = '$2a$10$rT7YC/oEyT94M83Kk/9oSOs1IWHYvzdXagutvYqmfPRLGRoiNkz1u';

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateCredentials(email, password) {
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    return 'A valid email address is required';
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must be at most 72 bytes';
  }

  // Require at least one uppercase, one lowercase, and one digit for stronger passwords
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasUpper || !hasLower || !hasDigit) {
    return 'Password must include uppercase, lowercase letters, and a digit';
  }

  return null;
}

async function persistRefreshToken(connection, userId, token) {
  await connection.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, hashRefreshToken(token), refreshTokenExpiresAt()],
  );
}

async function createSession(connection, user) {
  const refreshToken = createRefreshToken();
  await persistRefreshToken(connection, user.id, refreshToken);

  return {
    accessToken: issueAccessToken(user),
    refreshToken,
    user: publicUser(user),
  };
}

async function register(req, res, next) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, role)
       VALUES (?, ?, 'user')`,
      [email, passwordHash],
    );

    return res.status(201).json({
      user: {
        id: result.insertId,
        email,
        role: 'user',
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    const user = rows[0];
    // Always perform a bcrypt comparison so unknown emails do not get a faster response.
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password_hash || DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const session = await createSession(pool, user);
    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  const refreshToken = req.body?.refreshToken;
  if (typeof refreshToken !== 'string' || refreshToken.length < 20) {
    return res.status(400).json({ error: 'A refresh token is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT rt.id, rt.user_id, u.email, u.role
       FROM refresh_tokens AS rt
       INNER JOIN users AS u ON u.id = rt.user_id
       WHERE rt.token_hash = ?
         AND rt.expires_at > UTC_TIMESTAMP()
       LIMIT 1
       FOR UPDATE`,
      [hashRefreshToken(refreshToken)],
    );
    const tokenRecord = rows[0];

    if (!tokenRecord) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate the token so a stolen refresh token cannot be reused after refresh.
    await connection.execute('DELETE FROM refresh_tokens WHERE id = ?', [tokenRecord.id]);
    const user = {
      id: tokenRecord.user_id,
      email: tokenRecord.email,
      role: tokenRecord.role,
    };
    const session = await createSession(connection, user);
    await connection.commit();
    return res.status(200).json(session);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function logout(req, res, next) {
  const refreshToken = req.body?.refreshToken;
  if (typeof refreshToken !== 'string' || refreshToken.length < 20) {
    return res.status(204).send();
  }

  try {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE token_hash = ?',
      [hashRefreshToken(refreshToken)],
    );
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, role FROM users WHERE id = ? LIMIT 1',
      [req.auth.userId],
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }
    return res.status(200).json({ user: publicUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  logout,
  me,
  refresh,
  register,
};
