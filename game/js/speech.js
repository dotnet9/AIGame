// 语音识别：按住说话 → 识别 → 与目标单词模糊匹配
// 兼容 Chrome / Edge 的 Web Speech API

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const secure = location.protocol === 'https:'
  || ['localhost', '127.0.0.1'].includes(location.hostname);

// 浏览器有识别能力，但当前是 http 非本机访问 → 浏览器会静默拒绝，直接视为不支持并提示原因
export const voiceBlockedByInsecure = !!SR && !secure;
export const voiceSupported = !!SR && secure;

let rec = null;
let listening = false;
let onResultCb = null;
let onStateCb = null;
let autoTimer = null;
let gotResult = false;

function ensureRec() {
  if (rec) return rec;
  rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 6;
  rec.continuous = false;
  rec.onresult = (e) => {
    gotResult = true;
    const alts = [];
    const res = e.results[0];
    for (let i = 0; i < res.length; i++) {
      alts.push({ transcript: res[i].transcript, confidence: res[i].confidence || 0.6 });
    }
    if (onResultCb) onResultCb(alts);
  };
  rec.onend = () => {
    listening = false;
    clearTimeout(autoTimer);
    if (onStateCb) onStateCb(false);
    // 说完了但什么都没识别到
    if (!gotResult && onResultCb) onResultCb(null, 'no-result');
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
// 返回 { ok, close, heard, score }  score: 0-100 发音评分
export function matchAlt(alts, target) {
  const tol = target.length <= 3 ? 0 : target.length <= 5 ? 1 : 2;
  let best = { ok: false, close: false, heard: '', score: 0 };
  for (const a of alts || []) {
    const isObj = a && typeof a === 'object';
    const raw = isObj ? a.transcript : a;
    if (!raw) continue;
    const conf = Math.min(1, Math.max(0.3, isObj ? (a.confidence || 0.6) : 0.6));
    const heard = raw.toLowerCase().replace(/[^a-z ]/g, ' ').trim();
    if (!heard) continue;
    const tokens = heard.split(/\s+/);
    let s = null, ok = false, close = false;
    if (tokens.includes(target)) {
      ok = true;
      s = Math.round(85 + 15 * conf);                       // 完全命中：85-100
    } else {
      const joined = tokens.join('');
      const dToken = Math.min(...tokens.map(t => lev(t, target)));
      const dJoined = lev(joined, target);
      const d = Math.min(dToken, dJoined);
      if (d === 0) { ok = true; s = Math.round(78 + 16 * conf); }        // 连读命中：78-94
      else if (d <= tol) { close = true; s = Math.round(63 + (tol - d) * 7 + 12 * conf); } // 接近：63-82
      else if (d <= tol + 1) { close = true; s = Math.round(46 + 16 * conf); }             // 勉强接近：46-62
      else {
        const firstOk = tokens.some(t => t[0] === target[0]);
        s = firstOk ? Math.round(24 + 16 * conf) : Math.round(8 + 16 * conf);              // 鼓励分
      }
    }
    s = Math.max(0, Math.min(100, s));
    if (s > best.score) best = { ok, close, heard, score: s };
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
  if (!SR || !voiceSupported) return false;
  const r = ensureRec();
  gotResult = false;
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
