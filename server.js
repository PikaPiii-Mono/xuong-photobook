// Máy chủ LAN cho Xưởng Photobook — phục vụ đúng một file tĩnh, không nhận dữ liệu.
// Chạy: node server.js [cổng]   (mặc định 4330, bind 0.0.0.0, chỉ nhận máy trong mạng nội bộ)
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2]) || 4330;
const FILE = path.join(__dirname, 'Xuong-Photobook.html');

// Chỉ cho máy nội bộ: loopback + dải IP riêng (10/8, 172.16/12, 192.168/16).
function isLan(addr) {
  const ip = String(addr || '').replace(/^::ffff:/, '');
  if (ip === '127.0.0.1' || ip === '::1') return true;
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

const server = http.createServer((req, res) => {
  const who = req.socket.remoteAddress;
  if (!isLan(who)) { res.writeHead(403); res.end('Chi mo cho mang noi bo.'); return; }
  const url = req.url.split('?')[0];
  if (url === '/__pb_version' || url === '/version.txt') {          // app .exe hỏi phiên bản để tự cập nhật
    fs.readFile(FILE, 'utf8', (err, html) => {
      const m = !err && html.match(/<meta name="pb-version" content="([^"]+)"/);
      res.writeHead(m ? 200 : 503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(m ? m[1] : '');
    });
    return;
  }
  const vm = url.match(/^\/vendor\/([A-Za-z0-9._-]+)$/);   // bộ giải mã HEIC/TIFF
  if (vm) {
    fs.readFile(path.join(__dirname, 'vendor', vm[1]), (err, buf) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': vm[1].endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/octet-stream', 'Cache-Control': 'max-age=86400' });
      res.end(buf);
    });
    return;
  }
  if (url !== '/' && url !== '/index.html' && url !== '/Xuong-Photobook.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không có trang này. Mở / để vào Xưởng Photobook.'); return;
  }
  fs.readFile(FILE, (err, buf) => {
    if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không đọc được Xuong-Photobook.html cạnh server.js.'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : buf);
    console.log(`${new Date().toLocaleTimeString('vi-VN')}  ${who.replace(/^::ffff:/, '')}  mo trang`);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\nCONG ${PORT} DANG BAN. Co the may chu Photobook da chay o cua so khac.\nDong cua so do (hoac chuong trinh dang giu cong) roi mo lai.\n`);
  else console.error('\nLoi may chu:', e.message, '\n');
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal && isLan(n.address)).map((n) => n.address);
  console.log('\n  Xuong Photobook dang chay.');
  console.log(`  May nay:      http://localhost:${PORT}/`);
  for (const ip of ips) console.log(`  Dong nghiep:  http://${ip}:${PORT}/`);
  console.log('\n  Giu cua so nay mo. Dong cua so = tat may chu.\n');
});
