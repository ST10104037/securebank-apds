/**
 * server.js — APDS International Payments Portal API
 *
 * Security measures implemented:
 *  1. HTTPS / SSL (all traffic encrypted)
 *  2. Helmet (security headers: CSP, X-Frame-Options, HSTS, XSS protection, etc.)
 *  3. Rate limiting (brute-force protection)
 *  4. express-mongo-sanitize (NoSQL injection prevention)
 *  5. xss-clean (XSS prevention on req body/params)
 *  6. CORS (restricted to allowed origin)
 *  7. bcryptjs password hashing + salting
 *  8. JWT authentication (stateless, signed tokens)
 *  9. Input whitelisting with RegEx (see validators)
 * 10. HTTP → HTTPS redirect server
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const employeeRoutes = require('./routes/employee');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

// Helmet sets many secure HTTP headers at once:
//   Content-Security-Policy, X-Frame-Options: DENY (clickjacking),
//   Strict-Transport-Security (HSTS), X-Content-Type-Options, etc.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,       // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY (clickjacking protection)
  })
);

// Rate limiting — prevents brute-force attacks on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 attempts per window
  message: { error: 'Too many attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// CORS — only allow requests from our Angular front-end
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10kb' })); // limit body size (DoS protection)

// NoSQL injection prevention — strips $ and . from request body/params/query
app.use(mongoSanitize());

// XSS prevention — sanitizes HTML tags from input
app.use(xss());

// ─── Database ─────────────────────────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employee', employeeRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// ─── HTTPS Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const sslOptions = {
  key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH || './ssl/server.key')),
  cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH || './ssl/server.cert')),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running on https://localhost:${PORT}`);
});

// HTTP → HTTPS redirect (port 8080 → 3000)
http
  .createServer((_req, res) => {
    res.writeHead(301, { Location: `https://localhost:${PORT}` });
    res.end();
  })
  .listen(8080, () => {
    console.log('ℹ️  HTTP redirect server on port 8080 → HTTPS');
  });