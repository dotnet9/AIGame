# 🥚 词宠岛 WordPet Island

一款面向 3-6 年级小朋友的 **3D 英语学习游戏**：在漂浮的阳光农场里，念出英文单词唤醒"词宠蛋"，孵出来的词宠会成为伙伴——**召唤**它们解谜开路，它们饿了还会找你**复习**（遗忘曲线伪装成喂养）。

> 中文界面 + 英文学习内容 · 语音为主（🎤 跟读）、字母块兜底（🧩 拼词）· 永无失败惩罚

## ✨ 玩法闭环：学习 → 使用 → 复习

| 环节 | 玩法 | 学的是什么 |
|---|---|---|
| 🥚 孵化 | 走近发光的词宠蛋 → 听发音 → 点 🎤 读出来（10 秒倒计时自动评分，可 🎧 回放自己的读音；或拼字母块） | 单词认读 + 发音 |
| ✨ 召唤 | 河流挡路召唤 **boat**、谷仓太黑召唤 **light**、干草挡路召唤 **wind**、种 **seed** 再唤 **rain** 长出通天豆藤 | 单词即工具，语境记忆 |
| 🍖 喂养 | 词宠按遗忘曲线（10分钟/1天/3天/7天/14天）会"想你"，回去喊它名字喂它 | 科学复习，无打卡感 |

## 🗺️ 阳光农场（第一期 · 36 词 · 6 关）

**关卡制**：每唤醒 6 只词宠通关一次，庆祝后下一关的蛋才出现——告别一屏 36 颗蛋的散乱。剧情钥匙（boat/light/wind/seed/rain）固定钉在对应关卡，永远不会有卡死的关。

| 关 | 主题 | 词 |
|---|---|---|
| 1 | 出生草甸 | cat dog duck rabbit mouse + **boat**（过河钥匙） |
| 2 | 阳光果园 | flower grass frog apple banana + **light**（照亮谷仓） |
| 3 | 果园丰收 | carrot tomato potato corn goat + **wind**（吹走干草球） |
| 4 | 风车田与菜园 | pig cow bird bee + **seed**/**rain**（种出通天豆藤） |
| 5 | 谷仓与牧场 | horse sheep hen milk bread egg |
| 6 | 天空岛传说 | cake tractor tree sun + star moon（金色蛋） |

词库对齐人教版 PEP 3-6 年级。

## 📱 电脑 & 手机都能玩

- **电脑**：WASD/方向键走路 · **空格跳一跳（方向键+空格向前跳）** · 右键拖动转视角 · 滚轮缩放（最远可拉到全岛鸟瞰找蛋） · E 交互/一键召唤/坐船 · Tab 召唤面板
- **手机**（微信分享链接点开即玩）：左下摇杆走路 · **「跳」按钮蹦一蹦** · 拖动屏幕转视角 · 双指缩放 · 点提示条交互（走到机关旁一键召唤/坐船） · 点 🪄 召唤
- 🎤 语音识别需要 **HTTPS 或 localhost** + 麦克风权限；iOS 微信内置浏览器暂不支持语音识别，会自动引导用字母块拼词（功能完整）

## 📚 课本朗读练习（新增）

点 **📚 课本**：选择年级（3-6）和学期（上/下册）→ 选择单元 → 进入跟读练习：听标准发音 → 点 🎤 大声读 → **0-100 分评分**（劲舞团式 PERFECT!/GREAT!/COOL! 喝彩飘字 + 带情绪童声 + 进度环滚动 + 星级动画）。80 分以上 2 秒内自动过关，节奏快不拖沓。支持单词和短语（如 good morning / happy birthday），人教版 PEP 8 学期 46 单元 **449 个词/短语**，单元成绩自动保存。课程数据在 `js/curriculum.js`，可直接编辑增删。

**语音识别三级降级链**：
1. 🥇 **Web Speech API**（支持的 HTTPS 浏览器即时识别，不需要等待模型）
2. 🥈 **浏览器本地 Whisper 模型**（没有 Web Speech、或它连续读不出结果时按需加载，自托管于 `models/`）
3. 🥉 字母块拼写（100% 可用，永远能过关）

## 🚀 本地运行

Windows 双击 **`run.bat`** 一键启动后端（端口 6000，自动选用 Node 或 Python）；也可以手动：

```bash
cd AIGame
node tools/serve.js 6000       # 禁缓存开发服务器（零依赖，需 Node 14+）
python tools/serve.py 6000     # 等价实现（需 Python 3）
# 浏览器打开 http://localhost:6000/game/
```

排行榜接口由该服务提供：`GET /api/leaderboard`、`POST /api/score`，积分保存在 `tools/leaderboard.json`。线上部署若使用纯静态托管，游戏仍可离线记录本机积分，但要启用多人排行榜，请把该服务（或等价后端）与 `/api/*` 一起部署——nginx 加一段 `location /api/ { proxy_pass http://127.0.0.1:6000; }` 再 reload 即可，并确保排行榜文件可写。

## ☁️ 在线部署（分享给小朋友）

`game/` 是纯静态站点（含 `audio/` 语音 563 个 mp3 与 `models/` 本地识别模型，**需完整上传**），任选其一：

- **GitHub Pages**：仓库设置 → Pages → 分支 `main` 目录 `/game`（或根目录，注意路径）
- **Vercel / Netlify**：导入仓库，输出目录填 `game`
- 部署后默认 HTTPS ✓ 语音识别可用；把链接发到微信，手机点开即玩

## 🧱 技术实现

- **渲染**：Three.js（CDN ES Modules）+ 柔和阴影 + ACES 色调映射 + UnrealBloom 辉光 + 渐变天空 + 花瓣粒子
- **美术**：全部角色/场景为**代码程序化建模**（`js/models.js`，无外部模型文件），马卡龙低模 + 点睛小表情；词宠身上嵌发光首字母牌
- **语音**：Web Speech API 识别（多候选 + 编辑距离模糊匹配，识别到近音词会给音节拆分提示）；TTS 发音示范
- **标准美音**：单词发音优先采用 Wikimedia Commons 的真人美式录音（`En-us-*.ogg`，维基词典/AHD 录音计划），ffmpeg 变速生成慢速版（保音高），edge-tts 兜底；音标数据由 `tools/gen_ipa.py` 生成
- **关卡制**：`js/words.js` 的 `CHAPTERS` 定义每关 6 词，`game.js` 按存档进度出蛋
- **存档**：localStorage + 遗忘曲线调度（`js/save.js`）
- **词库**：`js/words.js` 每词一条数据（单词/中文/音节/谜面/图鉴小故事/位置），加词即加内容
- **favicon**：`tools/make_favicon.py`（PIL 绘制的 Q 版词宠蛋）

## 📂 目录

```
game/            游戏本体（纯静态，可整目录部署）
  index.html     页面 + 触屏摇杆
  css/style.css  柔软治愈 UI（含手机适配）
  js/            words 词库 · models 程序化建模 · world 场景 · pets 词宠
                 · speech 语音识别 · audio TTS/音效 · ui 界面 · game 主逻辑 · save 存档
tools/           make_voice.py 发音生成（Commons 真人美音+TTS 兜底）· gen_ipa.py 音标 · make_favicon.py 图标
logo.*           品牌 logo 原稿
```

## 🗺️ 路线图

- [ ] 更多区域：彩虹森林 / 蓝鲸海湾 / 星星天文台 / 时光小镇（框架已就绪，加词加场景即可）
- [x] ~~edge-tts 预生成整库发音音频~~ 已升级：真人标准美音 + 慢速变速版
- [ ] 更多关卡场景皮肤（雪原/海滩换季变体）
- [ ] 家长周报（图鉴成长 + 复习统计）
- [ ] Unity 版（Windows 离线语音 KeywordRecognizer，打包 exe）
