import { TYPES, ACTIONS, DIRECTIONS, MOVE_TYPES, DAMAGE_PLAYBACK_MS, clone, id, clamp, isAction, skillIdError, createDocument, createTrack, atlasForUnit, trackUnit, actionFrames, framesForTrack, resolveStarts, damageShares, hexToWorld, resolvePosition, flightInfo, trackDuration, totalDuration, sampleScene, validateDocument, importDocument, exportDocument } from './core.mjs';
import { Sprites } from './sprites.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round = value => Math.round(value * 100) / 100;
const STORAGE_KEY = 'rpgcore.skill-studio.v1';
const LABEL_WIDTH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--track-label'));
let doc = createDocument();
let manifest = { units: [], skills: [], unitAtlases: [], warnings: [], background: '', tile: '' };
let selection = null, inspectorTab = 'selection', assetTab = 'skills', chosenAsset = null, selectedEffectId = '';
let time = 0, playing = false, loop = false, playbackSpeed = 1, zoom = .22, snap = true, grid = true, coords = false;
let undo = [], redo = [], sceneScale = 1, pan = { x: 0, y: 0 }, transform = { x: 0, y: 0, scale: 1 };
let sceneDirty = true, thumbnailsDirty = true, toastTimer, timelineDrag = null, placementCell = null, placementUnit = null;
let lastPreviewFrame = -1, lastTick = performance.now(), timelineWidth = 0;
const scene = $('#scene'), ctx = scene.getContext('2d');
const sprites = new Sprites(() => { sceneDirty = true; thumbnailsDirty = true; });
let sceneHits = [];
const unitConfig = unitId => manifest.units.find(u => u.id === Number(unitId));
const unitName = unit => unitConfig(unit.unitId)?.name || `单位 ${unit.unitId}`;
const selectedTrack = () => selection?.kind === 'track' ? doc.tracks.find(t => t.id === selection.id) : null;
const selectedUnit = () => selection?.kind === 'unit' ? doc.scene.units.find(u => u.id === selection.id) : null;
const bindingPointLabel = binding => binding?.anchor === 'end' ? '飞行结束' : `第 ${binding.frame} 帧`;

function toast(message, error = false) {
  $('#toast').textContent = message; $('#toast').classList.toggle('error', error); $('#toast').hidden = false;
  $('#status-message').textContent = message;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 6500 : 3500);
}
function info(title, html) { $('#info-title').textContent = title; $('#info-body').innerHTML = html; $('#info-dialog').showModal(); }
function saveDraft() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(doc)); $('#save-state').title = '本地草稿已自动保存'; $('#save-state').style.background = '#70ad91'; }
  catch { $('#save-state').title = '浏览器无法保存草稿，请导出 JSON'; $('#save-state').style.background = '#dcad75'; }
}
function record(before, message, keepInspector = false) {
  if (before === JSON.stringify(doc)) { if (!keepInspector) renderAll(); return; }
  undo.push(before); if (undo.length > 80) undo.shift(); redo = [];
  saveDraft(); renderAll({ keepInspector }); if (message) $('#status-message').textContent = message;
}
function mutate(callback, message, keepInspector = false) {
  const before = JSON.stringify(doc);
  try { callback(); doc = importDocument(doc); resolveStarts(doc, manifest); record(before, message, keepInspector); }
  catch (error) { doc = JSON.parse(before); renderAll(); toast(error.message, true); }
}
function pause() { playing = false; $('#play-button').textContent = '▶'; $('#scene-state').textContent = 'EDIT MODE'; }
function select(value) {
  selection = value;
  const track = selectedTrack();
  if (track?.type === 'effect') selectedEffectId = track.id;
  inspectorTab = 'selection';
  const unit = selectedUnit();
  $('#scene-selection').hidden = !unit && !track;
  $('#scene-selection').textContent = unit ? `${unitName(unit)} · ${unit.role === 'caster' ? '攻击者' : '受击者'}` : track ? TYPES[track.type].name + ' · ' + track.name : '';
  renderInspector(); renderTimelineSelection(); sceneDirty = true;
}
function renderAll({ keepInspector = false } = {}) {
  $('#skill-name').value = doc.name;
  $('#scene-empty').hidden = doc.scene.units.length > 0 || doc.tracks.length > 0;
  const unit = selectedUnit(), track = selectedTrack();
  $('#scene-selection').hidden = !unit && !track;
  $('#scene-selection').textContent = unit ? `${unitName(unit)} · ${unit.role === 'caster' ? '攻击者' : '受击者'}` : track ? TYPES[track.type].name + ' · ' + track.name : '';
  if (!keepInspector) renderInspector();
  renderTimeline(); renderAssets(); renderValidation(); updateTime();
  $('#undo-button').disabled = !undo.length; $('#redo-button').disabled = !redo.length;
  sceneDirty = true;
}
function undoChange(forward = false) {
  const from = forward ? redo : undo, to = forward ? undo : redo;
  if (!from.length) return;
  pause(); to.push(JSON.stringify(doc)); doc = JSON.parse(from.pop()); selection = null; saveDraft(); renderAll();
  toast(forward ? '已重做' : '已撤销');
}
function updateTime() {
  const duration = totalDuration(doc, manifest);
  time = clamp(time, 0, duration);
  $('#time-label').innerHTML = `${String(Math.round(time)).padStart(4, '0')} <small>ms</small>`;
  $('#duration-label').textContent = Math.round(duration) + ' ms';
  $('#duration-label').title = `${doc.settings.durationMode === 'manual' ? '手动最小时长' : '自动跟随最后节点'} · 点击修改流程时长`;
  $('#play-button').disabled = duration <= 0;
  if (duration <= 0 && playing) pause();
  const durationValue = $('#skill-duration-value');
  if (durationValue) durationValue.textContent = round(duration) + ' ms';
  $('#playhead').style.left = LABEL_WIDTH() + time * zoom + 'px';
  $('#timeline-end').hidden = duration <= 0;
  $('#timeline-end').style.left = LABEL_WIDTH() + duration * zoom + 'px';
  $('#timeline-end-label').textContent = `结束 ${round(duration)} ms`;
  sceneDirty = true;
}
function setTime(value) { time = value; updateTime(); }
function togglePlay() {
  if (playing) return pause();
  const duration = totalDuration(doc, manifest);
  if (duration <= 0) { pause(); return toast('当前没有可播放的时长，请添加节点或设置手动时长'); }
  if (time >= duration) time = 0;
  playing = true; lastTick = performance.now(); $('#play-button').textContent = 'Ⅱ'; $('#scene-state').textContent = 'PLAYING';
}
async function loadResources(refresh = false) {
  $('#connection-status').textContent = '扫描本地资源…'; $('#refresh-button').disabled = true;
  try {
    const response = await fetch('/api/resources' + (refresh ? '?refresh=1' : ''));
    if (!response.ok) throw new Error(await response.text());
    manifest = await response.json(); sprites.clear();
    $('#skill-count').textContent = manifest.skills.length; $('#atlas-count').textContent = manifest.unitAtlases.length;
    $('#connection-status').textContent = `${manifest.units.length} 单位 · ${manifest.skills.length} 特效 · 本地已连接`;
    if (chosenAsset) chosenAsset = (assetTab === 'skills' ? manifest.skills : manifest.unitAtlases).find(a => a.id === chosenAsset.id) || null;
    renderAll(); if (refresh) toast('资源和单位表已重新读取');
  } catch (error) { $('#connection-status').textContent = '资源连接失败'; toast('请通过 SkillEditor/start.bat 启动本地服务。' + error.message, true); }
  finally { $('#refresh-button').disabled = false; }
}

function filteredAssets() {
  const query = $('#asset-search').value.toLowerCase();
  return (assetTab === 'skills' ? manifest.skills : manifest.unitAtlases).filter(a => a.id.toLowerCase().includes(query));
}
function renderAssets() {
  $$('.asset-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === assetTab));
  $('#resource-path').textContent = assetTab === 'skills' ? 'Res / Battle / Skill' : 'Res / Battle / UnitResAtlas';
  $('#resource-path').title = assetTab === 'skills' ? 'assets/remote/Res/Battle/Skill' : 'assets/remote/Res/Battle/UnitResAtlas';
  const items = filteredAssets(), list = $('#asset-list'), rowHeight = 64;
  $('#asset-spacer').style.height = items.length * rowHeight + 'px';
  const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - 2), end = Math.min(items.length, start + Math.ceil(list.clientHeight / rowHeight) + 5);
  $('#asset-window').style.transform = `translateY(${start * rowHeight}px)`;
  $('#asset-window').innerHTML = items.slice(start, end).map(a => `<div class="asset-item ${chosenAsset?.id === a.id ? 'selected' : ''}" data-asset="${esc(a.id)}" tabindex="0" role="button" aria-label="选择${esc(a.id)}"><canvas width="124" height="98" data-asset-thumb="${esc(a.id)}"></canvas><div class="asset-meta"><strong>${esc(a.id)}</strong><small>${a.frames.length} FRAMES · ${assetTab === 'skills' ? doc.settings.effectFps : doc.settings.defaultFps} FPS</small></div><span class="asset-add" title="${assetTab === 'skills' ? '双击添加特效轨道' : '双击查看图集'}">${assetTab === 'skills' ? '+' : '↗'}</span></div>`).join('');
  $('#asset-empty').hidden = !!items.length;
  $('#asset-empty').innerHTML = $('#asset-search').value ? '<span class="empty-symbol">⌕</span><strong>没有匹配的资源</strong>试试其他 ID' : assetTab === 'skills' ? '<span class="empty-symbol">✧</span><strong>等待技能特效资源</strong>将 plist + png 图集放入<br><code>assets/remote/Res/Battle/Skill</code><br>也支持子目录中的独立 PNG 序列<br>完成后点击右上角 ↻ 刷新' : '<span class="empty-symbol">▧</span><strong>没有找到角色图集</strong>检查角色资源目录后刷新';
  $('#use-resource').disabled = !chosenAsset || assetTab !== 'skills';
  $('#use-resource').textContent = assetTab === 'skills' ? '＋ 加入特效轨道' : '角色图集 · 点击地图放置单位';
  $('#preview-name').textContent = chosenAsset?.id || '选择一个动画资源';
  $('#preview-frames').textContent = chosenAsset ? chosenAsset.frames.length + ' 帧' : '—';
  lastPreviewFrame = -1; thumbnailsDirty = true;
}
function paintThumbnails() {
  $$('[data-asset-thumb]').forEach(canvas => { const atlas = (assetTab === 'skills' ? manifest.skills : manifest.unitAtlases).find(a => a.id === canvas.dataset.assetThumb); if (atlas) sprites.thumbnail(canvas, atlas, atlas.frames[0]); });
  $$('[data-track-thumb]').forEach(canvas => {
    const track = doc.tracks.find(t => t.id === canvas.dataset.trackThumb); if (!track) return;
    const unit = trackUnit(doc, track), atlas = isAction(track) ? atlasForUnit(doc, manifest, track.params.unitId || unit?.unitId) : manifest.skills.find(a => a.id === track.params.effectId);
    const frames = framesForTrack(doc, manifest, track);
    sprites.thumbnail(canvas, atlas, frames[Number(canvas.dataset.frame)]);
  });
}

function field(label, value, path, type = 'number', scope = 'track', options = '') {
  return `<label class="field">${esc(label)}<input type="${type}" value="${esc(value)}" data-scope="${scope}" data-path="${esc(path)}" ${options}></label>`;
}
function selectField(label, value, path, choices, scope = 'track', special = '') {
  return `<label class="field">${esc(label)}<select ${special ? `data-special="${special}"` : `data-scope="${scope}" data-path="${esc(path)}"`}>${choices.map(([key, name]) => `<option value="${esc(key)}" ${String(value ?? '') === String(key) ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`;
}
function checkbox(label, value, path, scope = 'track', special = '') {
  return `<label class="check-field"><input type="checkbox" ${value ? 'checked' : ''} ${special ? `data-special="${special}"` : `data-scope="${scope}" data-path="${esc(path)}"`}>${esc(label)}</label>`;
}
function section(title, body) { return `<section class="property-section"><h3>${esc(title)}</h3>${body}</section>`; }
function positionFields(value, path, title, offset = null, offsetPath = '') {
  const offsetFields = offsetPath ? `<div class="field-row">${field('位置偏移 X / px', offset?.x ?? 0, offsetPath + '.x', 'number', 'track', 'min="-10000" max="10000"')}${field('位置偏移 Y / px（向上为正）', offset?.y ?? 0, offsetPath + '.y', 'number', 'track', 'min="-10000" max="10000"')}</div><p class="field-note">偏移叠加在所选位置上，X 向右、Y 向上；默认 0，不添加偏移。</p>` : '';
  return section(title, selectField('位置', value.mode, path + '.mode', [['caster', '施法者身上'], ['target', '被攻击者'], ['custom', '自定义坐标']]) + (value.mode === 'custom' ? selectField('相对坐标系', value.relativeTo, path + '.relativeTo', [['caster', '以施法者为中心'], ['target', '以被攻击者为中心'], ['global', '全局地图坐标（地图中心为原点）']]) + `<div class="field-row">${field('X / px', value.x, path + '.x', 'number', 'track', 'min="-10000" max="10000"')}${field('Y / px（向上为正）', value.y, path + '.y', 'number', 'track', 'min="-10000" max="10000"')}</div>` : '') + offsetFields);
}
function mappingField(unitId) {
  const atlas = atlasForUnit(doc, manifest, unitId);
  return selectField('动画图集映射', atlas?.id || '', '', [['', '请选择对应图集…'], ...manifest.unitAtlases.map(a => [a.id, `${a.id} · ${a.frames.length} 帧`])], 'track', 'mapping') + `<p class="field-note ${atlas ? '' : 'warning'}">单位 ${esc(unitId)} ${atlas ? '→ 图集 ' + esc(atlas.id) : '没有对应资源。请选择正确图集。'}；映射随 JSON 保存。</p>`;
}
function unitChoices(emptyLabel = '按角色类型自动选择') { return [['', emptyLabel], ...doc.scene.units.map(u => [u.id, `${unitName(u)} (${u.unitId}) · [${u.q},${u.r}]`])]; }
function renderInspector() {
  $$('.inspector-tabs button').forEach(b => b.classList.toggle('active', b.dataset.inspector === inspectorTab));
  let html = '';
  const track = selectedTrack(), unit = selectedUnit();
  if (inspectorTab === 'skill') {
    html = `<div class="inspector-title"><span class="track-symbol" style="--node-color:#70dfbb">ϟ</span><div><strong>技能设置</strong><small>SKILL PRESENTATION</small></div></div>`;
    html += field('技能 ID', doc.skillId, 'skillId', 'text', 'doc', 'maxlength="100" required') + field('技能名称', doc.name, 'name', 'text', 'doc', 'maxlength="100"');
    html += section('流程时长', selectField('时长模式', doc.settings.durationMode || 'auto', 'settings.durationMode', [['auto', '自动 · 最后节点播放结束'], ['manual', '手动 · 指定最小时长']], 'doc') + (doc.settings.durationMode === 'manual' ? field('最小时长 / ms', doc.durationMs, 'durationMs', 'number', 'doc', 'min="100" max="120000" step="100"') + '<p class="field-note">可延长技能流程；若有节点结束更晚，则自动延长到该节点结束，保证完整播放。</p>' : '<p class="field-note">以所有启用节点中最晚的播放结束时间为流程终点，随节点时间、帧率和速度自动调整。循环动画按一轮时长计算。</p>') + `<div class="value-chip"><span>当前流程总时长</span><strong id="skill-duration-value">${round(totalDuration(doc, manifest))} ms</strong></div>`);
    html += section('播放默认值', `<div class="field-row">${field('角色默认 FPS', doc.settings.defaultFps, 'settings.defaultFps', 'number', 'doc', 'min="1" max="120"')}${field('特效默认 FPS', doc.settings.effectFps, 'settings.effectFps', 'number', 'doc', 'min="1" max="120"')}</div><p class="field-note">用于新建轨道；已有轨道保留各自帧率。</p>` + field('预览总伤害', doc.settings.previewDamage, 'settings.previewDamage', 'number', 'doc', 'min="0" max="1000000000"') + selectField('受击者翻转', doc.settings.targetFlip, 'settings.targetFlip', [['x', '左右镜像（角色正立）'], ['y', '上下翻转'], ['none', '不翻转']], 'doc'));
    html += section('地图与位移', selectField('遇到占用格', doc.settings.collision, 'settings.collision', [['stop', '停在前一个可用格'], ['ignore', '忽略占用（边界仍会阻挡）']], 'doc') + '<p class="field-note">7 × 7 · 98 × 86 px · 奇数行右移半格<br>格子左下角为 (0,0)，q 向右、r 向上。<br>世界坐标 X 向右、Y 向上；全局原点为地图中心。<br>强制移动期间，单位立即预占终点格。</p>');
    html += section('资源状态', manifest.warnings.map(w => `<p class="field-note warning">${esc(w)}</p>`).join('') || '<p class="field-note">本地资源读取正常。</p>');
  } else if (unit) {
    html = `<div class="inspector-title"><span class="track-symbol" style="--node-color:${unit.role === 'caster' ? '#70b8ff' : '#b59aff'}">♙</span><div><strong>${esc(unitName(unit))}</strong><small>UNIT ${unit.unitId} · [${unit.q}, ${unit.r}]</small></div></div>`;
    html += selectField('单位 ID', unit.unitId, 'unitId', manifest.units.map(u => [u.id, `${u.id} · ${u.name}`]), 'unit');
    html += selectField('角色类型', unit.role, 'role', [['caster', '攻击者 / 施法者'], ['target', '受击者']], 'unit');
    html += mappingField(unit.unitId);
    html += `<div class="field-row">${field('格子 q', unit.q, 'q', 'number', 'unit', 'min="0" max="6" step="1"')}${field('格子 r', unit.r, 'r', 'number', 'unit', 'min="0" max="6" step="1"')}</div>`;
    html += field('预览缩放', unit.scale, 'scale', 'number', 'unit', 'min="0.1" max="5" step="0.1"');
    html += section('添加角色行为', `<button class="full" data-add-action="${unit.role}">＋ ${unit.role === 'caster' ? '施法者行为' : '受击者行为'}</button>`);
    const raw = unitConfig(unit.unitId)?.raw;
    if (raw) html += section('单位表信息', `<p class="field-note">检索名：${esc(raw.ch_key)}<br>单位类型：${esc(raw.unit_type)}<br>阵营：${esc(raw.faction_id)}<br>攻击时长配置：${esc(raw.attack_during || '—')} s</p>`);
    html += `<div class="inspector-actions"><button class="danger" data-delete="unit">移除单位</button></div>`;
  } else if (track) {
    const starts = resolveStarts(doc, manifest), p = track.params;
    html = `<div class="inspector-title"><span class="track-symbol" style="--node-color:${TYPES[track.type].color}">${TYPES[track.type].icon}</span><div><strong>${TYPES[track.type].name}</strong><small>${esc(track.id)}</small></div></div>`;
    html += field('轨道名称', track.name, 'name', 'text', 'track', 'maxlength="100"') + checkbox('启用此轨道', track.enabled, 'enabled');
    html += section('触发时间', field('开始时间 / ms', round(starts.get(track.id)), 'startMs', 'number', 'track', `min="0" max="120000" step="1" ${track.binding ? 'disabled' : ''}`) + selectField('关联时间节点', track.binding?.trackId || '', '', [['', '绝对毫秒时间'], ...doc.tracks.filter(t => (isAction(t) || t.type === 'flight') && t.id !== track.id).map(t => [t.id, `${t.name} · ${t.type === 'flight' ? '飞行结束' : '动作帧'}`])], 'track', 'binding-source') + (track.binding ? (track.binding.anchor === 'end' ? field('额外偏移 / ms', track.binding.offsetMs, 'binding.offsetMs', 'number', 'track', 'step="1"') + '<p class="field-note">在关联飞行结束时触发。修改飞行速度、起终点或开始时间后自动重算，关联随 JSON 保存。</p>' : `<div class="field-row">${field('动作第几帧（从 1 起）', track.binding.frame, 'binding.frame', 'number', 'track', 'min="1" step="1"')}${field('额外偏移 / ms', track.binding.offsetMs, 'binding.offsetMs', 'number', 'track', 'step="1"')}</div><p class="field-note">关联记录随 JSON 保存。修改源动作 FPS 后，触发时间会自动更新。</p>`) : ''));
    if (isAction(track)) {
      const sourceUnit = trackUnit(doc, track), unitId = p.unitId || sourceUnit?.unitId;
      html += section('角色帧动画', selectField('场景单位', p.unitInstanceId, 'params.unitInstanceId', unitChoices()) + selectField('播放动作', p.action, 'params.action', Object.entries(ACTIONS)) + selectField('单位帧动画 / ID', p.unitId || '', 'params.unitId', [['', '使用场景单位的动画'], ...manifest.units.map(u => [u.id, `${u.id} · ${u.name}`])]) + (unitId ? mappingField(unitId) : '<p class="field-note warning">先在地图上放置对应角色。</p>') + field('动画帧率 / FPS', p.fps, 'params.fps', 'number', 'track', 'min="1" max="120" step="1"') + checkbox('循环播放动作', p.loop, 'params.loop') + `<div class="value-chip"><span>${framesForTrack(doc, manifest, track).length} 帧</span><strong>${round(trackDuration(doc, manifest, track))} ms</strong></div>`);
    }
    if (track.type === 'effect') {
      const durationField = p.loop ? '' : field('持续时间 / ms', p.durationMs ?? '', 'params.durationMs', 'number', 'track', `min="1" max="120000" step="1" placeholder="自动 · ${round(Math.max(1, framesForTrack(doc, manifest, track).length) * 1000 / (p.fps * p.speed))} ms"`) + '<p class="field-note">留空按一轮动画时长播放；填写 1–120000 ms 后，到时隐藏特效。动画提前播完则保持最后一帧，持续时间不受帧率或速度倍率影响。</p>';
      html += section('特效动画', field('技能特效 ID', p.effectId, 'params.effectId', 'text', 'track', 'list="effect-ids" maxlength="200"') + `<datalist id="effect-ids">${manifest.skills.map(s => `<option value="${esc(s.id)}"></option>`).join('')}</datalist><div class="field-row">${field('速度倍率', p.speed, 'params.speed', 'number', 'track', 'min="0.05" max="20" step="0.1"')}${field('源帧率 / FPS', p.fps, 'params.fps', 'number', 'track', 'min="1" max="120"')}</div>` + checkbox('循环播放特效', p.loop, 'params.loop') + durationField + checkbox('是否多目标', p.multiTarget, 'params.multiTarget') + '<p class="field-note">开启表示每个敌人一个特效；关闭表示只播放一个特效。</p>' + selectField('显示层级', p.layer, 'params.layer', [['top', '最上层'], ['auto', '合适图层（按 Y 排序）'], ['bottom', '最下层']]) + '<p class="field-note">合适图层：Cocos Y 越小越靠前；同 Y 时攻击方优先于受击方。</p>');
      html += positionFields(p.position, 'params.position', '特效位置');
      html += section('偏移与缩放', `<div class="field-row">${field('偏移 X / px', p.offset.x, 'params.offset.x', 'number', 'track', 'min="-10000" max="10000"')}${field('偏移 Y / px', p.offset.y, 'params.offset.y', 'number', 'track', 'min="-10000" max="10000"')}</div>` + field('特效缩放', p.scale, 'params.scale', 'number', 'track', 'min="0.1" max="10" step="0.1"'));
      html += '<button class="full" data-create-flight="true">➚ 为选中特效添加飞行</button>';
    }
    if (track.type === 'flight') {
      html += section('飞行参数', selectField('关联特效实例', p.effectTrackId, 'params.effectTrackId', doc.tracks.filter(t => t.type === 'effect').map(t => [t.id, t.name + ' · ' + t.params.effectId])) + field('飞行速度 / px·s⁻¹', p.speed, 'params.speed', 'number', 'track', 'min="1" max="10000"') + checkbox('是否与目标点朝向一致', p.alignToTarget, 'params.alignToTarget') + checkbox('到达终点后隐藏特效', p.hideOnArrival, 'params.hideOnArrival') + `<div class="value-chip"><span>按起终点距离计算</span><strong>${round(trackDuration(doc, manifest, track))} ms</strong></div><p class="field-note">飞行开始时记录起终点。开启朝向一致后，特效朝向起点到终点的方向，以素材朝右为 0°。未指定特效持续时间时，飞行期间保持最后一帧；指定后以特效持续时间为限。勾选特效循环可持续播放，到达后隐藏仍按本节点设置。</p>`);
      html += positionFields(p.start, 'params.start', '起始点', p.startOffset, 'params.startOffset') + positionFields(p.end, 'params.end', '结束点', p.endOffset, 'params.endOffset');
    }
    if (track.type === 'damage') {
      html += section('伤害分配', checkbox('自动分摊剩余伤害', p.share == null, '', 'track', 'auto-share') + (p.share != null ? field('总伤害百分比 / %', p.share, 'params.share', 'number', 'track', 'min="0" max="100" step="0.1"') : '') + `<div class="value-chip"><span>当前节点占比</span><strong>${round(damageShares(doc).get(track.id) || 0)}%</strong></div>` + selectField('受伤单位', p.unitInstanceId, 'params.unitInstanceId', unitChoices('自动选择受击者')) + `<p class="field-note">自动节点平均分摊手动节点之外的剩余伤害；全部自动时，每个节点占 100% / 节点数。伤害在节点开始时结算一次，数字表现持续 ${DAMAGE_PLAYBACK_MS} ms，播放结束时间计入流程总时长。</p>`);
    }
    if (track.type === 'move') {
      const moveType = p.moveType ?? 3, targetCell = p.targetCell ?? { q: 0, r: 0 };
      let movementFields = selectField('移动类型', moveType, 'params.moveType', MOVE_TYPES);
      if (moveType === 4) {
        movementFields += `<div class="field-row">${field('目标格子 q', targetCell.q, 'params.targetCell.q', 'number', 'track', 'min="0" max="6" step="1"')}${field('目标格子 r', targetCell.r, 'params.targetCell.r', 'number', 'track', 'min="0" max="6" step="1"')}</div><p class="field-note">直接向指定的目标格子移动，不使用移动格数和固定方向。</p>`;
      } else {
        if (moveType === 3) movementFields += selectField('六边形方向', p.direction, 'params.direction', DIRECTIONS.map((name, i) => [i, name]));
        movementFields += field('移动格数', p.steps, 'params.steps', 'number', 'track', 'min="1" max="12" step="1"');
        if (moveType === 1) movementFields += '<p class="field-note">在触发时按移动单位的水平朝向反向移动。</p>';
        if (moveType === 2) movementFields += '<p class="field-note">以施法者指向移动单位的向量，选择最近的六边形方向。缺少施法者或两者位置重合时不移动。</p>';
      }
      html += section('强制移动', selectField('移动单位', p.unitInstanceId, 'params.unitInstanceId', unitChoices('使用指定格子里的单位')) + (!p.unitInstanceId ? `<div class="field-row">${field('选中格子 q', p.cell.q, 'params.cell.q', 'number', 'track', 'min="0" max="6" step="1"')}${field('选中格子 r', p.cell.r, 'params.cell.r', 'number', 'track', 'min="0" max="6" step="1"')}</div>` : '') + movementFields + field('位移耗时 / ms', p.durationMs, 'params.durationMs', 'number', 'track', 'min="0" max="30000"') + '<p class="field-note">0 ms 表示直接到终点。格子以左下角为 (0,0)，q 向右、r 向上；选中格子只用于预览选取单位，与全局移动的目标格子独立。</p>');
      html += section('受阻回弹', `<div class="field-row">${field('回弹距离 / px', p.bounceDistance ?? 20, 'params.bounceDistance', 'number', 'track', 'min="0" max="10000" step="1"')}${field('往返耗时 / ms', p.bounceDurationMs ?? 200, 'params.bounceDurationMs', 'number', 'track', 'min="0" max="30000" step="1"')}</div><p class="field-note">游戏中路径被占格、不可移动格或地图边界阻挡时，回弹到原格。回弹开始位置自动限制在当前格内，距离或耗时设为 0 可关闭回弹动画。回弹参数用于游戏内表现，编辑器预览沿用全局碰撞规则。</p>`);
    }
    html += `<div class="inspector-actions"><button data-duplicate="true">⧉ 复制轨道</button><button class="danger" data-delete="track">删除轨道</button></div>`;
  } else {
    html = `<div class="inspector-placeholder"><span class="big">⌘</span><strong>选择场景对象或时间轴节点</strong><span>在这里编辑单位、动画和节点参数<br>点击技能设置查看全局配置</span><div class="legend">${Object.values(TYPES).map(type => `<span><b style="color:${type.color};font-weight:400">${type.icon}</b>${type.name}</span>`).join('')}</div></div>`;
  }
  $('#inspector').innerHTML = html;
}
function renderValidation() {
  const issues = validateDocument(doc, manifest);
  $('#validation').classList.toggle('warning', !!issues.length);
  $('#validation').innerHTML = issues.length ? `<button id="validation-details">△ ${issues.length} 项配置提示 · 查看全部</button>${issues.slice(0, 2).map(i => `<p class="issue">${esc(i)}</p>`).join('')}` : `<span>✓ ${doc.tracks.length ? '配置检查通过' : '准备好创建技能'}</span>`;
}

function renderTimeline() {
  const starts = resolveStarts(doc, manifest), duration = totalDuration(doc, manifest, starts);
  const scroll = $('#timeline-scroll');
  const editableEnd = Math.max(duration, ...doc.tracks.map(track => starts.get(track.id) + trackDuration(doc, manifest, track, starts)));
  timelineWidth = Math.max(scroll.clientWidth - LABEL_WIDTH() - 1, (editableEnd + 500) * zoom);
  $('#timeline-content').style.width = timelineWidth + LABEL_WIDTH() + 'px';
  const interval = zoom < .16 ? 500 : zoom < .4 ? 250 : 100;
  const ticks = [];
  for (let ms = 0; ms <= timelineWidth / zoom; ms += interval) {
    ticks.push(`<span class="ruler-tick" style="left:${ms * zoom}px">${ms}<small> ms</small></span>`);
    for (let j = 1; j < 5; j++) ticks.push(`<span class="ruler-tick minor" style="left:${(ms + interval * j / 5) * zoom}px"></span>`);
  }
  $('#timeline-ruler').innerHTML = `<div class="ruler-label">TRACK / MILLISECONDS</div><div class="ruler-ticks">${ticks.join('')}</div>`;
  $('#timeline-rows').innerHTML = doc.tracks.map((track, index) => {
    const def = TYPES[track.type], frames = framesForTrack(doc, manifest, track), start = starts.get(track.id), nodeDuration = trackDuration(doc, manifest, track, starts);
    const frameWidth = isAction(track) ? 1000 / track.params.fps * zoom : 0;
    const width = Math.max((isAction(track) && frames.length) || track.type === 'flight' || track.type === 'damage' ? 1 : 75, nodeDuration * zoom);
    let contents = '';
    if (isAction(track) && frames.length) contents = frames.map((f, i) => `<div class="frame-cell" style="width:${frameWidth}px" title="动作第${i + 1}帧 · ${round(start + i * 1000 / track.params.fps)}ms"><canvas width="80" height="62" data-track-thumb="${track.id}" data-frame="${i}"></canvas><span>${i + 1}</span></div>`).join('');
    else {
      const moveType = track.params.moveType ?? 3;
      const moveLabel = moveType === 4 ? `目标 [${track.params.targetCell?.q ?? 0},${track.params.targetCell?.r ?? 0}]`
        : `${moveType === 1 ? '反向朝向' : moveType === 2 ? '施法者 → 单位' : DIRECTIONS[track.params.direction]?.split(' ')[0]} ${track.params.steps} 格`;
      let subtitle = track.type === 'damage' ? `${round(damageShares(doc).get(track.id) || 0)}% 总伤害 · ${DAMAGE_PLAYBACK_MS} ms` : track.type === 'move' ? moveLabel : track.type === 'flight' ? `${track.params.speed} px/s` : track.type === 'effect' ? `${track.params.effectId || '未选资源'} · ${track.params.speed}×` : '缺少动作资源';
      contents = `<div class="node-title">${def.icon} ${esc(track.type === 'effect' ? track.params.effectId || '未选择特效' : def.name)}<small>${esc(subtitle)}</small></div>`;
    }
    const end = start + nodeDuration;
    const flightEnd = track.type === 'flight' ? `<div class="flight-end" data-flight-end="${track.id}" role="button" tabindex="0" aria-label="${esc(track.name)} 飞行结束，${round(end)}毫秒" title="飞行结束 ${round(end)} ms；拖动其他行为到此可关联" style="left:${end * zoom}px"><span>飞行结束<small>${round(end)} ms</small></span></div>` : '';
    return `<div class="timeline-row ${!track.enabled ? 'disabled' : ''}" data-row="${track.id}" style="--node-color:${def.color}"><div class="track-label" data-select-track="${track.id}"><span class="track-symbol">${def.icon}</span><div class="track-label-name"><strong>${esc(track.name)}</strong><small>${String(index + 1).padStart(2, '0')} / ${esc(isAction(track) ? ACTIONS[track.params.action] + ' · ' + track.params.fps + ' FPS' : def.name)}</small></div><button class="mute-track" data-mute="${track.id}" title="启用 / 禁用轨道">${track.enabled ? '◉' : '○'}</button></div><div class="track-lane" data-lane="${track.id}" style="background-size:${interval * zoom}px 100%"><div class="node-block ${track.type === 'flight' ? 'flight-node' : track.type === 'damage' ? 'damage-node' : ''}" data-node="${track.id}" tabindex="0" role="button" aria-label="${esc(track.name)}，${round(start)}毫秒" style="left:${start * zoom}px;width:${width}px"><span class="keyframe"></span>${contents}${track.binding ? `<span class="binding-tag">⌁ ${track.binding.anchor === 'end' ? '飞行结束' : 'F' + track.binding.frame}</span>` : ''}</div>${flightEnd}</div></div>`;
  }).join('');
  $('#timeline-empty').hidden = doc.tracks.length > 0;
  $('#track-count').textContent = `${doc.tracks.length} 条轨道`;
  renderTimelineSelection(); updateTime(); thumbnailsDirty = true;
}
function renderTimelineSelection() {
  $$('[data-row]').forEach(row => row.classList.toggle('selected', selection?.kind === 'track' && selection.id === row.dataset.row));
  $$('[data-node]').forEach(node => node.classList.toggle('selected', selection?.kind === 'track' && selection.id === node.dataset.node));
  const track = selectedTrack();
  $('#binding-status').textContent = track?.binding ? `已关联：${doc.tracks.find(t => t.id === track.binding.trackId)?.name} · ${bindingPointLabel(track.binding)}` : '拖动节点调整时间 · 拖到动作帧或飞行结束节点以关联';
}
function selectFlightEnd(trackId) {
  const track = doc.tracks.find(t => t.id === trackId && t.type === 'flight');
  if (!track) return;
  const starts = resolveStarts(doc, manifest);
  pause(); select({ kind: 'track', id: track.id });
  setTime(starts.get(track.id) + trackDuration(doc, manifest, track, starts));
}
function addTrack(type) {
  if (type === 'flight' && !doc.tracks.some(t => t.id === selectedEffectId && t.type === 'effect')) return toast('请先在场景或时间轴中选择一个技能特效实例', true);
  const track = createTrack(type, doc, type === 'flight' ? selectedEffectId : assetTab === 'skills' ? chosenAsset?.id || '' : '');
  track.startMs = Math.round(time);
  const unit = selectedUnit();
  if (isAction(track) && unit) track.params.unitInstanceId = unit.id;
  if (type === 'move') {
    if (unit) { track.params.unitInstanceId = unit.id; track.params.cell = { q: unit.q, r: unit.r }; }
    else if (placementCell) track.params.cell = clone(placementCell);
  }
  if (type === 'damage' && unit) track.params.unitInstanceId = unit.id;
  if (type === 'flight') track.startMs = Math.max(track.startMs, resolveStarts(doc, manifest).get(selectedEffectId));
  mutate(() => { doc.tracks.push(track); selection = { kind: 'track', id: track.id }; inspectorTab = 'selection'; if (type === 'effect') selectedEffectId = track.id; }, '已添加 ' + TYPES[type].name);
  $('#track-menu').hidden = true;
  const row = $$('[data-row]').find(r => r.dataset.row === track.id); if (row) row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function deleteSelection() {
  const track = selectedTrack(), unit = selectedUnit();
  if (track) {
    const starts = resolveStarts(doc, manifest), removing = new Set([track.id]);
    doc.tracks.filter(t => t.type === 'flight' && t.params.effectTrackId === track.id).forEach(t => removing.add(t.id));
    mutate(() => {
      for (const t of doc.tracks) if (t.binding && removing.has(t.binding.trackId)) { t.startMs = starts.get(t.id); t.binding = null; }
      doc.tracks = doc.tracks.filter(t => !removing.has(t.id)); selection = null;
    }, removing.size > 1 ? '已删除特效及关联飞行轨道（可撤销）' : '已删除轨道（可撤销）');
  } else if (unit) mutate(() => { doc.scene.units = doc.scene.units.filter(u => u.id !== unit.id); doc.tracks.forEach(t => { if (t.params.unitInstanceId === unit.id) t.params.unitInstanceId = ''; }); selection = null; }, '已移除单位（可撤销）');
}
function duplicateTrack() {
  const track = selectedTrack(); if (!track) return;
  mutate(() => { const copy = clone(track); copy.id = id('track'); copy.name += ' 副本'; doc.tracks.push(copy); selection = { kind: 'track', id: copy.id }; }, '已复制轨道');
}
function showTrackMenu(anchor) {
  const menu = $('#track-menu');
  menu.innerHTML = '<div class="menu-heading">选择功能节点 · 每条轨道一个节点</div>' + Object.entries(TYPES).map(([type, def]) => `<button data-add-type="${type}"><span class="track-symbol" style="--node-color:${def.color}">${def.icon}</span><span>${def.name}<small class="menu-description">${{ caster: '角色动作与逐帧时间轴', target: '受击、死亡及角色动作', effect: '序列帧动画、位置与图层', flight: '从选中特效创建飞行路径', damage: '总伤害占比与多段结算', move: '沿六边形方向移动指定格数' }[type]}</small></span></button>`).join('');
  menu.hidden = false;
  const rect = anchor.getBoundingClientRect(), height = menu.offsetHeight;
  menu.style.left = Math.min(innerWidth - menu.offsetWidth - 15, Math.max(10, rect.right - menu.offsetWidth)) + 'px';
  menu.style.top = Math.max(10, rect.top - height - 6) + 'px';
}
function timeFromPointer(event) {
  const rect = $('#timeline-scroll').getBoundingClientRect();
  return clamp((event.clientX - rect.left + $('#timeline-scroll').scrollLeft - LABEL_WIDTH()) / zoom, 0, Math.max(120000, totalDuration(doc, manifest)));
}
function refreshTimelinePositions(starts, snapSourceId = null) {
  $$('[data-node]').forEach(block => { block.style.left = starts.get(block.dataset.node) * zoom + 'px'; });
  $$('[data-flight-end]').forEach(marker => {
    const source = doc.tracks.find(t => t.id === marker.dataset.flightEnd), duration = trackDuration(doc, manifest, source, starts), end = starts.get(source.id) + duration;
    marker.style.left = end * zoom + 'px';
    marker.title = `飞行结束 ${round(end)} ms；拖动其他行为到此可关联`;
    marker.setAttribute('aria-label', `${source.name} 飞行结束，${round(end)}毫秒`);
    marker.querySelector('small').textContent = round(end) + ' ms';
    marker.classList.toggle('snap-target', snapSourceId === source.id);
    $(`[data-node="${CSS.escape(source.id)}"]`).style.width = Math.max(1, duration * zoom) + 'px';
  });
}
function startNodeDrag(event, node) {
  if (event.button !== 0) return;
  event.preventDefault(); event.stopPropagation(); pause();
  const track = doc.tracks.find(t => t.id === node.dataset.node); if (!track) return;
  select({ kind: 'track', id: track.id });
  const before = JSON.stringify(doc), initialStart = resolveStarts(doc, manifest).get(track.id), initialX = event.clientX, initialY = event.clientY;
  const pointerStart = timeFromPointer(event), offset = pointerStart - initialStart;
  node.setPointerCapture(event.pointerId);
  let moved = false;
  const move = e => {
    if (!moved && Math.hypot(e.clientX - initialX, e.clientY - initialY) < 4) return;
    const previous = { binding: track.binding, startMs: track.startMs, transform: node.style.transform, pointerEvents: node.style.pointerEvents, time, moved };
    try {
      moved = true; track.binding = null; track.startMs = Math.round(clamp(timeFromPointer(e) - offset, 0, 120000));
      node.style.pointerEvents = 'none';
      const underneath = document.elementFromPoint(e.clientX, e.clientY);
      const hovered = underneath?.closest('[data-row]');
      const hoveredEnd = underneath?.closest('[data-flight-end]')?.dataset.flightEnd;
      node.style.transform = `translateY(${e.clientY - initialY}px)`;
      const hoveredTrack = doc.tracks.find(t => t.id === hovered?.dataset.row);
      let best = null;
      if (snap && !e.altKey) {
        const starts = resolveStarts(doc, manifest);
        for (const source of doc.tracks.filter(t => (isAction(t) || t.type === 'flight') && t.id !== track.id && t.enabled)) {
          // A source that already depends on this node would create a cycle.
          let ancestor = source, cyclic = false;
          while (ancestor?.binding) { if (ancestor.binding.trackId === track.id) { cyclic = true; break; } ancestor = doc.tracks.find(t => t.id === ancestor.binding.trackId); }
          if (cyclic) continue;
          if (source.type === 'flight') {
            const at = starts.get(source.id) + trackDuration(doc, manifest, source, starts);
            const distance = Math.abs(at - track.startMs) * zoom;
            const onEnd = hoveredEnd === source.id || (hoveredTrack?.id === source.id && Math.abs(timeFromPointer(e) - at) * zoom < 12);
            const priority = onEnd ? 2 : 0;
            if ((distance < 9 || onEnd) && (!best || priority > best.priority || (priority === best.priority && distance < best.distance))) best = { source, anchor: 'end', at, distance, priority };
            continue;
          }
          const count = framesForTrack(doc, manifest, source).length; if (!count) continue;
          const frame = clamp(Math.round((track.startMs - starts.get(source.id)) * source.params.fps / 1000) + 1, 1, count);
          const at = starts.get(source.id) + (frame - 1) * 1000 / source.params.fps;
          const distance = Math.abs(at - track.startMs) * zoom;
          const inSource = hoveredTrack?.id === source.id && track.startMs >= starts.get(source.id) - 1000 / source.params.fps && track.startMs <= starts.get(source.id) + count * 1000 / source.params.fps;
          const priority = inSource ? 1 : 0;
          if ((distance < 9 || inSource) && (!best || priority > best.priority || (priority === best.priority && distance < best.distance))) best = { source, frame, at, distance, priority };
        }
      }
      let rejected = false;
      if (best) {
        const freeStart = track.startMs;
        track.binding = best.anchor === 'end' ? { trackId: best.source.id, anchor: 'end', offsetMs: 0 } : { trackId: best.source.id, frame: best.frame, offsetMs: 0 };
        track.startMs = Math.round(best.at);
        try { resolveStarts(doc, manifest); }
        catch { track.binding = null; track.startMs = freeStart; best = null; rejected = true; }
      }
      const starts = resolveStarts(doc, manifest);
      refreshTimelinePositions(starts, best?.anchor === 'end' ? best.source.id : null);
      $('#binding-status').textContent = best ? `⌁ 吸附到 ${best.source.name} · ${best.anchor === 'end' ? '飞行结束' : '第 ' + best.frame + ' 帧'} · ${round(best.at)} ms` : rejected ? '该关联会形成时间循环，已保留绝对时间' : `${track.startMs} ms · 按住 Alt 可跳过吸附`;
      time = starts.get(track.id); updateTime(); sceneDirty = true;
    } catch (error) {
      track.binding = previous.binding; track.startMs = previous.startMs; moved = previous.moved; time = previous.time;
      node.style.transform = previous.transform; node.style.pointerEvents = previous.pointerEvents;
      refreshTimelinePositions(resolveStarts(doc, manifest)); updateTime();
      $('#binding-status').textContent = '无法移动，已保留上次有效时间：' + error.message;
    }
  };
  const finish = () => {
    node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', finish); node.removeEventListener('pointercancel', cancel);
    node.style.pointerEvents = ''; node.style.transform = '';
    $$('[data-flight-end]').forEach(marker => marker.classList.remove('snap-target'));
    if (moved) record(before, track.binding ? `已关联${bindingPointLabel(track.binding)}` : `开始时间 ${track.startMs} ms`);
    else renderInspector();
  };
  const cancel = () => { doc = JSON.parse(before); finish(); renderAll(); };
  node.addEventListener('pointermove', move); node.addEventListener('pointerup', finish); node.addEventListener('pointercancel', cancel);
}

function resizeScene() {
  const rect = $('#viewport').getBoundingClientRect(), dpr = devicePixelRatio || 1;
  scene.width = Math.max(1, Math.round(rect.width * dpr)); scene.height = Math.max(1, Math.round(rect.height * dpr));
  sceneDirty = true;
}
function hexPolygon(context, x, y, width = 98, height = 86) {
  context.beginPath(); context.moveTo(x, y - height / 2); context.lineTo(x + width / 2, y - height / 4); context.lineTo(x + width / 2, y + height / 4); context.lineTo(x, y + height / 2); context.lineTo(x - width / 2, y + height / 4); context.lineTo(x - width / 2, y - height / 4); context.closePath();
}
function worldFromPointer(event) {
  const rect = scene.getBoundingClientRect();
  return { x: (event.clientX - rect.left - transform.x) / transform.scale, y: (event.clientY - rect.top - transform.y) / transform.scale };
}
function hitCell(world) {
  for (let r = 0; r < 7; r++) for (let q = 0; q < 7; q++) {
    const point = hexToWorld(q, r, doc.scene), dx = Math.abs(world.x - point.x), dy = Math.abs(world.y - point.y);
    if (dx <= 49 && dy <= 43 && dy <= 43 - dx * 43 / 98) return { q, r };
  }
  return null;
}
function drawLabel(text, x, y, color = '#e2efe7', size = 11) {
  ctx.save(); ctx.font = `${size}px "Segoe UI", "Microsoft YaHei", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = color;
  ctx.shadowColor = '#061914'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1; ctx.fillText(text, x, y); ctx.restore();
}
function drawHandle(point, label, color = '#9bdbb4') {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = '#122a24a6'; ctx.lineWidth = 1.5 / transform.scale;
  ctx.beginPath(); ctx.arc(point.x, point.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(point.x - 26, point.y); ctx.lineTo(point.x + 26, point.y); ctx.moveTo(point.x, point.y - 26); ctx.lineTo(point.x, point.y + 26); ctx.stroke(); ctx.restore();
  if (label) drawLabel(label, point.x, point.y + 40, color, 10);
}
function drawScene() {
  const w = scene.clientWidth, h = scene.clientHeight, dpr = devicePixelRatio || 1;
  if (!w || !h) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const background = sprites.image(manifest.background);
  if (background) { const scale = Math.max(w / background.width, h / background.height); ctx.drawImage(background, (w - background.width * scale) / 2, (h - background.height * scale) / 2, background.width * scale, background.height * scale); }
  else { ctx.fillStyle = '#253b34'; ctx.fillRect(0, 0, w, h); }
  ctx.fillStyle = '#14262222'; ctx.fillRect(0, 0, w, h);
  const scale = Math.max(.12, Math.min((w - 75) / 735, (h - 85) / 560)) * sceneScale;
  transform = { scale, x: w / 2 - 318.5 * scale + pan.x, y: h / 2 - 153.5 * scale + pan.y };
  $('#zoom-label').textContent = Math.round(scale * 100) + '%';
  ctx.translate(transform.x, transform.y); ctx.scale(scale, scale);
  const tile = sprites.image(manifest.tile), current = sampleScene(doc, manifest, time);
  sceneHits = [];
  for (let r = 0; r < 7; r++) for (let q = 0; q < 7; q++) {
    const point = hexToWorld(q, r, doc.scene), isSelected = selectedUnit()?.q === q && selectedUnit()?.r === r;
    if (grid) {
      if (tile) { ctx.save(); ctx.globalAlpha = isSelected ? .85 : .32; ctx.drawImage(tile, point.x - 49, point.y - 43, 98, 86); ctx.restore(); }
      else { hexPolygon(ctx, point.x, point.y); ctx.strokeStyle = '#a6c7a760'; ctx.lineWidth = .8; ctx.stroke(); }
      if (isSelected) { hexPolygon(ctx, point.x, point.y); ctx.fillStyle = '#65ce9430'; ctx.fill(); ctx.strokeStyle = '#d0e8a9'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    if (coords) drawLabel(`${q},${r}`, point.x, point.y + 4, '#e6efcdac', 10);
  }
  for (const unit of current.units) {
    ctx.save(); ctx.translate(unit.x, unit.y); ctx.scale(1, .48); ctx.beginPath(); ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2); ctx.fillStyle = '#0a1a164a'; ctx.fill(); ctx.strokeStyle = unit.role === 'caster' ? '#82c8f494' : '#e2a4b994'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  const drawables = [...current.units.map(u => ({ ...u, kind: 'unit', layer: 'auto' })), ...current.effects.map(e => ({ ...e, kind: 'effect' }))];
  const rank = { bottom: -1, auto: 0, top: 1 };
  drawables.sort((a, b) => rank[a.layer] - rank[b.layer] || a.y - b.y || (a.role === 'caster' ? 1 : 0) - (b.role === 'caster' ? 1 : 0) || (a.kind === 'effect' ? 1 : 0) - (b.kind === 'effect' ? 1 : 0));
  for (const object of drawables) {
    if (object.kind === 'unit') {
      const unitFlip = object.role === 'target' ? doc.settings.targetFlip : 'none';
      const drawn = sprites.draw(ctx, object.atlas, object.frame, object.x, object.y, { scale: object.scale, flip: unitFlip });
      if (!drawn && !object.atlas) { drawHandle(object, `缺少图集 · ${object.unitId}`, '#e5b57c'); }
      drawLabel(unitName(object), object.x, object.y + 25, object.role === 'caster' ? '#c5e7ef' : '#edd3d9', 10);
      const settled = current.damage.filter(d => d.unit?.id === object.id).reduce((s, d) => s + d.percent, 0);
      const hp = Math.max(0, 1 - settled / 100);
      if (object.role === 'target' || selection?.id === object.id) { ctx.fillStyle = '#192521c9'; ctx.fillRect(object.x - 22, object.y - 132 * object.scale, 44, 4); ctx.fillStyle = object.role === 'caster' ? '#8ecbb3' : '#dd9ca0'; ctx.fillRect(object.x - 22, object.y - 132 * object.scale, 44 * hp, 4); }
      sceneHits.push({ kind: 'unit', id: object.id, x: object.x + (object.frame?.offsetX || 0) * object.scale * (unitFlip === 'x' ? -1 : 1), y: object.y - (object.frame?.offsetY || 0) * object.scale * (unitFlip === 'y' ? -1 : 1), width: Math.max(40, (object.frame?.width || 52) * object.scale), height: Math.max(40, (object.frame?.height || 52) * object.scale) });
    } else {
      const drawn = sprites.draw(ctx, object.atlas, object.frame, object.x, object.y, { scale: object.track.params.scale, rotation: object.rotation });
      if (!drawn && !object.atlas) drawHandle(object, `缺失特效 · ${object.track.params.effectId || '未指定 ID'}`, '#e6bb7a');
      if (selection?.id === object.id) drawHandle(object, object.track.name, '#b4eed0');
      const effectScale = object.track.params.scale, cos = Math.cos(object.rotation || 0), sin = Math.sin(object.rotation || 0);
      const width = (object.frame?.width || 60) * effectScale, height = (object.frame?.height || 60) * effectScale;
      const offsetX = (object.frame?.offsetX || 0) * effectScale, offsetY = -(object.frame?.offsetY || 0) * effectScale;
      sceneHits.push({ kind: 'track', id: object.id, x: object.x + offsetX * cos - offsetY * sin, y: object.y + offsetX * sin + offsetY * cos, width: Math.max(52, Math.abs(width * cos) + Math.abs(height * sin)), height: Math.max(52, Math.abs(width * sin) + Math.abs(height * cos)) });
    }
  }
  const track = selectedTrack();
  if (track?.type === 'effect' && !current.effects.some(e => e.id === track.id)) {
    const point = resolvePosition(track.params.position, current.units, doc.scene); point.x += track.params.offset.x; point.y -= track.params.offset.y;
    drawHandle(point, '特效定位 · ' + track.name, '#a0d7b477');
    sceneHits.push({ kind: 'track', id: track.id, x: point.x, y: point.y, width: 52, height: 52 });
  }
  if (track?.type === 'flight') {
    const info = flightInfo(doc, current.starts, track), { start, end } = info;
    ctx.save(); ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = 2 / scale; ctx.stroke(); ctx.restore();
    drawHandle(start, '起点', '#ffe0a2'); drawHandle(end, '终点', '#ffe0a2');
  }
  for (const damage of current.damage.filter(d => d.age < DAMAGE_PLAYBACK_MS && d.unit)) {
    const alpha = 1 - damage.age / DAMAGE_PLAYBACK_MS;
    ctx.save(); ctx.globalAlpha = alpha; drawLabel('-' + damage.amount, damage.unit.x, damage.unit.y - 100 - damage.age * .06, '#ffe5a2', 24); ctx.restore();
  }
  if (sprites.errors.has(manifest.background)) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#ffd3a0'; ctx.font = '12px sans-serif'; ctx.fillText('背景资源加载失败，请检查路径并刷新资源', 18, h - 45); }
}

function renderUnitResults() {
  const query = $('#unit-search').value.toLowerCase();
  const units = manifest.units.filter(u => `${u.id} ${u.name} ${u.key}`.toLowerCase().includes(query));
  $('#unit-results').innerHTML = units.map(unit => {
    const mapped = !!atlasForUnit(doc, manifest, unit.id);
    return `<button type="button" class="unit-result ${placementUnit?.id === unit.id ? 'active' : ''}" data-unit-option="${unit.id}"><span class="mono">${unit.id}</span><span><strong>${esc(unit.name)}</strong><small>${esc(unit.raw.unit_type)} / ${esc(unit.raw.faction_id)}</small></span><span class="mapping-status ${mapped ? 'ok' : ''}">${mapped ? '已关联图集' : '需选择图集'}</span></button>`;
  }).join('') || '<p class="field-note" style="padding:15px">没有匹配的单位。可刷新资源重新读取单位表。</p>';
}
function updatePlacement() {
  const atlas = placementUnit ? atlasForUnit(doc, manifest, placementUnit.id) : null;
  $('#placement-atlas').innerHTML = '<option value="">选择对应动画图集…</option>' + manifest.unitAtlases.map(a => `<option value="${esc(a.id)}">${esc(a.id)} · ${a.frames.length} 帧</option>`).join('');
  $('#placement-atlas').value = atlas?.id || (assetTab === 'units' ? chosenAsset?.id || '' : '');
  $('#mapping-note').textContent = !placementUnit ? '请先选择单位。' : atlas ? `配置解析：单位 ${placementUnit.id} → 图集 ${atlas.id}` : `单位 ${placementUnit.id} 尚无有效动画映射，请选择对应图集。映射随技能 JSON 保存。`;
  $('#mapping-note').classList.toggle('warning', !atlas && !!placementUnit);
  $('#place-unit-button').disabled = !placementUnit || !$('#placement-atlas').value;
  renderUnitResults();
}
function openPlacement(cell) {
  if (!manifest.units.length) return toast('单位表没有可用数据，请查看资源详情', true);
  pause(); placementCell = cell; placementUnit = null;
  $('#unit-cell-label').textContent = `地图格子 [${cell.q}, ${cell.r}] · 从单位表选择角色及对应动画`;
  $('#unit-search').value = '';
  $('#placement-role').value = doc.scene.units.some(u => u.role === 'caster') ? 'target' : 'caster';
  updatePlacement(); $('#unit-dialog').showModal();
}
function placeUnit() {
  const resourceId = $('#placement-atlas').value;
  if (!placementUnit || !resourceId) return;
  const unit = { id: id('unit'), unitId: placementUnit.id, ...placementCell, role: $('#placement-role').value, scale: 1 };
  mutate(() => {
    if (doc.scene.units.some(u => u.q === unit.q && u.r === unit.r)) throw new Error('该格子已有单位');
    doc.resourceMappings[String(unit.unitId)] = resourceId; doc.scene.units.push(unit); selection = { kind: 'unit', id: unit.id }; inspectorTab = 'selection';
  }, `已放置 ${placementUnit.name} · 单位 ${unit.unitId} → 图集 ${resourceId}`);
  $('#unit-dialog').close();
}
function loadDemo() {
  if (manifest.units.length < 2 || !manifest.unitAtlases.length) return toast('需要至少两个单位配置和一个角色图集才能载入示例', true);
  mutate(() => {
    doc = createDocument(); doc.name = '近战多段攻击 · 操作示例'; doc.skillId = 'example';
    const first = manifest.units[0], second = manifest.units[1];
    doc.resourceMappings[String(first.id)] = atlasForUnit(doc, manifest, first.id)?.id || manifest.unitAtlases[0].id;
    doc.resourceMappings[String(second.id)] = atlasForUnit(doc, manifest, second.id)?.id || manifest.unitAtlases[1]?.id || manifest.unitAtlases[0].id;
    doc.scene.units = [{ id: id('unit'), unitId: first.id, q: 2, r: 3, role: 'caster', scale: 1 }, { id: id('unit'), unitId: second.id, q: 4, r: 3, role: 'target', scale: 1 }];
    const actor = createTrack('caster', doc); actor.params.unitInstanceId = doc.scene.units[0].id; actor.startMs = 300; actor.name = '施法者 · 攻击';
    const count = framesForTrack(doc, manifest, actor).length;
    const hit = createTrack('target', doc); hit.params.unitInstanceId = doc.scene.units[1].id; hit.binding = { trackId: actor.id, frame: Math.min(3, count || 1), offsetMs: 0 }; hit.name = '受击者 · 受击';
    const a = createTrack('damage', doc), b = createTrack('damage', doc);
    a.binding = { trackId: actor.id, frame: Math.min(3, count || 1), offsetMs: 0 }; a.name = '第一段伤害';
    b.startMs = 950; b.name = '第二段伤害';
    const move = createTrack('move', doc); move.params.unitInstanceId = doc.scene.units[1].id; move.startMs = 1000; move.params.steps = 1; move.name = '受击者 · 击退';
    doc.tracks = [actor, hit, a, b, move]; selection = { kind: 'track', id: actor.id }; inspectorTab = 'selection'; time = 300;
  });
  toast('已载入操作示例。示例图集映射仅供演示，可在单位属性中更换。');
}

async function saveJSON() {
  if ($('#save-button').disabled) return;
  const error = skillIdError(doc.skillId);
  if (error) {
    inspectorTab = 'skill'; renderInspector();
    const input = $('#inspector [data-path="skillId"]');
    input.focus();
    toast('请先设置有效的技能 ID：' + error, true);
    return;
  }
  $('#save-button').disabled = true;
  try {
    const output = exportDocument(doc, manifest);
    const response = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(output) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '保存失败');
    const expectedFilename = `${output.skillId}.json`, expectedPath = `assets/remote/Res/Config/Skill/${expectedFilename}`;
    if (result.filename !== expectedFilename || result.relativePath !== expectedPath) throw new Error(`当前保存服务仍使用旧配置（${result.relativePath || '未知目录'}），请关闭旧服务并重新运行 SkillEditor/start.bat`);
    // 必须校验原始文件，不能先导入补默认值，否则会掩盖旧服务丢字段的问题。
    try {
      const savedResponse = await fetch(`/assets/remote/Res/Config/Skill/${encodeURIComponent(expectedFilename)}`, { cache: 'no-store' });
      if (!savedResponse.ok) throw new Error('无法读取已保存的 JSON');
      const saved = await savedResponse.json();
      for (const track of output.tracks.filter(t => t.type === 'move')) {
        const actual = saved.tracks?.find(t => t.id === track.id && t.type === 'move')?.params;
        const target = track.params.targetCell;
        if (actual?.moveType !== (track.params.moveType ?? 3) ||
          (target && (actual?.targetCell?.q !== target.q || actual?.targetCell?.r !== target.r))) {
          throw new Error('保存服务丢失或改写了强制移动参数，请关闭旧服务并重新运行 SkillEditor/start.bat');
        }
      }
    } catch (error) {
      throw new Error(`文件已写入，但保存校验失败：${error.message}；本地草稿仍保留`);
    }
    saveDraft();
    const issues = validateDocument(doc, manifest);
    toast(`已保存 ${result.relativePath}${issues.length ? `（${issues.length} 项配置提示）` : ''}`);
  } catch (error) { toast('保存失败：' + error.message, true); }
  finally { $('#save-button').disabled = false; }
}
function resourceInfo() {
  info('本地资源状态', `<p>单位表：<code>${esc(manifest.source || '读取失败')}</code></p><p>${manifest.units.length} 个单位，${manifest.unitAtlases.length} 个角色图集，${manifest.skills.length} 个技能特效。</p>${manifest.warnings.map(w => `<p>△ ${esc(w)}</p>`).join('')}<p>技能目录：<code>assets/remote/Res/Battle/Skill</code><br>角色目录：<code>assets/remote/Res/Battle/UnitResAtlas</code></p><p>支持 TexturePacker / Cocos 的 plist + png（含旋转帧与裁边偏移），以及独立 PNG 序列帧子目录。资源改变后点击资源库右上角刷新。</p>`);
}
function showHelp() {
  info('技能表现编辑器 · 使用说明', `<p><a class="primary" href="/SkillEditor/guide.html" target="_blank" rel="noopener" style="display:inline-block;padding:10px 14px;border-radius:6px;background:#274f42;color:#a8f5d2;font-weight:700;text-decoration:none">打开图文使用说明与交互演示 ↗</a></p><h3>编排流程</h3><p>先点击顶部“新建”，输入技能 ID 后创建技能。保存文件为 assets/remote/Res/Config/Skill/技能ID.json。</p><p>① 点击空格子，从 Excel 单位表选择角色和动画图集，设置攻击者 / 受击者。<br>② 新建轨道，每条轨道只对应一个功能节点。<br>③ 在右侧设置动作、速度、位置等参数。<br>④ 拖动节点调整毫秒时间；拖到角色动作帧上，自动保存帧关联。<br>⑤ 播放预览或拖动标尺检查任意时刻，最后保存 JSON。</p><h3>时间轴规则</h3><p>帧号从 1 开始，表示当前动作中的相对帧。绝对图集帧范围沿用 UnitBase：站立 0–5、移动 6–8、受击 9–10、死亡 11–13、攻击 14 帧起。默认 10 FPS，每条动作可单独修改。关联节点会随源动作 FPS 自动重算。</p><p>伤害自动节点分摊剩余百分比，手动占比合计校验为 100%。强制移动默认忽略占用，0 ms 为瞬移；终点超出 7×7 地图时停在边界。飞行需先选中特效实例，再新建飞行轨道；勾选“是否与目标点朝向一致”可让特效朝向终点。</p><h3>坐标与图层</h3><p>自定义像素坐标 X 向右、Y 向上；全局坐标原点在地图中心。格子 [q,r] 左下角为 [0,0]，q 向右、r 向上，奇数行右移半格。自动图层按场景 Y 排序，屏幕更下方显示在前；相同 Y 时攻击方优先。受击者默认左右镜像。</p><h3>快捷键</h3><p><code>Space</code> 播放 / 暂停　<code>← →</code> 10 ms 步进<br><code>Shift + ← →</code> 按默认角色一帧步进<br><code>Home</code> 回到开始　<code>Delete</code> 删除选择<br><code>Ctrl S</code> 导出　<code>Ctrl Z</code> 撤销<br><code>Ctrl Shift Z</code> / <code>Ctrl Y</code> 重做<br><code>Alt + 拖动</code> 跳过帧吸附<br>地图滚轮缩放，中键拖动平移。上下拖动地图与时间轴之间的分隔线可调整高度。</p><p>编辑自动保存在当前浏览器的本地草稿中。新建、删除、导入均支持撤销。导入其他配置格式时会显示具体校验错误。</p>`);
}

$('#new-button').addEventListener('click', () => {
  pause();
  const input = $('#new-skill-id'); input.value = ''; input.setCustomValidity('');
  $('#new-skill-dialog').showModal(); input.focus();
});
$('#new-skill-id').addEventListener('input', event => event.target.setCustomValidity(skillIdError(event.target.value)));
$('#close-new-skill').addEventListener('click', () => $('#new-skill-dialog').close());
$('#cancel-new-skill').addEventListener('click', () => $('#new-skill-dialog').close());
$('#new-skill-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#new-skill-id'), error = skillIdError(input.value);
  input.setCustomValidity(error);
  if (error) { input.reportValidity(); return; }
  const skillId = input.value;
  mutate(() => { doc = createDocument(); doc.skillId = skillId; selection = null; selectedEffectId = ''; inspectorTab = 'skill'; time = 0; }, `已新建技能 ${skillId}，可通过撤销恢复之前的编辑`);
  $('#new-skill-dialog').close();
});
$('#save-button').addEventListener('click', saveJSON);
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('配置文件不能大于 5 MB');
    const next = importDocument(JSON.parse(await file.text()));
    resolveStarts(next, manifest); pause();
    mutate(() => { doc = next; selection = null; selectedEffectId = ''; time = 0; }, '已从 JSON 还原场景与所有轨道');
    toast('已导入 ' + next.name);
  } catch (error) { toast('导入失败：' + error.message, true); }
  finally { event.target.value = ''; }
});
$('#skill-name').addEventListener('change', event => mutate(() => { doc.name = event.target.value.trim() || '未命名技能'; }));
$('#refresh-button').addEventListener('click', () => loadResources(true));
$('#resource-info').addEventListener('click', resourceInfo);
$('#help-button').addEventListener('click', showHelp);
$('#close-info').addEventListener('click', () => $('#info-dialog').close());
$('#info-ok').addEventListener('click', () => $('#info-dialog').close());
$('#demo-button').addEventListener('click', loadDemo);
$('#asset-search').addEventListener('input', () => { $('#asset-list').scrollTop = 0; renderAssets(); });
$('#asset-list').addEventListener('scroll', renderAssets, { passive: true });
$$('[data-tab]').forEach(button => button.addEventListener('click', () => { assetTab = button.dataset.tab; chosenAsset = null; $('#asset-search').value = ''; $('#asset-list').scrollTop = 0; renderAssets(); }));
$('#asset-window').addEventListener('click', event => {
  const item = event.target.closest('[data-asset]'); if (!item) return;
  chosenAsset = (assetTab === 'skills' ? manifest.skills : manifest.unitAtlases).find(a => a.id === item.dataset.asset);
  renderAssets();
});
$('#asset-window').addEventListener('dblclick', event => {
  const item = event.target.closest('[data-asset]'); if (!item) return;
  chosenAsset = (assetTab === 'skills' ? manifest.skills : manifest.unitAtlases).find(a => a.id === item.dataset.asset);
  if (assetTab === 'skills') addTrack('effect');
  else toast(`图集 ${chosenAsset.id} 已选择；点击地图空格子来放置单位`);
});
$('#asset-window').addEventListener('keydown', event => { if (event.key === 'Enter') event.target.closest('[data-asset]')?.click(); });
$('#use-resource').addEventListener('click', () => addTrack('effect'));
$$('[data-inspector]').forEach(button => button.addEventListener('click', () => { inspectorTab = button.dataset.inspector; renderInspector(); }));
function handleInspectorChange(event, live = false) {
  const control = event.target, track = selectedTrack(), unit = selectedUnit();
  if (control.dataset.special === 'mapping') {
    const unitId = unit?.unitId || track?.params.unitId || (track ? trackUnit(doc, track)?.unitId : null);
    if (!unitId) return;
    return mutate(() => { if (control.value) doc.resourceMappings[String(unitId)] = control.value; else delete doc.resourceMappings[String(unitId)]; }, '图集映射已更新');
  }
  if (control.dataset.special === 'binding-source') return mutate(() => {
    const currentStart = resolveStarts(doc, manifest).get(track.id);
    const source = doc.tracks.find(t => t.id === control.value);
    track.binding = source ? (source.type === 'flight' ? { trackId: source.id, anchor: 'end', offsetMs: 0 } : { trackId: source.id, frame: 1, offsetMs: 0 }) : null;
    if (!track.binding) track.startMs = currentStart;
  });
  if (control.dataset.special === 'auto-share') return mutate(() => { track.params.share = control.checked ? null : round(damageShares(doc).get(track.id) || 0); });
  const scope = control.dataset.scope, path = control.dataset.path; if (!scope || !path) return;
  mutate(() => {
    let target = scope === 'doc' ? doc : scope === 'unit' ? unit : track;
    if (!target) return;
    const parts = path.split('.'), key = parts.pop();
    for (const part of parts) target = target[part];
    let value = control.type === 'checkbox' ? control.checked : control.type === 'number' ? Number(control.value) : control.value;
    if (path === 'params.unitId') value = control.value ? Number(control.value) : null;
    if (scope === 'unit' && path === 'unitId' || ['params.direction', 'params.moveType'].includes(path)) value = Number(control.value);
    const autoEffectDuration = scope === 'track' && track?.type === 'effect' && path === 'params.durationMs' && control.value === '';
    if (autoEffectDuration) value = null;
    else if (control.type === 'number' && control.value === '') throw new Error('数值不能为空');
    target[key] = value;
    if (scope === 'unit' && ['q', 'r'].includes(path) && doc.scene.units.some(u => u.id !== unit.id && u.q === unit.q && u.r === unit.r)) throw new Error('目标格子已经有单位');
  }, undefined, live);
}
$('#inspector').addEventListener('change', handleInspectorChange);
$('#inspector').addEventListener('input', event => {
  if (!['text', 'number'].includes(event.target.type) || !event.target.dataset.path || !event.target.validity.valid || event.target.value === '') return;
  handleInspectorChange(event, true);
});
$('#inspector').addEventListener('click', event => {
  if (event.target.closest('[data-delete]')) deleteSelection();
  if (event.target.closest('[data-duplicate]')) duplicateTrack();
  if (event.target.closest('[data-create-flight]')) { selectedEffectId = selectedTrack().id; addTrack('flight'); }
  const add = event.target.closest('[data-add-action]'); if (add) addTrack(add.dataset.addAction);
});
$('#validation').addEventListener('click', () => { const issues = validateDocument(doc, manifest); if (issues.length) info('配置检查', `<p>${issues.length} 项待处理的配置提示：</p><ul>${issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul><p>配置可导出为草稿。缺失资源会在预览中显示定位标记。</p>`); });
$('#play-button').addEventListener('click', togglePlay);
$('#duration-label').addEventListener('click', () => { inspectorTab = 'skill'; renderInspector(); $('#inspector [data-path="settings.durationMode"]').focus(); });
$('#restart-button').addEventListener('click', () => setTime(0));
$('#stop-button').addEventListener('click', () => { pause(); setTime(0); });
$('#loop-button').addEventListener('click', event => { loop = !loop; event.currentTarget.classList.toggle('active', loop); });
$('#playback-speed').addEventListener('change', event => { playbackSpeed = Number(event.target.value); });
$('#undo-button').addEventListener('click', () => undoChange());
$('#redo-button').addEventListener('click', () => undoChange(true));
$('#snap-button').addEventListener('click', event => { snap = !snap; event.currentTarget.classList.toggle('active', snap); });
$('#timeline-zoom').addEventListener('input', event => { const old = zoom; zoom = Number(event.target.value) / 100; const scroll = $('#timeline-scroll'); const center = (scroll.scrollLeft + scroll.clientWidth / 2 - LABEL_WIDTH()) / old; renderTimeline(); scroll.scrollLeft = center * zoom - scroll.clientWidth / 2 + LABEL_WIDTH(); });
$('#add-track-button').addEventListener('click', event => { event.stopPropagation(); showTrackMenu(event.currentTarget); });
$('#empty-add-button').addEventListener('click', event => { event.stopPropagation(); showTrackMenu(event.currentTarget); });
$('#track-menu').addEventListener('click', event => { const button = event.target.closest('[data-add-type]'); if (button) addTrack(button.dataset.addType); });
document.addEventListener('click', event => { if (!event.target.closest('#track-menu') && !event.target.closest('#add-track-button') && !event.target.closest('#empty-add-button')) $('#track-menu').hidden = true; });
$('#timeline-scroll').addEventListener('pointerdown', event => {
  const flightEnd = event.target.closest('[data-flight-end]');
  if (flightEnd) { event.preventDefault(); event.stopPropagation(); return selectFlightEnd(flightEnd.dataset.flightEnd); }
  const node = event.target.closest('[data-node]'); if (node) return startNodeDrag(event, node);
  const mute = event.target.closest('[data-mute]');
  if (mute) { event.preventDefault(); return mutate(() => { const t = doc.tracks.find(t => t.id === mute.dataset.mute); t.enabled = !t.enabled; }); }
  const label = event.target.closest('[data-select-track]'); if (label) return select({ kind: 'track', id: label.dataset.selectTrack });
  if (event.target.closest('.ruler-label') || !event.target.closest('.ruler-ticks, .track-lane')) return;
  event.preventDefault(); pause(); setTime(timeFromPointer(event));
  const scroll = $('#timeline-scroll'); scroll.setPointerCapture(event.pointerId);
  const move = e => setTime(timeFromPointer(e));
  const finish = () => { scroll.removeEventListener('pointermove', move); scroll.removeEventListener('pointerup', finish); scroll.removeEventListener('pointercancel', finish); };
  scroll.addEventListener('pointermove', move); scroll.addEventListener('pointerup', finish); scroll.addEventListener('pointercancel', finish);
});
$('#timeline-scroll').addEventListener('keydown', event => {
  const flightEnd = event.target.closest('[data-flight-end]');
  if (flightEnd && ['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); return selectFlightEnd(flightEnd.dataset.flightEnd); }
  const node = event.target.closest('[data-node]');
  if (node && event.key === 'Enter') { select({ kind: 'track', id: node.dataset.node }); setTime(resolveStarts(doc, manifest).get(node.dataset.node)); }
});

$('#grid-button').addEventListener('click', event => { grid = !grid; event.currentTarget.classList.toggle('active', grid); sceneDirty = true; });
$('#coord-button').addEventListener('click', event => { coords = !coords; event.currentTarget.classList.toggle('active', coords); sceneDirty = true; });
$('#fit-button').addEventListener('click', () => { sceneScale = 1; pan = { x: 0, y: 0 }; sceneDirty = true; });
scene.addEventListener('wheel', event => { event.preventDefault(); sceneScale = clamp(sceneScale * Math.exp(-event.deltaY * .001), .45, 3); sceneDirty = true; }, { passive: false });
scene.addEventListener('contextmenu', event => event.preventDefault());
scene.addEventListener('pointermove', event => {
  const cell = hitCell(worldFromPointer(event));
  $('#hover-cell').textContent = cell ? `格子 [${cell.q}, ${cell.r}] · ${round(hexToWorld(cell.q, cell.r, doc.scene).x - 318.5)}, ${round(193.5 - hexToWorld(cell.q, cell.r, doc.scene).y)} px` : '地图坐标 · —';
});
scene.addEventListener('pointerdown', event => {
  if (![0, 1].includes(event.button)) return;
  event.preventDefault(); scene.focus();
  const initial = { x: event.clientX, y: event.clientY }, initialPan = { ...pan }, world = worldFromPointer(event);
  const hit = [...sceneHits].reverse().find(item => Math.abs(item.x - world.x) <= item.width / 2 && Math.abs(item.y - world.y) <= item.height / 2);
  const before = JSON.stringify(doc), dragEffect = event.button === 0 && hit?.kind === 'track' ? doc.tracks.find(t => t.id === hit.id && t.type === 'effect') : null;
  const offset = dragEffect ? { ...dragEffect.params.offset } : null;
  scene.setPointerCapture(event.pointerId); let moved = false;
  const move = e => {
    const dx = e.clientX - initial.x, dy = e.clientY - initial.y;
    if (Math.hypot(dx, dy) < 4 && !moved) return; moved = true;
    if (event.button === 1) pan = { x: initialPan.x + dx, y: initialPan.y + dy };
    else if (dragEffect) { dragEffect.params.offset.x = round(clamp(offset.x + dx / transform.scale, -10000, 10000)); dragEffect.params.offset.y = round(clamp(offset.y - dy / transform.scale, -10000, 10000)); }
    sceneDirty = true;
  };
  const finish = () => {
    scene.removeEventListener('pointermove', move); scene.removeEventListener('pointerup', finish); scene.removeEventListener('pointercancel', cancel);
    if (moved) { if (dragEffect) { selection = { kind: 'track', id: dragEffect.id }; record(before, '特效偏移已更新'); } return; }
    if (event.button === 1) return;
    if (hit) return select({ kind: hit.kind, id: hit.id });
    const cell = hitCell(world);
    if (cell) {
      placementCell = cell;
      const unit = sampleScene(doc, manifest, time).units.find(u => u.q === cell.q && u.r === cell.r);
      if (unit) select({ kind: 'unit', id: unit.id }); else openPlacement(cell);
    } else select(null);
  };
  const cancel = () => { if (dragEffect) doc = JSON.parse(before); finish(); sceneDirty = true; };
  scene.addEventListener('pointermove', move); scene.addEventListener('pointerup', finish); scene.addEventListener('pointercancel', cancel);
});
$('#timeline-resize').addEventListener('pointerdown', event => {
  event.preventDefault(); const element = event.currentTarget, initialY = event.clientY, initialHeight = $('.timeline-panel').clientHeight;
  element.setPointerCapture(event.pointerId);
  const move = e => { document.documentElement.style.setProperty('--timeline-height', clamp(initialHeight + initialY - e.clientY, 170, innerHeight * .65) + 'px'); };
  const finish = () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', finish); element.removeEventListener('pointercancel', finish); };
  element.addEventListener('pointermove', move); element.addEventListener('pointerup', finish); element.addEventListener('pointercancel', finish);
});
$('#unit-search').addEventListener('input', renderUnitResults);
$('#unit-results').addEventListener('click', event => { const option = event.target.closest('[data-unit-option]'); if (option) { placementUnit = unitConfig(option.dataset.unitOption); updatePlacement(); } });
$('#placement-atlas').addEventListener('change', event => { $('#place-unit-button').disabled = !placementUnit || !event.target.value; });
$('#place-unit-button').addEventListener('click', placeUnit);
$('#unit-dialog form').addEventListener('submit', event => { if (event.submitter?.value !== 'cancel') event.preventDefault(); });
document.addEventListener('keydown', event => {
  if ($('dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); document.activeElement?.blur(); return saveJSON(); }
  if (event.target.closest('input,select,textarea,[contenteditable=true]')) return;
  if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); return undoChange(event.shiftKey || event.key.toLowerCase() === 'y'); }
  if (event.code === 'Space') { event.preventDefault(); return togglePlay(); }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); return deleteSelection(); }
  if (event.key === 'Home') { event.preventDefault(); pause(); return setTime(0); }
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); pause(); return setTime(time + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 1000 / doc.settings.defaultFps : 10)); }
  if (event.key === 'Escape') { $('#track-menu').hidden = true; select(null); }
});
new ResizeObserver(() => { resizeScene(); renderAssets(); }).observe($('#viewport'));
new ResizeObserver(() => renderTimeline()).observe($('#timeline-scroll'));
new ResizeObserver(() => renderAssets()).observe($('#asset-list'));
function tick(now) {
  const delta = now - lastTick; lastTick = now;
  if (playing) {
    const duration = totalDuration(doc, manifest);
    if (duration <= 0) { time = 0; pause(); }
    else {
      time += delta * playbackSpeed;
      if (time >= duration) { if (loop) time %= duration; else { time = duration; pause(); } }
    }
    updateTime();
    const scroll = $('#timeline-scroll'), x = time * zoom + LABEL_WIDTH();
    if (x > scroll.scrollLeft + scroll.clientWidth - 30) scroll.scrollLeft = x - scroll.clientWidth + 80;
    else if (x < scroll.scrollLeft + LABEL_WIDTH()) scroll.scrollLeft = Math.max(0, x - LABEL_WIDTH());
  }
  if (sceneDirty) { sceneDirty = false; drawScene(); }
  if (thumbnailsDirty) { thumbnailsDirty = false; paintThumbnails(); }
  if (chosenAsset) {
    const frame = Math.floor(now * (assetTab === 'skills' ? doc.settings.effectFps : doc.settings.defaultFps) / 1000) % chosenAsset.frames.length;
    if (frame !== lastPreviewFrame) { sprites.thumbnail($('#asset-preview'), chosenAsset, chosenAsset.frames[frame]); lastPreviewFrame = frame; }
  } else $('#asset-preview').getContext('2d').clearRect(0, 0, 240, 142);
  requestAnimationFrame(tick);
}
try { const draft = localStorage.getItem(STORAGE_KEY); if (draft) { doc = importDocument(JSON.parse(draft)); $('#status-message').textContent = '已恢复上次的本地草稿'; } }
catch { toast('上次草稿无法读取，已打开空白技能', true); }
renderAll(); resizeScene(); loadResources(); requestAnimationFrame(tick);
