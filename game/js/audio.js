// 发音播放：优先预生成语音文件（<audio>，手机浏览器最稳），TTS 仅兜底
// 另含 WebAudio 小音效

// ---------- 语音文件 ----------
let manifest = null;
fetch('audio/manifest.json').then(r => r.ok ? r.json() : null).then(m => manifest = m).catch(() => { manifest = null; });

const audioCache = {};
let currentAudio = null;

function playFile(url) {
  return new Promise(resolve => {
    try {
      // 互斥：新播放立刻掐掉上一段，避免连点出现重音
      if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }
      let a = audioCache[url];
      if (!a) { a = new Audio(url); audioCache[url] = a; }
      const done = ok => { a.onended = a.onerror = null; if (currentAudio === a) currentAudio = null; resolve(ok); };
      a.onended = () => done(true);
      a.onerror = () => done(false);
      try { a.currentTime = 0; } catch (e) { /* ignore */ }
      currentAudio = a;
      a.play().catch(() => done(false));
    } catch (e) { resolve(false); }
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

// 逐音节慢读："but ter fly"
export function speakSyllables(syl, onEnd) {
  if (!syl || !syl.length) { if (onEnd) onEnd(); return; }
  let i = 0;
  const next = () => {
    if (i >= syl.length) { if (onEnd) onEnd(); return; }
    const s = syl[i++].toLowerCase();
    tryFile('syl/' + s).then(ok => {
      if (ok) setTimeout(next, 180);
      else tts(s, { rate: 0.55, onEnd: () => setTimeout(next, 180) });
    });
  };
  next();
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
