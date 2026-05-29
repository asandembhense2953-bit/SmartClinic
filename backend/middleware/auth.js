const crypto = require('crypto');

const sessions = new Map();

const createSession = (user) => {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { user, createdAt: Date.now() });
  return token;
};

const getSession = (token) => {
  if (!token) return null;
  return sessions.get(token) || null;
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers['x-access-token'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  const token = authHeader.slice(7).trim();
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authorization token' });
  }

  req.user = session.user;
  next();
};

module.exports = { authenticate, createSession, getSession };
