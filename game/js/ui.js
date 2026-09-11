// DOM UI：HUD、挑战弹窗（语音+拼块）、召唤、图鉴、引导、提示
import { sfx, speak, speakSlow, speakFollow, spellLetters, stopSpeaking, playRecording, scoreVoice } from './audio.js';
import { voiceSupported, voiceBlockedByInsecure, isVoiceBroken } from './speech.js';
import { CURRICULUM, gradeKey } from './curriculum.js';

const $ = id => document.getElementById(id);
const els = {};
for (const id of ['loading', 'hud', 'user-pill', 'pet-count', 'score-pill', 'star-pill', 'hungry-pill', 'prompt', 'prompt-key', 'prompt-text',
  'quest', 'quest-text', 'daily', 'daily-text', 'modal', 'modal-title', 'word-en', 'word-ipa', 'word-zh', 'word-hint', 'btn-play', 'btn-mic',
  'mic-label', 'btn-replay', 'voice-feedback', 'score-panel', 'cheer', 'cheer-emoji', 'cheer-word', 'score-ring', 'score-num', 'score-stars', 'score-msg',
  'spell-area', 'spell-slots', 'spell-tiles', 'btn-replay-letters', 'btn-show-help-word',
  'btn-skip',
  'btn-switch-spell', 'modal-close', 'modal-foot', 'picker', 'picker-title', 'picker-grid', 'picker-close',
  'catalog', 'catalog-grid', 'catalog-close', 'map', 'map-head', 'map-canvas', 'map-close',
  'leaderboard-widget', 'leaderboard-list', 'leaderboard-refresh',
  'intro', 'intro-emoji', 'intro-text', 'intro-next',
  'toast', 'btn-catalog', 'btn-help', 'btn-account', 'profile-close', 'profile-logout',
  'hud-menu', 'btn-menu']) els[id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = $(id);

// 音标表（tools/gen_ipa.py 生成，可选：404 时静默跳过）
let ipaMap = null;
fetch('data/ipa.json').then(r => r.ok ? r.json() : null).then(m => ipaMap = m).catch(() => { ipaMap = null; });

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
  let chip = key;
  if (isTouchMode) {
    if (key === 'E') chip = '👆';
    else if (key === 'Tab') chip = '🪄';   // 手机没有 Tab 键，别把电脑按键显示给孩子
  }
  els.promptKey.textContent = chip;
  els.promptText.textContent = ' ' + text;
  els.prompt.classList.remove('hidden');
}
export function hidePrompt() { els.prompt.classList.add('hidden'); }

// 左上角显示当前登录用户名
export function updateUser(name) {
  if (!els.userPill) return;
  const n = String(name || '').trim();
  els.userPill.textContent = n ? `👤 ${n}` : '👤';
  els.userPill.classList.toggle('hidden', !n);
  els.userPill.title = n ? `${n} 的学习档案` : '';
}

// 劲舞团式喝彩分级：分数 → (大字, 样式, 配套表情)
const SCORE_LEVELS = [
  [95, 'PERFECT!', 'perfect', '🌟'],
  [85, 'GREAT!', 'great', '🎉'],
  [75, 'COOL!', 'cool', '😎'],
  [60, 'NICE!', 'nice', '😊'],
  [40, 'BAD...', 'bad', '😬'],
  [0, 'MISS...', 'miss', '🙈'],
];

export function updateHUD(count, total, hungryCount, chapterText = '') {
  // 手机上横向空间小：去掉可推断的字，只留数字
  els.petCount.textContent = isTouchMode
    ? `🐾 ${count}/${total}`
    : `🐾 ${chapterText ? chapterText + ' · ' : ''}词宠 ${count}/${total}`;
  const hungry = hungryCount > 0;
  els.hungryPill.classList.toggle('hidden', !hungry);
  els.hungryPill.textContent = isTouchMode ? `🍖 ${hungryCount} 只饿啦` : `🍖 有 ${hungryCount} 只词宠想你啦`;
  document.body.classList.toggle('has-hungry', hungry);
}

export function hideLoading() {
  els.loading.classList.add('done');
  setTimeout(() => els.loading.classList.add('hidden'), 700);
}

// 星星栏：数值变化时蹦一下
let lastStars = null;
export function updateStars(n) {
  if (!els.starPill) return;
  n = Number(n) || 0;
  if (n !== lastStars && lastStars !== null) {
    els.starPill.classList.remove('star-pop-anim');
    void els.starPill.offsetWidth;
    els.starPill.classList.add('star-pop-anim');
  }
  lastStars = n;
  els.starPill.textContent = `⭐ ${n}`;
  els.starPill.title = '星星：读单词、喂词宠、解谜题都能赚，去许愿井换装扮！';
}

// 每日任务横幅（进度或完成状态）
export function setDaily(text, done = false) {
  if (!els.daily) return;
  els.daily.classList.toggle('hidden', !text);
  els.daily.classList.toggle('done', !!done);
  if (els.dailyText) els.dailyText.textContent = text || '';
}

// ---------- 任务横幅 ----------
export function setQuest(text) {
  if (els.questText.textContent !== text) els.questText.textContent = text;
}

// ---------- 挑战弹窗 ----------
const ch = {
  open: false, word: null, mode: 'hatch', spellMode: false,
  slots: [], filled: [], tiles: [], onSuccess: null, onClose: null,
  busy: false, listening: false, canVoice: false, replayUrl: null,
};

export function openChallenge({ word, mode, onSuccess, onClose, onSkip }) {
  ch.open = true; ch.word = word; ch.mode = mode; ch.onSuccess = onSuccess; ch.onClose = onClose; ch.onSkip = onSkip;
  ch.busy = false; ch.spellMode = false; ch.listening = false; ch.replayUrl = null;
  toggleHudMenu(false);   // 弹窗打开时收起菜单
  els.modalTitle.textContent = mode === 'feed' ? '🍖 词宠饿啦，喊它的名字喂它'
    : mode === 'practice' ? '📖 跟读练习 · 大声读给词宠听'
    : '🥚 遇见词宠蛋！念出单词唤醒它';
  els.wordEn.textContent = word.en;
  els.wordEn.classList.remove('spell-hidden');
  // 音标（有数据才显示）
  const ipa = ipaMap && ipaMap[String(word.en).toLowerCase()];
  els.wordIpa.textContent = ipa ? `/${ipa}/` : '';
  els.wordIpa.classList.toggle('hidden', !ipa);
  els.wordZh.textContent = word.zh;
  els.wordHint.textContent = '小提示：' + word.hint;
  els.voiceFeedback.textContent = '';
  els.voiceFeedback.className = '';
  els.scorePanel.classList.add('hidden');
  els.btnReplay.classList.add('hidden');
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

// ---------- 麦克风：点击开始 → 10 秒倒计时内读完 → 再点结束（到时也自动识别） ----------
let countdownTimer = null;
const LISTEN_SECONDS = 10;

function stopCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = null;
}

function setListening(on) {
  ch.listening = on;
  els.btnMic.classList.toggle('listening', on);
  stopCountdown();
  if (on) {
    // 10 秒倒计时：显示在麦克风按钮上，到时自动收音识别，不让小朋友干等
    let left = LISTEN_SECONDS;
    els.micLabel.textContent = `读完点这里 ${left}s`;
    countdownTimer = setInterval(() => {
      left--;
      if (left <= 0) {
        stopCountdown();
        if (ch.listening) {   // 到时自动结束并识别（和点一下结束等价）
          setListening(false);
          els.voiceFeedback.textContent = '识别中…';
          if (ch.onMicEnd) ch.onMicEnd();
        }
        return;
      }
      if (ch.listening) els.micLabel.textContent = `读完点这里 ${left}s`;
    }, 1000);
  } else {
    els.micLabel.textContent = '点我开始读';
  }
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
    els.voiceFeedback.textContent = '识别中…';
    if (ch.onMicEnd) ch.onMicEnd();
    return;
  }
  stopSpeaking();          // 停掉示范发音，别盖过孩子的声音
  els.btnReplay.classList.add('hidden');
  setListening(true);
  els.voiceFeedback.textContent = `● 开口大声读！${LISTEN_SECONDS} 秒内读完会自动识别`;
  els.voiceFeedback.className = 'good';
  const ok = ch.onMic ? ch.onMic() : false;
  if (ok === false) {
    // 识别引擎启动失败：立即降级为字母块，不让小朋友干等
    setListening(false);
    els.voiceFeedback.textContent = '🎤 语音启动失败，改用字母块拼吧';
    setTimeout(() => setSpellMode(true), 500);
    return;
  }
});

// 语音结果由 game 调用进来：res = { ok, close, heard, score } 或 { error }
export function voiceResult(res) {
  if (!ch.open || ch.busy) return;
  setListening(false);
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

// 游戏层拿到录音 blob 后调进来：显示“听我读的”回放按钮；传 null 表示隐藏（新一轮录音前）
export function showReplay(url) {
  if (!ch.open) return;
  if (!url) { els.btnReplay.classList.add('hidden'); return; }
  ch.replayUrl = url;
  els.btnReplay.classList.remove('hidden');
}

els.btnReplay.addEventListener('click', () => {
  if (!ch.replayUrl) return;
  sfx.pop();
  els.voiceFeedback.textContent = '🎧 这是你刚才的读音，听听和标准音差在哪～';
  els.voiceFeedback.className = '';
  playRecording(ch.replayUrl);
});

// 评分演出：喝彩大字弹在弹窗之外的屏幕层（飘升消失）+ 带情绪语音 + 数字滚动 + 星级，≥80 分过关
function showScore(score, heard, opts = {}) {
  ch.busy = true;
  els.voiceFeedback.textContent = '';   // 分数都打出来了，“识别中…”别再挂着
  els.voiceFeedback.className = '';
  // 喝彩大字：屏幕层大字 + 配套表情，跳出来往上飘、渐渐消失（弹窗关了它还在飘）
  const lv = SCORE_LEVELS.find(l => score >= l[0]);
  els.cheer.className = '';
  void els.cheer.offsetWidth;           // 重启动画
  els.cheerEmoji.textContent = lv[3];
  els.cheerWord.textContent = lv[1];
  els.cheer.className = 'cheer-run c-' + lv[2];
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
  scoreVoice(score);   // 带情绪的英文喝彩（Perfect!/Great!/Cool!/…）
  if (score >= 85) { sfx.great(); setTimeout(() => sfx.magic(), 500); }
  else if (score >= 70) sfx.good();
  else if (score >= 60) sfx.pop();
  else sfx.miss();

  if (score >= 80) {
    // 过关就要爽快：1.4 秒内自动关卡，不让孩子干等
    setTimeout(() => {
      els.scorePanel.classList.add('hidden');
      ch.onSuccess && ch.onSuccess({ score, heard });
    }, 1400);
  } else {
    // 未过关：先示范标准慢速音（音节高亮同步显示），可继续尝试或换字母块
    setTimeout(() => {
      els.scorePanel.classList.add('hidden');
      ch.busy = false;
      playFollowAlong();
    }, 1900);
  }
}

// 跟读示范：播整词标准慢速音，音节只做高亮同步（不单独念音节，避免 TTS 念走调）
function playFollowAlong() {
  const word = ch.word;
  const syl = word.syl && word.syl.length && !(word.syl.length === 1 && word.syl[0] === word.en)
    ? word.syl : null;
  if (syl) {
    els.voiceFeedback.innerHTML = '跟我一起读：' + syl.map((s, i) =>
      `<span class="syl" data-i="${i}">${escapeHtml(s)}</span>`).join(' · ');
  } else {
    els.voiceFeedback.textContent = '跟我一起读：慢速示范';
  }
  els.voiceFeedback.className = '';
  const marks = els.voiceFeedback.querySelectorAll('.syl');
  speakFollow(word.en, syl || [word.en], i => {
    marks.forEach(el => el.classList.toggle('on', +el.dataset.i === i));
  }, () => {
    marks.forEach(el => el.classList.remove('on'));
  });
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
  // 空格自动补好（短语如 ice cream / good morning），只拼字母
  ch.filled = w.split('').map(c => (c === ' ' ? ' ' : null));
  ch.tiles = shuffle(w.split('').filter(c => c !== ' '));
  els.spellSlots.innerHTML = '';
  els.spellTiles.innerHTML = '';
  ch.slots.forEach(c => {
    const d = document.createElement('div');
    d.className = 'slot' + (c === ' ' ? ' space filled' : '');
    if (c === ' ') d.textContent = '·';
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
  const slotIdx = ch.filled.findIndex(x => x === null);
  const need = ch.word.en[slotIdx];
  if (ch.tiles[idx] === need) {
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
    const gIcon = x.gender === 'girl' ? '👧' : '👦';   // 没有性别记录的老数据默认男孩
    const active = current.username && name === current.username ? ' current' : '';
    return `<div class="rank-row${active}"><b>${medals[i]}</b><span>${gIcon} ${escapeHtml(name)}</span><strong>${Number(x.score) || 0} 分</strong></div>`;
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

export function showProfile(onDone, profile = {}, options = {}) {
  const ov = document.getElementById('profile');
  const input = document.getElementById('profile-name');
  const grade = document.getElementById('profile-grade');
  const term = document.getElementById('profile-term');
  const error = document.getElementById('profile-error');
  const title = ov.querySelector('h2');
  const intro = ov.querySelector('p');
  const start = document.getElementById('profile-start');
  const close = document.getElementById('profile-close');
  const logout = document.getElementById('profile-logout');
  const boyBtn = document.getElementById('gender-boy');
  const girlBtn = document.getElementById('gender-girl');
  const editing = !!options.editing;
  // 性别：男孩 / 女孩，可随时改
  let gender = profile.gender === 'girl' ? 'girl' : 'boy';
  const paintGender = () => {
    boyBtn.classList.toggle('active', gender === 'boy');
    girlBtn.classList.toggle('active', gender === 'girl');
  };
  boyBtn.onclick = () => { gender = 'boy'; sfx.pop(); paintGender(); };
  girlBtn.onclick = () => { gender = 'girl'; sfx.pop(); paintGender(); };
  paintGender();
  input.value = profile.username || '';
  title.textContent = editing ? '学习档案' : '开始前先设置学习档案';
  intro.textContent = editing ? '可以换个名字、形象或年级，保存后会重新进入词宠岛。' : '先选好年级和你的小形象，单词会跟着你的课本走。';
  start.textContent = editing ? '保存并继续' : '出发去词宠岛';
  close.classList.toggle('hidden', !editing);
  logout.classList.toggle('hidden', !editing);
  error.textContent = '';
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
    onDone && onDone(name, semKey, gender);
  };
  start.onclick = submit;
  logout.onclick = () => {
    if (options.onLogout) options.onLogout();
  };
  close.onclick = () => ov.classList.add('hidden');
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
export function openPicker(list, onPick, onClose, opts = {}) {
  els.pickerTitle.textContent = opts.title || '召唤一只词宠来帮忙：';
  els.pickerGrid.innerHTML = '';
  const lazy = [];
  for (const p of list) {
    const chip = document.createElement('div');
    chip.className = 'pick-chip';
    const img = document.createElement('img');
    const n = document.createElement('span');
    n.className = 'n'; n.textContent = p.en;
    const z = document.createElement('span');
    z.className = 'z'; z.textContent = p.zh;
    chip.append(img, n, z);
    chip.addEventListener('click', () => { sfx.pop(); els.picker.classList.add('hidden'); onPick(p.id); });
    els.pickerGrid.appendChild(chip);
    lazy.push({ img, thumb: p.thumb });
  }
  // 缩略图按时间预算分帧补上（全收集后召唤盘可能有几百只）
  let i = 0;
  const fillNext = () => {
    if (!els.pickerGrid.isConnected || els.picker.classList.contains('hidden')) return;
    const t0 = performance.now();
    while (i < lazy.length && performance.now() - t0 < 24) {
      const { img, thumb } = lazy[i++];
      try { img.src = typeof thumb === 'function' ? thumb() : thumb; } catch (e) { /* ignore */ }
    }
    if (i < lazy.length) requestAnimationFrame(fillNext);
  };
  requestAnimationFrame(fillNext);
  els.picker.classList.remove('hidden');
  els.picker.onclose = onClose;
}
els.pickerClose.addEventListener('click', () => els.picker.classList.add('hidden'));

// ---------- 图鉴 ----------
export function openCatalog(entries, getThumb) {
  els.catalogGrid.innerHTML = '';
  const lazyThumbs = [];   // 缩略图分帧生成：全收集 932 只，一次全画会把页面卡死
  for (const e of entries) {
    const d = document.createElement('div');
    d.className = 'cat-item ' + (e.hatched ? 'open' : 'locked') + (e.hungry ? ' hungry' : '');
    if (e.hatched) {
      d.innerHTML = `<div class="ico"><span class="ico-ph">🐾</span></div>
        <div class="en">${e.word.en}</div><div class="zh">${e.word.zh}</div>`;
      d.title = e.word.story;
      d.addEventListener('click', () => {
        toast(`「${e.word.en}」${e.word.zh} —— ${e.word.story}`, 4200);
        speak(e.word.en);
      });
      lazyThumbs.push({ d, w: e.word });
    } else {
      d.innerHTML = `<div class="ico">❓</div><div class="en">？？？</div><div class="zh">还没发现</div>`;
      d.title = '去岛上找找发光的词宠蛋吧！';
    }
    els.catalogGrid.appendChild(d);
  }
  // 按时间预算分帧生成（每帧最多 24ms），不阻塞滚动
  let i = 0;
  const fillNext = () => {
    const grid = els.catalogGrid;
    if (!grid.isConnected) return;   // 图鉴已关闭
    const t0 = performance.now();
    while (i < lazyThumbs.length && performance.now() - t0 < 24) {
      const { d, w } = lazyThumbs[i++];
      const ico = d.querySelector('.ico');
      if (ico && getThumb) {
        try {
          const url = getThumb(w);
          if (url) ico.innerHTML = `<img src="${url}" alt="">`;
        } catch (e) { /* 单张失败不影响其余 */ }
      }
    }
    if (i < lazyThumbs.length) requestAnimationFrame(fillNext);
  };
  requestAnimationFrame(fillNext);
  els.catalog.classList.remove('hidden');
}
els.catalogClose.addEventListener('click', () => els.catalog.classList.add('hidden'));

// ---------- 小火车站 ----------
export function openStation(list, onPick) {
  els.pickerTitle.textContent = '🚂 小火车要开去哪座岛？';
  els.pickerGrid.innerHTML = '';
  for (const isl of list) {
    const chip = document.createElement('div');
    chip.className = 'pick-chip station-chip' + (isl.unlocked ? '' : ' locked');
    const img = document.createElement('span');
    img.className = 'st-emoji';
    img.textContent = isl.emoji;
    const n = document.createElement('span');
    n.className = 'n'; n.textContent = isl.name;
    const z = document.createElement('span');
    z.className = 'z'; z.textContent = isl.unlocked ? '已开放' : `🔒 ${isl.need}`;
    chip.append(img, n, z);
    if (isl.unlocked) chip.addEventListener('click', () => { sfx.pop(); els.picker.classList.add('hidden'); onPick(isl.key); });
    els.pickerGrid.appendChild(chip);
  }
  els.picker.classList.remove('hidden');
}

// ---------- 农场地图 ----------
export function openMap(data) {
  const cv = els.mapCanvas, c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const scale = W / 420;                       // 世界 ±210 都画进来（主岛 + 内圈主题岛 + 中圈短语岛 + 外圈拓展岛）
  const X = x => W / 2 + x * scale, Z = z => H / 2 + z * scale;
  c.clearRect(0, 0, W, H);
  // 大海
  c.fillStyle = '#8FCDE8';
  c.beginPath(); c.roundRect(0, 0, W, H, 16); c.fill();
  // 主岛
  c.fillStyle = '#BFE8AC';
  c.beginPath(); c.arc(X(0), Z(0), 52 * scale, 0, Math.PI * 2); c.fill();
  // 海滩沙子（南）
  c.fillStyle = '#EFDCA8';
  c.beginPath();
  c.moveTo(X(-34), Z(35.5));
  c.quadraticCurveTo(X(0), Z(33.5), X(34), Z(35.5));
  c.arc(X(0), Z(0), 52 * scale, Math.PI * 0.22, Math.PI * 0.78);
  c.closePath(); c.fill();
  // 森林深绿（西）
  c.fillStyle = 'rgba(78,142,78,.55)';
  c.beginPath(); c.ellipse(X(-45), Z(3), 9 * scale, 15 * scale, 0, 0, Math.PI * 2); c.fill();
  // 河流
  c.fillStyle = '#8FD0E8';
  c.fillRect(X(-52), Z(-3.5), 104 * scale, 7 * scale);
  // 机关墙标记
  if (!data.gates || !data.gates.sandWall) {
    c.fillStyle = '#C9A46B';
    c.fillRect(X(-32), Z(37.6), 64 * scale, 1.6 * scale);
  }
  if (!data.gates || !data.gates.vines) {
    c.fillStyle = '#3E7A44';
    c.fillRect(X(-38.8), Z(4.5), 1.6 * scale, 29 * scale);
    c.fillRect(X(-38.8), Z(-33.5), 1.6 * scale, 29 * scale);
  }
  // 群岛
  for (const isl of data.islands || []) {
    c.fillStyle = isl.unlocked ? '#D8F0C8' : '#D8DDE4';
    c.beginPath(); c.arc(X(isl.cx), Z(isl.cz), isl.r * scale, 0, Math.PI * 2); c.fill();
    c.strokeStyle = isl.unlocked ? '#5CA85C' : '#B9AC9E';
    c.lineWidth = 1.5;
    c.stroke();
    c.font = '13px sans-serif';
    c.textAlign = 'center';
    c.fillText(isl.emoji, X(isl.cx), Z(isl.cz) - isl.r * scale + 14);
    c.fillStyle = isl.unlocked ? '#3E6B36' : '#8C8478';
    c.font = 'bold 10px "Microsoft YaHei"';
    c.fillText(isl.name.replace('岛', '').replace('大陆', ''), X(isl.cx), Z(isl.cz) + isl.r * scale - 3);
  }
  // 火车站
  c.font = '12px sans-serif';
  c.fillText('🚂', X(-9), Z(9.6) + 4);
  // 区域
  for (const zn of data.zones) {
    const x = X(zn.x1), y = Z(zn.z1), w = (zn.x2 - zn.x1) * scale, h = (zn.z2 - zn.z1) * scale;
    c.strokeStyle = zn.discovered ? '#5CA85C' : '#B9AC9E';
    c.lineWidth = 1.5;
    c.setLineDash(zn.discovered ? [] : [5, 4]);
    c.fillStyle = zn.discovered ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.18)';
    c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill(); c.stroke();
    c.setLineDash([]);
    c.fillStyle = zn.discovered ? '#3E6B36' : '#B9AC9E';
    c.font = 'bold 11px "Microsoft YaHei"';
    c.textAlign = 'center';
    c.fillText((zn.discovered ? zn.name : '？？？') + (zn.locked ? ' 🔒' : ''), x + w / 2, y + h / 2 - 3);
  }
  // 蛋点
  for (const e of data.eggs) {
    c.beginPath();
    c.fillStyle = e.golden ? '#FFC94E' : '#FF9FB6';
    c.arc(X(e.x), Z(e.z), 3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
  }
  // 玩家
  c.beginPath();
  c.fillStyle = '#4A90D9';
  c.arc(X(data.player.x), Z(data.player.z), 5, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2.5; c.strokeStyle = '#fff'; c.stroke();
  // 标题带上当前关卡
  const headSpan = els.mapHead.querySelector('span');
  if (headSpan) headSpan.textContent = '🗺️ 词宠岛地图' + (data.chapterLabel ? ' · ' + data.chapterLabel : '');
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

// ---------- 许愿井星星商店 ----------
let shopOv = null;
export function showShop({ stars, items, onBuy, onToggle }) {
  if (!shopOv) {
    shopOv = document.createElement('div');
    shopOv.className = 'overlay';
    shopOv.id = 'shop';
    document.body.appendChild(shopOv);
    shopOv.addEventListener('click', e => { if (e.target === shopOv) shopOv.classList.add('hidden'); });
  }
  const rows = items.map(it => {
    const state = !it.owned
      ? `<button class="shop-buy" data-id="${it.id}">⭐ ${it.price} 换</button>`
      : it.on
        ? `<button class="shop-wear on" data-id="${it.id}">穿着中</button>`
        : `<button class="shop-wear" data-id="${it.id}">穿上</button>`;
    return `<div class="shop-row${it.owned ? ' owned' : ''}">
      <div class="shop-emoji">${it.emoji}</div>
      <div class="shop-info"><div class="shop-name">${it.name}</div><div class="shop-desc">${it.desc}</div></div>
      ${state}
    </div>`;
  }).join('');
  shopOv.innerHTML = `
    <div id="shop-card">
      <div id="shop-head">
        <span>⛲ 许愿井 · 星星商店</span>
        <span id="shop-stars">⭐ ${stars}</span>
        <button id="shop-close" class="round-btn small">✕</button>
      </div>
      <div class="shop-tip">读单词、喂词宠、解谜题都能赚星星！</div>
      <div id="shop-list">${rows}</div>
    </div>`;
  shopOv.classList.remove('hidden');
  shopOv.querySelector('#shop-close').onclick = () => shopOv.classList.add('hidden');
  shopOv.querySelectorAll('.shop-buy').forEach(b => b.addEventListener('click', () => {
    const it = items.find(i => i.id === b.dataset.id);
    sfx.pop(); onBuy && onBuy(it);
  }));
  shopOv.querySelectorAll('.shop-wear').forEach(b => b.addEventListener('click', () => {
    const it = items.find(i => i.id === b.dataset.id);
    sfx.pop(); onToggle && onToggle(it);
  }));
}

// ---------- 每日任务板 ----------
let dailyOv = null;
export function showDailyBoard({ quest, stars }) {
  if (!dailyOv) {
    dailyOv = document.createElement('div');
    dailyOv.className = 'overlay';
    dailyOv.id = 'daily-board';
    document.body.appendChild(dailyOv);
    dailyOv.addEventListener('click', e => { if (e.target === dailyOv) dailyOv.classList.add('hidden'); });
  }
  const pct = Math.min(100, Math.round(quest.n / quest.goal * 100));
  dailyOv.innerHTML = `
    <div id="daily-card">
      <div id="daily-head">
        <span>📌 今日任务</span>
        <span id="daily-stars">⭐ ${stars}</span>
        <button id="daily-close" class="round-btn small">✕</button>
      </div>
      <div id="daily-quest-text">${quest.text}</div>
      <div id="daily-bar"><div id="daily-bar-fill" style="width:${pct}%"></div></div>
      <div id="daily-progress">${quest.done ? '🎉 已完成！奖励已到手' : `进度 ${Math.min(quest.n, quest.goal)}/${quest.goal} · 完成奖 ⭐5`}</div>
      <div id="daily-tip">每天来任务板看看，任务会换新的哦～</div>
    </div>`;
  dailyOv.classList.remove('hidden');
  dailyOv.querySelector('#daily-close').onclick = () => dailyOv.classList.add('hidden');
}

// ---------- 开场引导 ----------
export function playIntro(onDone, isTouch = false) {
  const move = isTouch
    ? '用左下角<b>摇杆</b>走路，<b>跳</b>按钮蹦一蹦，<br>屏幕上拖动转视角，双指缩放。'
    : '用 <b>W A S D</b> 或方向键走路，按<b>空格</b>跳一跳，<br>方向键+空格能向前跳，右键拖动转视角。';
  const steps = [
    ['🌼', '欢迎来到 <b>词宠岛</b>！<br>这座岛上住着 <b>60</b> 只词宠，<br>它们只会为<b>会说英文的小朋友</b>孵化哦。'],
    ['🎮', move],
    ['🥚', isTouch
      ? '走近<b>发光的蛋</b>，点一点它，<br>先听发音，再<b>点 🎤 大声读出来</b>，<br>10 秒内读完会自动打分，还能赚 <b>⭐星星</b>！'
      : '走近<b>发光的蛋</b>，按 <b>E</b> 打开它，<br>先听发音，再<b>点 🎤 大声读出来</b>，<br>10 秒内读完会自动打分，还能赚 <b>⭐星星</b>！'],
    ['🤔', '被沙墙、荆棘挡路时会有<b>谜题</b>：<br>读懂谜面，<b>召唤对的那只词宠</b>来帮忙！<br>一次答对奖励 3⭐，攒够星星去<b>许愿井</b>换装扮～'],
    ['🐾', '词宠饿了还会找你<b>复习</b>，<br>农场的南边有<b>海滩</b>、西边有<b>森林</b>…<br>出发吧，小小词宠训练家！'],
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
    ? `<div>🕹️ 左下摇杆走路 · <b>跳</b>按钮蹦一蹦 · 拖动屏幕转视角 · 双指缩放</div>
       <div>👆 走近蛋/词宠时，点屏幕下方的提示条互动</div>`
    : `<div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键走路 · 鼠标右键拖动转视角 · 滚轮缩放</div>
       <div><kbd>空格</kbd> 跳一跳（按住方向键再按空格 = 向前跳）</div>
       <div><kbd>E</kbd> 或点击：打开词宠蛋 / 和词宠互动 / 坐船过河</div>
       <div><kbd>Tab</kbd> 或点 🪄：召唤词宠帮忙</div>`;
  ov.innerHTML = `
    <div id="help-card">
      <h3>🌼 怎么玩</h3>
      ${touchLines}
      <div>🎤 点 🎤 开口读，10 秒内读完自动打分，还能 🎧 回放自己的读音</div>
      <div>⭐ 读得越准赚越多星星！95 分以上有 2 颗哦</div>
      <div>🧩 不会读？换成字母块拼一拼！</div>
      <div>🗺️ 不知道去哪？点左上角地图，跟着头顶的金色箭头走</div>
      <div>🤔 被挡路时会有<b>谜题</b>：读懂谜面，召唤对的那只词宠来帮忙，一次答对奖 3⭐</div>
      <div>⛲ 星星攒够了去许愿井换魔法帽、气球和魔法棒！</div>
      <div>📌 每天来任务板做一个今日任务，拿 5⭐</div>
      <div>🍖 词宠饿了会想你，回去喊它的名字喂它（复习）</div>
      <div>💾 进度自动保存，下次打开网址继续玩</div>
      <div style="margin-top:10px;color:#C4A78F;font-size:13px">词宠岛 · 农场/海滩/森林三大场景，60 个单词等你收集</div>
      <button id="help-close" class="round-btn small" style="position:absolute;top:14px;right:14px">✕</button>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.id === 'help-close') ov.remove(); });
  document.body.appendChild(ov);
}

// ---------- 右上角菜单：点 ☰ 展开 / 点别处或选项后收起 ----------
export function toggleHudMenu(show) {
  if (!els.hudMenu) return;
  const open = show != null ? show : els.hudMenu.classList.contains('hidden');
  els.hudMenu.classList.toggle('hidden', !open);
  if (els.btnMenu) els.btnMenu.textContent = open ? '✕' : '☰';
}

// ---------- 关于 ----------
export function showAbout() {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const link = (href, label) => `<a class="about-link" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  ov.innerHTML = `
    <div id="about-card">
      <button class="round-btn small" id="about-close" style="position:absolute;top:14px;right:14px">✕</button>
      <div class="about-emoji">🥚</div>
      <h3>词宠岛 WordPet Island</h3>
      <div class="about-sub">在玩中学会开口说英文 · 永无失败惩罚</div>
      <div class="about-rows">
        <div class="about-row"><span>🎮 游戏地址</span>${link('https://qtzu.com/', 'qtzu.com')}</div>
        <div class="about-row"><span>🧩 开源仓库</span>${link('https://github.com/dotnet9/AIGame', 'github.com/dotnet9/AIGame')}</div>
        <div class="about-row"><span>✍️ 作者</span><b>沙漠尽头的狼</b></div>
        <div class="about-row"><span>🌏 官方网站</span>${link('https://codewf.com/zh-CN', 'codewf.com')}</div>
      </div>
      <div class="about-tip">词宠岛 · 农场/海滩/森林与群岛，在玩中学会小学英语单词</div>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.id === 'about-close') ov.remove(); });
  document.body.appendChild(ov);
  sfx.pop();
}

// ---------- 绑定 HUD 按钮 ----------
export function bindHUD({ onCatalog, onHelp, onBook, onSummon, onPrompt, onMap, onHungryPill, onMic, onMicEnd, onRank, onAccount, onAbout, isTouch }) {
  isTouchMode = !!isTouch;
  els.btnCatalog.addEventListener('click', onCatalog);
  els.btnHelp.addEventListener('click', showHelp);
  const aboutBtn = document.getElementById('btn-about');
  if (aboutBtn) aboutBtn.addEventListener('click', onAbout);
  const rankBtn = document.getElementById('btn-rank');
  if (rankBtn) rankBtn.addEventListener('click', onRank);
  if (els.btnAccount) els.btnAccount.addEventListener('click', onAccount);
  if (els.leaderboardRefresh) els.leaderboardRefresh.addEventListener('click', () => refreshLeaderboard());
  const summonBtn = document.getElementById('btn-summon');
  if (summonBtn) summonBtn.addEventListener('click', onSummon);
  const mapBtn = document.getElementById('btn-map');
  if (mapBtn) mapBtn.addEventListener('click', onMap);
  const bookBtn = document.getElementById('btn-book');
  if (bookBtn) bookBtn.addEventListener('click', onBook);
  // 菜单：点 ☰ 展开/收起；点菜单里的项执行完顺手收起
  if (els.btnMenu) els.btnMenu.addEventListener('click', e => { e.stopPropagation(); toggleHudMenu(); });
  if (els.hudMenu) {
    els.hudMenu.addEventListener('click', e => e.stopPropagation());
    els.hudMenu.querySelectorAll('.menu-item').forEach(b => b.addEventListener('click', () => toggleHudMenu(false)));
  }
  document.addEventListener('click', e => {
    if (els.hudMenu && !els.hudMenu.classList.contains('hidden')) toggleHudMenu(false);
  });
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
