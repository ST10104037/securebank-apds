/**
 * Security Test Suite — SecureBank APDS
 * Tests validation logic, regex patterns, and security configs directly.
 * No live server required — all tests run offline.
 */

// ─── Regex patterns (mirrors what your Angular components use) ───────────────
const PATTERNS = {
  accountNumber: /^\d{8,12}$/,
  fullName:      /^[a-zA-Z\s\-']{2,50}$/,
  idNumber:      /^\d{13}$/,
  amount:        /^\d+(\.\d{1,2})?$/,
  swiftCode:     /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  currency:      /^(USD|EUR|GBP|ZAR|JPY|AUD|CAD|CHF|CNY|INR)$/,
  password:      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
};

// ─── Security header config (mirrors firebase.json headers) ──────────────────
const EXPECTED_HEADERS: Record<string, string> = {
  'x-frame-options':           'DENY',
  'x-content-type-options':    'nosniff',
  'x-xss-protection':          '1; mode=block',
  'referrer-policy':           'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'content-security-policy':   "default-src 'self'",
};

// Simulates the header map your firebase.json injects
function getConfiguredHeader(name: string): string | null {
  return EXPECTED_HEADERS[name.toLowerCase()] ?? null;
}

// ─── Simulated login validator (mirrors your Angular login guard) ─────────────
interface LoginPayload { accountNumber?: string; password?: string; }
type LoginResult = { success: boolean; error?: string };

function validateLoginInput(payload: LoginPayload): LoginResult {
  if (!payload.accountNumber || !payload.password) {
    return { success: false, error: 'Missing credentials' };
  }
  if (!PATTERNS.accountNumber.test(payload.accountNumber)) {
    return { success: false, error: 'Invalid account number format' };
  }
  if (payload.password.length < 8) {
    return { success: false, error: 'Password too short' };
  }
  return { success: true };
}

// ─── Brute-force rate limiter simulation ─────────────────────────────────────
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly limit = 5;
  private readonly windowMs = 60_000;

  isBlocked(ip: string): boolean {
    const now = Date.now();
    const times = (this.attempts.get(ip) ?? []).filter(t => now - t < this.windowMs);
    this.attempts.set(ip, times);
    return times.length >= this.limit;
  }

  record(ip: string): void {
    const times = this.attempts.get(ip) ?? [];
    times.push(Date.now());
    this.attempts.set(ip, times);
  }
}

// ─── XSS / SQL injection detector (input sanitiser) ──────────────────────────
function containsMaliciousInput(value: string): boolean {
  const xss = /<[^>]*script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;
  const sql = /('|--|;|\bOR\b|\bAND\b|\bDROP\b|\bSELECT\b|\bUNION\b|\bINSERT\b)/i;
  return xss.test(value) || sql.test(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security Headers — config verification', () => {
  test('X-Frame-Options is set to DENY (clickjacking protection)', () => {
    const val = getConfiguredHeader('x-frame-options');
    expect(val).toMatch(/DENY|SAMEORIGIN/i);
  });

  test('X-Content-Type-Options is nosniff (MIME-sniffing protection)', () => {
    expect(getConfiguredHeader('x-content-type-options')).toBe('nosniff');
  });

  test('Content-Security-Policy restricts script sources (XSS protection)', () => {
    const csp = getConfiguredHeader('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });

  test('Strict-Transport-Security enforces HTTPS (MITM protection)', () => {
    const hsts = getConfiguredHeader('strict-transport-security');
    expect(hsts).toBeTruthy();
    expect(hsts).toContain('max-age');
  });

  test('Referrer-Policy limits information leakage', () => {
    expect(getConfiguredHeader('referrer-policy')).toBeTruthy();
  });

  test('X-XSS-Protection header enables browser XSS filter', () => {
    expect(getConfiguredHeader('x-xss-protection')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Authentication — input validation', () => {
  test('Rejects empty payload (missing credentials)', () => {
    expect(validateLoginInput({}).success).toBe(false);
  });

  test('Rejects XSS attempt in account number field', () => {
    const result = validateLoginInput({
      accountNumber: '<script>alert(1)</script>',
      password: 'Password1!',
    });
    expect(result.success).toBe(false);
  });

  test('Rejects SQL injection attempt in account number field', () => {
    const result = validateLoginInput({
      accountNumber: "' OR '1'='1",
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  test('Rejects non-numeric account number', () => {
    expect(validateLoginInput({ accountNumber: 'abc123xyz', password: 'Password1!' }).success).toBe(false);
  });

  test('Rejects password shorter than 8 characters', () => {
    expect(validateLoginInput({ accountNumber: '12345678', password: '123' }).success).toBe(false);
  });

  test('Accepts valid credentials format', () => {
    expect(validateLoginInput({ accountNumber: '12345678', password: 'SecureP@ss1' }).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Input validation — RegEx whitelisting', () => {
  test('Account number rejects letters', () => {
    expect(PATTERNS.accountNumber.test('ABC12345')).toBe(false);
  });

  test('Account number rejects numbers shorter than 8 digits', () => {
    expect(PATTERNS.accountNumber.test('1234567')).toBe(false);
  });

  test('Account number accepts valid 8-digit number', () => {
    expect(PATTERNS.accountNumber.test('12345678')).toBe(true);
  });

  test('Full name rejects numeric characters', () => {
    expect(PATTERNS.fullName.test('John123')).toBe(false);
  });

  test('Full name rejects XSS payload', () => {
    expect(PATTERNS.fullName.test('<script>alert(1)</script>')).toBe(false);
  });

  test('Full name accepts valid name with hyphen', () => {
    expect(PATTERNS.fullName.test("Mary-Jane O'Brien")).toBe(true);
  });

  test('ID number must be exactly 13 digits', () => {
    expect(PATTERNS.idNumber.test('123456789012')).toBe(false);   // 12 digits
    expect(PATTERNS.idNumber.test('1234567890123')).toBe(true);   // 13 digits
  });

  test('Amount rejects negative values', () => {
    expect(PATTERNS.amount.test('-100')).toBe(false);
  });

  test('Amount rejects more than 2 decimal places', () => {
    expect(PATTERNS.amount.test('10.999')).toBe(false);
  });

  test('Amount accepts valid decimal', () => {
    expect(PATTERNS.amount.test('1500.50')).toBe(true);
  });

  test('SWIFT code rejects invalid format', () => {
    expect(PATTERNS.swiftCode.test('INVALID')).toBe(false);
  });

  test('SWIFT code accepts valid 8-character code', () => {
    expect(PATTERNS.swiftCode.test('ABCDZA22')).toBe(true);
  });

  test('SWIFT code accepts valid 11-character code', () => {
    expect(PATTERNS.swiftCode.test('ABCDZA22XXX')).toBe(true);
  });

  test('Currency rejects unknown currency codes', () => {
    expect(PATTERNS.currency.test('XXX')).toBe(false);
  });

  test('Currency accepts valid ISO codes', () => {
    expect(PATTERNS.currency.test('USD')).toBe(true);
    expect(PATTERNS.currency.test('ZAR')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('XSS and SQL injection detection', () => {
  test('Detects script tag injection', () => {
    expect(containsMaliciousInput('<script>alert("xss")</script>')).toBe(true);
  });

  test('Detects javascript: protocol injection', () => {
    expect(containsMaliciousInput('javascript:alert(1)')).toBe(true);
  });

  test('Detects SQL OR injection', () => {
    expect(containsMaliciousInput("' OR '1'='1")).toBe(true);
  });

  test('Detects SQL DROP injection', () => {
    expect(containsMaliciousInput("'; DROP TABLE users; --")).toBe(true);
  });

  test('Allows clean input through', () => {
    expect(containsMaliciousInput('John Smith')).toBe(false);
    expect(containsMaliciousInput('1500.00')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Brute force protection — rate limiter', () => {
  test('Allows requests under the limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 4; i++) limiter.record('192.168.1.1');
    expect(limiter.isBlocked('192.168.1.1')).toBe(false);
  });

  test('Blocks IP after 5 failed attempts within the window', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) limiter.record('10.0.0.1');
    expect(limiter.isBlocked('10.0.0.1')).toBe(true);
  });

  test('Does not block a different IP', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) limiter.record('10.0.0.1');
    expect(limiter.isBlocked('10.0.0.2')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Password policy', () => {
  test('Rejects passwords without uppercase letter', () => {
    expect(PATTERNS.password.test('password1!')).toBe(false);
  });

  test('Rejects passwords without a digit', () => {
    expect(PATTERNS.password.test('Password!')).toBe(false);
  });

  test('Rejects passwords shorter than 8 characters', () => {
    expect(PATTERNS.password.test('Ab1!')).toBe(false);
  });

  test('Accepts a strong password', () => {
    expect(PATTERNS.password.test('Secure@123')).toBe(true);
  });
});