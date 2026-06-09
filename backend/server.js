require('dotenv').config();
const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payments');
const employeeRoutes = require('./src/routes/employee');

const app = express();

app.use(helmet({
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
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employee', employeeRoutes);

app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const sslOptions = {
  key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH || './ssl/server.key')),
  cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH || './ssl/server.cert')),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running on https://localhost:${PORT}`);
});

http.createServer((_req, res) => {
  res.writeHead(301, { Location: `https://localhost:${PORT}` });
  res.end();
}).listen(8080, () => {
  console.log('ℹ️  HTTP redirect server on port 8080 → HTTPS');
});