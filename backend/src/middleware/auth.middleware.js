/**
 * auth.middleware.js — JWT authentication guards
 *
 * Security measures:
 *  - Verifies JWT signature using server-side secret
 *  - Checks token expiry automatically (jwt.verify throws if expired)
 *  - Role-based access: customers cannot reach employee routes and vice versa
 *  - Generic 401 responses — never reveals WHY auth failed (prevents enumeration)
 */

const jwt = require('jsonwebtoken');

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the decoded payload, or throws if invalid/expired.
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.split(' ')[1];
  // jwt.verify throws JsonWebTokenError or TokenExpiredError if invalid
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * requireCustomerAuth — protects customer-only routes.
 * Attaches decoded user payload to req.user on success.
 */
function requireCustomerAuth(req, res, next) {
  try {
    const payload = extractToken(req);
    if (payload.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.user = payload;
    next();
  } catch (err) {
    // Same message for expired, missing, and tampered tokens (prevents info leakage)
    return res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * requireEmployeeAuth — protects employee-only routes.
 * Accepts both 'employee' and 'admin' roles.
 */
function requireEmployeeAuth(req, res, next) {
  try {
    const payload = extractToken(req);
    if (payload.role !== 'employee' && payload.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * requireAdminAuth — protects admin-only routes (e.g. creating employees).
 */
function requireAdminAuth(req, res, next) {
  try {
    const payload = extractToken(req);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

module.exports = { requireCustomerAuth, requireEmployeeAuth, requireAdminAuth };