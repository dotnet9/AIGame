// 城市配置驱动层：城市内容全部来自 game/data/cities/ 的 JSON，本文件只负责
// 加载调度、路线算法和变体轮换，不写死任何一座城市。新增/修改城市 → 只改 JSON。
import { loadCityIndex, loadCityData } from './data.js';

// 舞台装饰类型 → emoji（city.json variants 的 deco 字段）
export const DECO_EMOJI = {
  lantern: '🏮', chili: '🌶️', boat: '⛵', tea: '🍵', flower: '🌸', shell: '🐚',
  palm: '🌴', bamboo: '🎍', horse: '🐴', grape: '🍇', iceflake: '❄️',
};

// 城市小问答：介绍卡看完弹一题，答对 +1⭐（没写的城市不弹）
export const CITY_QUIZ = {
  chengdu: { q: '成都最有名的动物是？', opts: ['🐼 大熊猫', '🐧 企鹅', '🦁 狮子'], a: 0 },
  beijing: { q: '北京是中国的什么？', opts: ['🏛️ 首都', '🏖️ 海岛', '🏜️ 沙漠'], a: 0 },
  shanghai: { q: '东方明珠塔在哪座城市？', opts: ['🌆 上海', '🏔️ 拉萨', '🐪 敦煌'], a: 0 },
  harbin: { q: '哈尔滨的冰雪大世界用什么做的？', opts: ['❄️ 冰', '🍪 饼干', '🧱 砖头'], a: 0 },
  sanya: { q: '三亚最有名的是？', opts: ['🏖️ 大海和沙滩', '❄️ 雪山', '🏭 工厂'], a: 0 },
  xian: { q: '西安的地下军团是？', opts: ['🗿 兵马俑', '🤖 机器人', '🐻 泰迪熊'], a: 0 },
  hangzhou: { q: '杭州西湖出产的名茶是？', opts: ['🍵 龙井', '🧋 奶茶', '☕ 咖啡'], a: 0 },
  wuhan: { q: '武汉最有名的小吃是？', opts: ['🍜 热干面', '🍣 寿司', '🍕 披萨'], a: 0 },
  chongqing: { q: '重庆最出名的美食是？', opts: ['🌶️ 火锅', '🍰 蛋糕', '🥗 沙拉'], a: 0 },
  kunming: { q: '昆明为什么叫"春城"？', opts: ['🌸 四季如春', '🎄 圣诞之城', '⛄ 冰雪之城'], a: 0 },
  hohhot: { q: '呼和浩特在哪片大草原旁？', opts: ['🐴 内蒙古', '🎋 竹林', '🌋 火山'], a: 0 },
  lhasa: { q: '拉萨的著名宫殿是？', opts: ['🏔️ 布达拉宫', '🏰 灰姑娘城堡', '🗼 铁塔'], a: 0 },
  qingdao: { q: '青岛靠着哪片海？', opts: ['🌊 黄海', '🙅 死海', '🏜️ 沙海'], a: 0 },
  urumqi: { q: '乌鲁木齐哪种水果最甜？', opts: ['🍈 哈密瓜', '🍋 柠檬', '🥑 牛油果'], a: 0 },
  luoyang: { q: '洛阳最出名的花是？', opts: ['🌹 牡丹', '🌸 樱花', '🌻 向日葵'], a: 0 },
  guangzhou: { q: '广州的别称是？', opts: ['🐑 羊城', '🐲 龙城', '🐦 鸟城'], a: 0 },
  nanjing: { q: '南京著名的古建筑是？', opts: ['🧱 明城墙', '🗼 埃菲尔铁塔', '🗿 狮身人面像'], a: 0 },
  changsha: { q: '长沙哪个洲头周末会放烟花？', opts: ['🎆 橘子洲', '🏝️ 椰子洲', '🌵 绿洲'], a: 0 },
};
export function getCityQuiz(id) { return CITY_QUIZ[id] || null; }

// 轻量城市列表（index 全量：档案卡选择器 / IP 定位用）；巡游城市的完整数据在 CITY_MAP
export const CITIES = [];
export const CITY_MAP = {};

const _index = { defaultHome: 'chengdu', finalCity: 'beijing', cities: [] };
let _initPromise = null;
let _loadedKey = '';

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 城市巡游路线：家乡 → 洗牌（家乡/终点除外）→ 终点城市收尾
// seed = 昵称+册：同一孩子同一册每次进游戏路线一致（进度可续）
export function cityRoute(homeId, semKey, count, username = '') {
  const ids = _index.cities.length ? _index.cities.map(c => c.id) : ['chengdu', 'beijing'];
  const home = ids.includes(homeId) ? homeId : _index.defaultHome;
  const final = _index.finalCity;
  const pool = ids.filter(id => id !== home && id !== final);
  let seed = hash(username + '|' + semKey);
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mid = pool.slice(0, Math.max(0, count - 2));
  if (home === final) return [home, ...mid].slice(0, Math.max(1, count));   // 家乡即终点：不重复收尾
  return [home, ...mid, final].slice(0, Math.max(1, count));
}

// 第 visit 次到访（0 起）用哪个介绍版本：常来常新
export function cityVariant(city, visit) {
  const vs = city && city.variants && city.variants.length ? city.variants
    : [{ emoji: '🏙️', intro: city ? city.name : '', introEn: city ? city.en : '', words: [], deco: 'lantern' }];
  return vs[visit % vs.length];
}

// 初始化：读索引 + 加载巡游城市的完整数据（city/universities/foods/scenes）。
// main.js 在 new Game() 之前 await；同参数重复调用只跑一次。
export async function initCities({ homeId, semKey, count = 10, username = '' } = {}) {
  const key = JSON.stringify([homeId || '', semKey || '', count, username]);
  if (_initPromise && _loadedKey === key) return _initPromise;
  _loadedKey = key;
  _initPromise = (async () => {
    const idx = await loadCityIndex();
    _index.cities = idx.cities || [];
    _index.defaultHome = idx.defaultHome || 'chengdu';
    _index.finalCity = idx.finalCity || 'beijing';
    // 轻量列表：选择器与定位只需 id/name/en
    CITIES.length = 0;
    for (const c of _index.cities) CITIES.push({ id: c.id, name: c.name, en: c.en, region: c.region });
    // 巡游路线城市的完整数据
    const route = cityRoute(homeId, semKey, count, username);
    const datas = await Promise.all(route.map(id => loadCityData(id)));
    route.forEach((id, i) => { if (datas[i]) CITY_MAP[id] = datas[i]; });
    // 家乡与终点不在路线时也保底加载（测验/档案/终点仪式要用）
    for (const must of [_index.defaultHome, _index.finalCity]) {
      if (!CITY_MAP[must]) { const d = await loadCityData(must); if (d) CITY_MAP[must] = d; }
    }
    return route;
  })();
  return _initPromise;
}

export function getDefaultHome() { return _index.defaultHome; }
export function getFinalCity() { return _index.finalCity; }
