// DOM UI：HUD、挑战弹窗（语音+拼块）、召唤、图鉴、引导、提示
import { sfx, speak, speakSlow, speakSyllables, spellLetters } from './audio.js';
import { voiceSupported, voiceBlockedByInsecure, isVoiceBroken } from './speech.js';
import { CURRICULUM, gradeKey } from './curriculum.js';

const $ = id => document.getElementById(id);
const els = {};
for (const id of ['loading', 'hud', 'pet-count', 'score-pill', 'hungry-pill', 'prompt', 'prompt-key', 'prompt-text',
  'quest', 'quest-text', 'modal', 'modal-title', 'word-en', 'word-zh', 'word-hint', 'btn-play', 'btn-mic',
  'mic-label', 'voice-feedback', 'score-panel', 'score-ring', 'score-num', 'score-stars', 'score-msg',
  'spell-area', 'spell-slots', 'spell-tiles', 'btn-replay-letters', 'btn-show-help-word',
  'btn-skip',
  'btn-switch-spell', 'modal-close', 'modal-foot', 'picker', 'picker-grid', 'picker-close',
  'catalog', 'catalog-grid', 'catalog-close', 'map', 'map-canvas', 'map-close',
  'leaderboard-widget', 'leaderboard-list', 'leaderboard-refresh',
  'intro', 'intro-emoji', 'intro-text', 'intro-next',
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
  // 手机上横向空间小：去掉可推断的字，只留数字
  els.petCount.textContent = isTouchMode ? `🐾 ${count}/${total}` : `🐾 词宠 ${count}/${total}`;
  const hungry = hungryCount > 0;
  els.hungryPill.classList.toggle('hidden', !hungry);
  els.hungryPill.textContent = isTouchMode ? `🍖 ${hungryCount} 只饿啦` : `🍖 有 ${hungryCount} 只词宠想你啦`;
  document.body.classList.toggle('has-hungry', hungry);
}

export function hideLoading() {
  els.loading.classList.add('done');
  setTimeout(() => els.loading.classList.add('hidden'), 700);
}

// ---------- 任务横幅 ----------
export function setQuest(text) {
  if (els.questText.textContent !== text) els.questText.textContent = text;
}

// ---------- 挑战弹窗 ----------
const ch = {
  open: false, word: null, mode: 'hatch', spellMode: false,
  slots: [], filled: [], tiles: [], onSuccess: null, onClose: null,
  busy: false, listening: false, canVoice: false,
};

export function openChallenge({ word, mode, onSuccess, onClose, onSkip }) {
  ch.open = true; ch.word = word; ch.mode = mode; ch.onSuccess = onSuccess; ch.onClose = onClose; ch.onSkip = onSkip;
  ch.busy = false; ch.spellMode = false; ch.listening = false;
  els.modalTitle.textContent = mode === 'feed' ? '🍖 词宠饿啦，喊它的名字喂它'
    : mode === 'practice' ? '📖 跟读练习 · 大声读给词宠听'
    : '🥚 遇见词宠蛋！念出单词唤醒它';
  els.wordEn.textContent = word.en;
  els.wordEn.classList.remove('spell-hidden');
  els.wordZh.textContent = word.zh;
  els.wordHint.textContent = '小提示：' + word.hint;
  els.voiceFeedback.textContent = '';
  els.voiceFeedback.className = '';
  els.scorePanel.classList.add('hidden');
  els.micLabel.textContent = '点我开始读';
  els.spellArea.classList.add('hidden');
  els.modalFoot.classList.remove('hidden');
  els.btnSkip.classList.toggle('hidden', mode !== 'practice');
  // 能不能“读”：在线识别可用，或设备能录音（改走自带的本地识别模型）
  const canRecord = typeof MediaRecorder !== 'undefined'
    && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const onlineVoice = voiceSupported && !isVoiceBroken();
  const canVoice = onlineVoice || canRecord;
  els.btnMic.classList.toggle('hidden', !canVoice);
  ch.canVoice = canVoice;
  if (voiceBlockedByInsecure) {
    els.voiceFeedback.textContent = '🎤 要 https:// 网址才能语音，先拼字母块吧';
    setSpellMode(true);
  } else if (canRecord && !onlineVoice) {
    els.voiceFeedback.textContent = '🎤 用本地识别朗读，第一次要下载一下';
  } else if (!canVoice) {
    els.voiceFeedback.textContent = '🎤 这台设备用不了语音，先拼字母块吧';
    setSpellMode(true);
  }
  els.modal.classList.remove('hidden');
  // 自动示范两遍发音（正常速 + 童声慢速文件）
  setTimeout(() => speak(word.en), 400);
  setTimeout(() => speakSlow(word.en), 1500);
}

export function closeChallenge() {
  if (!ch.open) return;
  ch.open = false;
  els.modal.classList.add('hidden');
  if (ch.onClose) ch.onClose();
}

export function challengeOpen() { return ch.open; }

// ---------- 麦克风：点击开始，再点结束（说完也会自动识别） ----------
let listeningTimer = null;

function setListening(on) {
  ch.listening = on;
  els.btnMic.classList.toggle('listening', on);
  els.micLabel.textContent = on ? '说完点这里' : '点我开始读';
}

export function voiceStatus(text) {
  if (ch.open) { els.voiceFeedback.textContent = text; els.voiceFeedback.className = ''; }
}
export function voiceRecording() {
  if (!ch.open) return;
  els.voiceFeedback.textContent = '● 正在录音，读完再点一下';
  els.voiceFeedback.className = 'good';
}
export function voiceUnavailable() {
  if (!ch.open) return;
  setListening(false);
  els.btnMic.classList.add('hidden');
  ch.canVoice = false;
  els.voiceFeedback.textContent = '🎤 语音用不了，改用字母块拼吧';
  setSpellMode(true);
  sfx.miss();
}

els.btnMic.addEventListener('click', () => {
  if (!ch.open || ch.busy || !ch.canVoice) return;
  if (ch.listening) {
    setListening(false);
    clearTimeout(listeningTimer);
    els.voiceFeedback.textContent = '识别中…';
    if (ch.onMicEnd) ch.onMicEnd();
    return;
  }
  setListening(true);
  els.voiceFeedback.textContent = '正在连接语音引擎，请稍等…';
  els.voiceFeedback.className = '';
  const ok = ch.onMic ? ch.onMic() : false;
  if (ok === false) {
    // 识别引擎启动失败：立即降级为字母块，不让小朋友干等
    setListening(false);
    els.voiceFeedback.textContent = '🎤 语音启动失败，改用字母块拼吧';
    setTimeout(() => setSpellMode(true), 500);
    return;
  }
  // 首次加载模型 / 录音最长 30 秒自动收束
  clearTimeout(listeningTimer);
  listeningTimer = setTimeout(() => {
    if (ch.listening) { setListening(false); if (ch.onMicEnd) ch.onMicEnd(); }
  }, 30000);
});

// 语音结果由 game 调用进来：res = { ok, close, heard, score } 或 { error }
export function voiceResult(res) {
  if (!ch.open || ch.busy) return;
  setListening(false);
  clearTimeout(listeningTimer);
  if (res.error) {
    els.voiceFeedback.textContent = res.error === 'no-result'
      ? '没听清，再大声读一次～'
      : '再读一次试试～';
    els.voiceFeedback.className = 'bad';
    sfx.miss();
    return;
  }
  const s = Math.max(0, Math.min(100, res.score || 0));
  showScore(s, res.heard, res);
}

// 评分演出：数字滚动 + 星级 + 音效，≥80 分过关；opts.msg 可自定义评语
function showScore(score, heard, opts = {}) {
  ch.busy = true;
  els.scorePanel.classList.remove('hidden');
  els.scoreRing.style.setProperty('--deg', '0deg');
  // 数字 + 进度环滚动
  let cur = 0;
  const tick = () => {
    cur = Math.min(score, cur + Math.max(1, Math.round(score / 16)));
    els.scoreNum.textContent = cur;
    els.scoreRing.style.setProperty('--deg', (cur / 100 * 360) + 'deg');
    if (cur < score) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // 星级
  const stars = score >= 90 ? 3 : score >= 80 ? 2 : score >= 60 ? 1 : 0;
  els.scoreStars.innerHTML = '';
  for (let i = 0; i < stars; i++) {
    const sp = document.createElement('span');
    sp.className = 'star-pop';
    sp.style.animationDelay = (0.25 + i * 0.22) + 's';
    sp.textContent = '⭐';
    els.scoreStars.appendChild(sp);
  }
  for (let i = stars; i < 3; i++) {
    const sp = document.createElement('span');
    sp.style.opacity = '.3';
    sp.textContent = '☆';
    els.scoreStars.appendChild(sp);
  }
  // 评语 + 音效
  let msg;
  if (opts.msg) msg = opts.msg;
  else if (score >= 95) msg = '🌟 完美发音！你就是单词小明星！';
  else if (score >= 85) msg = '太棒了！发音非常标准！';
  else if (score >= 80) msg = '合格啦！再练一次会更稳！';
  else if (score >= 60) msg = '再试一次，达到 80 分就能过关哦！';
  else if (heard) msg = `听到的是「${heard}」，勇敢再试一次！`;
  else msg = '没听清呢，大声一点点再试！';
  els.scoreMsg.textContent = msg;
  els.scoreMsg.className = score >= 80 ? 'good' : 'bad';
  els.scoreMsg.style.color = score >= 80 ? '#4E9A46' : '#D06A9C';
  if (score >= 85) { sfx.great(); setTimeout(() => sfx.magic(), 500); }
  else if (score >= 70) sfx.good();
  else if (score >= 60) sfx.pop();
  else sfx.miss();

  if (score >= 80) {
    setTimeout(() => {
      els.scorePanel.classList.add('hidden');
      ch.onSuccess && ch.onSuccess({ score, heard });
    }, 1900);
  } else {
    // 未过关：示范音节引导，可继续尝试或换字母块
    setTimeout(() => {
      els.scorePanel.classList.add('hidden');
      ch.busy = false;
      els.voiceFeedback.textContent = `跟我一起读：${ch.word.syl.join(' · ')}`;
      els.voiceFeedback.className = 'bad';
      speakSyllables(ch.word.syl);
    }, 2300);
  }
}

// 练习模式跳过
els.btnSkip.addEventListener('click', () => {
  if (!ch.open || ch.busy || !ch.onSkip) return;
  sfx.pop();
  els.scorePanel.classList.add('hidden');
  ch.onSkip();
});

// 再听一遍发音
els.btnPlay.addEventListener('click', () => {
  if (!ch.word) return;
  sfx.pop();
  speak(ch.word.en);
  setTimeout(() => speakSlow(ch.word.en), 1300);
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
      // 拼完整啦 —— 拼写满分演出
      speak(ch.word.en);
      showScore(100, null, { msg: '🧩 拼写满分！会拼就会读！' });
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
  els.wordEn.classList.toggle('spell-hidden', on);
  if (on) els.voiceFeedback.textContent = '用字母块拼出英文单词吧！';
  if (on) buildSpell();
}
export function updatePlayerScore(score, sessionScore = score) {
  if (els.scorePill) els.scorePill.textContent = isTouchMode ? `🏆 ${score}` : `🏆 ${score} 分 · 本局 ${sessionScore}`;
  leaderboardCurrent.score = Number(score) || 0;
  scheduleLeaderboardRefresh();
}

let leaderboardCurrent = { username: '', score: 0 };
let leaderboardTimer = null;
let leaderboardRequest = null;

function leaderboardRowsHtml(rows, current = leaderboardCurrent) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  if (!rows.length) return '<div class="rank-loading">还没有记录，快来拿第一分吧！</div>';
  return rows.slice(0, 5).map((x, i) => {
    const name = String(x.username || '匿名小伙伴');
    const active = current.username && name === current.username ? ' current' : '';
    return `<div class="rank-row${active}"><b>${medals[i]}</b><span>${escapeHtml(name)}</span><strong>${Number(x.score) || 0} 分</strong></div>`;
  }).join('');
}

async function fetchLeaderboardRows() {
  if (!leaderboardRequest) {
    leaderboardRequest = fetch('/api/leaderboard', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) { const err = new Error('offline'); err.status = r.status; throw err; }
        return r.json();
      })
      .then(rows => Array.isArray(rows) ? rows : [])
      .finally(() => { leaderboardRequest = null; });
  }
  return leaderboardRequest;
}

// 排行榜接口不可用时，说清是“后端没部署”还是“网络不通”，并留住自己的分数
function leaderboardOfflineReason(err) {
  return err && err.status === 404 ? '排行榜暂未开通' : '排行榜连不上';
}

function renderLeaderboardOffline(err) {
  if (!els.leaderboardList) return;
  const mine = leaderboardCurrent.username ? `<br>你已有 ${leaderboardCurrent.score} 分` : '';
  els.leaderboardList.innerHTML = `<div class="rank-loading">${leaderboardOfflineReason(err)}${mine}</div>`;
}

export async function refreshLeaderboard(current = {}) {
  if (current.username != null) leaderboardCurrent.username = String(current.username || '').trim();
  if (current.score != null) leaderboardCurrent.score = Number(current.score) || 0;
  if (!els.leaderboardList) return;
  try {
    const rows = await fetchLeaderboardRows();
    els.leaderboardList.innerHTML = leaderboardRowsHtml(rows, leaderboardCurrent);
  } catch (e) {
    renderLeaderboardOffline(e);
  }
}

function scheduleLeaderboardRefresh() {
  clearTimeout(leaderboardTimer);
  leaderboardTimer = setTimeout(() => refreshLeaderboard(), 500);
}

export function setLeaderboardPlayer(current = {}) {
  leaderboardCurrent.username = String(current.username || '').trim();
  leaderboardCurrent.score = Number(current.score) || 0;
  refreshLeaderboard();
}

export function showProfile(onDone, profile = {}) {
  const ov = document.getElementById('profile');
  const input = document.getElementById('profile-name');
  const grade = document.getElementById('profile-grade');
  const term = document.getElementById('profile-term');
  const error = document.getElementById('profile-error');
  input.value = profile.username || '';
  if (CURRICULUM[profile.semKey]) {
    grade.value = profile.semKey[0];
    term.value = profile.semKey[1] === 'a' ? 'up' : 'down';
  }
  let submitted = false;
  ov.classList.remove('hidden'); input.focus();
  const submit = () => {
    if (submitted) return;
    const name = input.value.trim();
    if (!name) { error.textContent = '先写一个名字再出发哦～'; input.focus(); return; }
    if (!grade.value) { error.textContent = '请选择你的年级'; grade.focus(); return; }
    if (!term.value) { error.textContent = '请选择上册或下册'; term.focus(); return; }
    const semKey = gradeKey(grade.value, term.value);
    if (!CURRICULUM[semKey]) return;
    submitted = true;
    ov.classList.add('hidden');
    onDone && onDone(name, semKey);
  };
  document.getElementById('profile-start').onclick = submit;
  input.onkeydown = e => { if (e.key === 'Enter') submit(); };
}

export async function showLeaderboard(current = {}) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div id="rank-card"><button class="round-btn small rank-close">✕</button>
    <div class="rank-title">🏆 词宠岛小小排行榜</div><div class="rank-sub">完成一个挑战得 1 分</div>
    <div class="rank-list"><div class="rank-loading">正在看看谁是单词小明星…</div></div></div>`;
  document.body.appendChild(ov); ov.querySelector('.rank-close').onclick = () => ov.remove();
  const list = ov.querySelector('.rank-list');
  try {
    const rows = await fetchLeaderboardRows();
    list.innerHTML = leaderboardRowsHtml(rows, current);
  } catch (e) { list.innerHTML = `<div class="rank-loading">${leaderboardOfflineReason(e)}，${escapeHtml(current.username || '你')} 已有 ${current.score || 0} 分。</div>`; }
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
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

// ---------- 农场地图 ----------
export function openMap(data) {
  const cv = els.mapCanvas, c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const scale = W / 84;
  const X = x => W / 2 + x * scale, Z = z => H / 2 + z * scale;
  c.clearRect(0, 0, W, H);
  // 草地底
  c.fillStyle = '#BFE8AC';
  c.beginPath(); c.roundRect(0, 0, W, H, 16); c.fill();
  // 河流
  c.fillStyle = '#8FD0E8';
  c.fillRect(0, Z(-3.5), W, 7 * scale);
  // 区域
  for (const zn of data.zones) {
    const x = X(zn.x1), y = Z(zn.z1), w = (zn.x2 - zn.x1) * scale, h = (zn.z2 - zn.z1) * scale;
    c.strokeStyle = zn.discovered ? '#5CA85C' : '#B9AC9E';
    c.lineWidth = 2;
    c.setLineDash(zn.discovered ? [] : [6, 5]);
    c.fillStyle = zn.discovered ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.22)';
    c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill(); c.stroke();
    c.setLineDash([]);
    c.fillStyle = zn.discovered ? '#3E6B36' : '#B9AC9E';
    c.font = 'bold 12px "Microsoft YaHei"';
    c.textAlign = 'center';
    c.fillText((zn.discovered ? zn.name : '？？？') + (zn.locked ? ' 🔒' : ''), x + w / 2, y + h / 2 - 4);
    if (zn.discovered) {
      c.font = '11px "Microsoft YaHei"';
      c.fillText(`词宠蛋 ${zn.total - zn.hatched}/${zn.total}`, x + w / 2, y + h / 2 + 12);
    }
  }
  // 蛋点
  for (const e of data.eggs) {
    c.beginPath();
    c.fillStyle = e.golden ? '#FFC94E' : '#FF9FB6';
    c.arc(X(e.x), Z(e.z), 3.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
  }
  // 玩家
  c.beginPath();
  c.fillStyle = '#4A90D9';
  c.arc(X(data.player.x), Z(data.player.z), 5.5, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
  els.map.classList.remove('hidden');
}
if (els.mapClose) els.mapClose.addEventListener('click', () => els.map.classList.add('hidden'));

// ---------- 课本朗读练习 ----------
let bookOv = null;

export function showBookPanel(data) {
  if (!bookOv) {
    bookOv = document.createElement('div');
    bookOv.className = 'overlay';
    bookOv.id = 'book-panel';
    document.body.appendChild(bookOv);
    bookOv.addEventListener('click', e => { if (e.target === bookOv) bookOv.classList.add('hidden'); });
  }
  const chips = data.sems.map(s =>
    `<button class="book-chip ${s.active ? 'active' : ''}" data-k="${s.key}">${s.label}</button>`).join('');
  const rows = data.units.map((u, i) => {
    const done = u.scores && u.scores.length === u.total;
    const avg = u.scores && u.scores.length
      ? Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length) : null;
    return `<div class="book-row">
      <div class="bi"><div class="bn">${u.name}</div>
        <div class="bp">${done ? '✅ 已完成' : '📖 共 ' + u.total + ' 个词/短语'}${avg != null ? ' · 平均 ' + avg + ' 分' : ''}</div></div>
      <button class="book-go" data-i="${i}">${done ? '再练一遍' : '开始朗读'}</button>
    </div>`;
  }).join('');
  bookOv.innerHTML = `
    <div id="book-card">
      <div id="book-head">
        <span>📚 课本朗读练习</span>
        <button id="book-close" class="round-btn small">✕</button>
      </div>
      <div id="book-sems">${chips}</div>
      <button id="book-quick" class="book-go">🎯 本学期 3 分钟挑战 · 随机 5 题</button>
      <div id="book-units">${rows}</div>
      <div id="book-tip">选择单元 → 听发音 → 点麦克风跟读 → 得分！短语和单词都支持哦</div>
    </div>`;
  bookOv.classList.remove('hidden');
  bookOv.querySelectorAll('.book-chip').forEach(b =>
    b.addEventListener('click', () => { sfx.pop(); data.onSelect(b.dataset.k); }));
  bookOv.querySelectorAll('.book-go').forEach(b =>
    b.addEventListener('click', () => {
      sfx.pop(); bookOv.classList.add('hidden');
      if (b.id === 'book-quick') data.onQuickRound && data.onQuickRound();
      else data.onStart(+b.dataset.i);
    }));
  bookOv.querySelector('#book-close').addEventListener('click', () => bookOv.classList.add('hidden'));
}
export function closeBookPanel() { if (bookOv) bookOv.classList.add('hidden'); }

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
      <div>🗺️ 不知道去哪？点左上角地图，跟着头顶的金色箭头走</div>
      <div>✨ 被挡路时，点 🪄 召唤词宠来帮忙</div>
      <div>🍖 词宠饿了会想你，回去喊它的名字喂它（复习）</div>
      <div>💾 进度自动保存，下次打开网址继续玩</div>
      <div style="margin-top:10px;color:#C4A78F;font-size:13px">词宠岛 · 在玩中学会 36 个农场单词</div>
      <button id="help-close" class="round-btn small" style="position:absolute;top:14px;right:14px">✕</button>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.id === 'help-close') ov.remove(); });
  document.body.appendChild(ov);
}

// ---------- 绑定 HUD 按钮 ----------
export function bindHUD({ onCatalog, onHelp, onBook, onSummon, onPrompt, onMap, onHungryPill, onMic, onMicEnd, onRank, isTouch }) {
  isTouchMode = !!isTouch;
  els.btnCatalog.addEventListener('click', onCatalog);
  els.btnHelp.addEventListener('click', showHelp);
  const rankBtn = document.getElementById('btn-rank');
  if (rankBtn) rankBtn.addEventListener('click', onRank);
  if (els.leaderboardRefresh) els.leaderboardRefresh.addEventListener('click', () => refreshLeaderboard());
  const summonBtn = document.getElementById('btn-summon');
  if (summonBtn) summonBtn.addEventListener('click', onSummon);
  const mapBtn = document.getElementById('btn-map');
  if (mapBtn) mapBtn.addEventListener('click', onMap);
  const bookBtn = document.getElementById('btn-book');
  if (bookBtn) bookBtn.addEventListener('click', onBook);
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
