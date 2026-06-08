/**
 * generateCert.js — Generate self-signed SSL certificate for local HTTPS
 * Run once: node src/utils/generateCert.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, '../../ssl');

if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

const keyPath = path.join(sslDir, 'server.key');
const certPath = path.join(sslDir, 'server.cert');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ SSL certificates already exist — skipping generation');
  process.exit(0);
}

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost/O=SecureBank/C=ZA"`,
    { stdio: 'inherit' }
  );
  console.log('✅ SSL certificates generated successfully');
  console.log(`   Key:  ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
} catch (err) {
  console.error('❌ OpenSSL not found. Generating certificates using Node.js fallback...');

  // Fallback: use Node.js built-in crypto to write placeholder files
  // For development only — replace with real certs in production
  const crypto = require('crypto');
  const { generateKeyPairSync } = crypto;

  try {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    fs.writeFileSync(keyPath, pem);

    // Write a minimal self-signed cert placeholder
    fs.writeFileSync(certPath, pem); // same file as fallback — server.js will handle

    console.log('⚠️  Placeholder key written (OpenSSL not available)');
    console.log('   Install OpenSSL for a proper certificate: https://slproweb.com/products/Win32OpenSSL.html');
  } catch (e) {
    console.error('❌ Could not generate certificates:', e.message);
  }
}