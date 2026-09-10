// 词宠岛后端：静态文件 + 排行榜接口（纯 Node，无需任何依赖）
// 用法: node tools/serve.js [端口]      端口默认 6000
// 接口: GET /api/leaderboard   POST /api/score   OPTIONS /api/*
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PORT) || 6000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..');
const BOARD_FILE = path.join(__dirname, 'leaderboard.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
};

// ---------- 排行榜文件 ----------
function readBoard() {
  try {
    const rows = JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];   // 文件不存在或损坏时当作空榜，不影响服务
  }
}

function writeBoard(rows) {
  const tmp = BOARD_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), 'utf8');
  fs.renameSync(tmp, BOARD_FILE);   // 原子替换，避免写一半被读到
}

function byRank(a, b) {
  const d = (Number(b.score) || 0) - (Number(a.score) || 0);
  if (d) return d;
  const x = String(a.username || '');
  const y = String(b.username || '');
  return x < y ? -1 : x > y ? 1 : 0;
}

// ---------- HTTP 小工具 ----------
function sendJson(res, status, payload) {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': raw.length,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, must-revalidate',
  });
  res.end(raw);
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function log(req, status, note) {
  console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.url} -> ${status}${note ? ' ' + note : ''}`);
}

// ---------- 静态文件 ----------
function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch (e) {
    res.writeHead(400); res.end('bad request'); return;
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, '.' + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {   // 防目录穿越
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      log(req, 404);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

// ---------- 服务 ----------
const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '/').split('?')[0];

  if (pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (pathname === '/api/leaderboard' && (req.method === 'GET' || req.method === 'HEAD')) {
      const rows = readBoard().slice().sort(byRank).slice(0, 5);
      sendJson(res, 200, rows);
      log(req, 200, `top${rows.length}`);
      return;
    }

    if (pathname === '/api/score' && req.method === 'POST') {
      let body;
      try {
        body = JSON.parse((await readBody(req)) || '{}');
      } catch (e) {
        sendJson(res, 400, { error: 'invalid json' });
        log(req, 400, 'invalid json');
        return;
      }
      const username = String(body && body.username != null ? body.username : '').trim().slice(0, 20);
      const delta = Math.max(0, Math.min(100, Math.floor(Number(body && body.delta != null ? body.delta : 1)) || 0));
      if (!username || !delta) {
        sendJson(res, 400, { error: 'invalid score' });
        log(req, 400, 'invalid score');
        return;
      }
      const rows = readBoard();
      let row = rows.find(x => x && x.username === username);
      if (!row) { row = { username, score: 0 }; rows.push(row); }
      row.score = (Number(row.score) || 0) + delta;
      writeBoard(rows);
      sendJson(res, 200, row);
      log(req, 200, `${username}=${row.score}`);
      return;
    }

    sendJson(res, 404, { error: 'not found' });
    log(req, 404);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`词宠岛后端已启动: http://127.0.0.1:${PORT}`);
  console.log(`  静态目录 : ${ROOT}`);
  console.log(`  排行榜   : ${BOARD_FILE}`);
  console.log('  接口     : GET /api/leaderboard   POST /api/score');
  console.log('  nginx 反代 /api/ 指向本服务即可');
});

server.on('error', err => {
  console.error(`[错误] 无法监听 ${HOST}:${PORT} —— ${err.message}`);
  process.exit(1);
});
