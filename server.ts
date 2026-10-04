import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import net from 'net';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import api from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local/self-hosted server: the API (server/routes.ts) plus the frontend. On Vercel, api/index.ts serves
// the same API and Vercel serves the built frontend itself.
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Cross-origin isolation lets PaddleOCR's WebAssembly use several CPU cores (~25% faster scans).
// "credentialless" keeps CDN scripts and images loading; browsers without it (Safari) just run single-threaded.
// Same headers as vercel.json.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// Dev only: a phone opening http://<LAN-IP>:port is sent to https so the browser allows location access.
// Proxied hosts (Google AI Studio, production) never match: they use public hostnames and terminate TLS upstream.
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV !== 'production' &&
    !(req.socket as any).encrypted &&
    req.method === 'GET' &&
    fs.existsSync(path.resolve(__dirname, '.cert', 'cert.pem'))
  ) {
    const host = (req.headers.host || '').replace(/:\d+$/, '');
    if (isPrivateLanHost(host)) {
      return res.redirect(307, `https://${req.headers.host}${req.originalUrl}`);
    }
  }
  next();
});

app.use(api);

/**
 * Phones only expose GPS to secure origins (https, or localhost). In development the server answers
 * both http and https on the same port, using a self-signed cert made with openssl, and sends phones
 * that open the LAN address over http to the https version. The desktop keeps http://localhost.
 */
function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function loadDevCert(): { key: Buffer; cert: Buffer } | null {
  try {
    const dir = path.resolve(__dirname, '.cert');
    const keyPath = path.join(dir, 'key.pem');
    const certPath = path.join(dir, 'cert.pem');
    const ipsPath = path.join(dir, 'ips.txt');
    const ips = lanAddresses().sort().join(',');
    // Regenerate when the LAN address changes, so the cert names the address the phone opens
    const stale = !fs.existsSync(certPath) || !fs.existsSync(ipsPath) || fs.readFileSync(ipsPath, 'utf8') !== ips;
    if (stale) {
      fs.mkdirSync(dir, { recursive: true });
      const san = ['DNS:localhost', 'IP:127.0.0.1', ...lanAddresses().map((ip) => `IP:${ip}`)].join(',');
      execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825',
        '-keyout', keyPath, '-out', certPath,
        '-subj', '/CN=Just the Tip (dev)',
        '-addext', `subjectAltName=${san}`,
      ], { stdio: 'ignore' });
      fs.writeFileSync(ipsPath, ips);
    }
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  } catch (err: any) {
    console.warn('Could not create a dev https certificate (is openssl installed?); serving http only.', err?.message || err);
    return null;
  }
}

const isPrivateLanHost = (host: string) =>
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith('.local');

// Vite middleware or production static files
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';
  const tls = isProduction ? null : loadDevCert();
  const httpServer = http.createServer(app);
  const httpsServer = tls ? https.createServer(tls, app) : null;

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // HMR runs on the page's own port (ws:// or wss://); http upgrades are handed to the same handler
    const hmrServer = httpsServer || httpServer;
    if (httpsServer) {
      httpServer.on('upgrade', (req, socket, head) => httpsServer.emit('upgrade', req, socket, head));
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(process.env.DISABLE_HMR !== 'true' ? { ws: { server: hmrServer } } : {}),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // One port for both protocols: a TLS handshake starts with byte 0x16, anything else is plain http
  const listener = httpsServer
    ? net.createServer((socket) => {
        socket.once('data', (firstChunk) => {
          socket.pause();
          socket.unshift(firstChunk);
          (firstChunk[0] === 0x16 ? httpsServer : httpServer).emit('connection', socket);
          process.nextTick(() => socket.resume());
        });
        socket.on('error', () => socket.destroy());
      })
    : httpServer;

  listener.listen(port, '0.0.0.0', () => {
    console.log(`GlobalTip Server running at http://localhost:${port}`);
    for (const ip of lanAddresses()) {
      console.log(`  On your phone (same Wi-Fi): ${httpsServer ? 'https' : 'http'}://${ip}:${port}`);
    }
    if (httpsServer) {
      console.log('  The phone shows a certificate warning once (self-signed); accept it to allow location access.');
    }
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
