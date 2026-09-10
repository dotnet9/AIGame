// 游戏主逻辑：玩家控制、交互、孵化、召唤解谜、喂养复习
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { WORDS, WORD_MAP, TOTAL, ZONE_NAMES } from './words.js';
import { buildWorld } from './world.js';
import { buildPlayer, letterTexture, petThumbnail } from './models.js';
import { EggManager, PetManager } from './pets.js';
import * as save from './save.js';
import * as ui from './ui.js';
import { startListening, stopListening, matchAlt, voiceSupported, markVoiceBroken } from './speech.js';
import { speak, sfx } from './audio.js';
import { ensureWhisper, recognizeBlob } from './whisper.js';
import { CURRICULUM } from './curriculum.js';

const PLAYER_SPEED = 4.4;
const ISLE_CENTER = { x: -22, z: 27 };
const CLIMB_TOP = { x: -22, z: 24.2, y: 14 };
const CLIMB_BOTTOM = { x: -22, z: 28.6, y: 0 };

// 区域范围（世界坐标），用于地图与探索提示
const ZONE_RECTS = [
  { key: 'orchard',  name: '阳光果园', x1: -34, z1: -30, x2: -5,  z2: -5 },
  { key: 'windmill', name: '风车田',   x1: 8,   z1: -30, x2: 34,  z2: -7 },
  { key: 'barnyard', name: '谷仓前院', x1: 14,  z1: 8,   x2: 34,  z2: 30 },
  { key: 'garden',   name: '魔法菜园', x1: -34, z1: 10,  x2: -13, z2: 34 },
  { key: 'meadow',   name: '出生草甸', x1: -18, z1: 5,   x2: 14,  z2: 34 },
];
const SKY_RECT = { key: 'sky', name: '天空岛', x1: -28, z1: 21, x2: -16, z2: 33 };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.tweens = [];
    this.fx = [];
    this.clock = new THREE.Clock();
    this.riverHintCd = 0;
    this._initRenderer();
    this._initScene();
    this._initPlayer();
    this._initEntities();
    this._initInput();
    this._initUI();
  }

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
    this.camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);
    this.world = buildWorld(this.scene);
    // 辉光后期（失败则退回普通渲染）
    try {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.65, 0.86);
      this.composer.addPass(this.bloom);
    } catch (e) { this.composer = null; }
    this.camYaw = 0; this.camPitch = 0.42; this.camDist = 8.5;
    this._initGuide();
  }

  _initPlayer() {
    const p = buildPlayer();
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
    this.scene.add(this.player);
    this.climbing = false;
    this.walkT = 0;
    this.lastZone = null;
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
    for (const w of WORDS) {
      if (save.isHatched(w.id)) this.pets.spawn(w);
      else this.eggs.spawnEgg(w, w.zone === 'sky');
    }
    // 已孵化词宠挂载点击 id
    for (const p of this.pets.all()) p.group.userData.wordId = p.word.id;
    for (const e of this.eggs.eggs.values()) e.group.userData.wordId = e.word.id;
    this.planted = save.hasGate('planted');
    this._refreshHungry();
  }

  _initInput() {
    this.joy = { x: 0, y: 0, active: false };
    this.isTouch = matchMedia('(pointer: coarse)').matches
      || 'ontouchstart' in window
      || /[?&]touch=1/.test(location.search);

    addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this._interact();
      if (e.code === 'Tab') { e.preventDefault(); this._openSummon(); }
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
          if (this.pinchDist > 0) this.camDist = THREE.MathUtils.clamp(this.camDist * this.pinchDist / d, 3.5, 14);
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
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.008, 3.5, 14);
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
    ui.setLeaderboardPlayer({ username: save.getUsername(), score: save.getScore() });
    ui.updatePlayerScore(save.getScore(), save.getSessionScore());
    if (!save.getIntro()) {
      setTimeout(() => ui.playIntro(() => save.setIntro(true), this.isTouch), 600);
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
    this.pets.update(dt, t);
    this._updatePrompt();
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // ================= 指引系统 =================
  _zoneAt(p) {
    if (this.onIsle) return 'sky';
    if (p.x > 20.9 && p.x < 27.1 && p.z > 19.3 && p.z < 24.7) return 'barn';
    for (const zr of ZONE_RECTS) {
      if (p.x >= zr.x1 && p.x <= zr.x2 && p.z >= zr.z1 && p.z <= zr.z2) return zr.key;
    }
    return 'meadow';
  }

  _reachableZone(zone) {
    if (zone === 'orchard' || zone === 'windmill') return save.hasGate('boat');
    if (zone === 'barn') return save.hasGate('light');
    if (zone === 'sky') return save.hasGate('beanstalk');
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

  // 当前任务目标（文字 + 指路坐标）
  _objective() {
    if (save.hatchedCount() === 0) {
      const e = this._nearestReachableEgg();
      return { text: '走近一颗发光的蛋，读出单词唤醒词宠！', target: e ? e.group.position : null };
    }
    if (!save.hasGate('boat')) {
      const ep = save.isHatched('boat') ? { x: 0, z: 4.6 } : this._eggById('boat');
      return save.isHatched('boat')
        ? { text: '去码头，点 🪄 召唤 boat 当小桥过河！', target: ep }
        : { text: '码头边有一颗 boat 蛋，先去孵化它！', target: ep };
    }
    if (!save.hasGate('light')) {
      const ep = save.isHatched('light') ? { x: 24, z: 18.5 } : this._eggById('light');
      return save.isHatched('light')
        ? { text: '谷仓里黑漆漆的，召唤 light 照亮它！', target: ep }
        : { text: '南瓜地附近有一颗 light 蛋，谷仓需要它！', target: ep };
    }
    if (!save.hasGate('wind')) {
      const ep = save.isHatched('wind') ? { x: 13, z: -6 } : this._eggById('wind');
      return save.isHatched('wind')
        ? { text: '风车田的干草球挡路了，召唤 wind 吹走它！', target: ep }
        : { text: '风车田门口有一颗 wind 蛋！', target: ep };
    }
    if (!save.hasGate('beanstalk')) {
      if (!this.planted) {
        const ep = save.isHatched('seed') ? { x: -22, z: 25.5 } : this._eggById('seed');
        return save.isHatched('seed')
          ? { text: '魔法菜园的泥土在等 seed！', target: ep }
          : { text: '菜园旁边有一颗 seed 蛋，捡起来！', target: ep };
      }
      const ep = save.isHatched('rain') ? { x: -22, z: 25.5 } : this._eggById('rain');
      return save.isHatched('rain')
        ? { text: '豆苗种下啦！呼唤 rain 让它长大！', target: ep }
        : { text: '豆苗需要一场 rain 才能长大！', target: ep };
    }
    const remain = TOTAL - save.hatchedCount();
    if (remain > 0) {
      const e = this._nearestReachableEgg();
      return { text: `还有 ${remain} 颗词宠蛋等着你！（🗺️ 看地图找一找）`, target: e ? e.group.position : null };
    }
    return { text: '🎉 恭喜你收集完阳光农场的全部词宠！', target: null };
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
        };
        ui.toast('📍 ' + (names[z] || z), 3200);
      }
    }
  }

  // 地图
  _openMap() {
    const visited = save.getVisited();
    const zones = ZONE_RECTS.map(zr => {
      const inZone = WORDS.filter(w => w.zone === zr.key);
      return {
        key: zr.key, name: zr.name, x1: zr.x1, z1: zr.z1, x2: zr.x2, z2: zr.z2,
        discovered: visited.includes(zr.key),
        total: inZone.length,
        hatched: inZone.filter(w => save.isHatched(w.id)).length,
        locked: !this._reachableZone(zr.key),
      };
    });
    const skyIn = WORDS.filter(w => w.zone === 'sky');
    zones.push({
      key: 'sky', name: SKY_RECT.name, x1: SKY_RECT.x1, z1: SKY_RECT.z1, x2: SKY_RECT.x2, z2: SKY_RECT.z2,
      discovered: visited.includes('sky'), total: skyIn.length,
      hatched: skyIn.filter(w => save.isHatched(w.id)).length,
      locked: !save.hasGate('beanstalk'),
    });
    const eggs = [...this.eggs.eggs.values()].map(e => ({
      x: e.group.position.x, z: e.group.position.z, golden: e.golden,
    }));
    ui.openMap({
      player: { x: this.player.position.x, z: this.player.position.z },
      zones, eggs,
    });
  }

  // ================= 玩家 =================
  _updatePlayer(dt) {
    if (this.climbing) return;
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.x += 1;
    // 虚拟摇杆（手机）
    if (this.joy.active) { move.x += this.joy.x; move.z += this.joy.y; }
    const moving = move.lengthSq() > 0;
    if (moving) {
      move.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);
      this.player.position.x += move.x * PLAYER_SPEED * dt;
      this.player.position.z += move.z * PLAYER_SPEED * dt;
      const targetYaw = Math.atan2(move.x, move.z);
      let dy = targetYaw - this.player.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.player.rotation.y += dy * Math.min(1, dt * 12);
      this.walkT += dt * 9;
    } else this.walkT += dt * 1.5;
    // 走路摆动
    const sw = Math.sin(this.walkT) * (moving ? 0.55 : 0.06);
    this.playerParts.legL.rotation.x = sw;
    this.playerParts.legR.rotation.x = -sw;
    this.playerParts.armL.rotation.x = -sw * 0.8;
    this.playerParts.armR.rotation.x = sw * 0.8;
    this.playerParts.body.position.y = 0.3 + Math.abs(Math.sin(this.walkT)) * (moving ? 0.03 : 0.008);

    this._collide();
    // 天空岛逻辑
    if (this.onIsle) {
      this.player.position.y = 14;
      const d = Math.hypot(this.player.position.x - ISLE_CENTER.x, this.player.position.z - ISLE_CENTER.z);
      if (d > 5.1 && !this.climbing) this._climb(false); // 走出边缘 → 滑下去
    }
  }

  _collide() {
    const p = this.player.position;
    const R = 0.42;
    // 世界边界
    const dc = Math.hypot(p.x, p.z);
    if (dc > 37 && !this.onIsle) { p.x *= 37 / dc; p.z *= 37 / dc; }
    // 河流
    if (Math.abs(p.z) < 4.1) {
      const canCross = save.hasGate('boat') && Math.abs(p.x) < 2.0;
      if (!canCross) {
        p.z = p.z >= 0 ? 4.1 : -4.1;
        if (this.riverHintCd <= 0) {
          this.riverHintCd = 6;
          if (save.isHatched('boat')) ui.toast(`🌊 河流挡路啦！${this.isTouch ? '点 🪄' : '按 Tab'}召唤 boat 来帮忙`);
          else ui.toast('🌊 河流挡住了去路…听说码头边有一颗 boat 蛋');
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
    const off = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch)
    ).multiplyScalar(this.camDist);
    const camPos = target.clone().add(off).add(new THREE.Vector3(0, 1.6, 0));
    if (!this.onIsle) camPos.y = Math.max(camPos.y, 1.2);
    this.camera.position.lerp(camPos, Math.min(1, dt * 7));
    this.camera.lookAt(target.x, target.y + 1.0, target.z);
  }

  _updateWorldAnim(dt, t) {
    const a = this.world.anim;
    if (a.windmill) a.windmill.rotation.z += dt * 0.7;
    if (a.water) {
      const pos = a.water.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setY(i, Math.sin(x * 0.5 + t * 1.6) * 0.055 + Math.cos(pos.getZ(i) * 0.8 + t) * 0.04);
      }
      pos.needsUpdate = true;
    }
    if (a.petals) {
      const pos = a.petals.points.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - a.petals.speeds[i] * dt;
        let x = pos.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.35;
        if (y < 0.1) { y = 11 + Math.random() * 2; x = (Math.random() - 0.5) * 70; }
        pos.setY(i, y); pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }
    for (const c of a.clouds) {
      c.position.x += dt * 0.25;
      if (c.position.x > 42) c.position.x = -42;
    }
    this.riverHintCd -= dt;
  }

  _updateFx(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.onUpdate(tw.ease ? tw.ease(k) : k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.onDone && tw.onDone(); }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      f.update(f.t);
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
    // 召唤提示
    const gate = this._activeGate();
    if (gate) {
      const how = this.isTouch ? '点 🪄 召唤' : '按 Tab 召唤';
      ui.showPrompt(gate.hint + '（' + how + '）', 'Tab');
      this.promptAction = null;
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
    const hits = ray.intersectObjects(targets, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && obj.userData.wordId === undefined) obj = obj.parent;
    if (!obj) return;
    const id = obj.userData.wordId;
    if (this.eggs.get(id)) this._openEgg(id);
    else if (save.isHungry(id)) this._feedPet(id);
  }

  // ---------- 孵化 ----------
  _openEgg(id) {
    const word = WORD_MAP[id];
    this.currentWord = word;
    ui.openChallenge({
      word, mode: 'hatch',
      onSuccess: () => this._doHatch(word),
      onClose: () => { this.currentWord = null; },
    });
  }

  _doHatch(word) {
    setTimeout(() => {
      ui.closeChallenge();
      save.hatch(word.id);
      save.addPoint();
      ui.updatePlayerScore(save.getScore(), save.getSessionScore());
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
      ui.toast(`🎉 孵化成功！「${word.en}」${word.zh} 加入图鉴啦`, 3400);
      speak(word.en);
      this._refreshHungry();
      this._checkFirstHatchHint();
    }, 650);
  }

  _letterBurst(pos, word) {
    const letters = word.split('');
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
    ui.openChallenge({
      word, mode: 'feed',
      onSuccess: () => {
        setTimeout(() => {
          ui.closeChallenge();
          save.feed(id);
          save.addPoint();
          ui.updatePlayerScore(save.getScore(), save.getSessionScore());
          this.pets.setHungry(id, false);
          this.pets.celebrate(id);
          sfx.good();
          ui.toast(`🍖「${word.en}」吃饱啦，心满意足地转了个圈`, 3000);
          this._refreshHungry();
        }, 600);
      },
      onClose: () => { this.currentWord = null; },
    });
  }

  _refreshHungry() {
    for (const pet of this.pets.all()) {
      this.pets.setHungry(pet.word.id, save.isHungry(pet.word.id));
    }
    ui.updateHUD(save.hatchedCount(), TOTAL, save.hungryPets().length);
  }

  // ---------- 召唤解谜 ----------
  _activeGate() {
    const p = this.player.position;
    if (!save.hasGate('boat') && Math.hypot(p.x - 0, p.z - 4.6) < 5 && Math.abs(p.x) < 8)
      return { id: 'boat', need: ['boat'], hint: save.isHatched('boat') ? '召唤 boat 当小桥' : '好像需要一只 boat', point: new THREE.Vector3(0, 0, 2.2) };
    if (!save.hasGate('wind') && Math.hypot(p.x - 13, p.z + 6.5) < 4)
      return { id: 'wind', need: ['wind'], hint: save.isHatched('wind') ? '召唤 wind 吹走干草球' : '干草球挡路，需要一阵 wind', point: new THREE.Vector3(13, 0, -8) };
    if (!save.hasGate('light') && Math.hypot(p.x - 24, p.z - 18.8) < 4.5)
      return { id: 'light', need: ['light'], hint: save.isHatched('light') ? '召唤 light 照亮谷仓' : '谷仓里黑漆漆的，需要 light', point: new THREE.Vector3(24, 0, 20) };
    if (!save.hasGate('beanstalk') && Math.hypot(p.x + 22, p.z - 25) < 5) {
      if (!this.planted) return { id: 'beanstalkSeed', need: ['seed'], hint: save.isHatched('seed') ? '把 seed 种进土里' : '菜园的泥土在等一颗 seed', point: new THREE.Vector3(-22, 0, 26) };
      return { id: 'beanstalkRain', need: ['rain'], hint: save.isHatched('rain') ? '呼唤 rain 让豆藤长大' : '豆苗需要一场 rain', point: new THREE.Vector3(-22, 0, 26) };
    }
    return null;
  }

  _openSummon() {
    if (ui.challengeOpen()) return;
    const gate = this._activeGate();
    const list = this.pets.all().map(p => ({
      id: p.word.id, en: p.word.en, zh: p.word.zh,
      thumb: petThumbnail(p.word.pet),
    }));
    if (!list.length) { ui.toast('还没有词宠哦，先去孵化一颗词宠蛋吧！'); return; }
    ui.openPicker(list, id => this._summon(id, gate), () => {});
  }

  _summon(id, gate) {
    const word = WORD_MAP[id];
    speak(word.en);
    const pet = this.pets.get(id);
    if (!gate) {
      // 随便召唤：小家伙飞过来打个招呼
      const p = this.player.position.clone().add(new THREE.Vector3(Math.sin(this.player.rotation.y) * -1.6, 0, Math.cos(this.player.rotation.y) * -1.6));
      this.pets.flyTo(id, p, 1.1, () => { pet.jumping = true; pet.jt = 0; });
      ui.toast(`「${word.en}」${word.zh} 来到你身边啦～`);
      return;
    }
    const target = gate.point.clone();
    if (gate.need.includes(id)) {
      this.pets.flyTo(id, target, 1.2, () => {
        pet.jumping = true; pet.jt = 0;
        this._applyGate(gate.id, pet);
      });
    } else {
      this.pets.flyTo(id, target, 1.1, () => {
        ui.toast(`「${word.en}」摇了摇头：这里好像用不上我，想想别的词？`, 3200);
        this.addTween(0.5, k => pet.group.rotation.y = Math.sin(k * Math.PI * 4) * 0.4, () => {
          pet.group.rotation.y = 0;
          this.pets.flyTo(id, new THREE.Vector3(pet.home.x, 0, pet.home.y), 1.1);
        });
      });
    }
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
    }
  }

  // ---------- 豆藤攀爬 ----------
  _climb(up) {
    if (this.climbing) return;
    this.climbing = true;
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
      if (up) ui.toast('☁️ 欢迎来到天空岛！这里有两颗金色的蛋…', 3600);
    });
  }

  // ---------- 图鉴 ----------
  _openCatalog(hungryFirst = false) {
    const hungrySet = new Set(save.hungryPets());
    const entries = WORDS.map(w => {
      const hatched = save.isHatched(w.id);
      return {
        word: w, hatched,
        hungry: hatched && hungrySet.has(w.id),
        thumb: hatched ? petThumbnail(w.pet) : null,
      };
    });
    if (hungryFirst) entries.sort((a, b) => (b.hungry ? 1 : 0) - (a.hungry ? 1 : 0));
    ui.openCatalog(entries);
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
    if (!semKey) semKey = save.getBookSem() || '3a';
    save.setBookSem(semKey);
    const labels = { '3a': '三上', '3b': '三下', '4a': '四上', '4b': '四下', '5a': '五上', '5b': '五下', '6a': '六上', '6b': '六下' };
    const sems = Object.keys(CURRICULUM).map(k => ({ key: k, label: labels[k] || k, active: k === semKey }));
    const units = CURRICULUM[semKey].units.map((u, i) => {
      const res = save.getUnitResult(semKey + '#' + i);
      return { name: u.name, total: u.words.length, scores: res ? res.scores : null };
    });
    ui.showBookPanel({
      sems, units,
      onSelect: k => this._openBook(k),
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
    ui.openChallenge({
      word: { en: w.en, zh: w.zh, syl: [w.en], hint: `第 ${p.idx + 1}/${p.list.length} 个 · 大声读给词宠听` },
      mode: 'practice',
      onSuccess: res => {
        p.scores.push(res.score || 80);
        save.addPoint();
        ui.updatePlayerScore(save.getScore(), save.getSessionScore());
        p.idx++;
        setTimeout(() => this._practiceNext(), 500);
      },
      onSkip: () => { p.scores.push(0); p.idx++; this._practiceNext(); },
      onClose: () => { this.practice = null; this.currentWord = null; },
    });
  }

  // ---------- 语音识别（优先级：Web Speech → 本地 Whisper → 字母块） ----------
  // 点击麦克风：开始录音；再点一次：结束并识别。返回 false 表示无法启动，UI 自动切字母块。
  _startVoice() {
    if (!this.currentWord) return false;
    // Web Speech 在支持的浏览器里几乎立即返回结果，避免第一次朗读先下载 40MB 模型。
    if (voiceSupported) return this._startWebSpeech();
    return this._startWhisper();
  }

  _startWhisper() {
    const word = this.currentWord;
    if (!word) return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      return this._startWebSpeech();
    }
    this.voiceCancelled = false;
    // 仅在浏览器没有 Web Speech 时使用本地模型；模型只在需要时加载。
    ui.voiceStatus('正在准备朗读小助手，第一次需要一点时间…');
    ensureWhisper().then(() => {
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
          try { stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
          ui.voiceStatus('识别中…');
          try {
            const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
            const text = await recognizeBlob(blob);
            if (!this.currentWord) return;
            if (!text) { ui.voiceResult({ score: 0, heard: '', error: 'no-result' }); return; }
            ui.voiceResult(matchAlt([{ transcript: text, confidence: 0.9 }], this.currentWord.en));
          } catch (e) {
            ui.voiceResult({ score: 0, heard: '', error: 'no-result' });
          }
        };
        rec.start();
        ui.voiceRecording(); // “正在录音，再点一下结束”
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
        if (!alts) { ui.voiceResult({ score: 0, heard: '', error: 'no-result' }); return; }
        ui.voiceResult(matchAlt(alts, this.currentWord.en));
      },
      (listening, err) => {
        if (err === 'not-allowed') ui.toast('🎤 需要允许麦克风权限才能语音读单词哦（点地址栏旁的麦克风图标）', 5000);
        else if (err && err !== 'no-result') ui.toast('🎤 语音识别暂时不可用，已切换为字母块拼写 🧩', 5000);
      }
    );
  }
}
