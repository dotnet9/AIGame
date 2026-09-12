---
name: city-chain-restructure-full
overview: 三大块：① 城市内容配置化（每城独立 JSON：历史/图集幻灯片/大学官网排名/美食风景 8+，新增台湾 4 城，成都默认、北京终点）；② 关卡重构为纯城市链条+城市牌子系统（地图按方位布大学/美食/风景牌子、点牌弹详情、蛋约 12 颗部分依牌分布）；③ 操作修复（点击钳制 Bug、点一下走一步、缩放手感）。
design:
  styleKeywords:
    - 粉彩卡通
    - 图片卡片
    - 幻灯片图集
    - 信息网格
    - 低模立牌
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 900
    subheading:
      size: 15px
      weight: 700
    body:
      size: 13px
      weight: 400
  colorSystem:
    primary:
      - "#C4577E"
      - "#FF9FBE"
      - "#C8402F"
    background:
      - "#FFFDF8"
      - "#FFF9EC"
    text:
      - "#8A6B4A"
      - "#FFFDF4"
    functional:
      - "#FFE08A"
      - "#7EC4F2"
      - "#8FD08F"
todos:
  - id: city-data-layer
    content: 搭建 game/data/cities/ 目录与 data.js 加载器：index.json + 成都/北京/台北/高雄/台中/台南全量 JSON（Wikimedia 图片/大学官网与排名/美食风景各 8+/bearing 方位/level 配置），cities.js 改配置驱动并保留兜底
    status: pending
  - id: migrate-cities-json
    content: 52 城基础数据迁移至 JSON（重点城市全量），默认城市改成都（cityRoute fallback + save 同步），索引纳入台湾 4 城
    status: pending
    dependencies:
      - city-data-layer
  - id: city-card-ui
    content: 重做城市卡片：ui.js/style.css/index.html 实现幻灯片图集、大学富卡（跳官网+实时建校年数+排名）、美食风景图片卡、customTabs 可扩展、北京终点徽章与抵达仪式
    status: pending
    dependencies:
      - city-data-layer
  - id: city-level-rebuild
    content: 关卡重构为纯城市链条：world.js 按 level 配置生成全屏城市地图（半径 28~32/多地标/地图式路网/装饰分区/高台），移除农场岛与河/船/机关，日常玩法迁移（喂食摸头通用/钓鱼挪沿海城/猫头鹰改城市向导），小火车/飞机转场动画
    status: pending
    dependencies:
      - city-data-layer
  - id: sign-system
    content: 牌子系统：world.js 按 bearing 方位生成大学/美食/风景低模立牌（几十块/城，同方位错开半径，共享材质），game.js 点击命中检测弹出 ui.js 详情卡（图片+中英文+简介，onerror 回退），牌子旁 seed 放蛋与散布蛋共约 12 颗（上限 15）
    status: pending
    dependencies:
      - city-level-rebuild
  - id: chapter-words-rebuild
    content: words.js 动态组关：每关新词约 6（单词+短语混合去重，seed 稳定）+复习词约 6（已孵化池抽取），合计蛋≈12 上限 15，复习蛋简单模式（读一遍/选义即过），save 孵化池兼容
    status: pending
    dependencies:
      - city-level-rebuild
  - id: input-feel-fix
    content: game.js 操作修复：点击落点改为相对当前城市中心钳制；单击走固定步长约 2 米并移除 _holdWalk；滚轮系数调细+键盘加减缩放+camDist 插值平滑
    status: pending
    dependencies:
      - city-level-rebuild
  - id: verify-commit
    content: 用 [skill:agent-browser] 本地自动化验证城市卡各 Tab、牌子弹卡、点击定位、走一步、蛋分布、转场与北京终点全链路，通过后中文规范化提交
    status: pending
    dependencies:
      - city-card-ui
      - sign-system
      - chapter-words-rebuild
      - input-feel-fix
---

## 产品概述

词宠岛（纯前端 three.js 儿童英语学习游戏）大型升级：城市内容配置化 + 关卡重构为“纯城市链条 + 城市牌子探索”模式

## 一、城市内容体系（配置为主、程序加强）

- 文案、图片等资源全部外置：`game/data/cities/` 目录，每城一个 JSON 配置文件，程序不写死内容
- 城市介绍含历史；城市卡片顶部真实特色图片幻灯片轮播
- Tab 页：大学、美食、风景名胜（架构支持扩展更多 Tab），内容为“实际图片+文字”卡片
- 大学：点击名称跳官网、创建时间、历史、建校距今年数（实时计算）、全球/全国排名
- 美食、风景名胜每城 8 个以上
- 新增台湾省台北、高雄、台中、台南
- 首次未获取用户城市默认成都；北京为终点城市（终点徽章+抵达仪式）

## 二、关卡结构重构（纯城市链条 + 牌子探索）

- 去掉农场岛：第一关=家乡城市（默认成都），城市间小火车/飞机转场动画
- 每关整屏可视区域是一座城市地图，小人全城可走
- **牌子系统（本轮新增）**：城市地图上按大致真实地理方位分布大学、美食、风景名胜的牌子（一块城市几十块）；点击牌子弹出详细介绍（图片+文字，数据来自 JSON）；牌子与蛋解耦——不是每块牌旁都有蛋
- 词宠蛋控制在 12 颗左右（不超过 15）：一部分 seed 挑选放在牌子旁，其余散布全城（地标旁/街角/高台）
- 每关词量：约 6 个新词（单词+短语混合、不重复）+ 约 6 个复习词（之前城市学过，seed 稳定跨会话一致）；复习蛋简单模式（读一遍/选义即过）
- 全部蛋孵化 → 过关 → 转场下一城（全新地图）→ 北京终点大地图+仪式
- 日常玩法迁移：喂食/摸头全城通用，钓鱼挪沿海城市，猫头鹰改城市向导

## 三、操作修复

- 城市圈内点击金色落点圈出现在圈外（根因：落点按世界原点半径 48 钳制，城市岛分布在 66~92 处）
- 点一次走一步（固定步长约 2 米），移除按住持续跟随
- 滚轮/键盘缩放手感优化

## 技术栈

- 保持现有架构：纯前端 ES Modules + three.js 0.160（importmap CDN），无构建流程，静态部署（game/ 复制根目录）
- 数据层：`game/data/cities/` JSON，运行时 fetch + 内存缓存 + 失败回退内置兜底（不用 import 断言，兼容性差）
- 图片源：Wikimedia Commons 真实照片外链（免费可热链），img 字段可随时换成本地图片；onerror 回退 emoji 横幅

## 系统架构

```mermaid
graph TD
    A[game/data/cities/index.json 城市索引] --> B[data.js 加载器 fetch+缓存+兜底]
    A2[每城 JSON: unis/foods/scenes/history/level] --> B
    B --> C[cities.js 配置驱动适配层]
    C --> D1[ui.js 城市卡片与牌子详情弹卡]
    C --> D2[world.js 城市地图生成: 地形/路网/地标/牌子]
    C --> D3[game.js 路线/组关/转场/蛋分布/交互]
    D3 --> E[words.js 动态组关: 新词+复习词]
```

## 关键决策

1. **数据外置**：index.json（顺序/默认 chengdu/终点 beijing）+ 每城 JSON；加载失败回退内置最小数据永不崩；旧字段向后兼容，旧存档不受影响
2. **牌子系统**：JSON 中 unis/foods/scenes 各项自动生成牌子，每项带 `bearing` 方位（N/NE/E/SE/S/SW/W/NW，未配置时按 id hash 自动分布），同方位多条目按半径错开；低模立牌=杆+板+emoji 图标+中文名 sprite；牌子只入遮挡不入碰撞（几十块牌不挡路）；点击牌子→详情弹卡（复用城市卡样式，图片+中英文+简介，靠近可发音朗读名称）
3. **蛋与牌子解耦**：level 配置 eggCount≈12（上限 15）；seed 按"昵称+册"从本城牌子中挑 4~6 块旁置蛋，其余按散布点位放置；蛋对应本关词表（新词+复习词）
4. **动态组关**：words.js chaptersFor 重写——新词约 6（本册单词+短语池混合去重）+复习词约 6（已孵化池 seed 抽取）；复习蛋走简单模式分支；PER_CHAPTER 动态化；save 孵化池兼容
5. **关卡生成配置化**：world.js 按 level 配置建城（半径 28~32、多地标、地图式路网复用现有路面画法、装饰分区、高台、牌子层）；移除农场岛/河/船/机关；北京大地图+终点仪式；转场复用 _flyTo cinematic + chapterBanner
6. **操作修复**：点击钳制相对当前城市中心；单击走一步移除 _holdWalk；滚轮系数调细+键盘 +/-/[ ] 缩放+camDist 插值平滑

## 性能与可靠性

- JSON 按需加载（index+当前路线城市）；图片懒加载+幻灯片预加载下一张；建校年数前端实时计算
- 官网外链 window.open 带 noopener,noreferrer；触屏外链弹确认防误触
- 牌子用 sprite+简单几何体，几十块/城的渲染开销可控（共享材质、视距裁剪）

## 设计风格

延续词宠岛粉彩卡通风格（圆角奶油卡片、粉彩描边、柔和投影），升级点：

- **城市卡片**：顶部 16:9 幻灯片图集（真实照片 4 秒/张轮播+圆点指示器+左右箭头，加载中显示城市主题色渐变占位，onerror 回退 emoji 横幅）；Tab 栏配置化渲染；大学 Tab 横向富卡片（校名超链接+985/211 标签+信息网格：创建年份/建校 N 年实时计算高亮/全球全国排名+一句话历史）；美食/风景双列图片卡片网格，hover 微浮起+点击轻震动
- **3D 牌子**：低模立牌（木杆+圆角板+类别 emoji 图标+中文名 sprite），颜色按类别区分（大学蓝/美食橙/风景绿），按方位绕城分布，同方位错开半径；点击弹详情卡（复用城市卡样式：图片+中英文名+简介+百科式短文）
- **北京终点**：金色主题卡片描边+“终点站”徽章+抵达横幅“抵达首都北京”+烟花粒子
- **转场**：全屏横幅（小火车/飞机图标+“前往上海…”）+镜头 cinematic 飞行
- **蛋**：12 颗左右散布+牌子旁，光柱引导保留

## Agent Extensions

### Skill

- **agent-browser**
- Purpose: 本地起服后自动化验证全链路（城市卡幻灯片与各 Tab、牌子点击弹卡、点击落点在圈内、单击走一步、蛋分布、转场、北京终点仪式）
- Expected outcome: 截图确认各功能正常、无控制台报错，验证通过后中文规范化提交