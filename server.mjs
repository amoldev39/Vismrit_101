import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function createServer(port) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    
    // Normalize path to prevent directory traversal
    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);
    
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + reqPath);
        return;
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, attempting port ${port + 1}...`);
      createServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n  ==============================================================');
    console.log('  🛡️  Vismrit Privacy Sentinel • LPOA Data Erasure Application');
    console.log('  ==============================================================');
    console.log(`  ➜  Local:   ${url}/`);
    console.log(`  ➜  Ready:   Statutory Agency & Deletion Notice Generator`);
    console.log('  ==============================================================\n');

    // Open browser on Windows if flag --open is passed or by default on dev start
    const shouldOpen = process.argv.includes('--open') || !process.env.NO_OPEN;
    if (shouldOpen) {
      const startCmd = process.platform === 'win32' ? `start "" "${url}"` :
                       process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(startCmd, () => {});
    }
  });
}

createServer(PORT);
