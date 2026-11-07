const fs = require('node:fs/promises');
const path = require('node:path');
const JSZip = require('jszip');

function decode(value = '') {
  return value.replace(/&#x([\da-f]+);|&#(\d+);|&(lt|gt|amp|quot|apos);/gi, (_, hex, num, named) => hex || num ? String.fromCodePoint(parseInt(hex || num, hex ? 16 : 10)) : ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[named]));
}
function xml(source) {
  const root = { name: 'root', children: [], text: '', attrs: {} }, stack = [root];
  for (const token of source.match(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![^>]*>|<[^>]+>|[^<]+/g) || []) {
    if (/^<\?|^<!/.test(token)) continue;
    if (/^<\//.test(token)) { if (stack.length > 1) stack.pop(); continue; }
    if (token.startsWith('<')) {
      const name = token.match(/^<([^\s/>]+)/)?.[1]?.split(':').pop();
      const attrs = Object.fromEntries([...token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1], decode(m[2] ?? m[3])]));
      const node = { name, attrs, text: '', children: [] };
      stack.at(-1).children.push(node);
      if (!/\/\s*>$/.test(token)) stack.push(node);
    } else stack.at(-1).text += decode(token);
  }
  return root;
}
function descendants(node, name) { return node.children.flatMap(c => [...(c.name === name ? [c] : []), ...descendants(c, name)]); }
function allText(node) { return node.text + node.children.map(allText).join(''); }
function plist(source) {
  function convert(node) {
    if (node.name === 'dict') {
      const result = Object.create(null);
      for (let i = 0; i < node.children.length; i += 2) result[node.children[i].text] = convert(node.children[i + 1]);
      return result;
    }
    if (node.name === 'array') return node.children.map(convert);
    if (node.name === 'true' || node.name === 'false') return node.name === 'true';
    if (node.name === 'integer' || node.name === 'real') return Number(node.text);
    return node.text;
  }
  return convert(descendants(xml(source), 'plist')[0].children[0]);
}
const numbers = value => Array.isArray(value) ? value : String(value ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
function normalizeFrame(name, raw) {
  const rect = numbers(raw.textureRect || raw.frame);
  const size = numbers(raw.spriteSize || raw.sourceColorRect).slice(-2);
  const source = numbers(raw.spriteSourceSize || raw.sourceSize);
  const offset = numbers(raw.spriteOffset || raw.offset);
  const rotated = !!(raw.textureRotated || raw.rotated);
  const width = size[0] || rect[2], height = size[1] || rect[3];
  return { name, x: rect[0], y: rect[1], width, height, rotated, sourceWidth: source[0] || width, sourceHeight: source[1] || height, offsetX: offset[0] || 0, offsetY: offset[1] || 0 };
}
const webPath = p => '/' + p.split(path.sep).join('/');
async function scanAtlases(root, relative, warnings) {
  const result = [];
  async function visit(folder) {
    let entries;
    try { entries = await fs.readdir(path.join(root, folder), { withFileTypes: true }); }
    catch (e) { warnings.push(`${folder}：${e.message}`); return; }
    for (const entry of entries) {
      if (entry.isDirectory()) { await visit(path.join(folder, entry.name)); continue; }
      if (path.extname(entry.name).toLowerCase() !== '.plist') continue;
      try {
        const file = path.join(folder, entry.name);
        const data = plist(await fs.readFile(path.join(root, file), 'utf8'));
        const image = path.join(folder, data.metadata?.textureFileName || entry.name.replace(/\.plist$/i, '.png'));
        await fs.access(path.join(root, image));
        const frames = Object.entries(data.frames || {}).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([name, frame]) => normalizeFrame(name, frame));
        if (frames.length && frames.every(f => f.width > 0 && f.height > 0 && Number.isFinite(f.x) && Number.isFinite(f.y))) result.push({ id: path.relative(relative, file).replace(/\\/g, '/').replace(/\.plist$/i, ''), image: webPath(image), path: webPath(file), frames });
        else warnings.push(`${file}：没有可用的图集帧`);
      } catch (e) { warnings.push(`${entry.name}：${e.message}`); }
    }
    // A directory of individually exported PNG frames is also a sequence.
    const pngs = entries.filter(e => e.isFile() && /\.png$/i.test(e.name));
    if (!entries.some(e => /\.plist$/i.test(e.name)) && pngs.length) {
      pngs.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
      const frames = [];
      for (const p of pngs) {
        const file = path.join(folder, p.name), buffer = await fs.readFile(path.join(root, file));
        if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') continue;
        const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
        frames.push({ name: p.name, image: webPath(file), x: 0, y: 0, width, height, sourceWidth: width, sourceHeight: height, offsetX: 0, offsetY: 0, rotated: false });
      }
      if (frames.length) result.push({ id: path.relative(relative, folder).replace(/\\/g, '/') || path.basename(folder), image: frames[0].image, path: webPath(folder), frames });
    }
  }
  await visit(relative);
  return result.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}
async function readUnits(root) {
  const relative = 'sharedata/excel/D-单位表(UnitData).xlsx';
  const zip = await JSZip.loadAsync(await fs.readFile(path.join(root, relative)));
  const ssFile = zip.file('xl/sharedStrings.xml');
  const strings = ssFile ? descendants(xml(await ssFile.async('string')), 'si').map(allText) : [];
  const book = xml(await zip.file('xl/workbook.xml').async('string'));
  const sheet = descendants(book, 'sheet').find(s => /\(UnitData\)/i.test(s.attrs.name)) || descendants(book, 'sheet')[0];
  const rels = descendants(xml(await zip.file('xl/_rels/workbook.xml.rels').async('string')), 'Relationship');
  const target = rels.find(r => r.attrs.Id === sheet.attrs['r:id'])?.attrs.Target || 'worksheets/sheet1.xml';
  const sheetPath = target.startsWith('/') ? target.slice(1) : path.posix.normalize('xl/' + target);
  const rows = descendants(xml(await zip.file(sheetPath).async('string')), 'row').map(row => Object.fromEntries(row.children.filter(c => c.name === 'c').map(c => {
    let value = c.children.find(v => v.name === 'v')?.text || '';
    if (c.attrs.t === 's') value = strings[Number(value)] || '';
    if (c.attrs.t === 'inlineStr') value = allText(c.children.find(v => v.name === 'is') || { text: '', children: [] });
    return [c.attrs.r.replace(/\d/g, ''), value];
  })));
  const headerIndex = rows.findIndex(row => Object.values(row).includes('id') && Object.values(row).includes('ch_key'));
  if (headerIndex < 0) throw new Error('单位表缺少 id / ch_key 表头');
  const header = rows[headerIndex], units = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const raw = Object.fromEntries(Object.entries(header).map(([column, key]) => [key, row[column] ?? '']));
    if (!/^\d+$/.test(raw.id)) continue;
    const resource = raw.animation_name || '';
    units.push({ id: Number(raw.id), name: (raw.name || raw.ch_key || raw.id).replace(/^\$Lang\$/, ''), key: raw.ch_key, resourceId: resource ? String(resource).replace(/\\/g, '/').replace(/^.*UnitResAtlas\//, '').replace(/\.(plist|png)$/i, '') : String(raw.id), raw });
  }
  return { units, source: relative };
}
async function buildManifest(root) {
  const warnings = [];
  const [skills, unitAtlases, unitData] = await Promise.all([
    scanAtlases(root, 'assets/remote/Res/Battle/Skill', warnings),
    scanAtlases(root, 'assets/remote/Res/Battle/UnitResAtlas', warnings),
    readUnits(root).catch(error => { warnings.push('单位表读取失败：' + error.message); return { units: [], source: '' }; })
  ]);
  if (!skills.length) warnings.push('技能目录当前为空。放入 plist + png 图集，或包含独立 PNG 序列帧的子目录后，点击刷新资源。');
  for (const unit of unitData.units) unit.mapped = unitAtlases.some(atlas => atlas.id === unit.resourceId);
  const unmapped = unitData.units.filter(u => !u.mapped).length;
  if (unmapped) warnings.push(`${unmapped} 个单位未配置 animation_name 或对应图集不存在，请在放置单位时选择对应图集。映射会保存在技能 JSON 中。`);
  return { skills, unitAtlases, ...unitData, warnings, background: '/assets/remote/Res/SingleImage/Battle/ui_battle_bg.jpg', tile: '/AtlasSource/Battle/ui_battle_select_frame.png', generatedAt: new Date().toISOString() };
}
module.exports = { xml, plist, normalizeFrame, readUnits, buildManifest };

