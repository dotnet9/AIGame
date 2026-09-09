// 程序化低模库：词宠 / 玩家 / 场景物
// 风格：Q 版大头、马卡龙配色、点睛小表情（黑豆眼 + 高光 + 腮红）
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0,
  emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
  transparent: !!o.alpha, opacity: o.alpha ?? 1,
  flatShading: !!o.flat, side: o.side ?? THREE.FrontSide,
});

function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const G = () => new THREE.Group();
const sph = (g, r, c, x, y, z, sx = 1, sy = 1, sz = 1, o) => add(g, new THREE.SphereGeometry(r, 18, 14), M(c, o), x, y, z, 0, 0, 0, sx, sy, sz);
const box = (g, w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0, o) => add(g, new THREE.BoxGeometry(w, h, d), M(c, o), x, y, z, rx, ry, rz);
const cyl = (g, rt, rb, h, c, x, y, z, rx = 0, ry = 0, rz = 0, seg = 14, o) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o), x, y, z, rx, ry, rz);
const cone = (g, r, h, c, x, y, z, rx = 0, ry = 0, rz = 0, seg = 12, o) => cyl(g, 0.001, r, h, c, x, y, z, rx, ry, rz, seg, o);
const cap = (g, r, len, c, x, y, z, rx = 0, ry = 0, rz = 0, o) => add(g, new THREE.CapsuleGeometry(r, len, 6, 12), M(c, o), x, y, z, rx, ry, rz);
const tor = (g, R, r, c, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2, o) => add(g, new THREE.TorusGeometry(R, r, 10, 24, arc), M(c, o), x, y, z, rx, ry, rz);

// 小表情：黑豆眼 + 高光 + 腮红（挂在 z 正面）
function face(g, { dx = 0.07, y = 0.02, z = 0.16, s = 1, blush = 0.12, by = -0.05 } = {}) {
  for (const sx of [-1, 1]) {
    sph(g, 0.030 * s, '#4A4046', dx * sx, y, z, 1, 1.35, 0.55);
    sph(g, 0.010 * s, '#FFFFFF', dx * sx + 0.011 * s, y + 0.032 * s, z + 0.014);
    sph(g, 0.036 * s, '#FFB3C1', blush * sx, by, z * 0.86, 1, 0.7, 0.4);
  }
}

export const PET_COLORS = {
  cat: '#F5A25D', dog: '#E8C48A', duck: '#FFD44E', rabbit: '#FFF6F0', mouse: '#B9B9C8',
  frog: '#7CC96F', flower: '#FF8FB0', grass: '#7CC96F', boat: '#C89A6B', light: '#FFD34E',
  seed: '#8FBF6F', apple: '#FF6B6B', banana: '#FFE24E', carrot: '#FF9A3C', tomato: '#FF5F5F',
  potato: '#C9A46B', corn: '#FFD34E', goat: '#CFC8BC', wind: '#A8D8F0', pig: '#FFB6C5',
  cow: '#FFF6EC', bird: '#7EC4F2', bee: '#FFD34E', horse: '#A9744F', sheep: '#FFF3E0',
  hen: '#FFF0DC', milk: '#FFFFFF', bread: '#D9A05B', egg: '#FFF8EE', cake: '#FFB7CB',
  tractor: '#6FA854', rain: '#BDE3F0', tree: '#6FBF73', sun: '#FFC94E', star: '#FFE24E',
  moon: '#F5E6A8',
};

// ================= 四足兽基础 =================
function quadBody(g, { bc, bodyR = 0.16, bodyLen = 1.3, legH = 0.12, legC, headR = 0.19, headY, headZ }) {
  cap(g, bodyR, 0.16 * bodyLen, bc, 0, legH + bodyR * 0.9, 0, Math.PI / 2, 0, 0).scale.y = bodyLen; // 身体（沿 z）
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]])
    cyl(g, 0.045, 0.05, legH, legC || bc, 0.1 * lx, legH / 2, 0.13 * bodyLen * lz * 0.8);
  const head = G();
  head.position.set(0, headY ?? (legH + bodyR + headR * 0.55), headZ ?? (0.22 * bodyLen));
  g.add(head);
  return head;
}

const PETS = {};

PETS.cat = () => {
  const g = G(), c = PET_COLORS.cat;
  const head = quadBody(g, { bc: c, headZ: 0.2 });
  sph(head, 0.19, c);
  for (const sx of [-1, 1]) cone(head, 0.06, 0.11, c, 0.11 * sx, 0.17, 0, 0, 0, 0.3 * sx);
  face(head, { y: 0.01, z: 0.165 });
  cone(head, 0.012, 0.04, '#E8875A', 0, -0.015, 0.19, Math.PI / 2); // 小鼻子
  cap(g, 0.03, 0.16, c, 0, 0.32, -0.2, -Math.PI / 3).scale.set(1, 1, 0.6); // 竖尾巴
  return g;
};

PETS.dog = () => {
  const g = G(), c = PET_COLORS.dog;
  const head = quadBody(g, { bc: c, bodyR: 0.17, headR: 0.2 });
  sph(head, 0.2, c);
  for (const sx of [-1, 1]) sph(head, 0.07, '#8A6844', 0.15 * sx, 0.03, 0.02, 1, 1.6, 0.5); // 垂耳
  sph(head, 0.06, '#FFF6EC', 0, -0.05, 0.18, 1, 0.8, 0.8); // 口鼻
  face(head, { y: 0.03, z: 0.175 });
  sph(g, 0.06, c, 0, 0.33, -0.24, 1, 1, 1.4); // 尾巴
  return g;
};

PETS.duck = () => {
  const g = G(), c = PET_COLORS.duck;
  sph(g, 0.17, c, 0, 0.2, -0.04, 1, 1, 1.2); // 身体
  cyl(g, 0.04, 0.045, 0.1, '#FF9A3C', 0.08, 0.05, -0.1); cyl(g, 0.04, 0.045, 0.1, '#FF9A3C', -0.08, 0.05, -0.1);
  const head = G(); head.position.set(0, 0.42, 0.08); g.add(head);
  sph(head, 0.14, c);
  cone(head, 0.05, 0.09, '#FF9A3C', 0, -0.01, 0.15, Math.PI / 2);
  face(head, { dx: 0.055, z: 0.12 });
  return g;
};

PETS.rabbit = () => {
  const g = G(), c = PET_COLORS.rabbit;
  sph(g, 0.16, c, 0, 0.18, -0.03, 1, 1.05, 1.25);
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) cyl(g, 0.035, 0.04, 0.09, c, 0.08 * lx, 0.045, 0.1 * lz);
  const head = G(); head.position.set(0, 0.38, 0.09); g.add(head);
  sph(head, 0.15, c);
  for (const sx of [-1, 1]) {
    cap(head, 0.05, 0.14, c, 0.065 * sx, 0.2, -0.01, 0, 0, 0.12 * sx).scale.z = 0.5;
    sph(head, 0.03, '#FFC9D6', 0.068 * sx, 0.2, 0.022, 1, 1, 0.35, );
  }
  sph(head, 0.025, '#FF9FB6', 0, -0.01, 0.145);
  face(head, { y: 0.03, z: 0.135 });
  sph(g, 0.055, c, 0, 0.2, -0.2);
  return g;
};

PETS.mouse = () => {
  const g = G(), c = PET_COLORS.mouse;
  sph(g, 0.13, c, 0, 0.14, -0.02, 1, 1, 1.25);
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) cyl(g, 0.025, 0.03, 0.07, c, 0.065 * lx, 0.035, 0.08 * lz);
  const head = G(); head.position.set(0, 0.3, 0.08); g.add(head);
  sph(head, 0.12, c);
  for (const sx of [-1, 1]) sph(head, 0.08, '#FFD9DF', 0.1 * sx, 0.06, -0.01, 1, 1, 0.35); // 大圆耳
  face(head, { dx: 0.05, y: 0, z: 0.11, s: 0.9 });
  cone(head, 0.014, 0.05, '#8E8EA0', 0, -0.01, 0.13, Math.PI / 2);
  tor(g, 0.09, 0.018, '#C9C9D6', 0, 0.17, -0.16, Math.PI / 2, 0, 0, Math.PI * 1.3); // 卷尾巴
  return g;
};

PETS.frog = () => {
  const g = G(), c = PET_COLORS.frog;
  sph(g, 0.19, c, 0, 0.13, 0, 1.05, 0.85, 1.1);
  sph(g, 0.13, '#EAF7DC', 0, 0.1, 0.08, 0.9, 0.7, 0.8);
  for (const sx of [-1, 1]) {
    sph(g, 0.065, c, 0.1 * sx, 0.25, 0.05);
    sph(g, 0.03, '#4A4046', 0.1 * sx, 0.27, 0.1, 1, 1.2, 0.5);
    sph(g, 0.01, '#FFFFFF', 0.107 * sx, 0.285, 0.115);
  }
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) sph(g, 0.045, c, 0.11 * lx, 0.04, 0.1 * lz, 1, 0.7, 1.4);
  return g;
};

PETS.flower = () => {
  const g = G(), c = PET_COLORS.flower;
  cyl(g, 0.022, 0.026, 0.34, '#66BB6A', 0, 0.17, 0);
  sph(g, 0.045, '#66BB6A', 0.06, 0.14, 0, 1.5, 0.4, 0.8); sph(g, 0.04, '#66BB6A', -0.05, 0.2, 0, 1.5, 0.4, 0.8);
  const head = G(); head.position.set(0, 0.44, 0); g.add(head);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 2 * i / 6;
    sph(head, 0.09, c, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0, 1, 1, 0.45);
  }
  sph(head, 0.1, '#FFD34E', 0, 0, 0.02, 1, 1, 0.6);
  face(head, { dx: 0.04, y: 0, z: 0.09, s: 0.9, blush: 0.085, by: -0.045 });
  return g;
};

PETS.grass = () => {
  const g = G();
  sph(g, 0.16, '#6FBF73', 0, 0.08, 0, 1.2, 0.5, 1.2); // 土丘
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 2 * i / 7 + 0.3;
    cone(g, 0.035, 0.22 + 0.08 * (i % 3), i % 2 ? '#7CC96F' : '#8FD08F',
      Math.cos(a) * 0.1, 0.2, Math.sin(a) * 0.1, 0.3 * Math.sin(a), 0, -0.3 * Math.cos(a), 5);
  }
  face(g, { dx: 0.06, y: 0.1, z: 0.16, s: 0.9 });
  return g;
};

PETS.boat = () => {
  const g = G();
  box(g, 0.5, 0.16, 0.9, PET_COLORS.boat, 0, 0.14, 0);                       // 船身
  box(g, 0.42, 0.06, 0.82, '#A87551', 0, 0.24, 0);                            // 甲板
  cyl(g, 0.018, 0.018, 0.75, '#8A6844', 0, 0.6, 0.05);                        // 桅杆
  const sail = add(g, new THREE.ConeGeometry(0.22, 0.55, 3), M('#FFF6EC'), 0, 0.68, 0.03, 0, Math.PI, 0, 1, 1, 0.25);
  sail.rotation.z = Math.PI;                                                  // 三角帆
  face(g, { dx: 0.12, y: 0.2, z: 0.44, s: 0.95 });
  sph(g, 0.03, '#FF9FB6', 0.17, 0.1, 0.42); sph(g, 0.03, '#FF9FB6', -0.17, 0.1, 0.42);
  return g;
};

PETS.light = () => {
  const g = G();
  box(g, 0.26, 0.3, 0.26, '#FFE9B8', 0, 0.26, 0, 0, 0, 0, { emissive: '#FFC94E', ei: 0.85 }); // 灯芯发光
  for (const sx of [-1, 1]) box(g, 0.03, 0.36, 0.3, '#8A6844', 0.15 * sx, 0.26, 0);
  for (const sz of [-1, 1]) box(g, 0.3, 0.36, 0.03, '#8A6844', 0, 0.26, 0.15 * sz);
  box(g, 0.34, 0.05, 0.34, '#8A6844', 0, 0.06, 0); box(g, 0.3, 0.05, 0.3, '#8A6844', 0, 0.47, 0);
  cyl(g, 0.008, 0.008, 0.1, '#8A6844', 0, 0.54, 0);
  face(g, { dx: 0.05, y: 0.28, z: 0.135, s: 0.85 });
  for (const sx of [-1, 1]) sph(g, 0.06, '#FFF6EC', 0.2 * sx, 0.32, -0.02, 1, 0.55, 0.9); // 小翅膀
  return g;
};

PETS.seed = () => {
  const g = G();
  sph(g, 0.17, '#8A6844', 0, 0.08, 0, 1.15, 0.5, 1.15); // 土堆
  cap(g, 0.015, 0.12, '#66BB6A', 0, 0.25, 0);
  sph(g, 0.06, '#8FD08F', 0.05, 0.32, 0, 1.4, 0.35, 0.8, 0, 0, 0.5);
  sph(g, 0.06, '#8FD08F', -0.05, 0.34, 0, 1.4, 0.35, 0.8, 0, 0, -0.5);
  sph(g, 0.07, '#C9A46B', 0, 0.14, 0.1, 0.8, 1.1, 0.8); // 一颗种子宝宝
  face(g, { dx: 0.035, y: 0.15, z: 0.185, s: 0.7 });
  return g;
};

PETS.apple = () => {
  const g = G(), c = PET_COLORS.apple;
  sph(g, 0.2, c, 0, 0.2, 0, 1, 0.95, 0.95);
  sph(g, 0.16, c, 0, 0.18, 0.04);
  cyl(g, 0.018, 0.022, 0.1, '#8A6844', 0, 0.41, 0);
  sph(g, 0.06, '#66BB6A', 0.08, 0.44, 0, 1.5, 0.3, 0.8, 0, 0, 0.4);
  face(g, { dx: 0.07, y: 0.21, z: 0.19 });
  return g;
};

PETS.banana = () => {
  const g = G(), c = PET_COLORS.banana;
  tor(g, 0.18, 0.055, c, 0, 0.22, 0, 0, 0, 0, Math.PI * 1.25);
  sph(g, 0.045, '#8A6844', 0.18, 0.22, 0); sph(g, 0.03, '#8A6844', -0.105, 0.28, 0);
  face(g, { dx: 0.045, y: 0.2, z: 0.075, s: 0.75 });
  return g;
};

PETS.carrot = () => {
  const g = G(), c = PET_COLORS.carrot;
  cone(g, 0.13, 0.42, c, 0, 0.23, 0, Math.PI); // 尖朝下
  for (let i = 0; i < 3; i++)
    cap(g, 0.02, 0.1, '#66BB6A', (i - 1) * 0.05, 0.5, 0, 0, 0, (i - 1) * 0.5);
  face(g, { dx: 0.055, y: 0.3, z: 0.11, s: 0.8 });
  return g;
};

PETS.tomato = () => {
  const g = G(), c = PET_COLORS.tomato;
  sph(g, 0.2, c, 0, 0.19, 0, 1, 0.88, 1);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5;
    sph(g, 0.05, '#66BB6A', Math.cos(a) * 0.1, 0.33, Math.sin(a) * 0.1, 1.4, 0.35, 0.7, 0, -a);
  }
  cyl(g, 0.014, 0.014, 0.07, '#66BB6A', 0, 0.38, 0);
  face(g, { dx: 0.07, y: 0.18, z: 0.18 });
  return g;
};

PETS.potato = () => {
  const g = G(), c = PET_COLORS.potato;
  sph(g, 0.19, c, 0, 0.17, 0, 1.15, 0.85, 1);
  sph(g, 0.1, c, -0.12, 0.2, 0.08, 1, 0.9, 1);
  sph(g, 0.08, '#B9945C', 0.1, 0.1, -0.1);
  face(g, { dx: 0.07, y: 0.18, z: 0.17 });
  return g;
};

PETS.corn = () => {
  const g = G(), c = PET_COLORS.corn;
  cap(g, 0.12, 0.24, c, 0, 0.3, 0).scale.set(1, 1, 0.9);
  for (const sx of [-1, 1]) {
    sph(g, 0.07, '#66BB6A', 0.11 * sx, 0.22, 0, 0.6, 1.5, 1, 0, 0, -0.4 * sx);
    sph(g, 0.06, '#66BB6A', 0.09 * sx, 0.36, 0, 0.6, 1.2, 1, 0, 0, -0.5 * sx);
  }
  face(g, { dx: 0.06, y: 0.33, z: 0.11, s: 0.85 });
  return g;
};

PETS.goat = () => {
  const g = G(), c = PET_COLORS.goat;
  const head = quadBody(g, { bc: c, bodyR: 0.17, headR: 0.18, legH: 0.14 });
  sph(head, 0.18, c);
  for (const sx of [-1, 1]) {
    cone(head, 0.035, 0.1, '#A89C8C', 0.09 * sx, 0.17, 0, 0, 0, -0.4 * sx); // 角
    sph(head, 0.05, c, 0.12 * sx, 0.02, 0.04, 1, 1.4, 0.5);                  // 耳
  }
  cone(head, 0.03, 0.09, '#EAE4D8', 0, -0.13, 0.1, Math.PI);                 // 胡子
  face(head, { y: 0.03, z: 0.16 });
  return g;
};

PETS.wind = () => {
  const g = G(), c = PET_COLORS.wind;
  sph(g, 0.15, '#FFFFFF', 0, 0.24, 0, 1.1, 0.8, 1);                          // 云宝
  for (const [ry, rz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]])
    tor(g, 0.16, 0.022, c, Math.sin(ry) * 0.12, 0.2, Math.sin(rz) * 0.1, Math.PI / 2, ry, rz, Math.PI * 1.2);
  sph(g, 0.04, '#8FD08F', 0.24, 0.3, 0.05); sph(g, 0.035, '#8FD08F', -0.2, 0.14, -0.06);
  face(g, { dx: 0.05, y: 0.25, z: 0.13, s: 0.85 });
  return g;
};

PETS.pig = () => {
  const g = G(), c = PET_COLORS.pig;
  const head = quadBody(g, { bc: c, bodyR: 0.17, headR: 0.19, headZ: 0.22 });
  sph(head, 0.19, c);
  for (const sx of [-1, 1]) cone(head, 0.055, 0.09, c, 0.12 * sx, 0.15, -0.02, 0, 0, -0.5 * sx);
  cyl(head, 0.05, 0.05, 0.05, '#FF8FA8', 0, -0.03, 0.185);
  sph(head, 0.012, '#C9607E', 0.02, -0.03, 0.212); sph(head, 0.012, '#C9607E', -0.02, -0.03, 0.212);
  face(head, { y: 0.045, z: 0.16 });
  tor(g, 0.05, 0.016, c, 0, 0.34, -0.22, Math.PI / 2.3); // 卷尾巴
  return g;
};

PETS.cow = () => {
  const g = G(), c = PET_COLORS.cow;
  const head = quadBody(g, { bc: c, bodyR: 0.19, bodyLen: 1.45, legH: 0.15, headR: 0.2 });
  sph(head, 0.2, c);
  sph(head, 0.09, '#FFC9D6', 0, -0.06, 0.17, 1.2, 0.8, 0.8); // 粉口鼻
  sph(head, 0.014, '#A0566F', 0.035, -0.05, 0.235); sph(head, 0.014, '#A0566F', -0.035, -0.05, 0.235);
  for (const sx of [-1, 1]) { cone(head, 0.03, 0.08, '#EAE4D8', 0.1 * sx, 0.19, 0, 0, 0, -0.5 * sx); sph(head, 0.05, c, 0.15 * sx, 0.05, 0.03, 1, 1.3, 0.5); }
  sph(g, 0.13, '#4A4046', 0.12, 0.42, -0.05, 1, 0.7, 1.2);   // 花斑
  sph(g, 0.1, '#4A4046', -0.14, 0.36, 0.12, 1, 0.65, 1);
  face(head, { y: 0.04, z: 0.175 });
  return g;
};

PETS.bird = () => {
  const g = G(), c = PET_COLORS.bird;
  sph(g, 0.16, c, 0, 0.22, 0, 1, 0.95, 1.05);
  sph(g, 0.12, '#FFF3DA', 0, 0.18, 0.06, 0.9, 0.8, 0.85);
  cone(g, 0.045, 0.09, '#FF9A3C', 0, 0.27, 0.16, Math.PI / 2);
  face(g, { dx: 0.06, y: 0.28, z: 0.12 });
  for (const sx of [-1, 1]) sph(g, 0.08, c, 0.15 * sx, 0.2, -0.02, 0.4, 0.8, 1.1); // 翅膀
  sph(g, 0.07, c, 0, 0.3, -0.15, 0.5, 0.6, 1);
  for (const sx of [-1, 1]) cyl(g, 0.012, 0.012, 0.08, '#FF9A3C', 0.05 * sx, 0.04, 0);
  return g;
};

PETS.bee = () => {
  const g = G(), c = PET_COLORS.bee;
  sph(g, 0.14, c, 0, 0.2, 0, 1, 0.95, 1.25);
  for (const z of [-0.04, 0.06]) tor(g, 0.138, 0.02, '#4A4046', 0, 0.2, z, Math.PI / 2).scale.set(1, 1, 1);
  sph(g, 0.1, '#4A4046', 0, 0.22, 0.14, 1, 0.9, 0.9); // 头
  for (const sx of [-1, 1]) {
    sph(g, 0.07, '#EAF7FC', 0.13 * sx, 0.28, -0.02, 1, 0.25, 1.5); // 翅膀
    cyl(g, 0.006, 0.006, 0.07, '#4A4046', 0.04 * sx, 0.32, 0.18, -0.5, 0, 0.4 * sx);
  }
  face(g, { dx: 0.045, y: 0.23, z: 0.22, s: 0.7 });
  cone(g, 0.008, 0.05, '#4A4046', 0, 0.2, -0.2, -Math.PI / 2);
  return g;
};

PETS.horse = () => {
  const g = G(), c = PET_COLORS.horse;
  const head = quadBody(g, { bc: c, bodyR: 0.19, bodyLen: 1.5, legH: 0.2, headR: 0.19, headZ: 0.34 });
  sph(head, 0.17, c, 0, 0, 0.05, 0.9, 0.95, 1.3); // 长脸
  sph(head, 0.05, '#8A6844', 0, -0.04, 0.2, 1, 0.8, 0.9);
  for (const sx of [-1, 1]) sph(head, 0.045, '#8A6844', 0.11 * sx, 0.12, -0.03, 1, 1.5, 0.5);
  for (let i = 0; i < 4; i++) sph(g, 0.045, '#6B4A30', 0, 0.44 + i * 0.04, 0.34 - i * 0.075, 1.6, 0.5, 0.5); // 鬃毛
  sph(g, 0.06, '#6B4A30', 0, 0.5, -0.32, 0.7, 1.3, 0.5); // 尾
  face(head, { dx: 0.075, y: 0.06, z: 0.13 });
  return g;
};

PETS.sheep = () => {
  const g = G(), c = PET_COLORS.sheep;
  const head = quadBody(g, { bc: c, bodyR: 0.2, legH: 0.13, legC: '#D9CBB8', headR: 0.15, headZ: 0.24 });
  for (const o of [[0, 0.06, 0.2], [0.12, 0.16, 0.15], [-0.12, 0.16, 0.15], [0, 0.2, -0.05], [0.13, 0.05, -0.1], [-0.13, 0.05, -0.1]])
    sph(g, 0.14, c, o[0], 0.28 + o[1], o[2] - 0.04, 1, 1, 1); // 卷卷毛
  sph(head, 0.13, '#4A4046', 0, 0, 0.04, 0.9, 0.95, 1.05); // 黑脸
  face(head, { dx: 0.045, y: 0.02, z: 0.13, s: 0.75 });
  for (const sx of [-1, 1]) sph(head, 0.05, c, 0.1 * sx, 0.08, -0.02, 1, 1.2, 0.4);
  return g;
};

PETS.hen = () => {
  const g = G(), c = PET_COLORS.hen;
  sph(g, 0.17, c, 0, 0.2, -0.03, 0.95, 1, 1.2);
  const head = G(); head.position.set(0, 0.42, 0.1); g.add(head);
  sph(head, 0.12, c);
  sph(head, 0.04, '#E84B4B', 0, 0.12, 0.02, 0.6, 1, 0.7); sph(head, 0.035, '#E84B4B', 0, 0.15, 0.01);
  cone(head, 0.035, 0.08, '#FF9A3C', 0, 0, 0.13, Math.PI / 2);
  sph(head, 0.03, '#E84B4B', 0, -0.09, 0.1, 0.5, 1, 0.5);
  face(head, { dx: 0.05, y: 0.03, z: 0.105 });
  for (const sx of [-1, 1]) cyl(g, 0.012, 0.012, 0.09, '#FF9A3C', 0.05 * sx, 0.05, 0);
  return g;
};

PETS.milk = () => {
  const g = G();
  box(g, 0.3, 0.42, 0.3, '#FFFFFF', 0, 0.21, 0);
  box(g, 0.3, 0.02, 0.3, '#7EC4F2', 0, 0.3, 0, 0, 0, 0);             // 蓝条
  add(g, new THREE.CylinderGeometry(0.15, 0.212, 0.16, 4), M('#E8F4FC'), 0, 0.48, 0, 0, Math.PI / 4); // 山形顶
  cyl(g, 0.035, 0.035, 0.06, '#D9E8F5', 0, 0.58, 0, 0, 0, 0, 8);
  face(g, { dx: 0.06, y: 0.2, z: 0.158 });
  return g;
};

PETS.bread = () => {
  const g = G(), c = PET_COLORS.bread;
  cap(g, 0.13, 0.22, c, 0, 0.15, 0, 0, 0, Math.PI / 2).scale.set(1, 1.05, 1.3);
  sph(g, 0.05, '#F5E0B8', -0.08, 0.27, 0.05); sph(g, 0.04, '#F5E0B8', 0.06, 0.28, -0.04);
  face(g, { dx: 0.06, y: 0.13, z: 0.165 });
  return g;
};

PETS.egg = () => {
  const g = G();
  sph(g, 0.18, PET_COLORS.egg, 0, 0.2, 0, 0.88, 1.12, 0.88);
  tor(g, 0.115, 0.016, '#A8D8F0', 0, 0.2, 0.06, 1.35, 0, 0, Math.PI).scale.set(0.92, 1.05, 1);
  face(g, { dx: 0.055, y: 0.22, z: 0.155 });
  return g;
};

PETS.cake = () => {
  const g = G();
  cyl(g, 0.2, 0.2, 0.16, '#FFB7CB', 0, 0.08, 0, 0, 0, 0, 18);
  cyl(g, 0.205, 0.205, 0.05, '#FFF6EC', 0, 0.18, 0, 0, 0, 0, 18);
  cyl(g, 0.16, 0.16, 0.12, '#FFE24E', 0, 0.25, 0, 0, 0, 0, 16);
  cyl(g, 0.012, 0.012, 0.12, '#8FD0E8', 0, 0.41, 0, 0, 0, 0, 6);
  sph(g, 0.028, '#FF8736', 0, 0.49, 0, 1, 1.5, 1, 0, 0, 0, { emissive: '#FF9A3C', ei: 1.2 }); // 烛火
  face(g, { dx: 0.07, y: 0.12, z: 0.185 });
  return g;
};

PETS.tractor = () => {
  const g = G(), c = PET_COLORS.tractor;
  box(g, 0.5, 0.22, 0.34, c, 0, 0.24, 0);
  box(g, 0.24, 0.24, 0.3, '#5C8F46', -0.08, 0.46, 0);
  sph(g, 0.1, '#EAF7FC', -0.08, 0.46, 0.02, 0.9, 0.9, 0.35); // 窗
  cyl(g, 0.015, 0.015, 0.16, '#4A4046', 0.16, 0.55, -0.08, 0, 0, 0, 8); // 烟囱
  const wheel = (x, z, r) => { cyl(g, r, r, 0.08, '#E8B23C', x, r, z, 0, 0, Math.PI / 2, 16); cyl(g, r * 0.45, r * 0.45, 0.09, '#4A4046', x, r, z, 0, 0, Math.PI / 2, 12); };
  wheel(0.18, 0, 0.1); wheel(-0.18, 0, 0.1);
  face(g, { dx: 0.1, y: 0.28, z: 0.19, s: 0.8 });
  return g;
};

PETS.rain = () => {
  const g = G(), c = PET_COLORS.rain;
  sph(g, 0.16, '#FFFFFF', 0, 0.32, 0, 1.2, 0.8, 1);
  sph(g, 0.12, '#FFFFFF', 0.15, 0.28, 0.02); sph(g, 0.11, '#FFFFFF', -0.15, 0.28, -0.02);
  face(g, { dx: 0.06, y: 0.31, z: 0.12, s: 0.85 });
  for (const [dx, dz, dy] of [[-0.14, 0.04, -0.1], [0.02, -0.06, -0.22], [0.15, 0.03, -0.13]])
    sph(g, 0.035, '#7EC4F2', dx, 0.2 + dy - 0.06, dz, 1, 1.4, 1, 0, 0, 0, { alpha: 0.9 });
  return g;
};

PETS.tree = () => {
  const g = G();
  cyl(g, 0.1, 0.14, 0.4, '#A87551', 0, 0.2, 0);
  sph(g, 0.24, '#6FBF73', 0, 0.55, 0);
  sph(g, 0.17, '#8FD08F', 0.13, 0.66, 0.08); sph(g, 0.15, '#5CA85C', -0.14, 0.62, -0.06);
  face(g, { dx: 0.055, y: 0.22, z: 0.13, s: 0.8 });
  return g;
};

PETS.sun = () => {
  const g = G(), c = PET_COLORS.sun;
  sph(g, 0.19, c, 0, 0.32, 0, 1, 1, 1, 0, 0, 0, { emissive: '#FFB93C', ei: 0.55 });
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * i / 8;
    cone(g, 0.045, 0.13, c, Math.cos(a) * 0.26, 0.32 + Math.sin(a) * 0.26, 0, 0, 0, a - Math.PI / 2, 8,
      { emissive: '#FFB93C', ei: 0.5 });
  }
  face(g, { dx: 0.06, y: 0.33, z: 0.17, s: 0.9 });
  return g;
};

PETS.star = () => {
  const g = G(), c = PET_COLORS.star;
  sph(g, 0.13, c, 0, 0.3, 0, 1, 1, 0.6, 0, 0, 0, { emissive: '#FFD34E', ei: 0.9 });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + Math.PI * 2 * i / 5;
    cone(g, 0.05, 0.16, c, Math.cos(a) * 0.17, 0.3 + Math.sin(a) * 0.17, 0, 0, 0, a + Math.PI / 2, 6,
      { emissive: '#FFD34E', ei: 0.9 });
  }
  face(g, { dx: 0.045, y: 0.31, z: 0.09, s: 0.75 });
  return g;
};

PETS.moon = () => {
  const g = G(), c = PET_COLORS.moon;
  tor(g, 0.17, 0.075, c, 0, 0.3, 0, 0, 0, Math.PI * 0.7, Math.PI * 1.6, { emissive: '#F5D98A', ei: 0.5 });
  sph(g, 0.03, '#EAD48E', 0.05, 0.42, 0.03); sph(g, 0.025, '#EAD48E', -0.1, 0.36, 0.05);
  face(g, { dx: 0.04, y: 0.31, z: 0.1, s: 0.7 });
  return g;
};

// ================= 字母挂牌 =================
export function letterTexture(letter, bg = '#FF8FB0', fg = '#FFFFFF') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = bg;
  c.beginPath();
  c.roundRect(8, 8, 112, 112, 34);
  c.fill();
  c.fillStyle = fg;
  c.font = '900 84px "Segoe UI", "Microsoft YaHei", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(letter.toUpperCase(), 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addLetterTag(group, letter) {
  const geo = new THREE.PlaneGeometry(0.17, 0.17);
  const m = new THREE.MeshBasicMaterial({ map: letterTexture(letter), transparent: true, side: THREE.DoubleSide });
  const tag = new THREE.Mesh(geo, m);
  const h = tagHeight(group);
  tag.position.set(0, h * 0.62, tagDepth(group, h));
  tag.name = 'letterTag';
  group.add(tag);
  return tag;
}
function tagHeight(g) {
  const box = new THREE.Box3().setFromObject(g);
  return Math.max(0.3, box.max.y);
}
function tagDepth(g, h) {
  const box = new THREE.Box3().setFromObject(g);
  const c = box.getCenter(new THREE.Vector3());
  return Math.min(0.3, (c.z - box.min.z) + (box.max.z - box.min.z) * 0.3 + 0.05);
}

// ================= 玩家（小花匠） =================
export function buildPlayer() {
  const g = G();
  const skin = '#FFE0CC';
  // 腿
  const legL = G(), legR = G();
  legL.position.set(-0.075, 0.3, 0); legR.position.set(0.075, 0.3, 0);
  for (const [leg, sx] of [[legL, -1], [legR, 1]]) {
    cap(leg, 0.042, 0.16, '#7EA8E8', 0, -0.15, 0);
    sph(leg, 0.058, '#FFE08A', 0, -0.285, 0.02, 1, 0.62, 1.25); // 小黄鞋
  }
  g.add(legL, legR);
  // 身体（背带裤）
  const body = G(); body.position.set(0, 0.3, 0); g.add(body);
  cyl(body, 0.135, 0.24, 0.34, '#7EA8E8', 0, 0.17, 0, 0, 0, 0, 16);
  sph(body, 0.125, '#FFF6C8', 0, 0.4, 0, 1, 0.55, 0.92);            // 上身
  box(body, 0.035, 0.2, 0.02, '#5C8F46', -0.06, 0.36, 0.115);       // 背带
  box(body, 0.035, 0.2, 0.02, '#5C8F46', 0.06, 0.36, 0.115);
  // 手臂
  const armL = G(), armR = G();
  armL.position.set(-0.15, 0.2, 0); armR.position.set(0.15, 0.2, 0);
  for (const arm of [armL, armR]) {
    cap(arm, 0.03, 0.1, skin, 0, -0.09, 0);
    sph(arm, 0.042, skin, 0, -0.17, 0);
    sph(arm, 0.052, '#7EA8E8', 0, -0.015, 0, 1.1, 0.6, 1.1);
  }
  body.add(armL, armR);
  // 头
  const head = G(); head.position.set(0, 0.46, 0); body.add(head);
  sph(head, 0.185, skin, 0, 0, 0, 1, 0.95, 0.97);
  sph(head, 0.196, '#8A5A3C', 0, 0.028, -0.022, 1.02, 0.98, 1.02);  // 头发
  sph(head, 0.07, '#8A5A3C', -0.075, 0.11, 0.13, 1.4, 0.7, 0.7);    // 刘海
  sph(head, 0.08, '#8A5A3C', 0, 0.125, 0.14, 1.4, 0.75, 0.75);
  sph(head, 0.07, '#8A5A3C', 0.075, 0.11, 0.13, 1.4, 0.7, 0.7);
  for (const sx of [-1, 1]) {
    sph(head, 0.03, '#4A4046', 0.068 * sx, 0.012, 0.158, 1, 1.35, 0.55);
    sph(head, 0.01, '#FFFFFF', 0.079 * sx, 0.044, 0.172);
    sph(head, 0.036, '#FFB3C1', 0.118 * sx, -0.048, 0.138, 1, 0.7, 0.4);
  }
  // 草帽
  cyl(head, 0.13, 0.26, 0.04, '#F5D76E', 0, 0.155, 0, 0, 0, 0, 18);
  sph(head, 0.13, '#F5D76E', 0, 0.17, 0, 1, 0.7, 1);
  cyl(head, 0.145, 0.148, 0.035, '#FF9FB6', 0, 0.175, 0, 0, 0, 0, 18);
  return { group: g, parts: { legL, legR, armL, armR, body, head } };
}

// ================= 场景物 =================
export const PROPS = {};

PROPS.tree = (blossom = false) => {
  const g = G();
  cyl(g, 0.16, 0.24, 1.5, '#A87551', 0, 0.75, 0, 0, 0, 0, 10);
  const c1 = blossom ? '#FFC9DD' : '#8FD08F', c2 = blossom ? '#FFB1CC' : '#7CC96F';
  sph(g, 0.85, c1, 0, 1.9, 0, 1, 1, 1);
  sph(g, 0.62, c2, 0.5, 1.6, 0.22); sph(g, 0.58, c2, -0.48, 1.65, -0.18);
  sph(g, 0.55, c1, 0.05, 2.4, -0.15);
  return g;
};

PROPS.fence = () => {
  const g = G();
  box(g, 0.09, 0.72, 0.09, '#FDF6EC', 0, 0.36, -0.95);
  box(g, 0.09, 0.72, 0.09, '#FDF6EC', 0, 0.36, 0.95);
  for (const z of [-0.55, -0.18, 0.18, 0.55]) {
    box(g, 0.07, 0.62, 0.22, '#FDF6EC', 0, 0.31, z);
    cone(g, 0.05, 0.1, '#FDF6EC', 0, 0.67, z, 0, Math.PI / 4, 0, 4);
  }
  box(g, 0.045, 0.08, 1.94, '#FDF6EC', 0, 0.42, 0);
  box(g, 0.045, 0.08, 1.94, '#FDF6EC', 0, 0.16, 0);
  return g;
};

PROPS.barn = () => {
  const g = G();
  box(g, 6, 3.2, 5, '#D95F4B', 0, 1.6, 0);                               // 主体
  // 大屋顶（两块斜板，内端在屋脊相接）
  box(g, 3.6, 0.18, 5.6, '#B44A38', -1.42, 3.85, 0, 0, 0, 0.72);
  box(g, 3.6, 0.18, 5.6, '#B44A38', 1.42, 3.85, 0, 0, 0, -0.72);
  box(g, 0.5, 0.22, 5.4, '#8A3A2C', 0, 4.95, 0);                          // 屋脊
  // 白色门框 + 大谷仓门
  box(g, 2.4, 2.6, 0.12, '#FFF3E0', 0, 1.3, 2.51);
  box(g, 1.9, 2.2, 0.14, '#FFF6EC', 0, 1.1, 2.52);
  for (const rz of [0.7, -0.7]) box(g, 0.12, 2.6, 0.16, '#D95F4B', 0, 1.1, 2.55, 0, 0, rz);
  // 干草窗
  box(g, 1, 1, 0.12, '#FFF6EC', 0, 3.3, 2.51);
  // 内部（默认黑黑的，light 词宠点亮后移除 darkness）
  const dark = box(g, 5.6, 3, 4.6, '#1E1620', 0, 1.55, 0);
  dark.material = M('#181022', { alpha: 0.96 });
  dark.name = 'darkness';
  return g;
};

PROPS.windmill = () => {
  const g = G();
  cyl(g, 1.1, 1.7, 4.2, '#FFF3E0', 0, 2.1, 0, 0, 0, 0, 10);
  cone(g, 1.35, 1.2, '#D95F4B', 0, 4.8, 0, 0, 0, 0, 10);
  box(g, 0.7, 1.4, 0.1, '#8A6844', 0, 0.7, 1.62);
  const blades = G();
  blades.position.set(0, 4.1, 1.45);
  for (let i = 0; i < 4; i++) {
    const b = G();
    box(b, 0.32, 2.5, 0.06, '#F5E0B8', 0, 1.25, 0);
    for (let j = 1; j < 4; j++) box(b, 0.3, 0.05, 0.02, '#C9A46B', 0, j * 0.6, 0.05);
    b.rotation.z = Math.PI / 2 * i;
    blades.add(b);
  }
  g.add(blades);
  g.userData.blades = blades;
  return g;
};

PROPS.dock = () => {
  const g = G();
  for (let i = 0; i < 5; i++) box(g, 2.2, 0.1, 1.1, '#C89A6B', 0, 0.16, -2.2 + i * 1.1);
  for (const z of [-2, 0, 2]) for (const x of [-0.9, 0.9]) cyl(g, 0.07, 0.07, 0.6, '#8A6844', x, -0.1, z, 0, 0, 0, 8);
  return g;
};

PROPS.haybale = () => {
  const g = G();
  cyl(g, 1.1, 1.1, 1.5, '#E8C87E', 0, 1.1, 0, 0, 0, Math.PI / 2, 16);
  tor(g, 1.11, 0.03, '#C9A46B', 0, 1.1, 0, 0, 0, Math.PI / 2);
  tor(g, 0.6, 0.025, '#D9B68F', 0, 1.1, 0, 0, 0, Math.PI / 2);
  return g;
};

PROPS.hedge = () => {
  const g = G();
  box(g, 2, 1.3, 1.2, '#5CA85C', 0, 0.65, 0);
  sph(g, 0.55, '#6FBF73', -0.7, 1.25, 0, 1, 0.7, 0.9);
  sph(g, 0.5, '#7CC96F', 0.6, 1.3, 0.1, 1, 0.7, 0.9);
  return g;
};

PROPS.pumpkin = () => {
  const g = G();
  sph(g, 0.32, '#FF9A3C', 0, 0.26, 0, 1, 0.85, 1);
  sph(g, 0.28, '#FFAB54', 0, 0.26, 0, 0.55, 0.88, 1);
  cyl(g, 0.04, 0.05, 0.12, '#5C8F46', 0, 0.6, 0);
  sph(g, 0.06, '#5C8F46', 0.08, 0.62, 0, 1.4, 0.3, 0.8);
  return g;
};

PROPS.rock = (s = 1) => {
  const g = G();
  sph(g, 0.22 * s, '#BDBDC8', 0, 0.14 * s, 0, 1.35, 0.7, 1);
  sph(g, 0.12 * s, '#CBCBD4', 0.18 * s, 0.1 * s, 0.1 * s);
  return g;
};

PROPS.cloud = (s = 1) => {
  const g = G();
  sph(g, 0.5 * s, '#FFFFFF', 0, 0, 0, 1, 0.75, 1, 0, 0, 0, { alpha: 0.92 });
  sph(g, 0.36 * s, '#FFFFFF', 0.45 * s, -0.05 * s, 0.1 * s, 1, 0.8, 1, 0, 0, 0, { alpha: 0.92 });
  sph(g, 0.32 * s, '#FFFFFF', -0.4 * s, -0.02 * s, -0.08 * s, 1, 0.8, 1, 0, 0, 0, { alpha: 0.92 });
  return g;
};

PROPS.flowerpatch = () => {
  const g = G();
  const cols = ['#FF8FB0', '#FFE24E', '#FFFFFF', '#B28FF5'];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 2 * i / 5 + Math.random();
    cyl(g, 0.012, 0.014, 0.18 + Math.random() * 0.1, '#66BB6A', Math.cos(a) * 0.25, 0.1, Math.sin(a) * 0.25);
    sph(g, 0.06, cols[i % 4], Math.cos(a) * 0.25, 0.24 + Math.random() * 0.06, Math.sin(a) * 0.25, 1, 0.7, 1);
  }
  return g;
};

PROPS.soil = () => {
  const g = G();
  box(g, 1.6, 0.12, 3.4, '#8A6844', 0, 0.05, 0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 4; j++)
      sph(g, 0.07, '#A8825B', -0.55 + i * 0.55, 0.12, -1.2 + j * 0.8, 1, 0.6, 1);
  return g;
};

PROPS.beanstalk = () => {
  const g = G();
  // 从地面爬向天空的豆藤（scale.y 动画用）
  const stalk = G();
  cyl(stalk, 0.12, 0.3, 14, '#5CA85C', 0, 7, 0, 0, 0, 0, 10);
  for (let i = 0; i < 8; i++) {
    const y = 1.5 + i * 1.6;
    const a = i * 1.3;
    sph(stalk, 0.3, '#6FBF73', Math.cos(a) * 0.5, y, Math.sin(a) * 0.5, 1.3, 0.4, 0.9);
    sph(stalk, 0.09, '#8FD08F', Math.cos(a + 1) * 0.55, y + 0.5, Math.sin(a + 1) * 0.55, 1.2, 0.35, 0.8);
  }
  g.add(stalk);
  g.userData.stalk = stalk;
  return g;
};

// ================= 词宠工厂 & 缩略图 =================
export function buildPet(petId) {
  const b = PETS[petId];
  if (!b) { const g = G(); sph(g, 0.15, '#CCCCCC', 0, 0.15, 0); return g; }
  return b();
}

let thumbRenderer = null;
const thumbCache = {};
export function petThumbnail(petId) {
  if (thumbCache[petId]) return thumbCache[petId];
  if (!thumbRenderer) {
    thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbRenderer.setSize(128, 128);
    thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
  const pet = buildPet(petId);
  scene.add(pet);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe4f0, 2.2));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const bb = new THREE.Box3().setFromObject(pet);
  const size = bb.getSize(new THREE.Vector3());
  const center = bb.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  cam.position.set(center.x + maxDim * 0.9, center.y + maxDim * 0.7, center.z + maxDim * 1.3);
  cam.lookAt(center);
  thumbRenderer.render(scene, cam);
  const url = thumbRenderer.domElement.toDataURL('image/png');
  thumbCache[petId] = url;
  return url;
}
