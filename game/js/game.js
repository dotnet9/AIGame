// 游戏主逻辑：玩家控制、交互、孵化、召唤解谜、喂养复习
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { WORD_MAP, ZONE_NAMES, PER_CHAPTER, allWordsForSem, chaptersFor, islandsForSem, BOOK_LABEL } from './words.js';
import { buildWorld } from './world.js';
import { buildPlayer, letterTexture, petThumbnail } from './models.js';
import { EggManager, PetManager } from './pets.js';
import * as save from './save.js';
import * as ui from './ui.js';
import { startListening, stopListening, matchAlt, voiceSupported, isVoiceBroken, markVoiceBroken } from './speech.js';
import { speak, sfx, stopSpeaking } from './audio.js';
import { ensureWhisper, recognizeBlob, preloadWhisper, loadPercent } from './whisper.js';
import { CURRICULUM } from './curriculum.js';

const PLAYER_SPEED = 4.4;
const ISLE_CENTER = { x: -22, z: 27 };
const CLIMB_TOP = { x: -22, z: 24.2, y: 14 };
const CLIMB_BOTTOM = { x: -22, z: 28.6, y: 0 };
const WORLD_R = 50.6;   // 岛屿可玩半径（岛边是大海）

// 柔和圆形贴图（尘土等小特效共用）
let _softTex = null;
function softTexture() {
  if (_softTex) return _softTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,253,246,0.95)');
  g.addColorStop(1, 'rgba(255,253,246,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  _softTex = new THREE.CanvasTexture(cv);
  return _softTex;
}

// 区域范围（世界坐标），用于地图与探索提示
const ZONE_RECTS = [
  { key: 'orchard',  name: '阳光果园', x1: -34, z1: -30, x2: -5,  z2: -5 },
  { key: 'windmill', name: '风车田',   x1: 8,   z1: -30, x2: 34,  z2: -7 },
  { key: 'barnyard', name: '谷仓前院', x1: 14,  z1: 8,   x2: 34,  z2: 30 },
  { key: 'garden',   name: '魔法菜园', x1: -34, z1: 10,  x2: -13, z2: 34 },
  { key: 'meadow',   name: '出生草甸', x1: -18, z1: 5,   x2: 14,  z2: 34 },
  { key: 'beach',    name: '阳光海滩', x1: -32, z1: 36,  x2: 32,  z2: 50 },
  { key: 'forest',   name: '神秘森林', x1: -52, z1: -18, x2: -37, z2: 24 },
];
const SKY_RECT = { key: 'sky', name: '天空岛', x1: -28, z1: 21, x2: -16, z2: 33 };

// 许愿井商店货架
const SHOP_ITEMS = [
  { id: 'hat-wizard', type: 'hat', value: 'wizard', emoji: '🎩', name: '魔法师帽', desc: '神秘的紫色尖帽', price: 30 },
  { id: 'hat-flower', type: 'hat', value: 'flower', emoji: '👑', name: '花朵王冠', desc: '香喷喷的小花环', price: 30 },
  { id: 'balloon', type: 'balloon', emoji: '🎈', name: '红气球', desc: '蹦蹦跳跳跟着你', price: 40 },
  { id: 'wand', type: 'wand', emoji: '🪄', name: '星星魔法棒', desc: '走路会撒下小星星', price: 50 },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.tweens = [];
    this.fx = [];
    this.clock = new THREE.Clock();
    // 本册范围：当前选了哪一册，就只关心那一册（序章农场 + 本册课本词/岛）
    this.sem = save.getBookSem() || '3a';
    this.scopeWords = allWordsForSem(this.sem);
    this.chapters = chaptersFor(this.sem);
    this.islands = islandsForSem(this.sem);
    this.scopeIds = new Set(this.scopeWords.map(w => w.id));
    this.total = this.scopeIds.size;
    this.riverHintCd = 0;
    this.preferWhisper = false;   // 在线识别连续失败后，改用自带的本地模型
    this.voiceMiss = 0;
    this._initRenderer();
    this._initScene();
    this._initPlayer();
    this._initEntities();
    this._initInput();
    this._initUI();
  }

  // ================= 本册范围 =================
  // 章节索引：以本册已唤醒数量折算（只数本册词，别的册不算进度）
  chapterIndex(hatchedCount) {
    return Math.min(Math.floor(hatchedCount / PER_CHAPTER), this.chapters.length - 1);
  }
  // 本册已唤醒数量
  hatchedInScope() {
    let n = 0;
    for (const w of this.scopeWords) if (save.isHatched(w.id)) n++;
    return n;
  }
  get currentChapter() { return this.chapters[this.chapterIndex(this.hatchedInScope())]; }

  // ================= 初始化 =================
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 260);
    this.world = buildWorld(this.scene, this.islands);
    // 辉光后期（失败则退回普通渲染）
    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.65, 0.86);
      this.composer.addPass(this.bloom);
    } catch (e) { this.composer = null; }
    this.camYaw = 0; this.camPitch = 0.42; this.camDist = 8.5;
    this.gateTries = {};   // 每个机关猜错的次数（一次答对有星星奖励）
    this._initGuide();
  }

  _initPlayer() {
    const p = buildPlayer(save.getGender(), save.getWear());
    this.player = p.group;
    this.playerParts = p.parts;
    this.player.rotation.y = Math.PI; // 面朝北（河流方向）
    // 恢复上次的位置与朝向（存档续玩）
    const sp = save.getPlayer();
    if (sp && typeof sp.x === 'number') {
      this.player.position.set(sp.x, sp.y || 0, sp.z);
      this.player.rotation.y = sp.yaw || Math.PI;
      this.camYaw = sp.camYaw || 0;
      this.onIsle = !!sp.isle;
      if (this.onIsle) this.player.position.y = 14;
    } else {
      this.player.position.set(0, 0, 14);
    }
    // 换了册：上次站的岛可能不属于本册了，落回阳光农场出生点，别悬在大海上
    const p0 = this.player.position;
    if (Math.hypot(p0.x, p0.z) > WORLD_R + 0.5 && !this._islandAt(p0)) {
      p0.set(0, 0, 14);
      this.onIsle = false;
    }
    this.scene.add(this.player);
    this.climbing = false;
    this.walkT = 0;
    this.lastZone = null;
    this.dustT = 0;       // 跑步尘土计时
    this.sparkT = 0;      // 魔法棒星星计时
  }

  // 向导箭头：漂浮在头顶，指向当前目标
  _initGuide() {
    const g = new THREE.Group();
    const gold = new THREE.MeshBasicMaterial({ color: 0xFFB93C });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.4, 8), gold);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = -0.32;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 8), gold);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.2;
    g.add(shaft, head);
    g.visible = false;
    this.scene.add(g);
    this.guideArrow = g;
  }

  _initEntities() {
    this.eggs = new EggManager(this.scene);
    this.pets = new PetManager(this.scene);
    this._spawnProgress();
    this.planted = save.hasGate('planted');
    this._refreshHungry();
  }

  // 关卡制出蛋：已孵化的变词宠；蛋只出"当前关卡的 6 个"（粉光柱）+ 剧情还没用掉的钥匙词蛋（蓝光柱带 🔑，不算本关进度）
  _spawnProgress() {
    const cur = new Set(this.currentChapter.words);
    for (const w of this.scopeWords) {
      if (save.isHatched(w.id)) {
        if (!this.pets.get(w.id)) {
          const pet = this.pets.spawn(w);
          pet.group.userData.wordId = w.id;
        }
        continue;
      }
      if (this.eggs.get(w.id)) continue;
      if (cur.has(w.id)) {
        const egg = this.eggs.spawnEgg(w, w.zone === 'sky');
        egg.group.userData.wordId = w.id;
      } else if (this._pendingGateWord(w.id)) {
        const egg = this.eggs.spawnEgg(w, w.zone === 'sky', true);
        egg.group.userData.wordId = w.id;
      }
    }
  }

  // 钥匙词蛋：只要对应机关还没触发就一直留在场上，保证剧情卡不死
  _pendingGateWord(id) {
    switch (id) {
      case 'boat': return !save.hasGate('boat');
      case 'light': return !save.hasGate('light');
      case 'wind': return !save.hasGate('wind');
      case 'seed': return !save.hasGate('planted');
      case 'rain': return save.hasGate('planted') && !save.hasGate('beanstalk');
      default: return false;
    }
  }

  _initInput() {
    this.joy = { x: 0, y: 0, active: false };
    // 终端判断：手机/平板走触屏 UI，电脑（含触屏笔记本）走键盘鼠标
    // ?touch=1 / ?touch=0 可强制指定
    const q = /[?&]touch=(1|0)/.exec(location.search);
    const uaMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);
    const coarse = matchMedia('(pointer: coarse)').matches;
    const desktopLike = matchMedia('(hover: hover) and (pointer: fine)').matches;
    this.isTouch = q ? q[1] === '1' : (uaMobile || (coarse && !desktopLike));
    this.vy = 0;            // 跳跃垂直速度
    this.onGround = true;
    this.riding = false;    // 正在坐船过河
    this.moveTarget = null; // 点击移动目标
    // 点击移动的落点标记（金色小光环）
    this.moveMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0xFFC94E, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    this.moveMarker.rotation.x = -Math.PI / 2;
    this.moveMarker.visible = false;
    this.scene.add(this.moveMarker);

    addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (/^Key[WASD]$|^Arrow/.test(e.code)) this._clearMoveTarget(); // 手动方向一按，自动走路让位
      if (e.code === 'KeyE') this._interact();
      if (e.code === 'Tab') { e.preventDefault(); this._openSummon(); }
      if (e.code === 'Space') {
        e.preventDefault();
        this._jump();
      }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('resize', () => this.onResize());

    // ---- 触屏：单指拖动=转视角，双指=缩放，轻点=交互；摇杆是独立元素 ----
    this.touchCam = new Map();      // pointerId -> {x, y}
    this.tapInfo = null;            // 轻点检测
    this.pinchDist = 0;

    let dragging = false, lx = 0, ly = 0;
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') {
        this.touchCam.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.touchCam.size === 2) {
          const [a, b] = [...this.touchCam.values()];
          this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        }
        this.tapInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
      } else if (e.button === 2) { dragging = true; lx = e.clientX; ly = e.clientY; }
      else if (e.button === 0) this._click(e);
    });
    addEventListener('pointermove', e => {
      if (dragging) {
        this.camYaw -= (e.clientX - lx) * 0.006;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + (e.clientY - ly) * 0.004, 0.08, 1.1);
        lx = e.clientX; ly = e.clientY;
        return;
      }
      if (this.touchCam.has(e.pointerId)) {
        const p = this.touchCam.get(e.pointerId);
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (this.touchCam.size === 1) {
          this.camYaw -= dx * 0.007;
          this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005, 0.08, 1.1);
        }
        p.x = e.clientX; p.y = e.clientY;
        if (this.touchCam.size === 2) {
          const [a, b] = [...this.touchCam.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinchDist > 0) this.camDist = THREE.MathUtils.clamp(this.camDist * this.pinchDist / d, 3.2, 60);
          this.pinchDist = d;
        }
      }
    });
    const endPointer = e => {
      if (this.touchCam.has(e.pointerId)) {
        this.touchCam.delete(e.pointerId);
        this.pinchDist = 0;
        // 轻点（几乎没移动、时间短）= 点击交互
        if (this.tapInfo && this.touchCam.size === 0) {
          const moved = Math.hypot(e.clientX - this.tapInfo.x, e.clientY - this.tapInfo.y);
          if (moved < 12 && performance.now() - this.tapInfo.t < 350) {
            this._click({ clientX: e.clientX, clientY: e.clientY });
          }
        }
        this.tapInfo = null;
      }
      if (e.pointerType !== 'touch') dragging = false;
    };
    addEventListener('pointerup', endPointer);
    addEventListener('pointercancel', endPointer);
    this.canvas.addEventListener('wheel', e => {
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 3.2, 60);
    }, { passive: true });

    // ---- 虚拟摇杆 ----
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joy-knob');
    if (joy && knob) {
      let joyId = null, cx = 0, cy = 0;
      const R = 44;
      const setKnob = (dx, dy) => { knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; };
      joy.addEventListener('pointerdown', e => {
        joyId = e.pointerId;
        try { joy.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const r = joy.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        this.joy.active = true;
        e.preventDefault();
      });
      joy.addEventListener('pointermove', e => {
        if (e.pointerId !== joyId) return;
        let dx = e.clientX - cx, dy = e.clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > R) { dx = dx / len * R; dy = dy / len * R; }
        setKnob(dx, dy);
        this.joy.x = dx / R; this.joy.y = dy / R;
      });
      const joyEnd = e => {
        if (e.pointerId !== joyId) return;
        joyId = null;
        this.joy.active = false; this.joy.x = 0; this.joy.y = 0;
        setKnob(0, 0);
      };
      joy.addEventListener('pointerup', joyEnd);
      joy.addEventListener('pointercancel', joyEnd);
    }
    if (this.isTouch && joy) {
      joy.classList.remove('hidden');
      document.body.classList.add('touch');
    }
    // 触屏跳跃按钮
    const jumpBtn = document.getElementById('btn-jump');
    if (jumpBtn) {
      if (this.isTouch) jumpBtn.classList.remove('hidden');
      jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); this._jump(); });
    }
  }

  // ================= 跳跃 =================
  _jump() {
    if (!this.onGround || this.climbing || this.riding) return;
    if (ui.challengeOpen()) return;
    if (document.querySelector('.overlay:not(.hidden)')) return;  // 弹窗打开时不跳
    const el = document.activeElement;
    if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    this.vy = 8.6;
    this.onGround = false;
    sfx.pop();
    // 起跳小蹲
    this.player.scale.set(1.08, 0.9, 1.08);
    this.addTween(0.16, k => {
      const s = 0.9 + k * 0.1 + Math.sin(k * Math.PI) * 0.06;
      this.player.scale.set(1.08 - k * 0.08, s, 1.08 - k * 0.08);
    }, () => this.player.scale.set(1, 1, 1));
  }

  // ================= 点击移动 =================
  _clearMoveTarget() {
    this.moveTarget = null;
    if (this.moveMarker) this.moveMarker.visible = false;
    this._stuckT = 0;
  }

  _setMoveTarget(e) {
    if (this.riding || this.climbing) return;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const groundY = this.onIsle ? 14 : 0;
    const pt = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -groundY), pt)) return;
    const dc = Math.hypot(pt.x, pt.z);
    if (dc > 48) { pt.x *= 48 / dc; pt.z *= 48 / dc; }   // 别点到世界外面去
    this.moveTarget = { x: pt.x, z: pt.z };
    this.moveMarker.position.set(pt.x, groundY + 0.06, pt.z);
    this.moveMarker.visible = true;
  }

  _initUI() {
    ui.bindHUD({
      onCatalog: () => this._openCatalog(),
      onHelp: () => {},
      onBook: () => this._openBook(),
      onSummon: () => this._openSummon(),
      onPrompt: () => this._interact(),
      onMap: () => this._openMap(),
      onHungryPill: () => this._openCatalog(true),
      onRank: () => ui.showLeaderboard({ username: save.getUsername(), score: save.getScore() }),
      onAbout: () => ui.showAbout(),
      onAccount: () => ui.showProfile((name, semKey, gender, password, serverScore) => {
        save.setUsername(name);
        save.setPassword(password || '');   // 允许清空/修改密码
        save.setRegistered(true);
        if (serverScore != null) save.syncScore(serverScore);
        save.setBookSem(semKey);
        save.setGender(gender);
        save.resetSessionScore();
        location.reload();
      }, {
        username: save.getUsername(), password: save.getPassword(), registered: save.isRegistered(),
        semKey: save.getBookSem(), gender: save.getGender(),
      }, {
        editing: true,
        onLogout: () => {
          if (confirm('退出当前账号并清除本机进度吗？')) {
            save.resetSave();
            location.reload();
          }
        },
      }),
      onMic: () => this._startVoice(),
      onMicEnd: () => this._stopVoice(),
      isTouch: this.isTouch,
    });
    // 位置存档：每 3 秒 + 离开页面时
    setInterval(() => this._savePosition(), 3000);
    addEventListener('pagehide', () => this._savePosition());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._savePosition(); });
  }

  _savePosition() {
    const p = this.player.position;
    save.savePlayer({
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2),
      yaw: +this.player.rotation.y.toFixed(2), camYaw: +this.camYaw.toFixed(2),
      isle: this.onIsle,
    });
  }

  onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer && this.composer.setSize(innerWidth, innerHeight);
  }

  start() {
    ui.hideLoading();
    ui.updateUser(save.getUsername());
    ui.updateStars(save.getStars());
    ui.setLeaderboardPlayer({ username: save.getUsername(), score: save.getScore() });
    ui.updatePlayerScore(save.getScore(), save.getSessionScore());
    this._refreshDailyBanner();
    if (!save.getIntro()) {
      setTimeout(() => ui.playIntro(() => save.setIntro(true), this.isTouch, BOOK_LABEL(this.sem), this.total), 600);
    }
    this._loop();
    setInterval(() => this._refreshHungry(), 1500);
    // 指一条路：最近的可孵蛋
    setTimeout(() => {
      if (!save.getIntro()) return;
      const near = this._nearestEggHint();
      if (near) ui.toast(`🥚 ${ZONE_NAMES[near.word.zone]}那边有词宠蛋在发光，去瞧瞧！`, 3600);
    }, 8000);
  }

  // ================= 主循环 =================
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this._updatePlayer(dt);
    this._updateCamera(dt);
    this._updateWorldAnim(dt, t);
    this._updateGuide(t);
    this._updateZoneHint(dt);
    this._updateFx(dt);
    this.eggs.update(dt, t);
    this.pets.update(dt, t, this.player.position);
    this._updatePrompt();
    this._placeQuestBubble();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // 任务气泡锚在小人头顶：3D 坐标投到屏幕，镜头外就先藏起来
  _placeQuestBubble() {
    this._v3 = this._v3 || new THREE.Vector3();
    this._v3.set(this.player.position.x, this.player.position.y + 1.6, this.player.position.z).project(this.camera);
    if (this._v3.z < 1) ui.placeQuest((this._v3.x * 0.5 + 0.5) * innerWidth, (-this._v3.y * 0.5 + 0.5) * innerHeight);
    else ui.placeQuest(null);
  }

  // ================= 指引系统 =================
  _zoneAt(p) {
    if (this.onIsle) return 'sky';
    const isl = this._islandAt(p);
    if (isl) return isl.key;
    if (p.x > 20.9 && p.x < 27.1 && p.z > 19.3 && p.z < 24.7) return 'barn';
    for (const zr of ZONE_RECTS) {
      if (p.x >= zr.x1 && p.x <= zr.x2 && p.z >= zr.z1 && p.z <= zr.z2) return zr.key;
    }
    return 'meadow';
  }

  // 玩家脚下是哪块陆地：海岛（含名字）或主岛（null）
  _islandAt(p) {
    return this.islands.find(isl => Math.hypot(p.x - isl.cx, p.z - isl.cz) <= isl.r + 1) || null;
  }

  _reachableZone(zone) {
    if (zone === 'orchard' || zone === 'windmill') return save.hasGate('boat');
    if (zone === 'barn') return save.hasGate('light');
    if (zone === 'sky') return save.hasGate('beanstalk');
    if (zone === 'beach') return save.hasGate('sandWall');
    if (zone === 'forest') return save.hasGate('vines');
    const isl = this.islands.find(i => i.key === zone);
    if (isl) return this.chapterIndex(this.hatchedInScope()) >= isl.startChapter;
    return true;
  }

  _eggById(id) { const e = this.eggs.get(id); return e ? e.group.position : null; }

  _nearestReachableEgg() {
    const p = this.player.position;
    let best = null, bd = 1e9;
    for (const e of this.eggs.eggs.values()) {
      if (!this._reachableZone(e.word.zone)) continue;
      const d = Math.hypot(e.group.position.x - p.x, e.group.position.z - p.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // 当前任务目标（文字 + 指路坐标）：剧情钥匙优先，平时显示本关进度
  _objective() {
    const total = this.hatchedInScope();
    const chIdx = this.chapterIndex(total);
    const chapters = this.chapters;
    if (total >= this.total) {
      return {
        text: `🎉 本册 ${this.total} 只词宠全部唤醒！去许愿井换套新装扮，或去「课本」换一册接着玩吧`,
        target: null,
      };
    }
    if (!save.hasGate('boat')) {
      const ep = save.isHatched('boat') ? { x: 0, z: 4.6 } : this._eggById('boat');
      return save.isHatched('boat')
        ? { text: '去码头，点 🪄 召唤能浮在水上的词宠搭桥！', target: ep }
        : { text: '码头边有一颗蛋，先去孵化它！', target: ep };
    }
    if (!save.hasGate('light')) {
      const ep = save.isHatched('light') ? { x: 24, z: 18.5 } : this._eggById('light');
      return save.isHatched('light')
        ? { text: '谷仓里黑漆漆的，召唤会发光的词宠照亮它！', target: ep }
        : { text: '南瓜地附近有一颗蛋，谷仓需要它！', target: ep };
    }
    if (!save.hasGate('wind')) {
      const ep = save.isHatched('wind') ? { x: 13, z: -6 } : this._eggById('wind');
      return save.isHatched('wind')
        ? { text: '风车田的干草球挡路了，召唤看不见摸不着的词宠吹走它！', target: ep }
        : { text: '风车田门口有一颗蛋！', target: ep };
    }
    if (!save.hasGate('beanstalk')) {
      if (!this.planted) {
        const ep = save.isHatched('seed') ? { x: -22, z: 25.5 } : this._eggById('seed');
        return save.isHatched('seed')
          ? { text: '魔法菜园的泥土在等一颗种子！', target: ep }
          : { text: '菜园旁边有一颗蛋，捡起来！', target: ep };
      }
      const ep = save.isHatched('rain') ? { x: -22, z: 25.5 } : this._eggById('rain');
      return save.isHatched('rain')
        ? { text: '豆苗种下啦！呼唤从天上落下来的词宠！', target: ep }
        : { text: '豆苗需要一场从天上落下来的礼物！', target: ep };
    }
    // 新大陆谜题：沙墙 → 阳光海滩；荆棘 → 神秘森林
    if (!save.hasGate('sandWall')) {
      return {
        text: save.hasGate('wind')
          ? '南边有一堵金色沙墙！去墙边召唤词宠解开谜题吧'
          : '听说南边的沙滩被沙墙封住了…先解锁前面的关吧',
        target: save.hasGate('wind') ? { x: 0, z: 36.5 } : null,
      };
    }
    if (!save.hasGate('vines')) {
      return {
        text: '西边的荆棘丛挡住了神秘森林！去拨开它吧',
        target: { x: -36.5, z: 11 },
      };
    }
    // 本关进度：唤醒满 6 个就通关开新蛋
    const cur = chapters[chIdx].words;
    const left = cur.filter(id => !save.isHatched(id)).length;
    const e = this._nearestReachableEgg();
    if (e) {
      // 蛋在海岛上而人不在岛上：指引去坐小火车 / 回主岛
      const isl = this.islands.find(i => i.key === e.word.zone);
      const here = this._islandAt(this.player.position);
      if (isl && (!here || here.key !== isl.key)) {
        const onMain = !here;
        return {
          text: onMain
            ? `🚂 坐小火车去「${isl.name}」！那里的蛋在等你`
            : `🚂 先回阳光农场，再坐小火车去「${isl.name}」`,
          target: onMain ? { x: -9, z: 9.6 } : { x: here.cx, z: here.cz - 2.5 },
        };
      }
    }
    return {
      text: `第 ${chIdx + 1} 关「${chapters[chIdx].name}」：还剩 ${left} 个单词就通关！（本册 ${total}/${this.total}）`,
      target: e ? e.group.position : null,
    };
  }

  _updateGuide(t) {
    const obj = this._objective();
    ui.setQuest(obj.text);
    // 头顶箭头
    const p = this.player.position;
    if (obj.target) {
      const dx = obj.target.x - p.x, dz = obj.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.5) {
        this.guideArrow.visible = true;
        this.guideArrow.position.set(p.x, p.y + 2.15 + Math.sin(t * 3) * 0.12, p.z);
        this.guideArrow.rotation.y = Math.atan2(-dz, dx);
      } else this.guideArrow.visible = false;
    } else this.guideArrow.visible = false;
  }

  // 区域进入提示
  _updateZoneHint(dt) {
    this._zoneTimer = (this._zoneTimer || 0) + dt;
    if (this._zoneTimer < 0.6) return;
    this._zoneTimer = 0;
    const z = this._zoneAt(this.player.position);
    if (z !== this.lastZone) {
      this.lastZone = z;
      if (save.addVisited(z)) {
      const names = {
        meadow: '出生草甸 · 词宠蛋的家', orchard: '阳光果园 · 过河就能摘果子',
        windmill: '风车田 · 大风车的秘密', barnyard: '谷仓前院 · 马和绵羊的家',
        barn: '谷仓里 · 灯亮了才能看清哦', garden: '魔法菜园 · 种下种子会发生什么？',
        sky: '天空岛 · 传说中的金色词宠蛋！',
        beach: '阳光海滩 · 听！是海浪的声音', forest: '神秘森林 · 树后面好像有眼睛在眨',
      };
        ui.toast('📍 ' + (names[z] || z), 3200);
      }
    }
  }

  // 地图
  _openMap() {
    const visited = save.getVisited();
    const hatched = this.hatchedInScope();
    const chIdx = this.chapterIndex(hatched);
    const chWords = new Set(this.chapters[chIdx].words);
    // 统计“当前关卡 + 剧情钥匙蛋”落在该区域的词，和场上真实可见的蛋保持一致（只看本册）
    const zoneStats = key => {
      const inZone = this.scopeWords.filter(w => w.zone === key && (chWords.has(w.id) || this._pendingGateWord(w.id)));
      return { total: inZone.length, hatched: inZone.filter(w => save.isHatched(w.id)).length };
    };
    const zones = ZONE_RECTS.map(zr => {
      const st = zoneStats(zr.key);
      return {
        key: zr.key, name: zr.name, x1: zr.x1, z1: zr.z1, x2: zr.x2, z2: zr.z2,
        discovered: visited.includes(zr.key),
        total: st.total,
        hatched: st.hatched,
        locked: !this._reachableZone(zr.key),
      };
    });
    zones.push({
      key: 'sky', name: SKY_RECT.name, x1: SKY_RECT.x1, z1: SKY_RECT.z1, x2: SKY_RECT.x2, z2: SKY_RECT.z2,
      discovered: visited.includes('sky'), ...zoneStats('sky'),
      locked: !save.hasGate('beanstalk'),
    });
    const eggs = [...this.eggs.eggs.values()].map(e => ({
      x: e.group.position.x, z: e.group.position.z, golden: e.golden, key: !!e.key,
    }));
    const islands = this.islands.map(isl => ({
      key: isl.key, name: isl.name, emoji: isl.emoji, cx: isl.cx, cz: isl.cz, r: isl.r,
      unlocked: chIdx >= isl.startChapter,
      // 本册进度：岛上有几只已经唤醒
      total: this.scopeWords.filter(w => w.island === isl.key).length,
      hatched: this.scopeWords.filter(w => w.island === isl.key && save.isHatched(w.id)).length,
    }));
    ui.openMap({
      player: { x: this.player.position.x, z: this.player.position.z },
      zones, eggs, islands,
      gates: { sandWall: save.hasGate('sandWall'), vines: save.hasGate('vines') },
      chapterLabel: `${BOOK_LABEL(this.sem)} · 第${chIdx + 1}关 · ${this.chapters[chIdx].name}`,
    });
  }

  // ================= 玩家 =================
  _updatePlayer(dt) {
    if (this.climbing || this.riding) return;
    const move = this._mv = this._mv || new THREE.Vector3();
    move.set(0, 0, 0);
    // 键盘/摇杆方向是“相对镜头”的；点击移动是“世界坐标直线”，不随镜头转
    let cameraRelative = true;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.x += 1;
    // 虚拟摇杆（手机）
    if (this.joy.active) { move.x += this.joy.x; move.z += this.joy.y; }
    // 键盘/摇杆接管时取消点击移动
    if (move.lengthSq() > 0 && this.moveTarget) this._clearMoveTarget();
    // 点击移动：没有手动输入时，沿直线朝点击的地点走
    if (move.lengthSq() === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - this.player.position.x;
      const dz = this.moveTarget.z - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        this._clearMoveTarget();
      } else {
        cameraRelative = false;
        move.x = dx / d; move.z = dz / d;
        // 被障碍卡住（想走但走不动）一小会儿就放弃，别顶着墙抖
        const step = Math.hypot(
          this.player.position.x - (this._lastStepX ?? this.player.position.x),
          this.player.position.z - (this._lastStepZ ?? this.player.position.z));
        this._stuckT = step < PLAYER_SPEED * dt * 0.3 ? (this._stuckT || 0) + dt : 0;
        if (this._stuckT > 0.7) { this._clearMoveTarget(); move.set(0, 0, 0); }
        this._lastStepX = this.player.position.x;
        this._lastStepZ = this.player.position.z;
      }
    }
    const moving = move.lengthSq() > 0;
    // 空中保留操控且带一点冲劲：方向键+空格 = 向前跳
    const speed = PLAYER_SPEED * (this.onGround ? 1 : 1.38);
    if (moving) {
      if (cameraRelative) {
        // 绕 Y 轴转 camYaw（等价于原 applyAxisAngle，不建临时对象）
        const s = Math.sin(this.camYaw), c = Math.cos(this.camYaw);
        const mx = move.x * c + move.z * s, mz = move.z * c - move.x * s;
        move.x = mx; move.z = mz;
      }
      this.player.position.x += move.x * speed * dt;
      this.player.position.z += move.z * speed * dt;
      const targetYaw = Math.atan2(move.x, move.z);
      let dy = targetYaw - this.player.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.player.rotation.y += dy * Math.min(1, dt * 12);
      this.walkT += dt * 9;
    } else this.walkT += dt * 1.5;
    // 跳跃物理
    const groundY = this.onIsle ? 14 : 0;
    if (!this.onGround) {
      this.vy -= 20 * dt;
      this.player.position.y += this.vy * dt;
      if (this.player.position.y <= groundY) {
        this.player.position.y = groundY;
        this.onGround = true;
        this.vy = 0;
        // 落地一压，Q 弹一下
        this.player.scale.set(1.12, 0.8, 1.12);
        this.addTween(0.2, k => {
          this.player.scale.set(1.12 - k * 0.12, 0.8 + k * 0.2, 1.12 - k * 0.12);
        }, () => this.player.scale.set(1, 1, 1));
      }
    } else if (!this.onIsle) {
      this.player.position.y = 0;
    }
    // 摆动：空中定格成张开的姿势
    const sw = this.onGround ? Math.sin(this.walkT) * (moving ? 0.55 : 0.06) : 0.8;
    this.playerParts.legL.rotation.x = sw;
    this.playerParts.legR.rotation.x = this.onGround ? -sw : -0.35;
    this.playerParts.armL.rotation.x = -sw * 0.8;
    this.playerParts.armR.rotation.x = sw * 0.8;
    this.playerParts.body.position.y = 0.3 + Math.abs(Math.sin(this.walkT)) * (moving && this.onGround ? 0.03 : 0.008);

    this._collide();
    // 跑步扬起小尘土
    if (moving && this.onGround) {
      this.dustT -= dt;
      if (this.dustT <= 0) { this.dustT = 0.22; this._puff(); }
    }
    // 星星魔法棒：走路撒星星
    if (this.playerParts.wandTip) {
      this.sparkT -= dt;
      if (moving && this.onGround && this.sparkT <= 0) {
        this.sparkT = 0.16;
        const wp = this._wp = this._wp || new THREE.Vector3();
        this.playerParts.wandTip.getWorldPosition(wp);
        this._sparkle(wp);
      }
    }
    // 天空岛逻辑
    if (this.onIsle) {
      if (this.onGround) this.player.position.y = 14;
      const d = Math.hypot(this.player.position.x - ISLE_CENTER.x, this.player.position.z - ISLE_CENTER.z);
      if (d > 5.1 && !this.climbing) this._climb(false); // 走出边缘 → 滑下去
    }
  }

  // 脚下的小尘土
  _puff() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), transparent: true, depthWrite: false }));
    s.position.copy(this.player.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.12, (Math.random() - 0.5) * 0.3));
    s.scale.setScalar(0.26);
    this.scene.add(s);
    this.fx.push({
      obj: s, t: 0, dur: 0.55,
      update: (t, dt) => { s.position.y += dt * 0.5; s.scale.setScalar(0.26 + t * 0.5); s.material.opacity = Math.max(0, 1 - t / 0.55) * 0.75; },
    });
  }

  // 魔法棒的小星星
  _sparkle(pos) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: letterTexture('✦', '#FFE24E', '#FFFDF0'), transparent: true, depthWrite: false,
    }));
    s.position.copy(pos);
    s.scale.setScalar(0.14);
    this.scene.add(s);
    this.fx.push({
      obj: s, t: 0, dur: 0.7,
      update: (t, dt) => { s.position.y += dt * 0.8; s.material.rotation += dt * 6; s.material.opacity = Math.max(0, 1 - t / 0.7); },
    });
  }

  _collide() {
    const p = this.player.position;
    const R = 0.42;
    // 世界边界：玩家只能待在陆地（主岛或某座海岛）上，海面过不去
    const isl = this._islandAt(p);
    if (!this.onIsle) {
      if (isl) {
        const dc = Math.hypot(p.x - isl.cx, p.z - isl.cz);
        if (dc > isl.r - 0.4) {
          const k = (isl.r - 0.4) / dc;
          p.x = isl.cx + (p.x - isl.cx) * k;
          p.z = isl.cz + (p.z - isl.cz) * k;
        }
      } else {
        const dc = Math.hypot(p.x, p.z);
        if (dc > WORLD_R) { p.x *= WORLD_R / dc; p.z *= WORLD_R / dc; }
      }
    }
    // 河流
    if (Math.abs(p.z) < 4.1) {
      const canCross = save.hasGate('boat') && Math.abs(p.x) < 2.0;
      if (!canCross) {
        p.z = p.z >= 0 ? 4.1 : -4.1;
        if (this.riverHintCd <= 0) {
          this.riverHintCd = 6;
          // 码头边交互提示条已经在引导了，别再用 toast 重复念叨同一句话
          const nearDock = Math.abs(p.x) < 8;
          if (!nearDock) {
            if (save.isHatched('boat')) ui.toast('🌊 河流挡路啦！回码头召唤能浮在水上的词宠吧');
            else ui.toast('🌊 河流挡住了去路…码头边好像有一颗蛋在发光');
          }
        }
      }
    }
    // 圆形与矩形碰撞体
    for (const c of this.world.colliders) {
      if (c.t === 'c') {
        const dx = p.x - c.x, dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d < c.r + R && d > 0.001) {
          p.x = c.x + dx / d * (c.r + R);
          p.z = c.z + dz / d * (c.r + R);
        }
      } else {
        const cx = THREE.MathUtils.clamp(p.x, c.x1, c.x2);
        const cz = THREE.MathUtils.clamp(p.z, c.z1, c.z2);
        const dx = p.x - cx, dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < R) {
          if (d > 0.001) { p.x = cx + dx / d * R; p.z = cz + dz / d * R; }
          else p.z = c.z2 + R; // 正好在矩形内，往南推
        }
      }
    }
  }

  _updateCamera(dt) {
    const target = this.player.position;
    // 复用临时向量：相机每帧跑 60 次，不能每次都 new（GC 卡顿元凶）
    const v = this._cv = this._cv || new THREE.Vector3();
    const cp = Math.cos(this.camPitch);
    v.set(
      target.x + Math.sin(this.camYaw) * cp * this.camDist,
      target.y + Math.sin(this.camPitch) * this.camDist + 1.6,
      target.z + Math.cos(this.camYaw) * cp * this.camDist
    );
    if (!this.onIsle && v.y < 1.2) v.y = 1.2;
    this.camera.position.lerp(v, Math.min(1, dt * 7));
    this.camera.lookAt(target.x, target.y + 1.0, target.z);
  }

  _updateWorldAnim(dt, t) {
    const a = this.world.anim;
    if (a.windmill) a.windmill.rotation.z += dt * 0.7;
    for (const pw of a.pinwheels || []) pw.rotation.z += dt * 2.2;
    if (a.water) {
      const pos = a.water.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, Math.sin(x * 0.5 + t * 1.6) * 0.055 + Math.cos(pos.getZ(i) * 0.8 + t) * 0.04);
      }
      pos.needsUpdate = true;
    }
    if (a.sea) a.sea.position.y = -0.14 + Math.sin(t * 0.8) * 0.03;
    if (a.surf) {
      a.surf.material.opacity = 0.32 + Math.sin(t * 1.4) * 0.16;
      const s = 1 + Math.sin(t * 1.4) * 0.006;
      a.surf.scale.set(s, 1, s);
    }
    for (const f of a.foam || []) f.material.opacity = 0.4 + Math.sin(t * 2.2 + f.position.z) * 0.2;
    for (const s2 of a.islandSurf || []) s2.material.opacity = 0.28 + Math.sin(t * 1.6 + s2.position.x) * 0.14;
    for (const pd of a.islandPads || []) {
      pd.beacon.rotation.y = t * 1.5;
      pd.beacon.position.y = 1.1 + Math.sin(t * 2.2 + pd.ring.position.x) * 0.15;
    }
    if (a.petals) {
      const pos = a.petals.points.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - a.petals.speeds[i] * dt;
        let x = pos.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.35;
        if (y < 0.1) { y = 11 + Math.random() * 2; x = (Math.random() - 0.5) * 90; }
        pos.setY(i, y); pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
    for (const c of a.clouds) {
      c.position.x += dt * 0.25;
      if (c.position.x > 60) c.position.x = -60;
    }
    for (const gr of a.grass || []) gr.rotation.z = Math.sin(t * 2 + gr.userData.phase) * 0.09;
    if (a.fireflies) {
      const pos = a.fireflies.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, 0.8 + Math.sin(t * 1.2 + i * 1.7) * 0.7 + Math.sin(t * 0.5 + i) * 0.4);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.7 + i * 2.3) * dt * 0.35);
      }
      pos.needsUpdate = true;
      a.fireflies.material.opacity = 0.65 + Math.sin(t * 2.4) * 0.3;
    }
    for (const bf of a.butterflies || []) {
      const c = bf.userData.center, p = bf.userData.phase;
      bf.position.set(
        c[0] + Math.sin(t * 0.5 + p) * 2.4,
        0.9 + Math.sin(t * 1.6 + p) * 0.35,
        c[1] + Math.cos(t * 0.42 + p) * 2.4);
      bf.rotation.y = -t * 0.5;
      bf.userData.wings[0].rotation.z = Math.sin(t * 16 + p) * 0.95;
      bf.userData.wings[1].rotation.z = -Math.sin(t * 16 + p) * 0.95;
    }
    for (const gu of a.gulls || []) {
      const c = gu.userData.center, p = gu.userData.phase, r = gu.userData.radius;
      const a2 = t * 0.35 + p;
      gu.position.set(c[0] + Math.cos(a2) * r, gu.userData.height + Math.sin(t + p) * 0.5, c[1] + Math.sin(a2) * r);
      gu.rotation.y = -a2;
      gu.userData.wingL.rotation.z = Math.sin(t * 7 + p) * 0.5;
      gu.userData.wingR.rotation.z = -Math.sin(t * 7 + p) * 0.5;
    }
    // 随身装扮：气球一颠一颠
    if (this.playerParts.balloon) {
      const b = this.playerParts.balloon;
      b.rotation.z = Math.sin(t * 2.6) * 0.14;
      b.children[1] && (b.children[1].position.x = Math.sin(t * 2.6) * 0.06);
    }
    // 点击移动落点标记：呼吸闪烁
    if (this.moveMarker && this.moveMarker.visible) {
      const s = 1 + Math.sin(t * 8) * 0.18;
      this.moveMarker.scale.setScalar(s);
      this.moveMarker.material.opacity = 0.55 + Math.sin(t * 8) * 0.3;
    }
    this.riverHintCd -= dt;
  }

  _updateFx(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.onUpdate(tw.ease ? tw.ease(k) : k, dt);
      if (k >= 1) { this.tweens.splice(i, 1); tw.onDone && tw.onDone(); }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      f.update(f.t, dt);
      if (f.t >= f.dur) { this.scene.remove(f.obj); this.fx.splice(i, 1); }
    }
  }

  addTween(dur, onUpdate, onDone, ease) {
    this.tweens.push({ t: 0, dur, onUpdate, onDone, ease });
  }

  // ================= 交互 =================
  _updatePrompt() {
    if (ui.challengeOpen()) { ui.hidePrompt(); return; }
    const p = this.player.position;
    // 蛋
    const egg = this.eggs.nearest(p, 2.6);
    if (egg) { ui.showPrompt('读出单词，唤醒词宠蛋', 'E'); this.promptAction = () => this._openEgg(egg.word.id); return; }
    // 饿了的词宠
    const hungry = this._nearHungryPet(p, 2.4);
    if (hungry) {
      ui.showPrompt(`喊「${hungry.word.en}」喂饱它`, 'E');
      this.promptAction = () => this._feedPet(hungry.word.id);
      return;
    }
    // 豆藤攀爬
    if (save.hasGate('beanstalk')) {
      const nearBase = Math.hypot(p.x - CLIMB_BOTTOM.x, p.z - CLIMB_BOTTOM.z) < 1.8 && !this.onIsle;
      const nearTop = this.onIsle && Math.hypot(p.x - CLIMB_TOP.x, p.z - CLIMB_TOP.z) < 2.2;
      if (nearBase) { ui.showPrompt('顺着豆藤爬上天空岛', 'E'); this.promptAction = () => this._climb(true); return; }
      if (nearTop) { ui.showPrompt('顺着豆藤滑回农场', 'E'); this.promptAction = () => this._climb(false); return; }
    }
    // 坐船过河：船就停在渡口，点一下（或按 E）直接坐过去，不用自己找路
    if (save.hasGate('boat') && !this.riding
        && Math.abs(p.x) < 6 && Math.abs(Math.abs(p.z) - 4.6) < 4.2) {
      ui.showPrompt('坐 boat 过河 ⛵', 'E');
      this.promptAction = () => this._rideBoat();
      return;
    }
    // 许愿井（星星商店）与每日任务板
    if (Math.hypot(p.x - 4.6, p.z - 19.5) < 2.6) {
      ui.showPrompt('到许愿井换新装扮', this.isTouch ? '👆' : 'E');
      this.promptAction = () => this._openShop();
      return;
    }
    if (Math.hypot(p.x + 4.6, p.z - 19.5) < 2.6) {
      ui.showPrompt('看看今日任务', this.isTouch ? '👆' : 'E');
      this.promptAction = () => this._openDailyBoard();
      return;
    }
    // 小火车站（主岛）与海岛返回台
    if (!this._islandAt(p) && Math.hypot(p.x + 9, p.z - 9.6) < 2.8) {
      ui.showPrompt('坐小火车去群岛', this.isTouch ? '👆' : 'E');
      this.promptAction = () => this._openStation();
      return;
    }
    const hereIsl = this._islandAt(p);
    if (hereIsl && Math.hypot(p.x - hereIsl.cx, p.z - (hereIsl.cz - 2.5)) < 2.6) {
      ui.showPrompt('坐小火车回阳光农场', this.isTouch ? '👆' : 'E');
      this.promptAction = () => this._rideTrain(null);
      return;
    }
    // 谜题机关：读懂谜面，从召唤盘里挑出对的那只词宠
    const gate = this._activeGate();
    if (gate) {
      const ready = gate.need.every(id => save.isHatched(id));
      if (ready) {
        ui.showPrompt('谜题时间：选对词宠帮帮忙', this.isTouch ? '🪄' : 'E');
        this.promptAction = () => this._openSummon(gate);
      } else {
        const how = this.isTouch ? '点 🪄 看谜语' : '按 Tab 看谜语';
        ui.showPrompt('这里有一个谜题（' + how + '）', 'Tab');
        this.promptAction = null;
      }
      return;
    }
    ui.hidePrompt();
    this.promptAction = null;
  }

  _interact() {
    if (ui.challengeOpen()) return;
    if (this.promptAction) this.promptAction();
  }

  _click(e) {
    if (ui.challengeOpen()) return;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const targets = [];
    for (const eg of this.eggs.eggs.values()) targets.push(eg.group);
    for (const pt of this.pets.all()) if (save.isHungry(pt.word.id)) targets.push(pt.group);
    // 河中央的船也可以点：直接坐船过河（但它饿的时候优先喂它）
    const boat = this.pets.get('boat');
    if (boat && save.hasGate('boat') && !save.isHungry('boat')) targets.push(boat.group);
    const hits = ray.intersectObjects(targets, true);
    if (!hits.length) { this._setMoveTarget(e); return; }   // 点的是空地 → 走过去
    let obj = hits[0].object;
    while (obj && obj.userData.wordId === undefined) obj = obj.parent;
    if (!obj) { this._setMoveTarget(e); return; }
    const id = obj.userData.wordId;
    if (id === 'boat' && save.hasGate('boat') && !this.eggs.get('boat')) {
      if (!this._rideBoat()) ui.toast('⛵ 走到渡口边上再坐船哦');
      return;
    }
    if (this.eggs.get(id)) { this._clearMoveTarget(); this._openEgg(id); }
    else if (save.isHungry(id)) { this._clearMoveTarget(); this._feedPet(id); }
    else this._setMoveTarget(e);   // 点的是空地 → 走过去（手机轻点同理）
  }

  // 坐船过河：船划到岸边接人 → 驮着过河 → 自己划回渡口守桥
  _rideBoat() {
    if (this.riding || this.climbing || !save.hasGate('boat')) return false;
    this._clearMoveTarget();
    const p = this.player.position;
    if (Math.abs(p.x) > 7) return false;   // 离渡口太远
    const fromZ = p.z >= 0 ? 4.6 : -4.6;
    const toZ = -fromZ;
    const from = new THREE.Vector3(THREE.MathUtils.clamp(p.x, -1.8, 1.8), 0, fromZ);
    const to = new THREE.Vector3(0, 0, toZ);
    const center = new THREE.Vector3(0, 0, 0.4);
    const boat = this.pets.get('boat');
    const dock = new THREE.Vector3(from.x, 0, from.z);
    const farDock = new THREE.Vector3(0, 0, toZ);
    this.riding = true;
    this.onGround = true; this.vy = 0;
    this.player.rotation.y = toZ < fromZ ? Math.PI : 0; // 面朝对岸
    ui.hidePrompt();
    sfx.pop();
    this.addTween(3.4, k => {
      const seg = (a, b) => Math.min(1, Math.max(0, (k - a) / (b - a)));
      if (!boat) {
        this.player.position.lerpVectors(from, to, seg(0, 0.7));
        return;
      }
      if (k < 0.22) {          // 船划过来接人
        const t = seg(0, 0.22);
        boat.group.position.lerpVectors(center, dock, t);
      } else if (k < 0.72) {   // 驮着小朋友过河
        const t = seg(0.22, 0.72);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        boat.group.position.lerpVectors(dock, farDock, e);
        this.player.position.lerpVectors(from, to, e);
        this.player.position.y = Math.abs(Math.sin(e * Math.PI * 3)) * 0.05; // 随水波轻晃
      } else {                 // 船自己划回河中央守桥
        const t = seg(0.72, 1);
        boat.group.position.lerpVectors(farDock, center, t);
      }
      // 别让“溜达 AI”把船拽回去
      if (boat) boat.target.set(boat.group.position.x, boat.group.position.z);
    }, () => {
      this.riding = false;
      this.player.position.copy(to);
      this.player.position.y = 0;
      if (boat) {
        boat.target.set(0, 0.4);
        boat.home.set(0, 0.4);
      }
      sfx.good();
    });
    return true;
  }

  // ---------- 孵化 ----------
  _openEgg(id) {
    const word = WORD_MAP[id];
    this.currentWord = word;
    this._maybePreloadWhisper(); this._warmMic();
    ui.openChallenge({
      word, mode: 'hatch',
      onSuccess: res => this._doHatch(word, res && res.score),
      onClose: () => { this.currentWord = null; },
    });
  }

  _doHatch(word, score = 80) {
    setTimeout(() => {
      ui.closeChallenge();
      save.hatch(word.id);
      save.addPoint();
      ui.updatePlayerScore(save.getScore(), save.getSessionScore());
      // 星星奖励：读得越准赚得越多（95+ 得 2 颗，80+ 得 1 颗）；FEVER 连击期间翻倍
      const earned = (score >= 95 ? 2 : 1) * (ui.isFever() ? 2 : 1);
      save.addStars(earned);
      ui.updateStars(save.getStars());
      if (save.bumpDaily('hatch2') === 'done') this._afterDaily();
      if (score >= 95 && save.bumpDaily('goodread') === 'done') this._afterDaily();
      this.eggs.removeEgg(word.id);
      const pet = this.pets.spawn(word);
      pet.group.userData.wordId = word.id;
      // 弹出动画 + 字母飞舞
      pet.group.scale.setScalar(0.01);
      this.addTween(0.9, k => {
        const s = 1 + Math.sin(k * Math.PI) * 0.35;
        pet.group.scale.setScalar(0.01 + (s - 0.01) * (1 - Math.pow(1 - k, 3)));
      }, () => pet.group.scale.setScalar(1));
      pet.jumping = true; pet.jt = 0;
      this._letterBurst(pet.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), word.en);
      sfx.magic();
      ui.toast(`🎉 孵化成功！「${word.en}」${word.zh} 加入图鉴啦 +${earned}⭐`, 3400);
      speak(word.en);
      this._refreshHungry();
      this._checkFirstHatchHint();
      // 每唤醒 6 只词宠 = 通关：庆祝一下，放出下一关的蛋
      const total = this.hatchedInScope();
      if (total % PER_CHAPTER === 0 && total < this.total) {
        setTimeout(() => this._chapterComplete(total / PER_CHAPTER), 1100);
      } else if (total >= this.total) {
        setTimeout(() => this._chapterComplete(this.chapters.length), 1100);
      }
    }, 280);
  }

  // 通关演出：庆祝 + 星星 + 新一关的蛋登场；本册集齐放烟花
  _chapterComplete(doneCount) {
    sfx.great();
    setTimeout(() => sfx.magic(), 350);
    save.addStars(3);
    ui.updateStars(save.getStars());
    const p = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this._letterBurst(p, '★✨⭐');
    this._starBurst(p, 6);
    const next = this.chapters[doneCount];
    this._spawnProgress();
    this._refreshHungry();
    if (next) {
      ui.toast(`🎊 第 ${doneCount} 关「${this.chapters[doneCount - 1].name}」全部唤醒！+3⭐ 第 ${doneCount + 1} 关「${next.name}」的蛋出现啦`, 5000);
    } else {
      ui.toast(`🎊 本册 ${this.total} 只词宠全部唤醒！你就是词宠岛传奇！去「课本」换一册还能继续玩～`, 6000);
      this._fireworks();
    }
  }

  // 星星从指尖飞起（拿星星时的小演出）
  _starBurst(pos, n = 3) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: letterTexture('⭐', '#FFE08A', '#FFB93C'), transparent: true, depthWrite: false,
      }));
      s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.5, (Math.random() - 0.5) * 0.8));
      s.scale.setScalar(0.24);
      this.scene.add(s);
      this.fx.push({
        obj: s, t: -i * 0.12, dur: 1.1,
        update: (t, dt) => {
          if (t < 0) { s.material.opacity = 0; return; }
          s.position.y += dt * 1.6;
          s.material.opacity = Math.max(0, 1 - t / 1.1);
        },
      });
    }
  }

  // 集齐全部词宠的烟花秀
  _fireworks() {
    for (let r = 0; r < 8; r++) {
      setTimeout(() => {
        const bx = this.player.position.x + (Math.random() - 0.5) * 16;
        const bz = this.player.position.z + (Math.random() - 0.5) * 16;
        const by = 6 + Math.random() * 4;
        const color = ['#FF6B6B', '#FFC94E', '#7EC4F2', '#8FD08F', '#FF8FB0', '#B28FF5'][r % 6];
        // 上升的火箭
        const rocket = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture('✦', color, '#FFF'), transparent: true }));
        rocket.position.set(bx, 0.5, bz);
        this.scene.add(rocket);
        this.fx.push({
          obj: rocket, t: 0, dur: 0.85,
          update: t => { rocket.position.y = 0.5 + (by / 0.85) * t; rocket.material.opacity = 1 - t / 0.85; },
        });
        // 炸开的花
        setTimeout(() => {
          sfx.pop();
          for (let i = 0; i < 14; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture('✦', color, '#FFFDF0'), transparent: true }));
            s.position.set(bx, by, bz);
            s.scale.setScalar(0.26);
            this.scene.add(s);
            const a = Math.PI * 2 * i / 14 + Math.random() * 0.4;
            const sp = 2.2 + Math.random() * 1.6;
            this.fx.push({
              obj: s, t: 0, dur: 1.3,
              update: (t, dt) => {
                s.position.x += Math.cos(a) * sp * dt;
                s.position.z += Math.sin(a) * sp * dt;
                s.position.y += (2.4 - t * 2.2) * dt;
                s.material.opacity = Math.max(0, 1 - t / 1.3);
              },
            });
          }
        }, 850);
      }, r * 420);
    }
  }

  _letterBurst(pos, word) {
    const letters = word.split('').filter(c => c !== ' ');
    for (let i = 0; i < letters.length * 2; i++) {
      const tex = letterTexture(letters[i % letters.length], ['#FF8FB0', '#FFC94E', '#7EC4F2', '#8FD08F'][i % 4]);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      s.position.copy(pos);
      s.scale.setScalar(0.001);
      this.scene.add(s);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 3);
      this.fx.push({
        obj: s, t: 0, dur: 1.4,
        update: t => {
          vel.y -= 6 * (1 / 60);
          s.position.addScaledVector(vel, 1 / 60);
          s.material.opacity = Math.max(0, 1 - t / 1.4);
          s.scale.setScalar(0.3 * Math.min(1, t * 6));
        },
      });
    }
    // 星星粒子
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: letterTexture('✦', '#FFE24E', '#FFF6B8'), transparent: true,
      }));
      s.position.copy(pos);
      this.scene.add(s);
      const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 1.4;
      this.fx.push({
        obj: s, t: 0, dur: 0.9,
        update: t => {
          s.position.set(pos.x + Math.cos(a) * r * (t / 0.9), pos.y + Math.sin(t * 9 + i) * 0.2 + t * 1.2, pos.z + Math.sin(a) * r * (t / 0.9));
          s.material.opacity = 1 - t / 0.9;
          s.scale.setScalar(0.22);
        },
      });
    }
  }

  _checkFirstHatchHint() {
    if (save.hatchedCount() === 1) {
      const how = this.isTouch ? '点右上角 🪄' : '按 Tab';
      setTimeout(() => ui.toast(`💡 小提示：被河流挡路时，${how}可以召唤词宠帮忙哦`, 4200), 2500);
    }
  }

  // ---------- 喂养 ----------
  _nearHungryPet(pos, r) {
    let best = null, bd = r;
    for (const pet of this.pets.all()) {
      if (!save.isHungry(pet.word.id)) continue;
      const d = Math.hypot(pet.group.position.x - pos.x, pet.group.position.z - pos.z);
      if (d < bd) { bd = d; best = pet; }
    }
    return best;
  }

  _feedPet(id) {
    const word = WORD_MAP[id];
    this.currentWord = word;
    this._maybePreloadWhisper(); this._warmMic();
    ui.openChallenge({
      word, mode: 'feed',
      onSuccess: () => {
        setTimeout(() => {
          ui.closeChallenge();
          save.feed(id);
          save.addPoint();
          ui.updatePlayerScore(save.getScore(), save.getSessionScore());
          save.addStars(ui.isFever() ? 2 : 1);
          ui.updateStars(save.getStars());
          if (save.bumpDaily('feed2') === 'done') this._afterDaily();
          this.pets.setHungry(id, false);
          this.pets.celebrate(id);
          sfx.good();
          ui.toast(`🍖「${word.en}」吃饱啦，心满意足地转了个圈 +1⭐`, 3000);
          this._refreshHungry();
        }, 280);
      },
      onClose: () => { this.currentWord = null; },
    });
  }

  _refreshHungry() {
    for (const pet of this.pets.all()) {
      this.pets.setHungry(pet.word.id, save.isHungry(pet.word.id));
    }
    // HUD 显示本关进度：第 X 关 · 本关唤醒 n/6
    const total = this.hatchedInScope();
    const chIdx = this.chapterIndex(total);
    const inChapter = this.chapters[chIdx].words.filter(id => save.isHatched(id)).length;
    ui.updateHUD(inChapter, PER_CHAPTER, save.hungryPets().length, `${BOOK_LABEL(this.sem)}·第${chIdx + 1}关`);
  }

  // ---------- 召唤解谜 ----------
  // 机关 = 一则谜语。孩子要读懂谜面，从自己的词宠里挑出对的那一只；
  // 猜错不惩罚（词宠摇头回家），第一次就猜对额外奖 3 颗星星。
  _activeGate() {
    const p = this.player.position;
    if (!save.hasGate('boat') && Math.hypot(p.x, p.z - 4.6) < 5 && Math.abs(p.x) < 8)
      return { id: 'boat', need: ['boat'], riddle: '河水挡住了去路——什么能浮在水上，带你过河？', point: new THREE.Vector3(0, 0, 2.2) };
    if (!save.hasGate('wind') && Math.hypot(p.x - 13, p.z + 6.5) < 4)
      return { id: 'wind', need: ['wind'], riddle: '圆圆的干草球挡路了——谁看不见摸不着，却能呼呼地把它吹走？', point: new THREE.Vector3(13, 0, -8) };
    if (!save.hasGate('light') && Math.hypot(p.x - 24, p.z - 18.8) < 4.5)
      return { id: 'light', need: ['light'], riddle: '谷仓里黑漆漆的——谁一出现，到处都亮堂堂？', point: new THREE.Vector3(24, 0, 20) };
    if (!save.hasGate('beanstalk') && Math.hypot(p.x + 22, p.z - 25) < 5) {
      if (!this.planted) return { id: 'beanstalkSeed', need: ['seed'], riddle: '菜园的泥土翻好了——把它种下去，就会发芽的是？', point: new THREE.Vector3(-22, 0, 26) };
      return { id: 'beanstalkRain', need: ['rain'], riddle: '豆苗咕嘟咕嘟口渴了——从云朵里落下来、花草都张嘴接住的是？', point: new THREE.Vector3(-22, 0, 26) };
    }
    if (!save.hasGate('sandWall') && p.z > 30 && Math.abs(p.x) < 32)
      return { id: 'sandWall', need: ['wind'], riddle: '金灿灿的沙墙好高呀！——谁虽然看不见摸不着，却能吹散一座沙城？', point: new THREE.Vector3(0, 0, 37.2) };
    if (!save.hasGate('vines') && p.x < -31)
      return { id: 'vines', need: ['banana'], riddle: '带刺的荆棘丛拦住了森林——弯弯的黄月亮、猴子最爱的水果是？', point: new THREE.Vector3(-38, 0, p.z > 0 ? 11 : -11) };
    return null;
  }

  _openSummon(gate = null) {
    if (ui.challengeOpen()) return;
    gate = gate || this._activeGate();
    const list = this.pets.all().map(p => ({
      id: p.word.id, en: p.word.en, zh: p.word.zh,
      thumb: () => petThumbnail(p.word.pet),   // 懒生成：召唤盘可能有几百只，列表构建时同步画会卡死
    }));
    if (!list.length) { ui.toast('还没有词宠哦，先去孵化一颗词宠蛋吧！'); return; }
    this.pendingGate = gate;
    // 有机关在身边时，标题就是谜语：读懂谜面，挑对词宠
    ui.openPicker(list, id => this._summon(id, gate), () => { this.pendingGate = null; },
      gate ? { title: '🤔 ' + gate.riddle } : {});
  }

  _summon(id, gate) {
    const word = WORD_MAP[id];
    speak(word.en);
    const pet = this.pets.get(id);
    if (save.bumpDaily('summon3') === 'done') this._afterDaily();
    if (!gate) {
      // 随便召唤：小家伙飞过来打个招呼
      const p = this.player.position.clone().add(new THREE.Vector3(Math.sin(this.player.rotation.y) * -1.6, 0, Math.cos(this.player.rotation.y) * -1.6));
      this.pets.flyTo(id, p, 1.1, () => { pet.jumping = true; pet.jt = 0; });
      ui.toast(`「${word.en}」${word.zh} 来到你身边啦～`);
      return;
    }
    const target = gate.point.clone();
    if (gate.need.includes(id)) {
      const tries = this.gateTries[gate.id] || 0;
      if (tries === 0 && gate.id !== 'boat') {
        // 一次答对：聪明星奖励（第一个 boat 机关是必经教学关，不算）；FEVER 期间翻倍
        save.addStars(ui.isFever() ? 6 : 3);
        ui.updateStars(save.getStars());
        setTimeout(() => ui.toast('🌟 一次就答对！聪明星 +3⭐', 2800), 200);
        this._starBurst(pet.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 3);
      }
      if (save.bumpDaily('gate1') === 'done') this._afterDaily();
      this.gateTries[gate.id] = 0;
      this.pets.flyTo(id, target, 1.2, () => {
        pet.jumping = true; pet.jt = 0;
        this._applyGate(gate.id, pet);
      });
    } else {
      this.gateTries[gate.id] = (this.gateTries[gate.id] || 0) + 1;
      const tries = this.gateTries[gate.id];
      this.pets.flyTo(id, target, 1.1, () => {
        ui.toast(`「${word.en}」${word.zh} 摇了摇头：好像不对哦，再想想谜语～`, 3000);
        this.addTween(0.5, k => pet.group.rotation.y = Math.sin(k * Math.PI * 4) * 0.4, () => {
          pet.group.rotation.y = 0;
          this.pets.flyTo(id, new THREE.Vector3(pet.home.x, 0, pet.home.y), 1.1);
          // 猜错两次后层层加提示，不让孩子卡死
          if (tries === 2) setTimeout(() => ui.toast(`💡 再想一想：${gate.riddle}`, 4200), 1600);
          else if (tries >= 3) setTimeout(() => {
            const answer = gate.need.map(wid => `「${WORD_MAP[wid].en}」${WORD_MAP[wid].zh}`).join(' ');
            const allHatched = gate.need.every(wid => save.isHatched(wid));
            ui.toast(allHatched
              ? `💡 谜底是 ${answer}，去召唤它试试！`
              : `💡 谜底是 ${answer}——找到它的蛋孵出来，就能召唤啦！`, 4800);
          }, 1600);
        });
      });
    }
  }

  // 每日任务刚完成时的统一庆祝
  _afterDaily() {
    setTimeout(() => {
      sfx.great();
      ui.toast('✅ 今日任务完成！+5⭐', 3600);
      this._starBurst(this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0)), 5);
      this._refreshDailyBanner();
    }, 500);
  }

  _applyGate(gateId, pet) {
    switch (gateId) {
      case 'boat': {
        save.setGate('boat');
        pet.group.position.set(0, 0, 0.4);
        pet.group.rotation.y = Math.PI / 2;
        pet.home.set(0, 0.4); // 停在河中央当桥
        pet.target.set(0, 0.4);
        pet.wait = 1e9;       // 不再乱跑，守着渡口
        sfx.magic();
        ui.toast('🚤「boat」游到河中央，变成了一座小船桥！现在可以过河啦', 4200);
        break;
      }
      case 'wind': {
        save.setGate('wind');
        const hay = this.world.gates.hay;
        sfx.magic();
        this.addTween(1.6, k => {
          hay.group.position.x = 13 - k * 7;
          hay.group.position.z = -9 + k * 3;
          hay.group.rotation.z = -k * 4;
          hay.group.position.y = Math.sin(k * Math.PI) * 1.5;
        }, () => {
          this.world.colliders.splice(hay.colIndex, 1);
          hay.group.visible = false;
          this.pets.flyTo(pet.word.id, new THREE.Vector3(pet.home.x, 0, pet.home.y), 1.2);
        });
        ui.toast('💨「wind」呼——地一吹，干草球咕噜噜滚走啦！', 3800);
        break;
      }
      case 'light': {
        save.setGate('light');
        const dark = this.world.gates.darkness;
        sfx.magic();
        this.addTween(1.8, k => {
          dark.material.opacity = 0.96 * (1 - k);
          dark.visible = k < 0.99;
          this.world.gates.barnLight.intensity = 2.2 * k;
        }, () => { dark.visible = false; });
        ui.toast('🏮「light」飞进谷仓，里面亮堂堂的，好像有词宠蛋！', 4200);
        break;
      }
      case 'beanstalkSeed': {
        this.planted = true;
        save.setGate('planted');
        const bs = this.world.gates.beanstalk;
        bs.visible = true;
        bs.scale.set(1, 0.02, 1);
        this.addTween(0.8, k => bs.scale.y = 0.02 + k * 0.03);
        sfx.pop();
        ui.toast('🌱「seed」种进土里，冒出了一个小芽…它还需要一场 rain！', 4200);
        break;
      }
      case 'beanstalkRain': {
        const bs = this.world.gates.beanstalk;
        sfx.magic();
        this.addTween(2.6, k => {
          bs.scale.y = 0.05 + (1 - Math.pow(1 - k, 3)) * 0.95;
          bs.position.y = 0;
        }, () => {
          save.setGate('beanstalk');
          ui.toast(`🌿 豆藤长到天上去了！走到豆藤旁${this.isTouch ? '点提示条' : '按 E'}就能爬上天空岛`, 4600);
        });
        // 小雨点特效
        for (let i = 0; i < 12; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture('💧', '#7EC4F2', '#D8F2FF'), transparent: true }));
          s.position.set(-22 + (Math.random() - 0.5) * 6, 8 + Math.random() * 4, 27 + (Math.random() - 0.5) * 6);
          this.scene.add(s);
          this.fx.push({ obj: s, t: 0, dur: 1.5 + Math.random(), update: t => { s.position.y -= t * 3; s.material.opacity = Math.max(0, 1 - t / 2); } });
        }
        break;
      }
      case 'sandWall': {
        save.setGate('sandWall');
        sfx.magic();
        const wall = this.world.gates.sandWall;
        // 沙子四散的粒子
        for (let i = 0; i < 26; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture('·', '#EDD49E', '#C9A46B'), transparent: true }));
          s.position.set((Math.random() - 0.5) * 30, 1 + Math.random() * 2.5, 38 + (Math.random() - 0.5) * 2.5);
          s.scale.setScalar(0.3 + Math.random() * 0.5);
          this.scene.add(s);
          const vx = (Math.random() - 0.5) * 6;
          this.fx.push({
            obj: s, t: 0, dur: 1.6 + Math.random() * 0.8,
            update: (t, dt) => { s.position.x += vx * dt; s.position.y += (1.2 - t) * dt * 2; s.material.opacity = Math.max(0, 1 - t / 2); },
          });
        }
        this.addTween(1.7, k => {
          wall.group.scale.y = 1 - k * 0.96;
          wall.group.scale.x = 1 + k * 0.3;
        }, () => { wall.group.visible = false; });
        ui.toast('💨 沙墙呼啦啦散开啦——欢迎来到阳光海滩！', 4600);
        this._flyPetHome(pet);
        break;
      }
      case 'vines': {
        save.setGate('vines');
        sfx.magic();
        const vines = this.world.gates.vines;
        for (let i = 0; i < 22; i++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture('🍃', '#8FD08F', '#D8F2D0'), transparent: true }));
          s.position.set(-38 + (Math.random() - 0.5) * 2, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 60);
          s.scale.setScalar(0.28);
          this.scene.add(s);
          this.fx.push({
            obj: s, t: 0, dur: 1.8 + Math.random(),
            update: (t, dt) => { s.position.y -= dt * 1.2; s.position.x += Math.sin(t * 5) * dt; s.material.rotation += dt * 4; s.material.opacity = Math.max(0, 1 - t / 1.9); },
          });
        }
        this.addTween(1.5, k => {
          vines.group.scale.y = 1 - k * 0.96;
          vines.group.rotation.z = Math.sin(k * Math.PI * 2) * 0.12;
        }, () => { vines.group.visible = false; });
        ui.toast('🍌 荆棘闻到香蕉香，让开了一条路——神秘森林到了！', 4600);
        this._flyPetHome(pet);
        break;
      }
    }
  }

  // 机关用完的小词宠自己飞回家
  _flyPetHome(pet) {
    this.addTween(0.4, k => { pet.group.position.y = Math.sin(k * Math.PI) * 0.5; }, () => {
      this.pets.flyTo(pet.word.id, new THREE.Vector3(pet.home.x, 0, pet.home.y), 1.2);
    });
  }

  // ---------- 豆藤攀爬 ----------
  _climb(up) {
    if (this.climbing) return;
    this.climbing = true;
    this._clearMoveTarget();
    const from = this.player.position.clone();
    const to = up
      ? new THREE.Vector3(CLIMB_TOP.x, CLIMB_TOP.y, CLIMB_TOP.z)
      : new THREE.Vector3(CLIMB_BOTTOM.x, CLIMB_BOTTOM.y, CLIMB_BOTTOM.z);
    sfx.pop();
    this.addTween(2.2, k => {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.player.position.lerpVectors(from, to, e);
      this.player.position.y = THREE.MathUtils.lerp(from.y, to.y, e) + Math.sin(e * Math.PI) * 0.6;
      this.player.rotation.y += 0.08;
      this.walkT += 0.18;
      const sw = Math.sin(this.walkT) * 0.5;
      this.playerParts.legL.rotation.x = sw;
      this.playerParts.legR.rotation.x = -sw;
    }, () => {
      this.climbing = false;
      this.onIsle = up;
      this.player.position.copy(to);
      this.onGround = true; this.vy = 0;
      if (up) ui.toast('☁️ 欢迎来到天空岛！这里有两颗金色的蛋…', 3600);
    });
  }

  // ---------- 小火车站 ----------
  _openStation() {
    const cur = this.chapterIndex(this.hatchedInScope());
    // 只列本册的海岛
    const list = this.islands.map(isl => ({
      key: isl.key, name: isl.name, emoji: isl.emoji,
      unlocked: cur >= isl.startChapter,
      need: `第${isl.startChapter + 1}关解锁`,
    }));
    ui.openStation(list, key => {
      const isl = this.islands.find(i => i.key === key);
      if (isl) this._rideTrain(isl);
    });
    sfx.pop();
  }

  // 小火车：跨海飞行（弧线 + 星星尾迹）
  _rideTrain(isl) {
    if (this.riding || this.climbing) return;
    this.riding = true;
    this._clearMoveTarget();
    const from = this.player.position.clone();
    const to = isl
      ? new THREE.Vector3(isl.cx, 0, isl.cz - 2.5)
      : new THREE.Vector3(0, 0, 16);
    const dist = from.distanceTo(to);
    const dur = THREE.MathUtils.clamp(dist / 22, 1.6, 4);
    sfx.magic();
    ui.toast(isl ? `🚂 呜——开往「${isl.name}」的小火车出发啦！` : '🚂 呜——回到阳光农场啦！', 2600);
    this.addTween(dur, (k, dt) => {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.player.position.lerpVectors(from, to, e);
      this.player.position.y = Math.sin(e * Math.PI) * Math.min(7, dist * 0.12) + 0.02;
      this.player.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      this.walkT += dt * 14;
      // 星星尾迹
      if (Math.random() < 0.5) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: letterTexture('✦', '#FFE24E', '#FFFDF0'), transparent: true, depthWrite: false,
        }));
        s.position.copy(this.player.position).add(new THREE.Vector3((Math.random() - 0.5), -0.4, (Math.random() - 0.5)));
        s.scale.setScalar(0.18);
        this.scene.add(s);
        this.fx.push({ obj: s, t: 0, dur: 0.6, update: (t, dt2) => { s.position.y -= dt2; s.material.opacity = 1 - t / 0.6; } });
      }
    }, () => {
      this.riding = false;
      this.player.position.copy(to);
      this.player.position.y = 0;
      this.onGround = true; this.vy = 0;
      this.lastZone = null;  // 触发新区域提示
      sfx.good();
      if (save.addVisited(isl ? isl.key : 'meadow')) {
        this._refreshDailyBanner && this._refreshDailyBanner();
      }
    });
  }

  // ---------- 许愿井商店 ----------
  _openShop() {
    const wear = save.getWear();
    const items = SHOP_ITEMS.map(it => {
      const owned = it.type === 'hat' ? wear.hatOwned.includes(it.value) : wear[it.type + 'Owned'];
      const on = it.type === 'hat' ? wear.hat === it.value : !!wear[it.type];
      return { ...it, owned, on };
    });
    ui.showShop({
      stars: save.getStars(), items,
      onBuy: it => {
        if (!save.spendStars(it.price)) { ui.toast('星星还不够啦，去读单词赚星星吧！'); return; }
        const patch = it.type === 'hat'
          ? { hatOwned: [...save.getWear().hatOwned, it.value], hat: it.value }
          : { [it.type + 'Owned']: true, [it.type]: true };
        save.updateWear(patch);
        ui.updateStars(save.getStars());
        sfx.magic();
        ui.toast(`🎉 买到了${it.emoji}${it.name}！马上穿上试试`, 3200);
        this._refreshPlayerLook();
        this._openShop();  // 刷新货架
      },
      onToggle: it => {
        if (it.type === 'hat') save.updateWear({ hat: wear.hat === it.value ? '' : it.value });
        else save.updateWear({ [it.type]: !wear[it.type] });
        ui.updateStars(save.getStars());
        sfx.pop();
        this._refreshPlayerLook();
        this._openShop();
      },
    });
  }

  // 重新生成玩家模型，应用装扮（气球/魔法棒要重拿在手上）
  _refreshPlayerLook() {
    const old = this.player;
    const p = buildPlayer(save.getGender(), save.getWear());
    this.player = p.group;
    this.playerParts = p.parts;
    this.player.position.copy(old.position);
    this.player.rotation.copy(old.rotation);
    this.scene.add(this.player);
    this.scene.remove(old);
  }

  // ---------- 每日任务板 ----------
  _openDailyBoard() {
    const q = save.getDaily();
    ui.showDailyBoard({
      quest: q, stars: save.getStars(),
      onClose: () => {},
    });
    sfx.pop();
  }

  // 顶部每日任务小横幅
  _refreshDailyBanner() {
    const q = save.getDaily();
    ui.setDaily(`今日任务：${q.text}（${Math.min(q.n, q.goal)}/${q.goal}）${q.done ? ' ✅' : ''}`, q.done);
  }

  // ---------- 图鉴（只看本册：序章 + 本册课本词） ----------
  _openCatalog(hungryFirst = false) {
    const hungrySet = new Set(save.hungryPets());
    const entries = this.scopeWords.map(w => {
      const hatched = save.isHatched(w.id);
      return {
        word: w, hatched,
        hungry: hatched && hungrySet.has(w.id),
      };
    });
    if (hungryFirst) entries.sort((a, b) => (b.hungry ? 1 : 0) - (a.hungry ? 1 : 0));
    ui.openCatalog(entries, w => petThumbnail(w.pet), { bookLabel: BOOK_LABEL(this.sem) });
  }

  _nearestEggHint() {
    const p = this.player.position;
    let best = null, bd = 1e9;
    for (const e of this.eggs.eggs.values()) {
      const d = Math.hypot(e.group.position.x - p.x, e.group.position.z - p.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ================= 课本朗读练习 =================
  _openBook(semKey) {
    if (!semKey) semKey = save.getBookSem() || this.sem;
    const sems = Object.keys(CURRICULUM).map(k => ({ key: k, label: BOOK_LABEL(k), active: k === semKey }));
    const units = CURRICULUM[semKey].units.map((u, i) => {
      const res = save.getUnitResult(semKey + '#' + i);
      return { name: u.name, total: u.words.length, scores: res ? res.scores : null };
    });
    ui.showBookPanel({
      sems, units,
      // 换一册：3D 场景/海岛/关卡整册重建，所以存好后重载一次
      onSelect: k => {
        if (k === this.sem) { this._openBook(k); return; }
        save.setBookSem(k);
        location.reload();
      },
      onStart: i => this._startPractice(semKey, i),
      onQuickRound: () => this._startQuickRound(semKey),
    });
  }

  _startQuickRound(semKey) {
    const source = CURRICULUM[semKey].units.flatMap(u => u.words);
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    const picked = source.slice(0, 5);
    const list = picked.map(item => {
      const [en, zh] = item.split('|');
      return { en, zh, syl: [en] };
    });
    this.practice = { key: `quick#${semKey}`, list, idx: 0, scores: [], quick: true };
    this._practiceNext();
  }

  _startPractice(semKey, unitIdx) {
    const unit = CURRICULUM[semKey].units[unitIdx];
    const list = unit.words.map(item => {
      const [en, zh] = item.split('|');
      return { en, zh, syl: [en] };
    });
    this.practice = { key: semKey + '#' + unitIdx, list, idx: 0, scores: [] };
    this._practiceNext();
  }

  _practiceNext() {
    const p = this.practice;
    if (!p) return;
    if (p.idx >= p.list.length) {
      if (!p.quick) save.saveUnitResult(p.key, p.scores);
      ui.closeChallenge();
      const avg = Math.round(p.scores.reduce((a, b) => a + b, 0) / Math.max(1, p.scores.length));
      sfx.great();
      ui.toast(`${p.quick ? '🎯 3 分钟挑战完成！' : '🎉 单元练习完成！'}平均 ${avg} 分，${avg >= 85 ? '你就是朗读小明星！' : '继续加油！'}`, 4200);
      this.currentWord = null;
      return;
    }
    const w = p.list[p.idx];
    this.currentWord = w;
    this._maybePreloadWhisper(); this._warmMic();
    ui.openChallenge({
      word: { en: w.en, zh: w.zh, syl: [w.en], hint: `第 ${p.idx + 1}/${p.list.length} 个 · 大声读给词宠听` },
      mode: 'practice',
      onSuccess: res => {
        p.scores.push(res.score || 80);
        save.addPoint();
        ui.updatePlayerScore(save.getScore(), save.getSessionScore());
        if ((res.score || 0) >= 95 && save.bumpDaily('goodread') === 'done') this._afterDaily();
        p.idx++;
        setTimeout(() => this._practiceNext(), 300);
      },
      onSkip: () => { p.scores.push(0); p.idx++; this._practiceNext(); },
      onClose: () => { this.practice = null; this.currentWord = null; },
    });
  }

  // ---------- 语音识别（优先级：Web Speech → 本地 Whisper → 字母块） ----------
  // 点击麦克风：开始录音（10 秒倒计时自动收）；再点一次：立即识别。返回 false 表示无法启动，UI 自动切字母块。
  _startVoice() {
    if (!this.currentWord) return false;
    stopSpeaking();                    // 示范发音立刻停，别盖过孩子的声音
    ui.showReplay(null);               // 清掉上一轮的回放按钮
    // Web Speech 在支持的浏览器里几乎立即返回结果，避免第一次朗读先下载 40MB 模型；
    // 它连续读不到时（手机微信里很常见）改用自带的本地模型。
    if (!this.preferWhisper && voiceSupported && !isVoiceBroken()) return this._startWebSpeech();
    return this._startWhisper();
  }

  // 打开挑战卡时悄悄预热本地识别引擎：手机上 Web Speech 多半不可用，
  // 等孩子听完示范发音、开口录音时，40MB 模型基本已在后台下好了
  _maybePreloadWhisper() {
    if (this._whisperPreloaded) return;
    const canRecord = typeof MediaRecorder !== 'undefined'
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const webSpeechOk = voiceSupported && !isVoiceBroken();
    if (!canRecord || webSpeechOk) return;   // 桌面浏览器走即时识别，不必提前下 40MB
    this._whisperPreloaded = true;
    preloadWhisper();
  }

  // 打开挑战卡时先把麦克风"点着"：权限弹窗、麦克风启动都发生在孩子认单词的时候，
  // 等他点下录音键立刻就能开口，不用对着"准备中"干等（只做一次，失败的静默）
  _warmMic() {
    if (this._micWarmed) return;
    this._micWarmed = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      stream.getTracks().forEach(t => t.stop());
    }).catch(() => { /* 权限没给：录音时再正式提示 */ });
  }

  _startWhisper() {
    const word = this.currentWord;
    if (!word) return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      return this._startWebSpeech();
    }
    this.voiceCancelled = false;
    // 在线识别不可用/不好用时使用本地模型；模型只在需要时加载。
    // 首次下载有实时进度提示，孩子和家长知道在等什么、要等多久。
    ui.voiceStatus('正在准备语音引擎…');
    clearInterval(this._loadTick);
    this._loadTick = setInterval(() => {
      const pct = loadPercent();
      if (pct > 0) ui.voiceStatus(`正在下载语音引擎 ${pct}%（约 40MB，只需下载一次）…`);
    }, 400);
    ensureWhisper().finally(() => clearInterval(this._loadTick)).then(() => {
      if (!this.currentWord) return;
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        if (this.voiceCancelled || this.currentWord !== word) {
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
          return;
        }
        this.mediaStream = stream;
        const rec = new MediaRecorder(stream);
        this.recorder = rec;
        this.chunks = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
        rec.onstop = async () => {
          clearTimeout(this._recCap);
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
          try {
            const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
            // 留下孩子自己的读音，评分后可以回放对比
            if (blob.size > 800) {
              if (this._lastRecUrl) URL.revokeObjectURL(this._lastRecUrl);
              this._lastRecUrl = URL.createObjectURL(blob);
              ui.showReplay(this._lastRecUrl);
            }
            if (!this.currentWord) return;
            ui.voiceStatus('识别中…');
            const text = await recognizeBlob(blob);
            if (!this.currentWord) return;
            if (!text) { ui.voiceResult({ score: 0, heard: '', error: 'no-result' }); return; }
            ui.voiceResult(matchAlt([{ transcript: text, confidence: 0.9 }], this.currentWord.en));
          } catch (e) {
            ui.voiceResult({ score: 0, heard: '', error: 'no-result' });
          }
        };
        rec.start();
        ui.voiceRecording(); // “正在录音，读完再点一下”
        // 10 秒硬上限：倒计时归零自动收音识别，绝不让孩子干等
        clearTimeout(this._recCap);
        this._recCap = setTimeout(() => {
          if (rec.state === 'recording') { try { rec.stop(); } catch (e) { /* ignore */ } }
        }, 10000);
      });
    }).catch(() => {
      // 本地引擎失败 → Web Speech → 字母块
      if (this.currentWord && this._startWebSpeech()) return;
      markVoiceBroken();
      ui.voiceUnavailable();
    });
    return true;
  }

  _stopVoice() {
    clearTimeout(this._recCap);
    if (this.recorder && this.recorder.state === 'recording') {
      try { this.recorder.stop(); } catch (e) { /* ignore */ }
    } else {
      this.voiceCancelled = true; // 引擎还没就绪就取消了
      stopListening();
    }
  }

  _startWebSpeech() {
    if (!voiceSupported) return false;
    return startListening(
      alts => {
        if (!this.currentWord) return;
        if (!alts) { this._noteVoiceMiss(); ui.voiceResult({ score: 0, heard: '', error: 'no-result' }); return; }
        ui.voiceResult(matchAlt(alts, this.currentWord.en));
      },
      (listening, err) => {
        if (err === 'not-allowed') ui.toast('🎤 需要允许麦克风权限才能语音读单词哦（点地址栏旁的麦克风图标）', 5000);
        else if (err && err !== 'no-result') {
          this._noteVoiceMiss();
          if (!this.preferWhisper) ui.toast('🎤 识别不太顺，也可以点“换成拼字母块”过关', 4000);
        }
      }
    );
  }

  // 在线识别连续两次拿不到结果（手机微信里很常见）→ 下次改用本地模型
  _noteVoiceMiss() {
    this.voiceMiss += 1;
    if (this.preferWhisper || this.voiceMiss < 2) return;
    const canRecord = typeof MediaRecorder !== 'undefined'
      && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!canRecord) return;
    this.preferWhisper = true;
    ui.toast('🎤 下次改用本地识别，第一次要等一下下', 4000);
  }
}
