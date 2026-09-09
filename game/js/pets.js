// 词宠实体：蛋（待孵化）与词宠（已孵化，会溜达、会饿）
import * as THREE from 'three';
import { buildPet, addLetterTag, letterTexture, PET_COLORS } from './models.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.75, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
});

// ---------- 蛋 ----------
export class EggManager {
  constructor(scene) {
    this.scene = scene;
    this.eggs = new Map(); // wordId -> {group, word}
  }

  spawnEgg(word, golden = false) {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), M(golden ? '#FFE9A8' : '#FFF6F0', { emissive: golden ? '#FFC94E' : '#FFB7CB', ei: golden ? 0.5 : 0.22 }));
    shell.scale.set(0.85, 1.15, 0.85);
    shell.position.y = 0.4;
    shell.castShadow = true;
    g.add(shell);
    // 蛋壳斑点
    for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M(golden ? '#FFD34E' : '#FFC9DD'));
      const a = Math.PI * 2 * i / 4 + 0.5;
      dot.position.set(Math.cos(a) * 0.24, 0.42 + Math.sin(i * 1.7) * 0.14, Math.sin(a) * 0.24);
      dot.scale.z = 0.4;
      g.add(dot);
    }
    // 首字母提示牌
    const letter = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: letterTexture(word.en[0], golden ? '#FFB93C' : '#FF8FB0'), transparent: true, side: THREE.DoubleSide }));
    letter.position.set(0, 0.48, 0.32);
    g.add(letter);
    // 底座光圈
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 24), M(golden ? '#FFD34E' : '#FFB7CB', { emissive: golden ? '#FFC94E' : '#FF9FB6', ei: 0.7 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    g.add(ring);
    const [x, z] = word.pos;
    const isSky = word.zone === 'sky';
    g.position.set(x, isSky ? 14 : 0, z);
    this.scene.add(g);
    const egg = { group: g, word, shell, ring, t: Math.random() * 9, golden };
    this.eggs.set(word.id, egg);
    return egg;
  }

  removeEgg(id) {
    const egg = this.eggs.get(id);
    if (!egg) return;
    this.scene.remove(egg.group);
    this.eggs.delete(id);
  }

  nearest(pos, maxDist = 2.6) {
    let best = null, bestD = maxDist;
    for (const egg of this.eggs.values()) {
      const d = Math.hypot(egg.group.position.x - pos.x, egg.group.position.z - pos.z);
      if (d < bestD) { bestD = d; best = egg; }
    }
    return best;
  }

  get(id) { return this.eggs.get(id); }

  update(dt, t) {
    for (const egg of this.eggs.values()) {
      egg.t += dt;
      egg.group.position.y = (egg.word.zone === 'sky' ? 14 : 0) + Math.abs(Math.sin(egg.t * 1.6)) * 0.12;
      egg.group.rotation.y = Math.sin(egg.t * 0.8) * 0.4;
      const pulse = 0.18 + Math.sin(egg.t * 2.4) * 0.1;
      egg.shell.material.emissiveIntensity = egg.golden ? 0.45 + Math.sin(egg.t * 2.4) * 0.2 : pulse;
      egg.ring.rotation.z = t * 0.8;
    }
  }
}

// ---------- 已孵化的词宠 ----------
export class PetManager {
  constructor(scene) {
    this.scene = scene;
    this.pets = new Map();
  }

  spawn(word) {
    const g = buildPet(word.pet);
    addLetterTag(g, word.en[0]);
    const [x, z] = word.pos;
    const baseY = word.zone === 'sky' ? 14 : 0;
    g.position.set(x, baseY, z);
    this.scene.add(g);
    const pet = {
      word, group: g, t: Math.random() * 8, baseY,
      home: new THREE.Vector2(x, z),
      target: new THREE.Vector2(x, z),
      wait: Math.random() * 2,
      hungry: false, jumping: false, jt: 0,
      flying: null,
    };
    this.pets.set(word.id, pet);
    return pet;
  }

  get(id) { return this.pets.get(id); }
  all() { return [...this.pets.values()]; }

  setHungry(id, v) {
    const p = this.pets.get(id);
    if (!p) return;
    p.hungry = v;
    if (v && !p.bubble) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      c.fillStyle = '#FFFDF8';
      c.beginPath(); c.arc(32, 30, 24, 0, Math.PI * 2); c.fill();
      c.font = '30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('🍖', 32, 32);
      const tex = new THREE.CanvasTexture(cv);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      s.scale.setScalar(0.5);
      s.position.y = 1.05;
      s.name = 'hungryBubble';
      p.group.add(s);
      p.bubble = s;
    } else if (!v && p.bubble) {
      p.group.remove(p.bubble);
      p.bubble = null;
    }
  }

  celebrate(id) { // 喂饱后的开心跳
    const p = this.pets.get(id);
    if (!p) return;
    p.jumping = true; p.jt = 0;
  }

  flyTo(id, target, duration, onDone) { // 召唤飞行
    const p = this.pets.get(id);
    if (!p) return;
    p.flying = {
      from: p.group.position.clone(),
      to: new THREE.Vector3(target.x, target.y ?? 0, target.z),
      t: 0, duration, onDone,
    };
  }

  update(dt, t) {
    for (const p of this.pets.values()) {
      p.t += dt;
      // 召唤飞行优先
      if (p.flying) {
        p.flying.t += dt;
        const k = Math.min(1, p.flying.t / p.flying.duration);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        p.group.position.lerpVectors(p.flying.from, p.flying.to, e);
        p.group.position.y = THREE.MathUtils.lerp(p.flying.from.y, p.flying.to.y, e) + Math.sin(e * Math.PI) * 1.4;
        p.group.rotation.y += dt * 6 * (1 - k);
        if (k >= 1) {
          const cb = p.flying.onDone;
          p.flying = null;
          p.group.rotation.y = 0;
          if (cb) cb();
        }
        continue;
      }
      // 溜达
      if (p.jumping) {
        p.jt += dt;
        p.group.position.y = p.baseY + Math.abs(Math.sin(p.jt * 8)) * 0.35;
        if (p.jt > 1.4) { p.jumping = false; p.group.position.y = p.baseY; }
      } else {
        const dx = p.target.x - p.group.position.x, dz = p.target.y - p.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.15) {
          p.wait -= dt;
          if (p.wait <= 0) {
            const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.4;
            p.target.set(p.home.x + Math.cos(a) * r, p.home.y + Math.sin(a) * r);
            p.wait = 1.5 + Math.random() * 3.5;
          }
        } else {
          const sp = 0.55;
          p.group.position.x += dx / d * sp * dt;
          p.group.position.z += dz / d * sp * dt;
          p.group.rotation.y = Math.atan2(dx, dz);
          p.group.position.y = p.baseY + Math.abs(Math.sin(p.t * 7)) * 0.05;
        }
      }
      // 饿了的气泡呼吸
      if (p.bubble) p.bubble.position.y = 1.05 + Math.sin(p.t * 3) * 0.06;
    }
  }
}
