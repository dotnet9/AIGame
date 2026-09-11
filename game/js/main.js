// 词宠岛 · 入口
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
function begin(name, semKey, gender, password, serverScore) {
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
    if (el) el.querySelector('.loading-text').textContent = '哎呀，这台设备跑不起来 3D 画面，换台电脑试试吧';
  }
}

// 建过档案（有昵称、选好课本）就直接续玩；否则弹窗：有昵称的走登录，没有的走注册
if (save.getUsername() && save.isRegistered() && CURRICULUM[save.getBookSem()]) begin();
else ui.showProfile(begin, {
  username: save.getUsername(), password: save.getPassword(), registered: save.isRegistered(),
  semKey: save.getBookSem(), gender: save.getGender(),
}, { mode: save.getUsername() ? 'login' : 'register' });
