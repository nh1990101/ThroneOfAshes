export const TYPES = {
  caster: { name: '施法者行为', color: '#70b8ff', icon: '↗' },
  target: { name: '受击者行为', color: '#b59aff', icon: '↙' },
  effect: { name: '播放技能特效', color: '#53d7b0', icon: '✧' },
  flight: { name: '技能移动飞行', color: '#f3c277', icon: '➚' },
  damage: { name: '伤害节点', color: '#f48694', icon: '◇' },
  move: { name: '强制移动', color: '#64d1de', icon: '↠' }
};
export const ACTIONS = { idle: '站立', attack: '攻击', dead: '死亡', move: '移动', hit: '受击' };
// Damage is applied at the track start; its floating number finishes this much later.
export const DAMAGE_PLAYBACK_MS = 700;
// Exported action values follow assets/script/Common/GameEnum.ts UNIT_ACTION.
// MAX is a sentinel, not a playable action. Internal names keep preview/UI compatible.
export const UNIT_ACTION = Object.freeze({ IDLE: 0, MOVE: 1, BE_HIT: 2, DEAD: 3, ATTACK: 4 });
const ACTION_VALUES = Object.freeze({ idle: UNIT_ACTION.IDLE, move: UNIT_ACTION.MOVE, hit: UNIT_ACTION.BE_HIT, dead: UNIT_ACTION.DEAD, attack: UNIT_ACTION.ATTACK });
export const DIRECTIONS = ['→ 右 / 东', '↗ 右上 / 东北', '↖ 左上 / 西北', '← 左 / 西', '↙ 左下 / 西南', '↘ 右下 / 东南'];
export const MOVE_TYPES = [[1, '以移动单位朝向反方向移动'], [2, '以施法者指向移动单位的方向移动'], [3, '固定移动方向'], [4, '全局移动 · 指定目标格子']];
export const clone = value => structuredClone(value);
export const id = prefix => prefix + '_' + globalThis.crypto.randomUUID().slice(0, 8);
export const clamp = (v, low, high) => Math.min(high, Math.max(low, Number(v) || 0));
export const isAction = track => ['caster', 'target'].includes(track.type);
export const position = (mode = 'target') => ({ mode, relativeTo: 'caster', x: 0, y: 0 });
export function skillIdError(value) {
  if (typeof value !== 'string' || !value.trim()) return '请填写技能 ID';
  if (value !== value.trim()) return '技能 ID 不能包含首尾空白';
  if (value.length > 100) return '技能 ID 不能超过 100 个字符';
  if (/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(value)) return '技能 ID 不能包含文件名禁用字符或控制字符';
  if (/[. ]$/.test(value)) return '技能 ID 不能以点或空格结尾';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) return '技能 ID 不能使用系统保留的文件名';
  return '';
}
export function createDocument() {
  return {
    format: 'RPGCore.SkillPresentation', schemaVersion: 1, skillId: '', name: '未命名技能', durationMs: 3000,
    settings: { defaultFps: 10, effectFps: 24, previewDamage: 1000, targetFlip: 'x', collision: 'ignore', durationMode: 'auto' },
    scene: { cols: 7, rows: 7, hexWidth: 98, hexHeight: 86, coordinateOrigin: 'bottom-left', units: [] }, resourceMappings: {}, tracks: []
  };
}
export function createTrack(type, doc, effectId = '') {
  if (!TYPES[type]) throw new Error('未知节点类型');
  let params;
  if (isAction({ type })) params = { unitInstanceId: '', unitId: null, action: type === 'caster' ? 'attack' : 'hit', fps: doc.settings.defaultFps, loop: false };
  if (type === 'effect') params = { effectId, fps: doc.settings.effectFps, speed: 1, position: position(), layer: 'auto', offset: { x: 0, y: 0 }, scale: 1, loop: false, durationMs: null, multiTarget: false };
  if (type === 'flight') params = { effectTrackId: effectId, speed: 400, start: position('caster'), end: position('target'), startOffset: { x: 0, y: 0 }, endOffset: { x: 0, y: 0 }, hideOnArrival: false, alignToTarget: false };
  if (type === 'damage') params = { share: null, unitInstanceId: '' };
  if (type === 'move') params = { unitInstanceId: '', cell: { q: 0, r: 0 }, moveType: 3, targetCell: { q: 0, r: 0 }, direction: 0, steps: 1, durationMs: 0, bounceDistance: 20, bounceDurationMs: 200 };
  return { id: id('track'), type, name: TYPES[type].name, enabled: true, startMs: 0, binding: null, params };
}
export function atlasForUnit(doc, manifest, unitId) {
  const configured = manifest.units.find(u => u.id === Number(unitId));
  const mapping = doc.resourceMappings[String(unitId)] || configured?.resourceId || String(unitId);
  return manifest.unitAtlases.find(a => a.id === mapping) || null;
}
export function trackUnit(doc, track) {
  const wanted = track.params.unitInstanceId;
  return doc.scene.units.find(u => u.id === wanted) || doc.scene.units.find(u => u.role === (track.type === 'caster' ? 'caster' : 'target')) || null;
}
export function actionFrames(atlas, action) {
  if (!atlas) return [];
  const ranges = { idle: [0, 6], move: [6, 9], hit: [9, 11], dead: [11, 14], attack: [14, atlas.frames.length] };
  const [start, end] = ranges[action] || ranges.idle;
  return atlas.frames.slice(start, end);
}
export function framesForTrack(doc, manifest, track) {
  if (track.type === 'effect') return manifest.skills.find(s => s.id === track.params.effectId)?.frames || [];
  if (!isAction(track)) return [];
  const unit = trackUnit(doc, track);
  return actionFrames(atlasForUnit(doc, manifest, track.params.unitId || unit?.unitId), track.params.action);
}
// A zero-distance flight can finish at its own start time. A move bound to that
// finish still happens after its endpoint snapshot, even though both times match.
const flightSnapshotExclusions = new WeakMap();
export function resolveStarts(doc, manifest) {
  const times = new Map(), visiting = new Set(), ending = new Set(), ends = new Map(), snapshots = new Map(), deferred = new Map();
  const tracks = new Map(doc.tracks.map(track => [track.id, track]));
  const exclusions = new Map();
  flightSnapshotExclusions.set(times, exclusions);
  class PendingEnd extends Error {
    constructor(trackId) { super('等待飞行结束时间'); this.trackId = trackId; }
  }
  function pendingEnd(track) {
    const seen = new Set();
    while (track?.binding && !seen.has(track.id)) {
      seen.add(track.id);
      const source = tracks.get(track.binding.trackId);
      if (track.binding.anchor === 'end' && source && ending.has(source.id) && !ends.has(source.id)) return source.id;
      track = source;
    }
    return null;
  }
  function resolve(track) {
    if (times.has(track.id)) return times.get(track.id);
    if (visiting.has(track.id)) {
      const pending = pendingEnd(track);
      if (pending) throw new PendingEnd(pending);
      throw new Error('轨道时间关联存在循环');
    }
    visiting.add(track.id);
    try {
      let value = track.startMs;
      if (track.binding) {
        const source = tracks.get(track.binding.trackId);
        if (track.binding.anchor === 'end') {
          if (!source || source.type !== 'flight') throw new Error('关联的飞行轨道不存在');
          value = resolveEnd(source) + (track.binding.offsetMs || 0);
        } else {
          if (track.binding.anchor !== undefined) throw new Error('不支持的关联锚点');
          if (!source || !isAction(source)) throw new Error('关联的角色动作轨道不存在');
          const count = framesForTrack(doc, manifest, source).length;
          const frame = Math.min(Math.max(1, track.binding.frame), Math.max(1, count));
          value = resolve(source) + (frame - 1) * 1000 / source.params.fps + (track.binding.offsetMs || 0);
        }
      }
      times.set(track.id, Math.max(0, value));
      return times.get(track.id);
    } finally { visiting.delete(track.id); }
  }
  function resolveEnd(track) {
    if (ends.has(track.id)) return ends.get(track.id);
    if (ending.has(track.id)) throw new PendingEnd(track.id);
    ending.add(track.id);
    try {
      const start = resolve(track), skipped = new Map();
      // Global endpoints do not depend on unit movement or occupancy at all.
      const global = point => point.mode === 'custom' && point.relativeTo === 'global';
      if (!global(track.params.start) || !global(track.params.end)) {
        for (const move of doc.tracks.filter(t => t.enabled && t.type === 'move')) {
          try { resolve(move); }
          catch (error) {
            if (!(error instanceof PendingEnd)) throw error;
            skipped.set(move.id, error.trackId);
          }
        }
      }
      const snapshot = flightInfo(doc, times, track);
      snapshots.set(track.id, snapshot); deferred.set(track.id, skipped);
      ends.set(track.id, start + snapshot.duration);
      return ends.get(track.id);
    } finally { ending.delete(track.id); }
  }
  try {
    // Resolve flight events first so a move listed before its own flight-end
    // source is treated as a future consequence, never as a snapshot prerequisite.
    doc.tracks.filter(track => track.type === 'flight').forEach(resolveEnd);
    doc.tracks.forEach(resolve);
    for (const track of doc.tracks.filter(t => t.type === 'flight')) {
      const start = times.get(track.id), skipped = deferred.get(track.id), sameTime = new Set();
      for (const [moveId, pendingId] of skipped) {
        if (times.get(moveId) === start && ends.get(pendingId) === start) sameTime.add(moveId);
      }
      exclusions.set(track.id, sameTime);
      const actual = flightInfo(doc, times, track), initial = snapshots.get(track.id);
      if (Math.abs(actual.start.x - initial.start.x) > 1e-8 || Math.abs(actual.start.y - initial.start.y) > 1e-8
        || Math.abs(actual.end.x - initial.end.x) > 1e-8 || Math.abs(actual.end.y - initial.end.y) > 1e-8) {
        throw new Error(`轨道时间关联存在循环：${track.name} 的飞行结束关联位移影响了飞行开始时的位置快照`);
      }
    }
  } catch (error) {
    if (error instanceof PendingEnd) throw new Error('轨道时间关联存在循环');
    throw error;
  }
  return times;
}
export function damageShares(doc) {
  const nodes = doc.tracks.filter(t => t.type === 'damage' && t.enabled);
  const explicit = nodes.filter(n => n.params.share != null).reduce((sum, n) => sum + n.params.share, 0);
  const automatic = nodes.filter(n => n.params.share == null);
  const autoShare = automatic.length ? Math.max(0, 100 - explicit) / automatic.length : 0;
  return new Map(nodes.map(n => [n.id, n.params.share ?? autoShare]));
}
export function hexToWorld(q, r, scene = { rows: 7, hexWidth: 98, hexHeight: 86 }) {
  return { x: scene.hexWidth * q + (r % 2) * scene.hexWidth / 2, y: scene.hexHeight * .75 * ((scene.rows ?? 7) - 1 - r) };
}
export function neighbor(q, r, direction) {
  const even = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
  const odd = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];
  const [dq, dr] = (r % 2 ? odd : even)[direction];
  return { q: q + dq, r: r + dr };
}
function inside(cell, scene) { return cell.q >= 0 && cell.q < scene.cols && cell.r >= 0 && cell.r < scene.rows; }
export function movePath(cell, direction, steps, scene, occupied, collision = 'stop') {
  const cells = [{ q: cell.q, r: cell.r }];
  for (let i = 0; i < steps; i++) {
    const next = neighbor(cells.at(-1).q, cells.at(-1).r, direction);
    if (!inside(next, scene) || (collision === 'stop' && occupied.has(`${next.q},${next.r}`))) break;
    cells.push(next);
  }
  return cells;
}
// Match HexagonData.getLine: offset -> axial coordinates -> cube rounding.
function hexLine(start, end) {
  const a = { q: start.q - (start.r - (start.r & 1)) / 2, r: start.r };
  const b = { q: end.q - (end.r - (end.r & 1)) / 2, r: end.r };
  const count = Math.max(Math.abs(b.q - a.q), Math.abs(b.r - a.r), Math.abs(b.q + b.r - a.q - a.r));
  const cells = [];
  for (let i = 0; i <= count; i++) {
    const t = count ? i / count : 0, q = a.q * (1 - t) + b.q * t, r = a.r * (1 - t) + b.r * t, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r);
    const rs = Math.round(s), dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    cells.push({ q: rq + (rr - (rr & 1)) / 2, r: rr });
  }
  return cells;
}
function globalMovePath(cell, target, scene, occupied, collision) {
  const cells = [{ q: cell.q, r: cell.r }];
  if (!target) return cells;
  for (const next of hexLine(cell, target).slice(1)) {
    if (!inside(next, scene) || (collision === 'stop' && occupied.has(`${next.q},${next.r}`))) break;
    cells.push(next);
  }
  return cells;
}
function movementDirection(params, unit, from, units, start, doc) {
  const type = params.moveType ?? 3;
  if (type === 1) return unit.role === 'target' && doc.settings.targetFlip === 'x' ? 0 : 3;
  if (type === 3) return params.direction;
  const caster = units.find(u => u.role === 'caster');
  if (!caster) return null;
  const casterPos = caster.movement ? movementPosition(caster.movement, start, doc.scene) : hexToWorld(caster.q, caster.r, doc.scene);
  const dx = from.x - casterPos.x, dy = from.y - casterPos.y;
  if (dx === 0 && dy === 0) return null;
  const w = doc.scene.hexWidth, h = doc.scene.hexHeight * .75;
  const directions = [[w, 0], [w / 2, -h], [-w / 2, -h], [-w, 0], [-w / 2, h], [w / 2, h]];
  let direction = 0, best = -Infinity;
  directions.forEach(([x, y], index) => {
    const dot = (dx * x + dy * y) / Math.hypot(x, y);
    if (dot > best) { best = dot; direction = index; }
  });
  return direction;
}
function movementPosition(movement, time, scene) {
  const points = movement.cells.map(cell => hexToWorld(cell.q, cell.r, scene));
  if (movement.from) points[0] = movement.from;
  if (movement.duration === 0) return points.at(-1);
  if (points.length === 1) return points[0];
  if (movement.direct) {
    const t = clamp((time - movement.start) / Math.max(1, movement.duration), 0, 1), from = points[0], to = points.at(-1);
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
  const segment = clamp((time - movement.start) / Math.max(1, movement.duration), 0, 1) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(segment)), fraction = segment - index;
  return { x: points[index].x + (points[index + 1].x - points[index].x) * fraction, y: points[index].y + (points[index + 1].y - points[index].y) * fraction };
}
export function unitsAt(doc, starts, time) {
  const units = doc.scene.units.map(u => ({ ...u, ...hexToWorld(u.q, u.r, doc.scene), movement: null }));
  const moves = doc.tracks.filter(t => t.enabled && t.type === 'move' && starts.get(t.id) <= time).sort((a, b) => starts.get(a.id) - starts.get(b.id));
  for (const track of moves) {
    const start = starts.get(track.id), p = track.params;
    const unit = p.unitInstanceId ? units.find(u => u.id === p.unitInstanceId) : units.find(u => u.q === p.cell.q && u.r === p.cell.r);
    if (!unit) continue;
    const from = unit.movement ? movementPosition(unit.movement, start, doc.scene) : hexToWorld(unit.q, unit.r, doc.scene);
    // A unit reserves its destination for the duration of a forced move.
    const occupied = new Set(units.filter(u => u !== unit).map(u => `${u.q},${u.r}`));
    const direct = p.moveType === 4;
    const direction = direct ? null : movementDirection(p, unit, from, units, start, doc);
    const cells = direct ? globalMovePath(unit, p.targetCell, doc.scene, occupied, doc.settings.collision)
      : direction === null ? [{ q: unit.q, r: unit.r }] : movePath(unit, direction, p.steps, doc.scene, occupied, doc.settings.collision);
    unit.movement = { cells, start, duration: p.durationMs, from, direct };
    Object.assign(unit, cells.at(-1));
  }
  for (const unit of units) Object.assign(unit, unit.movement ? movementPosition(unit.movement, time, doc.scene) : hexToWorld(unit.q, unit.r, doc.scene));
  return units;
}
export function resolvePosition(value, units, scene) {
  const role = value.mode === 'custom' ? value.relativeTo : value.mode;
  const anchor = role === 'global' ? { x: scene.hexWidth * 3.25, y: scene.hexHeight * .75 * 3 } : units.find(u => u.role === role) || { x: 0, y: 0 };
  // Custom pixel coordinates use Y-up; positions returned here use Canvas Y-down.
  return { x: anchor.x + (value.mode === 'custom' ? value.x : 0), y: anchor.y - (value.mode === 'custom' ? value.y : 0) };
}
export function flightInfo(doc, starts, track) {
  const excluded = flightSnapshotExclusions.get(starts)?.get(track.id);
  const snapshotStarts = excluded?.size ? new Map([...starts].filter(([id]) => !excluded.has(id))) : starts;
  const time = starts.get(track.id), units = unitsAt(doc, snapshotStarts, time);
  const start = resolvePosition(track.params.start, units, doc.scene), end = resolvePosition(track.params.end, units, doc.scene);
  // Endpoint offsets are world directions (X-right/Y-up), independent of sprite offsets.
  start.x += track.params.startOffset?.x ?? 0; start.y -= track.params.startOffset?.y ?? 0;
  end.x += track.params.endOffset?.x ?? 0; end.y -= track.params.endOffset?.y ?? 0;
  const dx = end.x - start.x, dy = end.y - start.y;
  return { start, end, duration: Math.hypot(dx, dy) * 1000 / track.params.speed, rotation: dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx) };
}
export function trackDuration(doc, manifest, track, starts = resolveStarts(doc, manifest)) {
  if (isAction(track)) return framesForTrack(doc, manifest, track).length * 1000 / track.params.fps;
  if (track.type === 'effect') return !track.params.loop && track.params.durationMs != null ? track.params.durationMs : Math.max(1, framesForTrack(doc, manifest, track).length) * 1000 / (track.params.fps * track.params.speed);
  if (track.type === 'flight') return flightInfo(doc, starts, track).duration;
  if (track.type === 'damage') return DAMAGE_PLAYBACK_MS;
  if (track.type === 'move') return track.params.durationMs;
  return 0;
}
export function totalDuration(doc, manifest, starts = resolveStarts(doc, manifest)) {
  const lastEnd = Math.max(0, ...doc.tracks.filter(t => t.enabled).map(t => starts.get(t.id) + trackDuration(doc, manifest, t, starts)));
  return doc.settings.durationMode === 'manual' ? Math.max(doc.durationMs, lastEnd) : lastEnd;
}
export function sampleScene(doc, manifest, time) {
  const starts = resolveStarts(doc, manifest), units = unitsAt(doc, starts, time);
  for (const unit of units) {
    const actions = doc.tracks.filter(t => t.enabled && isAction(t) && trackUnit(doc, t)?.id === unit.id && starts.get(t.id) <= time).sort((a, b) => starts.get(a.id) - starts.get(b.id));
    const track = actions.at(-1), elapsed = track ? time - starts.get(track.id) : time;
    let action = track?.params.action || 'idle';
    let atlas = atlasForUnit(doc, manifest, track?.params.unitId || unit.unitId);
    let frames = actionFrames(atlas, action), fps = track?.params.fps || doc.settings.defaultFps;
    if (track && !track.params.loop && elapsed >= frames.length * 1000 / fps && action !== 'dead') { action = 'idle'; atlas = atlasForUnit(doc, manifest, unit.unitId); frames = actionFrames(atlas, action); fps = doc.settings.defaultFps; }
    const loop = action === 'idle' || track?.params.loop;
    const index = loop ? Math.floor(elapsed * fps / 1000) % Math.max(1, frames.length) : Math.min(frames.length - 1, Math.floor(elapsed * fps / 1000));
    Object.assign(unit, { action, atlas, frame: frames[index], frameIndex: index });
  }
  const effects = [];
  for (const track of doc.tracks.filter(t => t.enabled && t.type === 'effect')) {
    const elapsed = time - starts.get(track.id), atlas = manifest.skills.find(s => s.id === track.params.effectId), frames = atlas?.frames || [];
    const hasDuration = !track.params.loop && track.params.durationMs != null;
    if (elapsed < 0 || (hasDuration && elapsed >= track.params.durationMs)) continue;
    const flights = doc.tracks.filter(t => t.enabled && t.type === 'flight' && t.params.effectTrackId === track.id && starts.get(t.id) <= time).sort((a, b) => starts.get(a.id) - starts.get(b.id));
    const flight = flights.at(-1);
    let point = resolvePosition(track.params.position, units, doc.scene), inFlight = false, rotation = 0;
    if (flight) {
      const info = flightInfo(doc, starts, flight), progress = clamp((time - starts.get(flight.id)) / Math.max(1, info.duration), 0, 1);
      if (progress >= 1 && flight.params.hideOnArrival) continue;
      point = { x: info.start.x + (info.end.x - info.start.x) * progress, y: info.start.y + (info.end.y - info.start.y) * progress };
      inFlight = progress < 1;
      if (flight.params.alignToTarget) rotation = info.rotation;
    }
    const rawIndex = Math.floor(elapsed * track.params.fps * track.params.speed / 1000);
    if (frames.length && rawIndex >= frames.length && !track.params.loop && !hasDuration && !inFlight) continue;
    const index = track.params.loop ? rawIndex % Math.max(1, frames.length) : Math.min(frames.length - 1, rawIndex);
    effects.push({ id: track.id, track, atlas, frame: frames[index], x: point.x + track.params.offset.x, y: point.y - track.params.offset.y, rotation, layer: track.params.layer, role: track.params.position.mode === 'caster' ? 'caster' : 'target' });
  }
  const shares = damageShares(doc);
  const damage = doc.tracks.filter(t => t.enabled && t.type === 'damage' && starts.get(t.id) <= time).map(t => ({ id: t.id, age: time - starts.get(t.id), percent: shares.get(t.id), amount: Math.round(doc.settings.previewDamage * shares.get(t.id) / 100), unit: units.find(u => u.id === t.params.unitInstanceId) || units.find(u => u.role === 'target') }));
  return { units, effects, damage, starts };
}
export function validateDocument(doc, manifest) {
  const issues = [], starts = resolveStarts(doc, manifest), shares = damageShares(doc);
  const total = [...shares.values()].reduce((a, b) => a + b, 0);
  if (shares.size && Math.abs(total - 100) > .001) issues.push(`伤害比例合计 ${total.toFixed(2)}%，需要为 100%`);
  const explicit = doc.tracks.filter(t => t.enabled && t.type === 'damage').reduce((a, t) => a + (t.params.share ?? 0), 0);
  if (explicit > 100) issues.push('手动指定的伤害比例超过 100%');
  for (const unit of doc.scene.units) if (!atlasForUnit(doc, manifest, unit.unitId)) issues.push(`单位 ${unit.unitId} 尚未关联有效图集`);
  for (const track of doc.tracks.filter(t => t.enabled)) {
    if (isAction(track)) {
      if (!trackUnit(doc, track)) issues.push(`${track.name}：场景中没有对应单位`);
      if (!framesForTrack(doc, manifest, track).length) issues.push(`${track.name}：动作帧或单位资源缺失`);
    }
    if (track.type === 'effect' && !manifest.skills.some(s => s.id === track.params.effectId)) issues.push(`${track.name}：特效 ${track.params.effectId || '未选择'} 资源缺失`);
    if (track.type === 'flight') {
      const effect = doc.tracks.find(t => t.id === track.params.effectTrackId && t.type === 'effect');
      if (!effect) issues.push(`${track.name}：关联特效不存在`);
      else if (!effect.enabled || starts.get(track.id) < starts.get(effect.id)) issues.push(`${track.name}：飞行必须在关联特效开始播放后触发`);
    }
    if (track.binding) {
      const source = doc.tracks.find(t => t.id === track.binding.trackId);
      if (!source.enabled) issues.push(`${track.name}：关联的${track.binding.anchor === 'end' ? '飞行轨道' : '角色动作'}已禁用`);
      if (track.binding.anchor !== 'end' && track.binding.frame > framesForTrack(doc, manifest, source).length) issues.push(`${track.name}：关联帧超出动作范围，当前预览钳制到最后一帧`);
    }
  }
  return [...new Set(issues)];
}

// Import into a fresh, whitelisted structure. Invalid files never replace the open document.
export function importDocument(input) {
  const fail = message => { throw new Error('配置无效：' + message); };
  if (!input || input.format !== 'RPGCore.SkillPresentation' || input.schemaVersion !== 1) fail('不支持的文件格式或版本');
  const num = (v, low, high, label) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < low || v > high) fail(label); return v; };
  const text = (v, label, max = 200) => { if (typeof v !== 'string' || v.length > max) fail(label); return v; };
  const choice = (v, options, label) => { if (!options.includes(v)) fail(label); return v; };
  const readAction = value => choice(typeof value === 'number' ? Object.keys(ACTION_VALUES).find(name => ACTION_VALUES[name] === value) : value, Object.keys(ACTIONS), '动作');
  const bool = v => typeof v === 'boolean' ? v : fail('布尔参数');
  const doc = createDocument();
  doc.skillId = text(input.skillId, '技能ID'); doc.name = text(input.name, '技能名'); doc.durationMs = num(input.durationMs, 100, 120000, '时长范围100–120000ms');
  const settings = input.settings;
  if (!settings) fail('缺少设置');
  doc.settings = { defaultFps: num(settings.defaultFps, 1, 120, '默认帧率'), effectFps: num(settings.effectFps, 1, 120, '特效帧率'), previewDamage: num(settings.previewDamage, 0, 1e9, '预览伤害'), targetFlip: choice(settings.targetFlip, ['x', 'y', 'none'], '朝向'), collision: choice(settings.collision, ['stop', 'ignore'], '碰撞规则'), durationMode: settings.durationMode === undefined ? 'auto' : choice(settings.durationMode, ['auto', 'manual'], '时长模式') };
  if (!input.scene || input.scene.cols !== 7 || input.scene.rows !== 7 || input.scene.hexWidth !== 98 || input.scene.hexHeight !== 86) fail('地图应为7×7，格子尺寸98×86');
  const coordinateOrigin = input.scene.coordinateOrigin === undefined ? 'top-left' : choice(input.scene.coordinateOrigin, ['top-left', 'bottom-left'], '格子坐标原点');
  if (!Array.isArray(input.scene.units) || input.scene.units.length > 49 || !Array.isArray(input.tracks) || input.tracks.length > 300) fail('单位或轨道数量');
  const identifiers = new Set(), cells = new Set();
  const unique = v => { text(v, '标识符', 100); if (!v || identifiers.has(v)) fail('标识符重复'); identifiers.add(v); return v; };
  const integer = (v, lo, hi, label) => { num(v, lo, hi, label); if (!Number.isInteger(v)) fail(label); return v; };
  const readRow = (value, label) => {
    const row = integer(value, 0, 6, label);
    return coordinateOrigin === 'top-left' ? doc.scene.rows - 1 - row : row;
  };
  doc.scene.units = input.scene.units.map(u => {
    const value = { id: unique(u.id), unitId: integer(u.unitId, 1, 1e10, '单位ID'), q: integer(u.q, 0, 6, 'q坐标'), r: readRow(u.r, 'r坐标'), role: choice(u.role, ['caster', 'target'], '角色类型'), scale: num(u.scale ?? 1, .1, 5, '单位缩放') };
    const key = `${value.q},${value.r}`; if (cells.has(key)) fail('多个单位占据同一格'); cells.add(key); return value;
  });
  doc.resourceMappings = Object.create(null);
  for (const [key, value] of Object.entries(input.resourceMappings || {})) { if (!/^\d+$/.test(key)) fail('资源映射ID'); doc.resourceMappings[key] = text(value, '图集ID'); }
  const readPosition = p => {
    if (!p) fail('缺少位置参数');
    return { mode: choice(p.mode, ['caster', 'target', 'custom'], '位置类型'), relativeTo: choice(p.relativeTo, ['caster', 'target', 'global'], '相对坐标'), x: num(p.x, -10000, 10000, '位置X'), y: num(p.y, -10000, 10000, '位置Y') };
  };
  const readFlightOffset = (value, label) => {
    if (value === undefined) return { x: 0, y: 0 };
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label);
    return { x: num(value.x, -10000, 10000, label + 'X'), y: num(value.y, -10000, 10000, label + 'Y') };
  };
  const readBinding = binding => {
    if (!binding) return null;
    const trackId = text(binding.trackId, '关联轨道'), offsetMs = num(binding.offsetMs || 0, -120000, 120000, '关联偏移');
    if (binding.anchor === 'end') return { trackId, anchor: 'end', offsetMs };
    if (binding.anchor !== undefined) fail('不支持的关联锚点');
    return { trackId, frame: integer(binding.frame, 1, 10000, '关联帧'), offsetMs };
  };
  doc.tracks = input.tracks.map(t => {
    const type = choice(t.type, Object.keys(TYPES), '节点类型'), p = t.params;
    if (!p) fail('缺少节点参数');
    let params;
    if (isAction(t)) params = { unitInstanceId: text(p.unitInstanceId, '单位实例'), unitId: p.unitId === null ? null : integer(p.unitId, 1, 1e10, '动作单位ID'), action: readAction(p.action), fps: num(p.fps, 1, 120, '动作帧率'), loop: bool(p.loop) };
    if (type === 'effect') params = { effectId: text(p.effectId, '特效ID'), fps: num(p.fps, 1, 120, '特效帧率'), speed: num(p.speed, .05, 20, '特效倍率'), position: readPosition(p.position), layer: choice(p.layer, ['top', 'auto', 'bottom'], '图层'), offset: { x: num(p.offset?.x, -10000, 10000, '偏移X'), y: num(p.offset?.y, -10000, 10000, '偏移Y') }, scale: num(p.scale, .1, 10, '特效缩放'), loop: bool(p.loop), durationMs: p.durationMs == null ? null : num(p.durationMs, 1, 120000, '特效持续时间范围1–120000ms'), multiTarget: p.multiTarget === undefined ? false : bool(p.multiTarget) };
    if (type === 'flight') params = { effectTrackId: text(p.effectTrackId, '特效轨道'), speed: num(p.speed, 1, 10000, '飞行速度'), start: readPosition(p.start), end: readPosition(p.end), startOffset: readFlightOffset(p.startOffset, '飞行起点偏移'), endOffset: readFlightOffset(p.endOffset, '飞行终点偏移'), hideOnArrival: bool(p.hideOnArrival), alignToTarget: p.alignToTarget === undefined ? false : bool(p.alignToTarget) };
    if (type === 'damage') params = { share: p.share === null ? null : num(p.share, 0, 100, '伤害占比'), unitInstanceId: text(p.unitInstanceId, '受伤单位') };
    if (type === 'move') {
      const moveType = p.moveType === undefined ? 3 : integer(p.moveType, 1, 4, '移动类型');
      if (moveType === 4 && p.targetCell === undefined) fail('全局移动缺少目标格子');
      const targetCell = p.targetCell === undefined ? { q: 0, r: 0 }
        : { q: integer(p.targetCell?.q, 0, 6, '目标格q'), r: readRow(p.targetCell?.r, '目标格r') };
      params = { unitInstanceId: text(p.unitInstanceId, '位移单位'), cell: { q: integer(p.cell?.q, 0, 6, '位移格q'), r: readRow(p.cell?.r, '位移格r') }, moveType, targetCell, direction: integer(p.direction ?? 0, 0, 5, '六边形方向'), steps: integer(p.steps ?? 1, 1, 12, '位移格数'), durationMs: num(p.durationMs, 0, 30000, '位移耗时'), bounceDistance: p.bounceDistance === undefined ? 20 : num(p.bounceDistance, 0, 10000, '受阻回弹距离'), bounceDurationMs: p.bounceDurationMs === undefined ? 200 : num(p.bounceDurationMs, 0, 30000, '受阻回弹耗时') };
    }
    return { id: unique(t.id), name: text(t.name, '轨道名称'), type, enabled: bool(t.enabled), startMs: num(t.startMs, 0, 120000, '开始时间'), binding: readBinding(t.binding), params };
  });
  const tracksById = new Map(doc.tracks.map(t => [t.id, t]));
  for (const t of doc.tracks) {
    if (t.binding) {
      const source = tracksById.get(t.binding.trackId);
      if (t.binding.anchor === 'end') {
        if (!source || source.type !== 'flight') fail('飞行结束关联源不存在');
      } else if (!source || !isAction(source)) fail('帧关联源不存在');
    }
    if (t.params.unitInstanceId && !doc.scene.units.some(u => u.id === t.params.unitInstanceId)) fail('引用的单位实例不存在');
    if (t.type === 'flight' && !doc.tracks.some(e => e.id === t.params.effectTrackId && e.type === 'effect')) fail('飞行引用的特效不存在');
  }
  // Detect cycles independently of resource availability.
  const visiting = new Set(), done = new Set();
  const visit = t => { if (visiting.has(t.id)) fail('轨道时间关联循环'); if (done.has(t.id)) return; visiting.add(t.id); if (t.binding) visit(tracksById.get(t.binding.trackId)); visiting.delete(t.id); done.add(t.id); };
  doc.tracks.forEach(visit);
  return doc;
}
export function exportDocument(doc, manifest) {
  const result = clone(doc), starts = resolveStarts(doc, manifest), shares = damageShares(doc);
  for (const track of result.tracks.filter(isAction)) {
    const action = ACTION_VALUES[track.params.action];
    if (typeof action !== 'number') throw new Error('配置无效：动作');
    track.params.action = action;
  }
  result.resolved = { durationMs: totalDuration(doc, manifest, starts), damagePercentTotal: [...shares.values()].reduce((a, b) => a + b, 0), nodes: doc.tracks.map(t => ({ trackId: t.id, startMs: starts.get(t.id), durationMs: trackDuration(doc, manifest, t, starts), ...(shares.has(t.id) ? { damagePercent: shares.get(t.id) } : {}) })) };
  return result;
}
