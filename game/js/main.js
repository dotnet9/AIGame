// 词宠岛 · 入口
import * as THREE from 'three';
import { Game } from './game.js';
import * as save from './save.js';
import * as ui from './ui.js';
import { CURRICULUM } from './curriculum.js';

window.THREE = THREE; // 调试句柄

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
function begin(name, semKey, gender) {
  if (started) return;
  started = true;
  try {
    const profile = document.getElementById('profile');
    if (profile) profile.classList.add('hidden');
    if (name) save.setUsername(name);
    if (semKey) save.setBookSem(semKey);
    if (gender) save.setGender(gender);   // 只在档案提交时更新；续玩/改档案后的自动重载不带参，别把性别重置
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

if (save.getUsername() && CURRICULUM[save.getBookSem()]) begin();
else ui.showProfile(begin, { username: save.getUsername(), semKey: save.getBookSem() });
