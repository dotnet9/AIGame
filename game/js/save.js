// 存档：localStorage + 遗忘曲线状态
import { FEED_INTERVALS } from './words.js';

const KEY = 'wordpet_save_v1';

function fresh() {
  return {
    pets: {},          // id -> { hatchedAt, fedAt, feedStage, feeds }
    gates: {},         // boat / light / wind / beanstalk
    visited: [],       // 去过的区域
    player: null,      // 上次位置 {x,y,z,yaw,camYaw,isle}
    book: { sem: null, units: {} }, // 课本：选中学期 + 单元成绩 {'3a#0': {scores:[..], done:true}}
    intro: false,
    playSeconds: 0,
    profile: { username: '', score: 0, sessionScore: 0 },
  };
}

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw);
    // 深度合并 + 兼容旧版本存档（缺字段自动补齐）
    const merged = Object.assign(fresh(), d);
    merged.pets = d.pets || {};
    merged.gates = d.gates || {};
    merged.visited = d.visited || [];
    merged.book = Object.assign({ sem: null, units: {} }, d.book || {});
    merged.profile = Object.assign({ username: '', score: 0, sessionScore: 0 }, d.profile || {});
    if (!merged.player) merged.player = null;
    return merged;
  } catch (e) {
    return fresh();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 隐身模式等 */ }
}

export function getSave() { return data; }

export function isHatched(id) { return !!data.pets[id]; }

export function hatch(id) {
  const now = Date.now();
  data.pets[id] = { hatchedAt: now, fedAt: now, feedStage: 0, feeds: 0 };
  save();
}

// 距离下次该喂养的剩余时间（<0 表示已经饿了）
export function hungryIn(id) {
  const p = data.pets[id];
  if (!p) return Infinity;
  const interval = FEED_INTERVALS[Math.min(p.feedStage, FEED_INTERVALS.length - 1)];
  return p.fedAt + interval - Date.now();
}

export function isHungry(id) { return hungryIn(id) < 0; }

export function feed(id) {
  const p = data.pets[id];
  if (!p) return;
  p.feedStage = Math.min(p.feedStage + 1, FEED_INTERVALS.length - 1);
  p.fedAt = Date.now();
  p.feeds += 1;
  save();
}

export function hungryPets() {
  return Object.keys(data.pets).filter(isHungry);
}

export function hatchedCount() { return Object.keys(data.pets).length; }

export function setGate(name) { data.gates[name] = true; save(); }
export function hasGate(name) { return !!data.gates[name]; }

export function addVisited(zone) {
  if (data.visited.includes(zone)) return false;
  data.visited.push(zone);
  save();
  return true;
}
export function getVisited() { return data.visited; }

export function savePlayer(p) { data.player = p; save(); }
export function getPlayer() { return data.player; }

export function setBookSem(sem) { data.book.sem = sem; save(); }
export function getBookSem() { return data.book.sem; }
export function saveUnitResult(key, scores) {
  data.book.units[key] = { scores, done: scores.length > 0 };
  save();
}
export function getUnitResult(key) { return data.book.units[key]; }

export function setIntro(v) { data.intro = v; save(); }
export function getIntro() { return data.intro; }

export function addPlaySeconds(s) { data.playSeconds += s; save(); }

export function getUsername() { return data.profile.username || ''; }
export function getScore() { return Number(data.profile.score) || 0; }
export function getSessionScore() { return Number(data.profile.sessionScore) || 0; }
export function setUsername(name) {
  data.profile.username = String(name || '').trim().slice(0, 20);
  save();
}

// 每完成一个学习挑战加 1 分；本地先记账，联网时再同步到排行榜服务。
export function addPoint() {
  if (!data.profile.username) return;
  data.profile.score = getScore() + 1;
  data.profile.sessionScore = getSessionScore() + 1;
  save();
  const body = JSON.stringify({ username: data.profile.username, delta: 1 });
  try {
    fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (e) { /* 静态站点或离线时保留本地积分 */ }
}

export function resetSessionScore() { data.profile.sessionScore = 0; save(); }

export function resetSave() { data = fresh(); save(); }
