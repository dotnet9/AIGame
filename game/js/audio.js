// 发音（TTS）+ 小音效（WebAudio 合成，无需音频文件）

let enVoice = null;
let voiceReady = false;

function pickVoice() {
  const vs = speechSynthesis.getVoices();
  if (!vs.length) return;
  // 优先美音女声（更适合教学跟读）
  const prefer = ['Aria', 'Jenny', 'Zira', 'Google US English', 'Samantha', 'Jenny (English'];
  for (const p of prefer) {
    const v = vs.find(v => /en[-_]US/i.test(v.lang) && v.name.includes(p));
    if (v) { enVoice = v; return; }
  }
  enVoice = vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || vs[0];
}

if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = () => { pickVoice(); voiceReady = true; };
}

export function speak(text, { rate = 0.8, pitch = 1.05, onEnd } = {}) {
  if (!('speechSynthesis' in window)) { if (onEnd) setTimeout(onEnd, 300); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  u.pitch = pitch;
  if (!enVoice) pickVoice();
  if (enVoice) u.voice = enVoice;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

// 逐音节慢读："but ter fly"
export function speakSyllables(syl, onEnd) {
  if (!syl || !syl.length) { speak('', { onEnd }); return; }
  let i = 0;
  const next = () => {
    if (i >= syl.length) { if (onEnd) onEnd(); return; }
    speak(syl[i++], { rate: 0.6, onEnd: () => setTimeout(next, 160) });
  };
  next();
}

export function spellLetters(word) {
  for (const ch of word.toUpperCase()) {
    setTimeout(() => speak(ch, { rate: 0.6 }), 480 * word.indexOf(ch.toLowerCase()));
  }
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
