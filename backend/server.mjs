import http from 'node:http';
import {
  handleGetTermsConsent,
  handlePostTermsConsent,
  handleGetAllConsents,
  handleGetAuditHistory,
  handleResetConsent,
  sendJson,
} from './routes/consent.mjs';

const PORT = process.env.BACKEND_PORT || 5000;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Protect against body overflow (> 1MB)
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Malformed JSON'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

export function createBackendServer(port = PORT) {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for easy cross-origin or proxied integration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const [pathname] = req.url.split('?');

    try {
      if (req.method === 'GET' && pathname === '/api/consent/terms') {
        handleGetTermsConsent(req, res);
      } else if (req.method === 'POST' && pathname === '/api/consent/terms') {
        const body = await parseJsonBody(req);
        handlePostTermsConsent(req, res, body);
      } else if (req.method === 'GET' && pathname === '/api/consent/all') {
        handleGetAllConsents(req, res);
      } else if (req.method === 'GET' && pathname === '/api/consent/audit') {
        handleGetAuditHistory(req, res);
      } else if (req.method === 'POST' && pathname === '/api/consent/reset') {
        const body = await parseJsonBody(req);
        handleResetConsent(req, res, body);
      } else if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/api')) {
        sendJson(res, 200, {
          status: 'ok',
          service: 'Vismrit Terms Consent Service',
          timestamp: new Date().toISOString(),
        });
      } else {
        sendJson(res, 404, {
          success: false,
          error: `Endpoint not found: ${req.method} ${pathname}`,
        });
      }
    } catch (err) {
      if (err.message === 'Malformed JSON') {
        sendJson(res, 400, { success: false, error: 'Malformed JSON payload' });
      } else {
        console.error('Unhandled server error:', err);
        sendJson(res, 500, { success: false, error: 'Internal server error' });
      }
    }
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const server = createBackendServer(PORT);
  server.listen(PORT, () => {
    console.log(`\n==============================================================`);
    console.log(`🛡️  Vismrit Privacy Sentinel - Standalone Terms Consent API`);
    console.log(`==============================================================`);
    console.log(`➜  Backend running on: http://localhost:${PORT}`);
    console.log(`➜  Endpoints (No Auth Required - Pass userId in body or query):`);
    console.log(`   - POST /api/consent/terms (Pass { userId, termsAccepted: true/false })`);
    console.log(`   - GET  /api/consent/terms?userId=user_1 (Get acceptance status)`);
    console.log(`   - GET  /api/consent/all   (Inspect all users' status)`);
    console.log(`   - GET  /api/consent/audit?userId=user_1 (User audit trail)`);
    console.log(`==============================================================\n`);
  });
}
