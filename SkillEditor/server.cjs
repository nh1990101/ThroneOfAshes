const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { buildManifest } = require('./resources.cjs');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.SKILL_EDITOR_PORT || 8766);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json; charset=utf-8' };
let manifest;
const corePath = path.join(__dirname, 'core.mjs');
async function loadCore() {
  // 按文件内容区分模块版本，避免旧服务把新参数当作未知字段过滤掉。
  const source = await fs.promises.readFile(corePath);
  const version = createHash('sha256').update(source).digest('hex');
  return import(`${pathToFileURL(corePath).href}?v=${version}`);
}
function replyJSON(res, status, value) {
  res.writeHead(status, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/api/save') {
      if (![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin) || !/^application\/json\b/i.test(req.headers['content-type'] || '')) return replyJSON(res, 403, { error: '只允许编辑器页面保存 JSON' });
      const chunks = []; let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 5 * 1024 * 1024) return replyJSON(res, 413, { error: '配置不能超过 5 MB' });
        chunks.push(chunk);
      }
      const { importDocument, exportDocument, skillIdError } = await loadCore();
      let data;
      try {
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const idError = skillIdError(input?.skillId);
        if (idError) return replyJSON(res, 400, { error: idError });
        const parsed = importDocument(input);
        if (!manifest) manifest = await buildManifest(root);
        data = exportDocument(parsed, manifest);
      } catch (error) { return replyJSON(res, 400, { error: error.message }); }
      const filename = `${data.skillId}.json`;
      const relativeFolder = 'assets/remote/Res/Config/Skill';
      const folder = path.join(root, relativeFolder);
      await fs.promises.mkdir(folder, { recursive: true });
      // Never follow a redirected config directory outside this project path.
      if ((await fs.promises.realpath(folder)).toLowerCase() !== folder.toLowerCase()) return replyJSON(res, 403, { error: '技能配置目录不能是外部符号链接' });
      const target = path.join(folder, filename), temporary = target + '.' + require('node:crypto').randomUUID() + '.tmp';
      try {
        await fs.promises.writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
        await fs.promises.rename(temporary, target);
      } finally { await fs.promises.unlink(temporary).catch(() => {}); }
      return replyJSON(res, 200, { filename, relativePath: relativeFolder + '/' + filename });
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    if (url.pathname === '/api/resources') {
      if (!manifest || url.searchParams.has('refresh')) manifest = await buildManifest(root);
      res.writeHead(200, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(manifest));
    }
    let requested = decodeURIComponent(url.pathname).replace(/\\/g, '/');
    if (requested === '/') requested = '/SkillEditor/index.html';
    const relative = requested.replace(/^\/+/, '');
    const allowed = relative.startsWith('assets/remote/Res/') || relative.startsWith('AtlasSource/Battle/') || /^SkillEditor\/(index\.html|guide\.html|app\.mjs|core\.mjs|sprites\.mjs|style\.css)$/.test(relative);
    const file = path.resolve(root, relative);
    if (!allowed || !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    const real = await fs.promises.realpath(file);
    if (!real.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error.code === 'ENOENT' ? '资源不存在' : '读取失败：' + error.message);
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请先关闭旧的技能编辑器服务，再重新启动。` : error.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => console.log(`Skill Editor: http://127.0.0.1:${port}`));
process.stdin.on('data', chunk => { if (chunk.toString().trim() === 'exit') server.close(() => process.exit(0)); });

