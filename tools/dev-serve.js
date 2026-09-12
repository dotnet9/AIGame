// 开发用静态服务器：所有响应 no-store，改完代码刷新即生效（生产仍用 run.bat 的 serve.py）
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'game');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  let fp = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (fp.endsWith('/') || fp.endsWith('\\')) fp = path.join(fp, 'index.html');
  fs.readFile(fp, (err, data) => {
    if (err) { res.statusCode = 404; res.end('404'); return; }
    res.setHeader('Content-Type', mime[path.extname(fp)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(data);
  });
}).listen(8090, () => console.log('dev serve on 8090'));
