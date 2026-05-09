#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: 6006,
    dir: process.cwd(),
    fallback: 'index.html'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dir' || arg === '-d') {
      options.dir = path.resolve(args[++i]);
    } else if (arg.startsWith('--dir=')) {
      options.dir = path.resolve(arg.split('=')[1]);
    } else if (arg === '--fallback' || arg === '-f') {
      options.fallback = args[++i];
    } else if (arg.startsWith('--fallback=')) {
      options.fallback = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.dir = path.resolve(arg);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: vue-httpd [options] [directory]

Options:
  -p, --port <number>      指定端口 (默认: 6000)
  -d, --dir <path>         指定静态目录 (默认: 当前目录)
  -f, --fallback <file>    指定回退文件 (默认: index.html)
  -h, --help               显示帮助信息

Examples:
  vue-httpd
  vue-httpd ./dist
  vue-httpd --port 8080
  vue-httpd --fallback app.html
  vue-httpd --port 8080 ./dist
`);
}

// 检测端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port);
  });
}

// 查找可用端口
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < 65535) {
    if (await checkPort(port)) {
      return port;
    }
    port++;
  }
  throw new Error('没有可用的端口');
}

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

// 创建服务器
function createServer(options) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(options.dir, urlPath);
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(options.dir);
    
    // 安全检查：防止目录遍历
    if (!resolvedPath.startsWith(resolvedDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveFile(filePath, res);
      } else {
        // 目录或文件不存在，统一走 fallback
        const actualFallback = detectFallbackFile(options.dir, options.fallback);
        if (actualFallback) {
          serveFile(path.join(options.dir, actualFallback), res);
        } else {
          send404(res);
        }
      }
    });
  });

  return server;
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

// 同步检测实际可用的 fallback 文件名
function detectFallbackFile(dir, fallback) {
  const fallbackPath = path.join(dir, fallback);
  if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
    return fallback;
  }

  const indexPath = path.join(dir, 'index.html');
  if (fallback !== 'index.html' && fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return 'index.html';
  }

  try {
    const files = fs.readdirSync(dir);
    const htmlFile = files.find(f => f.toLowerCase().endsWith('.html'));
    if (htmlFile) {
      return htmlFile;
    }
  } catch (e) {
    // ignore
  }

  return null;
}

// 获取所有本地 IPv4 地址
function getLocalIPs() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// 主函数
async function main() {
  const options = parseArgs();

  if (!fs.existsSync(options.dir)) {
    console.error(`错误: 目录不存在 ${options.dir}`);
    process.exit(1);
  }

  const stat = fs.statSync(options.dir);
  if (!stat.isDirectory()) {
    console.error(`错误: ${options.dir} 不是目录`);
    process.exit(1);
  }

  const port = await findAvailablePort(options.port);
  
  if (port !== options.port) {
    console.log(`端口 ${options.port} 被占用，自动切换到端口 ${port}`);
  }

  const actualFallback = detectFallbackFile(options.dir, options.fallback);
  const server = createServer(options);
  
  server.listen(port, () => {
    const ips = getLocalIPs();
    console.log(`\n  服务已启动`);
    console.log(`  静态目录: ${options.dir}`);
    if (actualFallback) {
      console.log(`  回退文件: ${actualFallback}`);
    } else {
      console.log(`  回退文件: (无可用 html 文件)`);
    }
    console.log(`\n  本地:   http://localhost:${port}/`);
    ips.forEach(ip => {
      console.log(`  网络:   http://${ip}:${port}/`);
    });
    console.log(`\n  按 Ctrl+C 停止服务\n`);
  });

  process.on('SIGINT', () => {
    console.log('\n\n服务已停止');
    server.close(() => {
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
