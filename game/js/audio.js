// 发音播放：优先预生成语音文件（<audio>，手机浏览器最稳），TTS 仅兜底
// 另含 WebAudio 小音效

// ---------- 语音文件 ----------
let manifest = null;
fetch('audio/manifest.json').then(r => r.ok ? r.json() : null).then(m => manifest = m).catch(() => { manifest = null; });

const audioCache = {};
let currentAudio = null;

function playFile(url, { cache = true } = {}) {
  return new Promise(resolve => {
    try {
      // 互斥：新播放立刻掐掉上一段，避免连点出现重音
      if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }
      let a = cache ? audioCache[url] : null;
      if (!a) { a = new Audio(url); if (cache) audioCache[url] = a; }
      const done = ok => { a.onended = a.onerror = null; a.onloadedmetadata = null; if (currentAudio === a) currentAudio = null; resolve(ok); };
      a.onended = () => done(true);
      a.onerror = () => done(false);
      try { a.currentTime = 0; } catch (e) { /* ignore */ }
      currentAudio = a;
      a.play().catch(() => done(false));
    } catch (e) { resolve(false); }
  });
}

// 播放并顺便给出时长（秒），用于跟读音节的视觉同步
function playFileMeta(url) {
  return new Promise(resolve => {
    try {
      if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }
      const a = new Audio(url);
      const finish = (ok, dur) => { a.onended = a.onerror = a.onloadedmetadata = null; if (currentAudio === a) currentAudio = null; resolve({ ok, dur: dur || 0 }); };
      a.onloadedmetadata = () => {
        const dur = isFinite(a.duration) ? a.duration : 0;
        // 互斥播放
        currentAudio = a;
        a.play().then(() => finish(true, dur)).catch(() => finish(false, dur));
      };
      a.onerror = () => finish(false);
      a.load();
      // 某些浏览器不触发 loadedmetadata 的兜底
      setTimeout(() => { if (a.paused && a.currentTime === 0 && currentAudio !== a) finish(false); }, 2500);
    } catch (e) { resolve({ ok: false, dur: 0 }); }
  });
}

// key 形如 "word/cat" / "word/good-morning" / "syl/ap" / "letter/c"
function fileKey(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
async function tryFile(key) {
  if (!manifest || !manifest[key]) return false;
  return playFile(manifest[key]);
}
async function tryFileMeta(key) {
  if (!manifest || !manifest[key]) return { ok: false, dur: 0 };
  return playFileMeta(manifest[key]);
}

// ---------- TTS 兜底 ----------
let enVoice = null;

function pickVoice() {
  const vs = speechSynthesis.getVoices();
  if (!vs.length) return;
  const prefer = ['Aria', 'Jenny', 'Zira', 'Google US English', 'Samantha'];
  for (const p of prefer) {
    const v = vs.find(v => /en[-_]US/i.test(v.lang) && v.name.includes(p));
    if (v) { enVoice = v; return; }
  }
  enVoice = vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0];
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function tts(text, { rate = 0.8, pitch = 1.05, onEnd } = {}) {
  if (!('speechSynthesis' in window)) { if (onEnd) setTimeout(onEnd, 300); return; }
  try {
    // Chrome 下 cancel 后立刻 speak 会吞掉声音：先停再延迟播
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      setTimeout(() => tts(text, { rate, pitch, onEnd }), 120);
      return;
    }
  } catch (e) { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  u.pitch = pitch;
  if (!enVoice) pickVoice();
  if (enVoice) u.voice = enVoice;
  if (onEnd) u.onend = onEnd;
  u.onerror = () => { if (onEnd) onEnd(); };
  speechSynthesis.speak(u);
}

// 对外发音入口：单词/短语/音节/字母 自动匹配语音文件
export async function speak(text, { rate = 0.8, onEnd } = {}) {
  const raw = String(text).trim();
  const fk = fileKey(raw);
  if (fk) {
    if (await tryFile(`word/${fk}`)) { if (onEnd) onEnd(); return; }
    const t = fk.replace(/-/g, '');
    if (t && t.length === 1 && await tryFile(`letter/${t}`)) { if (onEnd) onEnd(); return; }
    if (raw.includes(' ') || fk.includes('-')) { /* 多词短语没有独立文件时走 TTS */ }
  }
  tts(raw, { rate, onEnd });
}

// 慢速单词（有专门录的慢速文件）
export function speakSlow(word, onEnd) {
  tryFile('word/' + fileKey(word) + '_slow').then(ok => { if (!ok) tts(word, { rate: 0.55, onEnd }); else if (onEnd) onEnd(); });
}

// 跟读：播放整词慢速标准音（真人录音变速），音节只做视觉高亮同步，不再单独念音节
// （拆开的音节交给 TTS 念会走调，比如 ter/ple/rab，听感就是“乱读”）
export function speakFollow(word, syl, onSyl, onEnd) {
  const parts = syl && syl.length ? syl : [word];
  const estimate = Math.max(0.7, parts.length * 0.42);
  const schedule = dur => {
    const per = Math.max(0.22, dur / parts.length);
    parts.forEach((_, i) => setTimeout(() => onSyl && onSyl(i), per * 1000 * i));
    if (onEnd) setTimeout(onEnd, Math.max(dur, per * parts.length) * 1000 + 80);
  };
  tryFileMeta('word/' + fileKey(word) + '_slow').then(res => {
    if (res.ok) schedule(res.dur || estimate);
    else {
      tts(word, { rate: 0.55 });
      schedule(Math.max(0.8, word.length * 0.09));
    }
  });
}

// 立刻停下正在播的发音（点麦克风开口前调用，避免示范音压过孩子的声音）
export function stopSpeaking() {
  if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

// 回放小朋友自己的录音（blob URL，不进缓存）
export function playRecording(url, onEnd) {
  return playFile(url, { cache: false }).then(ok => { if (onEnd) onEnd(); return ok; });
}

// 逐字母
export function spellLetters(word, onEnd) {
  const w = word.toLowerCase();
  let i = 0;
  const next = () => {
    if (i >= w.length) { if (onEnd) onEnd(); return; }
    const ch = w[i++];
    tryFile('letter/' + ch).then(ok => {
      if (ok) setTimeout(next, 200);
      else tts(ch, { rate: 0.55, onEnd: () => setTimeout(next, 200) });
    });
  };
  next();
}

// 劲舞团式评分喝彩：Perfect / Great / Cool / Nice / Bad / Miss
// 优先播放预生成的情绪童声（audio/fx/，AnaNeural），缺文件时用 TTS 提调兜底
export function scoreVoice(score) {
  const key = score >= 95 ? 'perfect' : score >= 85 ? 'great' : score >= 75 ? 'cool'
    : score >= 60 ? 'nice' : score >= 40 ? 'bad' : 'miss';
  const texts = { perfect: 'Perfect!', great: 'Great!', cool: 'Cool!', nice: 'Nice try!', bad: 'Oh, bad...', miss: 'Miss...' };
  const happy = score >= 60;
  tryFile('fx/' + key).then(ok => {
    if (!ok) tts(texts[key], { rate: happy ? 1 : 0.85, pitch: happy ? 1.35 : 0.8 });
  });
}

// ---------- WebAudio 小音效 ----------
let actx = null;
function ctx() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* 无声环境 */ }
  }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, t0, dur, type = 'sine', gain = 0.16) {
  const a = ctx();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + t0);
  o.stop(a.currentTime + t0 + dur + 0.05);
}

export const sfx = {
  pop() { tone(520, 0, 0.12, 'sine'); tone(780, 0.06, 0.14, 'sine', 0.1); },
  good() { tone(523, 0, 0.15); tone(659, 0.1, 0.15); tone(784, 0.2, 0.28); },
  great() { tone(523, 0, 0.13); tone(659, 0.09, 0.13); tone(784, 0.18, 0.13); tone(1047, 0.27, 0.4); },
  miss() { tone(300, 0, 0.18, 'triangle', 0.12); tone(240, 0.14, 0.22, 'triangle', 0.1); },
  crack() { tone(180, 0, 0.1, 'square', 0.08); tone(140, 0.08, 0.12, 'square', 0.06); },
  magic() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, i * 0.07, 0.25, 'sine', 0.09)); },
};
