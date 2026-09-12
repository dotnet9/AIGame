// 存档：localStorage + 遗忘曲线状态 + 星星/装扮/每日任务
import { FEED_INTERVALS } from './words.js';

const KEY = 'wordpet_save_v1';

// 每日任务池：按日期轮换，完成奖 5 颗星星
export const DAILY_QUESTS = [
  { id: 'feed2', goal: 2, text: '喂饱 2 只想你的词宠' },
  { id: 'hatch2', goal: 2, text: '孵化 2 颗新词宠蛋' },
  { id: 'gate1', goal: 1, text: '解开 1 个机关谜题' },
  { id: 'goodread', goal: 1, text: '朗读拿到 1 次 95 分以上' },
  { id: 'summon3', goal: 3, text: '召唤 3 次词宠' },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fresh() {
  return {
    pets: {},          // id -> { hatchedAt, fedAt, feedStage, feeds }
    gates: {},         // boat / light / wind / beanstalk / sandWall / vines
    visited: [],       // 去过的区域
    player: null,      // 上次位置 {x,y,z,yaw,camYaw,isle}
    book: { sem: null, units: {} }, // 课本：选中学期 + 单元成绩 {'3a#0': {scores:[..], done:true}}
    intro: false,
    playSeconds: 0,
    profile: { username: '', password: '', registered: false, score: 0, sessionScore: 0, gender: 'boy', stars: 0,
      wear: { hat: '', hatOwned: [], balloon: false, balloonOwned: false, wand: false, wandOwned: false } },
    daily: { day: '', idx: 0, n: 0, done: false },
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
    merged.profile = Object.assign(fresh().profile, d.profile || {});
    merged.profile.wear = Object.assign(fresh().profile.wear, d.profile?.wear || {});
    if (!merged.profile.gender) merged.profile.gender = 'boy'; // 老存档没有性别字段 → 默认男孩
    if (typeof merged.profile.stars !== 'number') merged.profile.stars = 0;
    // 老存档没有密码字段：留空即可（密码允许为空）
    if (typeof merged.profile.password !== 'string') merged.profile.password = '';
    // 是否已建过档案（用来决定是否直接续玩）；老存档默认 false，下次填一次名字即可
    if (typeof merged.profile.registered !== 'boolean') merged.profile.registered = false;
    merged.daily = Object.assign({ day: '', idx: 0, n: 0, done: false }, d.daily || {});
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

// 稀有词宠（95 分孵化）与进化形态标记
export function markRare(id) {
  if (data.pets[id] && !data.pets[id].rare) { data.pets[id].rare = true; save(); }
}
export function markEvolved(id) {
  if (data.pets[id] && !data.pets[id].evo) { data.pets[id].evo = true; save(); }
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
// 登录时用服务端分数补上本机（换设备登录时本地是 0，但账号其实有分）；只升不降，避免抹掉离线攒的分
export function syncScore(serverScore) {
  const n = Number(serverScore);
  if (!Number.isFinite(n) || n <= getScore()) return;
  data.profile.score = Math.floor(n);
  save();
}
export function setUsername(name) {
  data.profile.username = String(name || '').trim().slice(0, 20);
  save();
}
export function getGender() { return data.profile.gender === 'girl' ? 'girl' : 'boy'; }
export function setGender(g) {
  data.profile.gender = g === 'girl' ? 'girl' : 'boy';
  save();
}
export function getPassword() { return data.profile.password || ''; }
export function setPassword(pwd) { data.profile.password = String(pwd || ''); save(); }
export function isRegistered() { return !!data.profile.registered; }
export function setRegistered(v) { data.profile.registered = !!v; save(); }

// 每完成一个学习挑战加 1 分；本地先记账，联网时再同步到排行榜服务。
export function addPoint() {
  if (!data.profile.username) return;
  data.profile.score = getScore() + 1;
  data.profile.sessionScore = getSessionScore() + 1;
  save();
  // 还没建档案就只记本地分；有档案（哪怕密码为空）才同步给排行榜
  if (!data.profile.registered) return;
  const body = JSON.stringify({
    username: data.profile.username, password: data.profile.password, delta: 1, gender: getGender(),
  });
  try {
    fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch (e) { /* 静态站点或离线时保留本地积分 */ }
}

export function resetSessionScore() { data.profile.sessionScore = 0; save(); }

// ---------- 星星经济 ----------
export function getStars() { return Number(data.profile.stars) || 0; }
export function addStars(n) {
  data.profile.stars = Math.max(0, getStars() + n);
  save();
  return data.profile.stars;
}
export function spendStars(n) {
  if (getStars() < n) return false;
  data.profile.stars = getStars() - n;
  save();
  return true;
}

// ---------- 装扮（许愿井商店） ----------
export function getWear() { return data.profile.wear; }
export function updateWear(patch) {
  Object.assign(data.profile.wear, patch);
  save();
  return data.profile.wear;
}

// ---------- 每日任务 ----------
export function getDaily() {
  const today = todayKey();
  if (data.daily.day !== today) {
    // 跨天：轮换到下一个小任务，进度清零
    const idx = data.daily.day ? (data.daily.idx + 1) % DAILY_QUESTS.length
      : Math.floor(Math.abs(new Date().getTimezoneOffset() + new Date().getDate() * 7)) % DAILY_QUESTS.length;
    data.daily = { day: today, idx, n: 0, done: false };
    save();
  }
  return { ...DAILY_QUESTS[data.daily.idx], n: data.daily.n, done: data.daily.done, key: data.daily.idx };
}
// 推进度：命中今日任务类型才计数；刚完成时自动发 5 颗星星。返回 'done' | 'progress' | null
export function bumpDaily(id, n = 1) {
  const q = DAILY_QUESTS[data.daily.idx];
  if (!q || q.id !== id || data.daily.done) return null;
  data.daily.n += n;
  let result = 'progress';
  if (data.daily.n >= q.goal) {
    data.daily.done = true;
    addStars(5);
    result = 'done';
  }
  save();
  return result;
}

export function resetSave() { data = fresh(); save(); }
