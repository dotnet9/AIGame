// DOM UI：HUD、挑战弹窗（语音+拼块）、召唤、图鉴、引导、提示
import { sfx, speak, speakSyllables, spellLetters } from './audio.js';
import { voiceSupported } from './speech.js';

const $ = id => document.getElementById(id);
const els = {};
for (const id of ['loading', 'hud', 'pet-count', 'hungry-pill', 'prompt', 'prompt-key', 'prompt-text',
  'modal', 'modal-title', 'word-en', 'word-zh', 'word-hint', 'btn-play', 'btn-mic', 'voice-feedback',
  'spell-area', 'spell-slots', 'spell-tiles', 'btn-replay-letters', 'btn-show-help-word',
  'btn-switch-spell', 'modal-close', 'modal-foot', 'picker', 'picker-grid', 'picker-close',
  'catalog', 'catalog-grid', 'catalog-close', 'intro', 'intro-emoji', 'intro-text', 'intro-next',
  'toast', 'btn-catalog', 'btn-help']) els[id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = $(id);

// ---------- 通用 ----------
let toastTimer = null;
export function toast(text, ms = 2800) {
  els.toast.textContent = text;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), ms);
}

let isTouchMode = false;
export function showPrompt(text, key = 'E') {
  els.promptKey.textContent = (isTouchMode && key === 'E') ? '👆' : key;
  els.promptText.textContent = ' ' + text;
  els.prompt.classList.remove('hidden');
}
export function hidePrompt() { els.prompt.classList.add('hidden'); }

export function updateHUD(count, total, hungryCount) {
  els.petCount.textContent = `🐾 词宠 ${count}/${total}`;
  els.hungryPill.classList.toggle('hidden', hungryCount === 0);
  els.hungryPill.textContent = `🍖 有 ${hungryCount} 只词宠想你啦`;
}

export function hideLoading() {
  els.loading.classList.add('done');
  setTimeout(() => els.loading.classList.add('hidden'), 700);
}

// ---------- 挑战弹窗 ----------
const ch = {
  open: false, word: null, mode: 'hatch', spellMode: false,
  slots: [], filled: [], tiles: [], onSuccess: null, busy: false,
};

export function openChallenge({ word, mode, onSuccess, onClose }) {
  ch.open = true; ch.word = word; ch.mode = mode; ch.onSuccess = onSuccess; ch.onClose = onClose;
  ch.busy = false; ch.spellMode = false;
  els.modalTitle.textContent = mode === 'feed' ? '🍖 词宠饿啦，喊它的名字喂它' : '🥚 遇见词宠蛋！念出单词唤醒它';
  els.wordEn.textContent = word.en;
  els.wordZh.textContent = word.zh;
  els.wordHint.textContent = '小提示：' + word.hint;
  els.voiceFeedback.textContent = '';
  els.voiceFeedback.className = '';
  els.spellArea.classList.add('hidden');
  els.modalFoot.classList.remove('hidden');
  els.btnMic.classList.toggle('hidden', !voiceSupported);
  if (!voiceSupported) els.voiceFeedback.textContent = '这台浏览器不支持语音识别，用下面的字母块吧～';
  els.modal.classList.remove('hidden');
  // 自动示范两遍发音
  setTimeout(() => speak(word.en), 400);
  setTimeout(() => speak(word.en, { rate: 0.65 }), 1400);
}

export function closeChallenge() {
  if (!ch.open) return;
  ch.open = false;
  els.modal.classList.add('hidden');
  if (ch.onClose) ch.onClose();
}

export function challengeOpen() { return ch.open; }

// 语音按钮：按住说话
els.btnMic.addEventListener('pointerdown', () => {
  if (!ch.open || ch.busy || !voiceSupported) return;
  els.btnMic.classList.add('listening');
  els.voiceFeedback.textContent = '在听啦，大声读出来…';
  els.voiceFeedback.className = '';
  if (ch.onMic) ch.onMic();
});
window.addEventListener('pointerup', () => {
  if (els.btnMic.classList.contains('listening')) {
    els.btnMic.classList.remove('listening');
    els.voiceFeedback.textContent = '嗯…让我听听～';
    if (ch.onMicEnd) ch.onMicEnd();
  }
});

// 语音结果由 game 调用进来
export function voiceResult(res) {
  if (!ch.open || ch.busy) return;
  if (res.ok) {
    challengeSuccess(res.heard);
  } else if (res.close) {
    els.voiceFeedback.textContent = `就差一点点！和我一起读：${ch.word.syl.join(' · ')}`;
    els.voiceFeedback.className = 'bad';
    speakSyllables(ch.word.syl);
    sfx.miss();
  } else {
    els.voiceFeedback.textContent = res.heard ? `听到的是「${res.heard}」，再试一次吧！` : '没听清呢，再大声一点点！';
    els.voiceFeedback.className = 'bad';
    sfx.miss();
  }
}

export function challengeSuccess(heard) {
  if (ch.busy) return;
  ch.busy = true; // 防止重复触发（弹窗即将关闭）
  els.voiceFeedback.textContent = heard ? `说得真棒！「${heard}」 ✨` : '太棒了！✨';
  els.voiceFeedback.className = 'good';
  sfx.great();
  ch.onSuccess && ch.onSuccess();
}

// 再听一遍发音
els.btnPlay.addEventListener('click', () => {
  if (!ch.word) return;
  sfx.pop();
  speak(ch.word.en);
  setTimeout(() => speak(ch.word.en, { rate: 0.6 }), 1100);
});

// ---------- 字母块 ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSpell() {
  const w = ch.word.en;
  ch.slots = w.split('');
  ch.filled = w.split('').map(() => null);
  ch.tiles = shuffle(w.split(''));
  els.spellSlots.innerHTML = '';
  els.spellTiles.innerHTML = '';
  ch.slots.forEach(() => {
    const d = document.createElement('div');
    d.className = 'slot';
    els.spellSlots.appendChild(d);
  });
  ch.tiles.forEach((letter, idx) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.textContent = letter;
    b.addEventListener('click', () => tileClick(idx, b));
    els.spellTiles.appendChild(b);
  });
}

function tileClick(idx, btn) {
  if (!ch.open || ch.busy) return;
  const need = ch.word.en[ch.filled.findIndex(x => x === null)];
  if (ch.tiles[idx] === need) {
    const slotIdx = ch.filled.findIndex(x => x === null);
    ch.filled[slotIdx] = ch.tiles[idx];
    els.spellSlots.children[slotIdx].textContent = ch.tiles[idx];
    els.spellSlots.children[slotIdx].classList.add('filled');
    btn.classList.add('used');
    speak(ch.tiles[idx], { rate: 0.6 });
    sfx.pop();
    if (!ch.filled.includes(null)) {
      // 拼完整啦
      speak(ch.word.en);
      challengeSuccess(null);
    }
  } else {
    els.spellArea.classList.remove('shake');
    void els.spellArea.offsetWidth;
    els.spellArea.classList.add('shake');
    sfx.miss();
    els.voiceFeedback.textContent = `${ch.tiles[idx]} 还不是下一个字母哦，听听看～`;
    els.voiceFeedback.className = 'bad';
    speak(ch.word.en, { rate: 0.6 });
  }
}

function setSpellMode(on) {
  ch.spellMode = on;
  els.spellArea.classList.toggle('hidden', !on);
  els.modalFoot.classList.toggle('hidden', on);
  if (on) buildSpell();
}
els.btnSwitchSpell.addEventListener('click', () => { setSpellMode(true); sfx.pop(); });
els.btnReplayLetters.addEventListener('click', () => { spellLetters(ch.word.en); speak(ch.word.en); });
els.btnShowHelpWord.addEventListener('click', () => {
  const slotIdx = ch.filled.findIndex(x => x === null);
  if (slotIdx < 0) return;
  const tileIdx = ch.tiles.findIndex((t, i) => t === ch.word.en[slotIdx] && !els.spellTiles.children[i].classList.contains('used'));
  if (tileIdx >= 0) tileClick(tileIdx, els.spellTiles.children[tileIdx]);
});
els.modalClose.addEventListener('click', () => { sfx.pop(); closeChallenge(); });

// ---------- 召唤面板 ----------
export function openPicker(list, onPick, onClose) {
  els.pickerGrid.innerHTML = '';
  for (const p of list) {
    const chip = document.createElement('div');
    chip.className = 'pick-chip';
    const img = document.createElement('img');
    img.src = p.thumb;
    const n = document.createElement('span');
    n.className = 'n'; n.textContent = p.en;
    const z = document.createElement('span');
    z.className = 'z'; z.textContent = p.zh;
    chip.append(img, n, z);
    chip.addEventListener('click', () => { sfx.pop(); els.picker.classList.add('hidden'); onPick(p.id); });
    els.pickerGrid.appendChild(chip);
  }
  els.picker.classList.remove('hidden');
  els.picker.onclose = onClose;
}
els.pickerClose.addEventListener('click', () => els.picker.classList.add('hidden'));

// ---------- 图鉴 ----------
export function openCatalog(entries) {
  // entries: [{word, hatched, hungry, thumb}]
  els.catalogGrid.innerHTML = '';
  for (const e of entries) {
    const d = document.createElement('div');
    d.className = 'cat-item ' + (e.hatched ? 'open' : 'locked') + (e.hungry ? ' hungry' : '');
    if (e.hatched) {
      d.innerHTML = `<div class="ico"><img src="${e.thumb}" alt=""></div>
        <div class="en">${e.word.en}</div><div class="zh">${e.word.zh}</div>`;
      d.title = e.word.story;
      d.addEventListener('click', () => {
        toast(`「${e.word.en}」${e.word.zh} —— ${e.word.story}`, 4200);
        speak(e.word.en);
      });
    } else {
      d.innerHTML = `<div class="ico">❓</div><div class="en">？？？</div><div class="zh">还没发现</div>`;
      d.title = '去岛上找找发光的词宠蛋吧！';
    }
    els.catalogGrid.appendChild(d);
  }
  els.catalog.classList.remove('hidden');
}
els.catalogClose.addEventListener('click', () => els.catalog.classList.add('hidden'));

// ---------- 开场引导 ----------
export function playIntro(onDone, isTouch = false) {
  const move = isTouch
    ? '用左下角<b>摇杆</b>走路，屏幕上拖动转视角，双指缩放。'
    : '用 <b>W A S D</b> 走路，鼠标右键转动视角，<br>滚轮可以拉近看词宠。';
  const steps = [
    ['🌼', '欢迎来到 <b>词宠岛</b>！<br>这座农场里住着好多词宠蛋，<br>它们只会为<b>会说英文的小朋友</b>孵化哦。'],
    ['🎮', move],
    ['🥚', isTouch
      ? '走近<b>发光的蛋</b>，点一点它，<br>先听发音，再<b>按住 🎤 大声读出来</b>！'
      : '走近<b>发光的蛋</b>，按 <b>E</b> 打开它，<br>先听发音，再<b>按住 🎤 大声读出来</b>！'],
    ['🐾', '孵出来的词宠会成为你的伙伴：<br><b>召唤</b>它们帮你过河、照亮谷仓，<br>它们饿了还会找你<b>复习</b>呢！'],
  ];
  let i = 0;
  const show = () => {
    els.introEmoji.textContent = steps[i][0];
    els.introText.innerHTML = steps[i][1];
    els.introNext.textContent = i === steps.length - 1 ? '出发！' : '好呀！';
  };
  els.intro.classList.remove('hidden');
  show();
  els.introNext.onclick = () => {
    sfx.pop();
    i++;
    if (i >= steps.length) {
      els.intro.classList.add('hidden');
      onDone && onDone();
    } else show();
  };
}

// ---------- 帮助 ----------
export function showHelp() {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const touchLines = matchMedia('(pointer: coarse)').matches
    ? `<div>🕹️ 左下摇杆走路 · 拖动屏幕转视角 · 双指缩放</div>
       <div>👆 走近蛋/词宠时，点屏幕下方的提示条互动</div>`
    : `<div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走路 · 鼠标右键拖动转视角 · 滚轮缩放</div>
       <div><kbd>E</kbd> 或点击：打开词宠蛋 / 和词宠互动</div>`;
  ov.innerHTML = `
    <div id="help-card">
      <h3>🌼 怎么玩</h3>
      ${touchLines}
      <div>🎤 按住说话，念出单词就能孵化词宠</div>
      <div>🧩 不会读？换成字母块拼一拼！</div>
      <div>✨ 被挡路时，点 🪄 召唤词宠来帮忙</div>
      <div>🍖 词宠饿了会想你，回去喊它的名字喂它（复习）</div>
      <div style="margin-top:10px;color:#C4A78F;font-size:13px">词宠岛 · 在玩中学会 36 个农场单词</div>
      <button id="help-close" class="round-btn small" style="position:absolute;top:14px;right:14px">✕</button>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.id === 'help-close') ov.remove(); });
  document.body.appendChild(ov);
}

// ---------- 绑定 HUD 按钮 ----------
export function bindHUD({ onCatalog, onHelp, onSummon, onPrompt, onHungryPill, onMic, onMicEnd, isTouch }) {
  isTouchMode = !!isTouch;
  els.btnCatalog.addEventListener('click', onCatalog);
  els.btnHelp.addEventListener('click', showHelp);
  const summonBtn = document.getElementById('btn-summon');
  if (summonBtn) summonBtn.addEventListener('click', onSummon);
  // 交互提示可以直接点（手机上主要交互方式）
  els.prompt.addEventListener('click', onPrompt);
  if (isTouch) els.promptKey.textContent = '👆';
  els.hungryPill.addEventListener('click', onHungryPill);
  ch.onMic = onMic;
  ch.onMicEnd = onMicEnd;
}

export function setMicHint(text) {
  els.voiceFeedback.textContent = text;
}
