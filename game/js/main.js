// 词宠岛 · 入口
import './compat.js'; // 兼容垫片（roundRect 等），必须最先加载
import './version.js'; // 热更新检测：线上有新版本时提示刷新
import * as THREE from 'three';
import { Game } from './game.js';
import * as save from './save.js';
import * as ui from './ui.js';
import { CURRICULUM } from './curriculum.js';
import { AUTO_SPECS, WORDS } from './words.js';
import { setAutoSpecs, buildPet, petThumbnail } from './models.js';

setAutoSpecs(AUTO_SPECS); // 海岛词宠的参数化模型配方

window.THREE = THREE; // 调试句柄
window.__save = save; // 调试句柄
window.__ui = ui;     // 调试句柄
window.__words = WORDS; // 调试句柄
window.__buildPet = buildPet; // 调试句柄
window.__petThumb = petThumbnail; // 调试句柄

const canvas = document.getElementById('scene');
// 全局错误兜底（别让小朋友卡在黑屏）
window.addEventListener('error', e => {
  const el = document.getElementById('loading');
  if (el && !el.classList.contains('done')) {
    el.querySelector('.loading-text').textContent = '哎呀，加载出了点小问题，请刷新试试（需要联网加载 3D 引擎）';
    console.error(e.error || e.message);
  }
});

let started = false;
async function begin(name, semKey, gender, password, serverScore) {
  if (started) return;
  started = true;
  try {
    const profile = document.getElementById('profile');
    if (profile) profile.classList.add('hidden');
    // 从弹窗提交进来才更新档案；自动续玩时不带参，别覆盖已有资料
    if (name) {
      save.setUsername(name);
      save.setPassword(password || '');   // 密码允许为空
      save.setRegistered(true);
    }
    if (serverScore != null) save.syncScore(serverScore);   // 换设备登录时补上账号里的分数
    // 换设备/重新登录：拉取服务器存档合并本地（词宠/星星/进度），失败静默走本地
    try { await save.pullSave(); } catch (e) { /* ignore */ }
    if (semKey) save.setBookSem(semKey);
    if (gender) save.setGender(gender);
    save.resetSessionScore();
    const game = new Game(canvas);
    game.start();
    window.__game = game; // 调试句柄
  } catch (err) {
    console.error(err);
    window.__bootErr = err && (err.stack || err.message);
    const el = document.getElementById('loading');
    if (el) {
      const esc = s => String(s).replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
      const msg = esc((err && err.message) || err || '未知错误');
      const log = (window.__errLog || []).slice(-2).map(esc).join('；');
      el.querySelector('.loading-text').innerHTML =
        '哎呀，加载 3D 画面时出了点小问题，请关掉其他应用后刷新重试' +
        `<small style="display:block;margin-top:10px;font-size:12px;opacity:.75;word-break:break-all">${msg}${log ? '<br>' + log : ''}</small>`;
    }
  }
}

// 建过档案（有昵称、选好课本）就直接续玩；否则弹窗：有昵称的走登录，没有的走注册
if (save.getUsername() && save.isRegistered() && CURRICULUM[save.getBookSem()]) begin();
else ui.showProfile(begin, {
  username: save.getUsername(), password: save.getPassword(), registered: save.isRegistered(),
  semKey: save.getBookSem(), gender: save.getGender(),
}, { mode: save.getUsername() ? 'login' : 'register' });
