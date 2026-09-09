// 词宠岛 · 入口
import * as THREE from 'three';
import { Game } from './game.js';

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

try {
  const game = new Game(canvas);
  game.start();
  window.__game = game; // 调试句柄
} catch (err) {
  console.error(err);
  window.__bootErr = err && (err.stack || err.message);
  const el = document.getElementById('loading');
  if (el) el.querySelector('.loading-text').textContent = '哎呀，这台设备跑不起来 3D 画面，换台电脑试试吧';
}
