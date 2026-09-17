const { verifyAccessToken } = require('../auth');

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.userId);
    if (
      payload.type !== 'access'
      || !Number.isSafeInteger(userId)
      || userId <= 0
      || !['user', 'admin'].includes(payload.role)
    ) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    req.auth = {
      userId,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

module.exports = authenticate;
