// 存档：localStorage + 遗忘曲线状态
import { FEED_INTERVALS } from './words.js';

const KEY = 'wordpet_save_v1';

function fresh() {
  return {
    pets: {},          // id -> { hatchedAt, fedAt, feedStage, feeds }
    gates: {},         // boat / light / wind / beanstalk
    visited: [],       // 去过的区域
    player: null,      // 上次位置 {x,y,z,yaw,camYaw,isle}
    intro: false,
    playSeconds: 0,
  };
}

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw);
    return Object.assign(fresh(), d);
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

export function setIntro(v) { data.intro = v; save(); }
export function getIntro() { return data.intro; }

export function addPlaySeconds(s) { data.playSeconds += s; save(); }

export function resetSave() { data = fresh(); save(); }
