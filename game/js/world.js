// 农场岛屿世界搭建：地形彩绘、河流、果园、风车田、谷仓、菜园、天空岛、阳光海滩、神秘森林、环形群岛
import * as THREE from 'three';
import { PROPS, badge } from './models.js';
import { ISLANDS } from './words.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.rough ?? 0.9, metalness: 0,
  emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
  transparent: !!o.alpha, opacity: o.alpha ?? 1, side: o.side ?? THREE.FrontSide,
});

// 简易几何辅助（火车站等小构筑物用）
const box = (g, w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};
const cyl = (g, rt, rb, h, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};
const cone = (g, r, h, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.001, r, h, seg), M(c));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
};

// 岛屿半径（可玩范围）， 海从 52 以外开始
const ISLE_R = 52;

function place(scene, obj, x, z, ry = 0, y = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(obj);
  return obj;
}

// ---------- 彩绘地形：一块大画布画出各区域的地面 ----------
function islandTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const c = cv.getContext('2d');
  const P = 1024 / (ISLE_R * 2);                  // 世界坐标 → 画布像素
  const px = x => (x + ISLE_R) * P, pz = z => (z + ISLE_R) * P;
  const blob = (x, z, r, colors, n = 6) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = colors[i % colors.length];
      c.globalAlpha = 0.35;
      c.beginPath();
      c.ellipse(px(x) + (Math.random() - 0.5) * r * P, pz(z) + (Math.random() - 0.5) * r * P,
        (0.3 + Math.random() * 0.5) * r * P, (0.25 + Math.random() * 0.4) * r * P, Math.random() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  };
  const path = (pts, w = 1.4) => {
    c.strokeStyle = '#D9B68F';
    c.lineWidth = w * P;
    c.globalAlpha = 0.85;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    pts.forEach(([x, z], i) => i ? c.lineTo(px(x), pz(z)) : c.moveTo(px(x), pz(z)));
    c.stroke();
    c.globalAlpha = 1;
  };

  // 草地底色
  c.fillStyle = '#7FCB72';
  c.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1000; i++) {
    c.fillStyle = ['#8FD88A', '#74C06E', '#93D98B', '#7ACB70'][i % 4];
    c.globalAlpha = 0.5;
    c.beginPath();
    c.ellipse(Math.random() * 1024, Math.random() * 1024, 8 + Math.random() * 26, 5 + Math.random() * 18,
      Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // 阳光果园（西北）：深一点的绿
  blob(-20, -18, 9, ['#6FBB68', '#67B262']);
  // 风车田（东北）：金色麦浪条纹
  blob(21, -19, 9, ['#C9C16B', '#D4C470']);
  c.strokeStyle = 'rgba(217,196,112,.6)';
  c.lineWidth = 2.5 * P;
  for (let x = 10; x <= 32; x += 3.2) {
    c.beginPath(); c.moveTo(px(x), pz(-29)); c.lineTo(px(x + 1), pz(-8)); c.stroke();
  }
  // 谷仓前院（东南）：踩出来的土色
  blob(24, 19, 7, ['#D9C9A0', '#CBB88F']);
  // 魔法菜园（西）：一垄一垄的菜地
  c.strokeStyle = 'rgba(138,104,68,.55)';
  c.lineWidth = 1.1 * P;
  for (let z = 11; z <= 33; z += 2.2) {
    c.beginPath(); c.moveTo(px(-33), pz(z)); c.lineTo(px(-14), pz(z)); c.stroke();
  }
  // 神秘森林（极西）：深苔藓绿 + 落叶斑点
  blob(-45, 2, 8, ['#5E9E58', '#549252'], 16);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = ['#4E8E4E', '#6FAF6A', '#8A6844'][i % 3];
    c.globalAlpha = 0.5;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 7;
    c.beginPath();
    c.ellipse(px(-45 + Math.cos(a) * r), pz(3 + Math.sin(a) * r) , 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // 阳光海滩（正南）：一大片沙子 + 浪打湿的深沙边
  c.fillStyle = '#EFDCA8';
  c.beginPath();
  c.moveTo(px(-40), pz(35.5));
  for (let x = -40; x <= 40; x += 4) c.quadraticCurveTo(px(x + 2), pz(34.6 + Math.sin(x) * 0.9), px(x + 4), pz(35.5));
  c.lineTo(px(50), pz(55)); c.lineTo(px(-50), pz(55));
  c.closePath(); c.fill();
  blob(0, 40, 8, ['#E8D49C', '#F4E2B4'], 10);
  // 湿沙：沿着岛边缘一圈深色
  c.strokeStyle = 'rgba(196,172,120,.8)';
  c.lineWidth = 1.6 * P;
  c.beginPath();
  c.arc(px(0), pz(0), 50.6 * P, Math.PI * 0.32, Math.PI * 0.68);
  c.stroke();
  // 河两岸的浅滩沙
  blob(-24, 5.2, 3, ['#E3D0A0'], 8);
  blob(24, -5.2, 3, ['#E3D0A0'], 8);
  blob(0, 5.2, 3, ['#E3D0A0'], 6);
  blob(0, -5.2, 3, ['#E3D0A0'], 6);

  // 小路：码头 → 出生点 → 各区域
  path([[0, 4.6], [0, 12], [0, 20]]);
  path([[0, 20], [13, 20], [22.5, 19.6]]);            // 去谷仓
  path([[0, 20], [-12, 19], [-22, 20.5]]);            // 去菜园
  path([[0, 20], [0, 30], [0, 36.8]]);                // 去海滩沙墙
  path([[0, 14], [-14, 12], [-26, 11], [-36.5, 11]]); // 去森林荆棘
  path([[0, -4.6], [-8, -6], [-16, -6]]);             // 过河往果园

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function groundTexture() { return islandTexture(); }

function petalTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#FFC9DD';
  c.beginPath();
  c.ellipse(32, 32, 20, 13, 0.6, 0, Math.PI * 2);
  c.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture(inner = 'rgba(255,244,214,1)', outer = 'rgba(255,244,214,0)') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const grad = c.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  c.fillStyle = grad;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, semIslands = ISLANDS) {
  const world = { colliders: [], anim: {}, gates: {}, platforms: [] };
  const C = world.colliders;
  // 可站立物件：给碰撞体一个“台面高度”，跳得够高就能落上去站着（站得高看得远）
  const colTop = (x, z, r, top, bottom = 0) => {
    C.push({ t: 'c', x, z, r, top, bottom });
    world.platforms.push({ x, z, r, top });
  };
  // 纯平台（不挡路）：云朵这类悬空软物件，跳穿它落在上面反而更好玩
  const addPlatform = (x, z, r, top) => world.platforms.push({ x, z, r, top });
  const colC = (x, z, r, top) => C.push(top ? { t: 'c', x, z, r, top } : { t: 'c', x, z, r });
  const colR = (x1, z1, x2, z2, top) => C.push(top ? { t: 'r', x1, z1, x2, z2, top } : { t: 'r', x1, z1, x2, z2 });

  // ---- 天空穹顶（渐变 + 更晴朗的蓝） ----
  const skyCv = document.createElement('canvas');
  skyCv.width = 2; skyCv.height = 256;
  {
    const c = skyCv.getContext('2d');
    const grad = c.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3E97E8');
    grad.addColorStop(0.42, '#7EC8F5');
    grad.addColorStop(0.62, '#BDE9FF');
    grad.addColorStop(0.82, '#FDF3D8');
    grad.addColorStop(1, '#FFE3EC');
    c.fillStyle = grad;
    c.fillRect(0, 0, 2, 256);
  }
  const skyTex = new THREE.CanvasTexture(skyCv);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  scene.add(dome);
  scene.fog = new THREE.Fog(0xDFF3EC, 42, 150);

  // ---- 太阳（亮核 + 光晕） ----
  const sunDir = new THREE.Vector3(18, 30, 12).normalize();
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,252,238,1)', 'rgba(255,240,190,0)'), fog: false,
    depthWrite: false, transparent: true,
  }));
  sunCore.position.copy(sunDir).multiplyScalar(118);
  sunCore.scale.setScalar(26);
  scene.add(sunCore);
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,236,170,.55)', 'rgba(255,236,170,0)'), fog: false,
    depthWrite: false, transparent: true,
  }));
  sunHalo.position.copy(sunDir).multiplyScalar(116);
  sunHalo.scale.setScalar(64);
  scene.add(sunHalo);

  // ---- 光照 ----
  scene.add(new THREE.HemisphereLight(0xFFF6E8, 0x9CC98F, 1.05));
  const sun = new THREE.DirectionalLight(0xFFF2DC, 2.1);
  // 真实时段色温：清晨和黄昏整岛偏金（只调一次，白天玩的孩子看不到差别）
  const hr = new Date().getHours();
  if (hr >= 16 && hr < 19) { sun.color.set(0xFFC98A); sun.intensity = 1.75; }
  else if (hr >= 5 && hr < 8) { sun.color.set(0xFFE2B8); sun.intensity = 1.85; }
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---- 大海（全岛外圈 + 群岛） ----
  const seaMat = M('#4A9ED9', { rough: 0.32 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(-Math.PI / 2), seaMat);
  sea.position.y = -0.14;
  scene.add(sea);
  world.anim.sea = sea;
  // 岛边的白色浪花圈
  const surf = new THREE.Mesh(new THREE.RingGeometry(49.4, ISLE_R + 0.8, 72).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.45, depthWrite: false }));
  surf.position.y = 0.03;
  scene.add(surf);
  world.anim.surf = surf;

  // ---- 云影：几团大暗斑贴地缓慢漂移，世界有“云过”的呼吸感 ----
  const clouds = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(7 + i * 3.5, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x274D27, transparent: true, opacity: 0.08, depthWrite: false }));
    c.position.set(-60 + i * 45, 0.32, (i - 1) * 22);
    scene.add(c);
    clouds.push(c);
  }
  world.anim.clouds = clouds;

  // ---- 岛屿地面（彩绘） ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(ISLE_R, 72).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  // 远处海面上的青色小岛剪影
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * i / 8 + 0.4;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(14 + (i % 3) * 6, 16, 12),
      M(i % 2 ? '#6FAF8E' : '#7FBf98'));
    hill.position.set(Math.cos(a) * 84, -6, Math.sin(a) * 84);
    hill.scale.y = 0.62;
    scene.add(hill);
  }

  // ---- 河流 ----
  const waterGeo = new THREE.PlaneGeometry(104, 7, 60, 4).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, M('#6FC7E8', { rough: 0.25, alpha: 0.9 }));
  water.position.y = 0.04;
  scene.add(water);
  world.anim.water = water;
  // 两岸白色浪线
  world.anim.foam = [];
  for (const bank of [1, -1]) {
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(104, 0.26).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55, depthWrite: false }));
    foam.position.set(0, 0.105, bank * 3.72);
    scene.add(foam);
    world.anim.foam.push(foam);
  }
  // 河里的荷叶
  for (const [x, z] of [[-15, 0.6], [-7, -1.1], [18, 0.9], [27, -0.8]]) place(scene, PROPS.lilyPad(), x, z, Math.random() * 3, 0.06).traverse(o => { if (o.isMesh) o.castShadow = false; });

  // ---- 码头（boat 过河点） ----
  place(scene, PROPS.dock(), 0, 0);
  for (const z of [5.8, -5.8]) place(scene, PROPS.flowerpatch(), (Math.random() - 0.5) * 6, z * 0.9 + Math.sign(z) * 1.5);

  // ---- 栅栏（河岸两侧，留码头缺口）：矮栏杆跳得过去，掉进河堤小条带也能再跳回来 ----
  // 面板必须转 90° 顺着岸线排：不转的话一块块立着像缺口，看着能钻过去其实撞墙
  for (const bank of [1, -1]) {
    for (let x = -34; x <= 34; x += 2.1) {
      if (x > -4.5 && x < 4.5) continue;
      place(scene, PROPS.fence(), x, bank * 6.2, Math.PI / 2);
    }
    colR(-35, bank * 6.2 - 0.3, -4.5, bank * 6.2 + 0.3, 0.8);
    colR(4.5, bank * 6.2 - 0.3, 35, bank * 6.2 + 0.3, 0.8);
  }

  // ---- 树木点缀（草甸 & 果园） ----
  const treeSpots = [
    [-24, 8, 0], [22, 8, 1], [-28, 14, 0], [30, 26, 1], [-34, 2, 0], [34, 4, 0],
    [-20, -16, 0], [-26, -12, 1], [-12, -18, 0], [-30, -22, 0], [-16, -26, 1], [-24, -24, 0],
    [-34, -10, 0], [-8, -24, 0],
  ];
  for (const [x, z, bl] of treeSpots) {
    place(scene, PROPS.tree(!!bl), x, z, Math.random() * 3);
    colC(x, z, 0.6);
  }
  // 果园地标：大树下的鸟窝（两颗小小的蛋）
  place(scene, PROPS.nest(), -23.4, 9.0, Math.random() * 3);
  // 果园里散落的小苹果
  for (let i = 0; i < 6; i++) {
    const x = -30 + Math.random() * 22, z = -26 + Math.random() * 14;
    const ap = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), M('#FF6B6B'));
    s.position.y = 0.14; s.castShadow = true; ap.add(s);
    place(scene, ap, x, z);
  }

  // ---- 风车田（含干草垛大门 + 树篱围栏） ----
  for (let x = 8; x <= 34; x += 2.05) {
    if (x > 11.5 && x < 14.5) continue; // 大门缺口
    place(scene, PROPS.hedge(), x, -9);
    colR(x - 1, -9.65, x + 1, -8.35);
  }
  for (let z = -30; z <= -9; z += 2.05) {
    place(scene, PROPS.hedge(), 8, z);
    colR(7.35, z - 1, 8.65, z + 1);
  }
  const hay = place(scene, PROPS.haybale(), 13, -9);
  colC(13, -9, 1.7);
  world.gates.hay = { group: hay, colIndex: C.length - 1 };
  const windmill = place(scene, PROPS.windmill(), 27, -18, 0.4);
  world.anim.windmill = windmill.userData.blades;
  colC(27, -18, 2.0);
  // 风车田地标：小干草垛（跳上去站站看）
  place(scene, PROPS.haybale(0.6), 18, -20, Math.random() * 3);
  colTop(18, -20, 0.85, 0.95);
  // 谷仓前院地标：干草垛兄弟俩
  place(scene, PROPS.haybale(0.7), 29.5, 27.5, Math.random() * 3);
  colTop(29.5, 27.5, 0.95, 1.1);
  place(scene, PROPS.haybale(0.5), 30.9, 28.7, Math.random() * 3);
  colTop(30.9, 28.7, 0.7, 0.8);

  // ---- 谷仓（黑黑的里面） ----
  const barn = place(scene, PROPS.barn(), 24, 22, Math.PI); // 门朝北（面向草甸）
  world.gates.darkness = barn.getObjectByName('darkness');
  colR(20.9, 19.3, 22.9, 19.7); colR(25.1, 19.3, 27.1, 19.7);
  colR(20.9, 24.3, 27.1, 24.7);
  colR(20.9, 19.3, 21.3, 24.7); colR(26.7, 19.3, 27.1, 24.7);
  const barnLight = new THREE.PointLight(0xFFDFA8, 0, 12, 1.6);
  barnLight.position.set(24, 2.4, 22);
  scene.add(barnLight);
  world.gates.barnLight = barnLight;

  // ---- 南瓜地（light 蛋旁边） ----
  for (const [x, z, s] of [[7.5, 30.5, 1.2], [10.5, 32.5, 1], [6.5, 33, 0.8]]) {
    const p = PROPS.pumpkin();
    p.scale.setScalar(s);
    place(scene, p, x, z);
    colTop(x, z, 0.45 * s, 0.55 * s);
  }

  // ---- 魔法菜园（seed+rain 长豆藤） ----
  for (const [x, z] of [[-22, 20], [-22, 23.5]]) place(scene, PROPS.soil(), x, z);
  colR(-23, 19.3, -21, 21); colR(-23, 22.8, -21, 25.2);
  const beanstalk = PROPS.beanstalk();
  beanstalk.position.set(-22, 0, 27);
  beanstalk.scale.set(1, 0.001, 1);
  beanstalk.visible = false;
  scene.add(beanstalk);
  world.gates.beanstalk = beanstalk;

  // ---- 天空岛 ----
  const isle = new THREE.Group();
  const isleTop = new THREE.Mesh(new THREE.CylinderGeometry(6, 5.2, 0.8, 20), M('#7FCB72'));
  isleTop.position.y = -0.4;
  const isleBottom = new THREE.Mesh(new THREE.ConeGeometry(5.2, 5, 20), M('#A8825B'));
  isleBottom.rotation.x = Math.PI;
  isleBottom.position.y = -3.2;
  isle.add(isleTop, isleBottom);
  const isleTree = PROPS.tree(true);
  isleTree.position.set(3, 0, -3);
  isleTree.scale.setScalar(0.8);
  isle.add(isleTree);
  isle.position.set(-22, 14, 27);
  isle.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(isle);
  world.gates.skyIsle = isle;
  // 天空岛顶面本身也是可站平台：沿云朵阶梯跳上来后就能直接落在岛上
  colTop(-22, 27, 6, 14, 13);   // bottom=13：岛底下走路自由通过
  // ---- 云朵阶梯：菜园南侧外圈 9 朵矮云，每跳 1.3 米单跳可达，一路跳到岛沿 ----
  // 云是纯平台不设碰撞：跳穿了就落上去，地面上从云底下走也不撞隐形墙；
  // 阶梯绕开岛的正下方（在岛底下起跳永远够不到岛面）
  {
    const stair = [
      [-16.4, 19.6, 1.3],
      [-14.9, 21.3, 2.6],
      [-14.0, 23.3, 3.9],
      [-13.7, 25.5, 5.2],
      [-14.0, 27.8, 6.5],
      [-14.8, 30.0, 7.8],
      [-16.2, 31.8, 9.1],
      [-18.0, 33.1, 10.4],
      [-21.3, 33.4, 12.4],
    ];
    world.anim.cloudStair = [];
    for (const [x, z, top] of stair) {
      const c = PROPS.cloud(1.15);
      c.position.set(x, top - 0.6, z);
      c.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 0.8; } });
      scene.add(c);
      addPlatform(x, z, 1.35, top);
      const pf = world.platforms[world.platforms.length - 1];
      pf.baseTop = top;
      pf.bob = { amp: 0.14, speed: 1.05, phase: Math.random() * Math.PI * 2 };
      world.anim.cloudStair.push({ mesh: c, pf, baseY: top - 0.6 });
    }
  }

  // ---- 村庄小广场：许愿井 + 任务板 + 向日葵 + 稻草人 + 风车花 ----
  const well = place(scene, PROPS.well(), 4.6, 19.5, -0.5);
  colTop(4.6, 19.5, 0.85, 1.0);
  world.gates.well = well;
  const board = place(scene, PROPS.signboard(), -4.6, 19.5, 0.5);
  colC(-4.6, 19.5, 0.7);
  world.gates.board = board;
  const scare = place(scene, PROPS.scarecrow(), 11, 27, -0.8);
  colC(11, 27, 0.5);
  world.anim.scarecrow = scare;
  world.anim.pinwheels = [];
  for (const [x, z, ry] of [[3, 24.5, 0.4], [-9, 9, 1.2], [14, 12, 2.2]]) {
    const pw = place(scene, PROPS.pinwheel(), x, z, ry);
    colC(x, z, 0.25);
    world.anim.pinwheels.push(pw.userData.blades);
  }
  for (const [x, z] of [[-11.5, 16.5], [-10.5, 23], [7, 29], [8.5, 7.5], [-2, 27]])
    place(scene, PROPS.sunflower(), x, z, Math.random() * 3);

  // ---- 跳跳石（草甸东南的空地）：三级石阶跳上高台，台顶的蛋要跳上去才够得着 ----
  {
    const perch = { x: 11.5, z: 27.2, r: 1.35, top: 2.75 };
    const steps = [
      { x: 11.5, z: 24.2, r: 1.0, top: 1.0 },
      { x: 11.5, z: 25.7, r: 1.0, top: 1.85 },
      perch,
    ];
    for (const s of steps) {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(s.r, s.r + 0.18, s.top, 14),
        M(s === perch ? '#9FB894' : '#BCC8B4'));
      stone.position.set(s.x, s.top / 2, s.z);
      stone.castShadow = true;
      stone.receiveShadow = true;
      scene.add(stone);
      colTop(s.x, s.z, s.r, s.top);   // 侧面也挡人，但站到台顶高度后不再挡
    }
    world.perch = perch;   // 每关会有一颗蛋放到台顶（见 game.js _spawnProgress）
  }

  // ---- 阳光海滩（吹开沙墙后）：椰树、遮阳伞、沙堡、浮木 ----
  const palmSpots = [[-14, 41.5], [12, 44], [-22, 44], [20, 41], [2, 49.5], [-28, 40.5]];
  for (const [x, z] of palmSpots) {
    place(scene, PROPS.palm(), x, z, Math.random() * 3);
    colC(x, z, 0.55);
  }
  for (const [x, z, ry] of [[-6, 43.5, 0.7], [9, 47.5, 2.4]]) {
    place(scene, PROPS.umbrella(), x, z, ry);
    colC(x, z, 0.35);
  }
  place(scene, PROPS.sandcastle(1.15), 16, 46.5, 0.5);
  colTop(16, 46.5, 1.15, 1.5);
  place(scene, PROPS.sandcastle(0.8), -18, 47, 2.2);
  colTop(-18, 47, 0.8, 1.1);
  for (const [x, z, ry] of [[5, 42.5, 0.8], [-12, 49.5, 1.9]]) {
    place(scene, PROPS.log(0.9), x, z, ry);
    colTop(x, z, 0.5, 0.7);
  }

  // 海滩地标：贝壳堆与小海星
  place(scene, PROPS.shells(), 8.2, 45.4, Math.random() * 3);

  // ---- 神秘森林（拨开荆棘后）：松树、灌木、蘑菇、萤火虫 ----
  const pineSpots = [
    [-41, -14], [-47, -15], [-52, -10], [-51, -4], [-41, -6], [-52, 6], [-42, 2],
    [-50, 14], [-41, 9], [-43, 16], [-51, 19], [-42, 22], [-49, 22], [-40, -12],
  ];
  for (const [x, z] of pineSpots) {
    place(scene, PROPS.pine(0.9 + Math.random() * 0.5), x, z, Math.random() * 3);
    colC(x, z, 0.55);
  }
  for (const [x, z] of [[-44, -2], [-48, 4], [-40, 6], [-46, 10], [-44, 19], [-40, -10]]) {
    place(scene, PROPS.bush(0.8 + Math.random() * 0.5), x, z, Math.random() * 3);
    colTop(x, z, 0.5, 0.9);
  }
  for (const [x, z, s] of [[-45, -6, 1], [-49, 9, 1.2], [-41, 13, 0.9], [-47, 17, 1.1], [-43, -12, 0.8]]) {
    place(scene, bigMushroom(s), x, z, Math.random() * 3);
    colTop(x, z, 0.28 * s, 0.9 * s);
  }
  place(scene, PROPS.log(1.1), -45.5, 4.5, 0.4);
  colTop(-45.5, 4.5, 0.55, 0.8);
  // 萤火虫（神秘森林专属小灯）
  {
    const n = 42;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -52 + Math.random() * 13;
      pos[i * 3 + 1] = 0.5 + Math.random() * 2;
      pos[i * 3 + 2] = -16 + Math.random() * 37;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fire = new THREE.Points(geo, new THREE.PointsMaterial({
      map: glowTexture('rgba(255,250,180,1)', 'rgba(255,240,120,0)'),
      color: 0xFFF2A0, size: 0.42, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(fire);
    world.anim.fireflies = fire;
  }

  // ---- 云朵（抬到高处：飘太低会挡在镜头和小人之间，把地面糊成一片白） ----
  world.anim.clouds = [];
  for (let i = 0; i < 8; i++) {
    const c = PROPS.cloud(1.1 + Math.random() * 0.8);
    const a = Math.PI * 2 * i / 8;
    c.position.set(Math.cos(a) * (24 + Math.random() * 16), 22 + Math.random() * 8, Math.sin(a) * (24 + Math.random() * 16));
    c.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 0.45; o.castShadow = false; } });
    scene.add(c);
    world.anim.clouds.push(c);
  }

  // ---- 蝴蝶（草甸花丛间） ----
  world.anim.butterflies = [];
  const bfCenters = [[0, 20], [-10, 25], [8, 12], [-16, 30], [12, 28], [-4, 8]];
  const bfColors = ['#FF8FB0', '#FFE24E', '#7EC4F2', '#B28FF5', '#FF9A5C', '#FF6B6B'];
  for (let i = 0; i < bfCenters.length; i++) {
    const bf = PROPS.butterfly(bfColors[i]);
    bf.position.set(bfCenters[i][0], 1, bfCenters[i][1]);
    bf.userData.center = bfCenters[i];
    bf.userData.phase = Math.random() * 9;
    scene.add(bf);
    world.anim.butterflies.push(bf);
  }

  // ---- 海鸥（海滩上空盘旋） ----
  world.anim.gulls = [];
  for (let i = 0; i < 3; i++) {
    const gu = PROPS.gull();
    gu.userData.center = [i * 6 - 6, 46];
    gu.userData.radius = 5 + i * 2;
    gu.userData.height = 6.5 + i * 1.3;
    gu.userData.phase = i * 2.1;
    scene.add(gu);
    world.anim.gulls.push(gu);
  }

  // ---- 摇曳的小草 ----
  world.anim.grass = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 40;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z) < 5.4) continue;
    if (x > 19 && x < 29 && z > 18 && z < 26) continue;
    const tuft = place(scene, PROPS.grassTuft(), x, z, Math.random() * 3);
    tuft.traverse(o => { if (o.isMesh) o.castShadow = false; });
    tuft.userData.phase = Math.random() * 9;
    world.anim.grass.push(tuft);
  }

  // ---- 花瓣飘落粒子 ----
  const petalCount = 220;
  const positions = new Float32Array(petalCount * 3);
  const speeds = new Float32Array(petalCount);
  for (let i = 0; i < petalCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 90;
    positions[i * 3 + 1] = Math.random() * 12 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    speeds[i] = 0.35 + Math.random() * 0.5;
  }
  const petalGeo = new THREE.BufferGeometry();
  petalGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const petals = new THREE.Points(petalGeo, new THREE.PointsMaterial({
    map: petalTexture(), size: 0.42, transparent: true, opacity: 0.85,
    depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(petals);
  world.anim.petals = { points: petals, speeds };

  // ---- 机关 1：金色沙墙（南边去海滩的路，用 wind 吹开） ----
  {
    const wall = new THREE.Group();
    const cols = [];
    for (let i = 0; i < 6; i++) {
      const d = PROPS.dune(3.1 + Math.random() * 0.5);
      const dx = -27.5 + i * 11, dz = 38.2 + (i % 2) * 0.5;
      d.position.set(dx, 0, dz);
      d.rotation.y = Math.random();
      wall.add(d);
      // 沙丘是个半径 5 米多的大球，比细条矩形碰撞体外鼓很多，
      // 不补圆形碰撞的话小人会走进沙球身体里，镜头也被整个埋进去
      cols.push(C.length); colC(dx + 0.4, dz, 4.3);
    }
    const castle = PROPS.sandcastle(1.25);
    castle.position.set(0, 1.4, 38.4);
    wall.add(castle);
    wall.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(wall);
    cols.push(C.length); colR(-34.5, 37.3, 34.5, 39.3);
    world.gates.sandWall = { group: wall, cols };
    // 沙墙两端的大岩石封口
    for (const [x, z] of [[37.5, 39.5], [-37.5, 39.5]]) {
      place(scene, PROPS.rock(2.4), x, z);
      colC(x, z, 2.2);
    }
  }

  // ---- 机关 2：荆棘丛（西边去森林的路，用 banana 拨开） ----
  {
    const wall = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const tn = PROPS.thorn(2.1 + Math.random() * 0.5);
      tn.position.set(-38, 0, 7.5 + i * 6.4);
      tn.rotation.y = Math.random() * 3;
      wall.add(tn);
      const tn2 = PROPS.thorn(2.1 + Math.random() * 0.5);
      tn2.position.set(-38, 0, -7.5 - i * 6.4);
      tn2.rotation.y = Math.random() * 3;
      wall.add(tn2);
    }
    wall.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(wall);
    colR(-39.2, 4.3, -36.8, 33.5);
    colR(-39.2, -33.5, -36.8, -4.3);
    world.gates.vines = { group: wall, cols: [C.length - 2, C.length - 1] };
    // 荆棘两端的大石头封口
    for (const [x, z] of [[-38.5, 36], [-38.5, -36]]) {
      place(scene, PROPS.rock(2.4), x, z);
      colC(x, z, 2.2);
    }
  }

  // ---- 群岛：只建当前册的海岛（选了哪一册就只出现哪一册的岛，小火车往返） ----
  world.islands = [];
  for (const isl of semIslands) {
    const { cx, cz, r, color, key } = isl;
    const grp = new THREE.Group();
    // 岛身：草顶 + 岩底
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 6, 26),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#9CCF8C'), 0.55), roughness: 0.95 }));
    top.position.y = -3;
    top.receiveShadow = true;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, r * 0.9, 26), M('#A8825B'));
    rock.rotation.x = Math.PI;
    rock.position.y = -6 - r * 0.45;
    grp.add(top, rock);
    // 岛边浪花圈
    const surf2 = new THREE.Mesh(new THREE.RingGeometry(r - 1.2, r + 0.7, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.4, depthWrite: false }));
    surf2.position.y = 0.03;
    grp.add(surf2);
    world.anim.islandSurf = world.anim.islandSurf || [];
    world.anim.islandSurf.push(surf2);
    // 岛上装饰
    const decoSpots = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 2 * i / 7 + (r % 3);
      decoSpots.push([cx + Math.cos(a) * (r - 3), cz + Math.sin(a) * (r - 3)]);
    }
    for (const [x, z] of decoSpots) {
      let obj = null;
      if (isl.style === 'pine') obj = PROPS.pine(0.9 + Math.random() * 0.4);
      else if (isl.style === 'house') obj = PROPS.bush(0.9 + Math.random() * 0.4);
      else obj = PROPS.tree(false);
      place(scene, obj, x, z, Math.random() * 3);
      colC(x, z, 0.55);
    }
    // 返回台：发光圆环 + 小信标
    const pad = new THREE.Group();
    const ringP = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xFFC94E, transparent: true, opacity: 0.65, depthWrite: false }));
    ringP.position.y = 0.04;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.28),
      M('#FFD34E', { emissive: '#FFC94E', ei: 0.7 }));
    beacon.position.y = 1.1;
    pad.add(ringP, beacon);
    pad.position.set(cx, 0, cz - 2.5);
    scene.add(pad);
    world.anim.islandPads = world.anim.islandPads || [];
    world.anim.islandPads.push({ ring: ringP, beacon });
    colC(cx, cz - 2.5, 0.8);
    grp.position.set(cx, 0, cz);
    scene.add(grp);
    world.islands.push({ ...isl, pad: { x: cx, z: cz - 2.5 } });
  }

  // ---- 小火车站（主岛，去群岛的入口） ----
  {
    const st = new THREE.Group();
    box(st, 2.6, 0.12, 1.4, '#C8A85C', 0, 0.3, 0);                 // 站台
    for (const sx of [-1, 1]) box(st, 0.1, 0.3, 1.4, '#A8863C', 1.3 * sx, 0.15, 0);
    for (const sx of [-1, 1]) cyl(st, 0.05, 0.06, 1.3, '#8A6844', 1.15 * sx, 0.85, -0.5);
    cone(st, 1.7, 0.6, '#D95F4B', 0, 1.75, -0.5, 0, Math.PI / 4, 0, 4); // 尖顶雨棚
    box(st, 1.4, 0.5, 0.08, '#FFFDF4', 0, 1.35, 0.55);             // 站牌
    badge(st, '🚂', 1.36, 0.16);
    st.traverse(o => { if (o.isMesh) o.castShadow = true; });
    st.position.set(-9, 0, 8);
    scene.add(st);
    colR(-10.2, 7.4, -7.8, 8.6, 0.8);
    world.gates.station = { group: st, pos: { x: -9, z: 9.6 } };
  }

  // ---- 装饰散布 ----
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 38;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z) < 5.2) continue; // 别掉河里
    if (x > 19 && x < 29 && z > 18 && z < 26) continue; // 别进谷仓
    if (z > 36) continue;                              // 沙滩保持干净
    if (x < -37) continue;                             // 森林自己布置过了
    const roll = Math.random();
    if (roll < 0.45) place(scene, PROPS.flowerpatch(), x, z);
    else if (roll < 0.7) { place(scene, PROPS.rock(0.6 + Math.random() * 0.8), x, z); colC(x, z, 0.4); }
    else if (roll < 0.85) place(scene, PROPS.flowerpatch(), x, z);
  }

  return world;
}

// 大蘑菇（森林装饰，无脸）
function bigMushroom(s = 1) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 10), M('#FFF0DC'));
  stem.position.y = 0.25; stem.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), M(['#E86A5A', '#B28FF5', '#FF9A3C'][Math.floor(Math.random() * 3)]));
  cap.position.y = 0.52; cap.scale.y = 0.62; cap.castShadow = true;
  g.add(stem, cap);
  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M('#FFF6EC'));
    const a = Math.PI * 2 * i / 4 + Math.random();
    dot.position.set(Math.cos(a) * 0.18, 0.62, Math.sin(a) * 0.18);
    dot.scale.y = 0.5;
    g.add(dot);
  }
  g.scale.setScalar(s);
  return g;
}
