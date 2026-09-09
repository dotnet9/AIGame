// 语音识别：按住说话 → 识别 → 与目标单词模糊匹配
// 兼容 Chrome / Edge 的 Web Speech API

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const voiceSupported = !!SR;

let rec = null;
let listening = false;
let onResultCb = null;
let onStateCb = null;
let autoTimer = null;

function ensureRec() {
  if (rec) return rec;
  rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 6;
  rec.continuous = false;
  rec.onresult = (e) => {
    const alts = [];
    const res = e.results[0];
    for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
    if (onResultCb) onResultCb(alts);
  };
  rec.onend = () => {
    listening = false;
    clearTimeout(autoTimer);
    if (onStateCb) onStateCb(false);
  };
  rec.onerror = (e) => {
    listening = false;
    clearTimeout(autoTimer);
    if (onStateCb) onStateCb(false, e.error);
    if (onResultCb && e.error !== 'no-speech' && e.error !== 'aborted') onResultCb(null, e.error);
  };
  return rec;
}

// targetWords: 可接受的单词列表（第一个是主目标）
// 返回 { ok, close, heard }
export function matchAlt(transcripts, target) {
  const tol = target.length <= 3 ? 0 : target.length <= 5 ? 1 : 2;
  let best = { ok: false, close: false, heard: '' };
  for (const raw of transcripts || []) {
    if (!raw) continue;
    const heard = raw.toLowerCase().replace(/[^a-z ]/g, ' ').trim();
    if (!heard) continue;
    const tokens = heard.split(/\s+/);
    if (tokens.includes(target)) return { ok: true, close: false, heard };
    const joined = tokens.join('');
    if (joined === target) return { ok: true, close: false, heard };
    for (const t of tokens) {
      const d = lev(t, target);
      if (d === 0) return { ok: true, close: false, heard };
      if (d <= tol) return { ok: true, close: true, heard };
      if (d <= tol + 1) best = { ok: false, close: true, heard };
    }
    // 整句连读接近（小朋友可能一口气连读）
    if (tokens.length > 1) {
      const d2 = lev(heard.replace(/ /g, ''), target);
      if (d2 <= tol + 1) best = { ok: false, close: true, heard };
    }
  }
  return best;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function startListening(onResult, onState) {
  if (!SR) return false;
  const r = ensureRec();
  try { r.abort(); } catch (e) { /* ignore */ }
  onResultCb = onResult;
  onStateCb = onState;
  try {
    r.start();
    listening = true;
    if (onState) onState(true);
    // 最长 5 秒自动收束
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { try { r.stop(); } catch (e) { /* ignore */ } }, 5000);
    return true;
  } catch (e) {
    listening = false;
    return false;
  }
}

export function stopListening() {
  if (rec && listening) {
    try { rec.stop(); } catch (e) { /* ignore */ }
  }
}
