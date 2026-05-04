/**
 * validators.js — Input whitelisting using RegEx patterns
 *
 * All patterns use WHITELIST approach (only allow known-good characters).
 * Any input that does not match is rejected before it touches the database.
 */

const PATTERNS = {
  // Full name: letters, spaces, hyphens, apostrophes — no special chars
  fullName: /^[a-zA-Z\s'\-]{2,100}$/,

  // South African ID number: exactly 13 digits
  idNumber: /^\d{13}$/,

  // Account number: 8–11 digits (typical bank account)
  accountNumber: /^\d{8,11}$/,

  // Username: alphanumeric + underscore, 3–30 chars
  username: /^[a-zA-Z0-9_]{3,30}$/,

  // Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,64}$/,

  // Amount: positive decimal, up to 2 decimal places
  amount: /^\d{1,10}(\.\d{1,2})?$/,

  // Currency code: ISO 4217 (3 uppercase letters)
  currency: /^[A-Z]{3}$/,

  // SWIFT / BIC code: 8 or 11 alphanumeric chars
  swiftCode: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,

  // Provider name: letters only
  provider: /^[A-Z]{1,20}$/,

  // Payee name: same as full name
  payeeName: /^[a-zA-Z\s'\-]{2,100}$/,
};

/**
 * Validate a value against a named pattern.
 * @param {string} field — key in PATTERNS
 * @param {string} value — value to test
 * @returns {boolean}
 */
function validate(field, value) {
  if (!PATTERNS[field]) {
    throw new Error(`Unknown validation field: ${field}`);
  }
  if (typeof value !== 'string') return false;
  return PATTERNS[field].test(value.trim());
}

/**
 * Middleware factory — validates a set of fields from req.body.
 * Usage: router.post('/route', validateBody(['field1','field2']), handler)
 */
function validateBody(fields) {
  return (req, res, next) => {
    const errors = [];
    for (const field of fields) {
      const value = req.body[field];
      if (value === undefined || value === null) {
        errors.push(`${field} is required`);
      } else if (!validate(field, String(value))) {
        errors.push(`${field} has an invalid format`);
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

module.exports = { PATTERNS, validate, validateBody };