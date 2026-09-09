// 农场岛屿世界搭建：地形、河流、果园、风车田、谷仓、菜园、天空岛
import * as THREE from 'three';
import { PROPS } from './models.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({
  color, roughness: o.rough ?? 0.9, metalness: 0,
  emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
  transparent: !!o.alpha, opacity: o.alpha ?? 1, side: o.side ?? THREE.FrontSide,
});

function place(scene, obj, x, z, ry = 0, y = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  obj.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(obj);
  return obj;
}

function groundTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#7FCB72';
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = ['#8FD88A', '#74C06E', '#93D98B', '#7ACB70'][i % 4];
    c.beginPath();
    c.ellipse(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 14, 4 + Math.random() * 9,
      Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

export function buildWorld(scene) {
  const world = { colliders: [], anim: {}, gates: {} };
  const C = world.colliders;
  const colC = (x, z, r) => C.push({ t: 'c', x, z, r });
  const colR = (x1, z1, x2, z2) => C.push({ t: 'r', x1, z1, x2, z2 });

  // ---- 天空与雾 ----
  const skyCv = document.createElement('canvas');
  skyCv.width = 2; skyCv.height = 256;
  {
    const c = skyCv.getContext('2d');
    const grad = c.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#7EC8F5');
    grad.addColorStop(0.55, '#BDE9FF');
    grad.addColorStop(0.8, '#FDF3D8');
    grad.addColorStop(1, '#FFE3EC');
    c.fillStyle = grad;
    c.fillRect(0, 0, 2, 256);
  }
  const skyTex = new THREE.CanvasTexture(skyCv);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xDFF3EC, 34, 80);

  // ---- 光照 ----
  scene.add(new THREE.HemisphereLight(0xFFF6E8, 0x9CC98F, 1.05));
  const sun = new THREE.DirectionalLight(0xFFF2DC, 2.1);
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---- 地面 ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);
  // 远处缓坡山丘（放在可游玩区之外，只当地平线剪影）
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * 2 * i / 8 + 0.4;
    const hill = new THREE.Mesh(new THREE.SphereGeometry(18 + (i % 3) * 4, 16, 12),
      M(i % 2 ? '#8FD88A' : '#7CC96F'));
    hill.position.set(Math.cos(a) * 60, -11, Math.sin(a) * 60);
    hill.scale.y = 0.7;
    scene.add(hill);
  }

  // ---- 河流 ----
  const waterGeo = new THREE.PlaneGeometry(100, 7, 60, 4).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, M('#6FC7E8', { rough: 0.25, alpha: 0.9 }));
  water.position.y = 0.04;
  scene.add(water);
  world.anim.water = water;
  // 河流阻挡在 game._collide 里特殊处理（boat 过河豁免），不进静态碰撞表

  // ---- 码头（boat 过河点） ----
  place(scene, PROPS.dock(), 0, 0);
  for (const z of [5.8, -5.8]) place(scene, PROPS.flowerpatch(), (Math.random() - 0.5) * 6, z * 0.9 + Math.sign(z) * 1.5);

  // ---- 栅栏（河岸两侧，留码头缺口，不可穿越） ----
  for (const bank of [1, -1]) {
    for (let x = -34; x <= 34; x += 2.1) {
      if (x > -4.5 && x < 4.5) continue;
      place(scene, PROPS.fence(), x, bank * 6.2);
    }
    colR(-35, bank * 6.2 - 0.3, -4.5, bank * 6.2 + 0.3);
    colR(4.5, bank * 6.2 - 0.3, 35, bank * 6.2 + 0.3);
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
  // 果园里散落的小苹果
  for (let i = 0; i < 6; i++) {
    const x = -30 + Math.random() * 22, z = -26 + Math.random() * 14;
    const g = new THREE.Group();
    const ap = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), M('#FF6B6B'));
    s.position.y = 0.14; s.castShadow = true; ap.add(s);
    place(scene, ap, x, z);
  }

  // ---- 风车田（含干草垛大门 + 树篱围栏） ----
  const hedgeMat = M('#5CA85C');
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

  // ---- 谷仓（黑黑的里面） ----
  const barn = place(scene, PROPS.barn(), 24, 22, Math.PI); // 门朝北（面向草甸）
  world.gates.darkness = barn.getObjectByName('darkness');
  // 谷仓墙体碰撞（门朝 -z，缺口 x∈[22.9,25.1]）
  colR(20.9, 19.3, 22.9, 19.7); colR(25.1, 19.3, 27.1, 19.7);
  colR(20.9, 24.3, 27.1, 24.7);
  colR(20.9, 19.3, 21.3, 24.7); colR(26.7, 19.3, 27.1, 24.7);
  // 谷仓内的暖光（点亮后才加）
  const barnLight = new THREE.PointLight(0xFFDFA8, 0, 12, 1.6);
  barnLight.position.set(24, 2.4, 22);
  scene.add(barnLight);
  world.gates.barnLight = barnLight;

  // ---- 南瓜地（light 蛋旁边） ----
  for (const [x, z, s] of [[7.5, 30.5, 1.2], [10.5, 32.5, 1], [6.5, 33, 0.8]]) {
    const p = PROPS.pumpkin();
    p.scale.setScalar(s);
    place(scene, p, x, z);
    colC(x, z, 0.45 * s);
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

  // ---- 云朵 ----
  world.anim.clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = PROPS.cloud(1.4 + Math.random());
    const a = Math.PI * 2 * i / 7;
    c.position.set(Math.cos(a) * (20 + Math.random() * 12), 9 + Math.random() * 4, Math.sin(a) * (20 + Math.random() * 12));
    scene.add(c);
    world.anim.clouds.push(c);
  }

  // ---- 花瓣飘落粒子 ----
  const petalCount = 220;
  const positions = new Float32Array(petalCount * 3);
  const speeds = new Float32Array(petalCount);
  for (let i = 0; i < petalCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 70;
    positions[i * 3 + 1] = Math.random() * 12 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
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

  // ---- 装饰散布 ----
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 26;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(z) < 5) continue; // 别掉河里
    if (x > 20 && x < 28 && z > 19 && z < 25) continue; // 别进谷仓
    const roll = Math.random();
    if (roll < 0.45) place(scene, PROPS.flowerpatch(), x, z);
    else if (roll < 0.7) { place(scene, PROPS.rock(0.6 + Math.random() * 0.8), x, z); colC(x, z, 0.4); }
    else if (roll < 0.85) place(scene, PROPS.flowerpatch(), x, z);
  }

  return world;
}
