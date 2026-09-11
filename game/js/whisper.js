// 浏览器本地语音识别：Whisper tiny.en（模型自托管于 models/，客户端解析，无第三方依赖）
// transformers.js 经 jsdelivr CDN 加载（国内可达）
let pipePromise = null;
let loadPct = 0;

export function loadPercent() { return loadPct; }

export function ensureWhisper() {
  if (!pipePromise) {
    pipePromise = (async () => {
      const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js');
      mod.env.allowLocalModels = true;
      mod.env.localModelPath = 'models/';
      mod.env.allowRemoteModels = false; // 绝不访问外部模型源
      mod.env.useBrowserCache = true;    // 模型文件缓存在浏览器 Cache API，二次进入不再下载几十 MB
      return mod.pipeline('automatic-speech-recognition', 'whisper-tiny.en', {
        dtype: 'q8',
        progress_callback: p => {
          if (p && p.status === 'progress' && typeof p.progress === 'number') {
            loadPct = Math.max(loadPct, Math.min(99, Math.round(p.progress)));
          }
        },
      });
    })().catch(err => { pipePromise = null; loadPct = 0; throw err; });
  }
  return pipePromise;
}

// 后台预下载（打开挑战卡时就悄悄开始，孩子开口时基本已就绪；失败静默，录音时再正式加载）
export function preloadWhisper() {
  ensureWhisper().catch(() => { /* 静默 */ });
}

// 录音 blob → 16kHz 单声道 Float32
async function blobToAudio16k(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const decoded = await ac.decodeAudioData(await blob.arrayBuffer());
  await ac.close();
  let audio = decoded.getChannelData(0);
  if (decoded.sampleRate !== 16000) {
    const len = Math.max(1, Math.ceil(decoded.duration * 16000));
    const off = new OfflineAudioContext(1, len, 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    audio = (await off.startRendering()).getChannelData(0);
  }
  // Whisper 对过短音频容易幻觉，补齐到至少 1 秒
  if (audio.length < 16000) {
    const padded = new Float32Array(16000);
    padded.set(audio, 0);
    return padded;
  }
  return audio;
}

// 返回识别出的英文文本
export async function recognizeBlob(blob) {
  const pipe = await ensureWhisper();
  const audio = await blobToAudio16k(blob);
  // whisper-tiny.en 为英文专用模型，不可传 language/task 参数
  const out = await pipe(audio, { chunk_length_s: 30 });
  return out && out.text ? out.text.trim() : '';
}
