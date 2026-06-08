const PATTERNS = {
  fullName:      /^[a-zA-Z\s'\-]{2,100}$/,
  idNumber:      /^\d{13}$/,
  accountNumber: /^\d{8,11}$/,
  username:      /^[a-zA-Z0-9_]{3,30}$/,
  password:      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,64}$/,
  amount:        /^\d{1,10}(\.\d{1,2})?$/,
  currency:      /^[A-Z]{3}$/,
  swiftCode:     /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  provider:      /^[A-Z]{1,20}$/,
  payeeName:     /^[a-zA-Z\s'\-]{2,100}$/,
};

function validate(field, value) {
  if (!PATTERNS[field]) throw new Error(`Unknown validation field: ${field}`);
  if (typeof value !== 'string') return false;
  return PATTERNS[field].test(value.trim());
}

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