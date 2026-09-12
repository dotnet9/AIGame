const fs = require('fs');
const p = 'd:/github/apps/AIGame/game/js/game.js';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
const rep = (a, b) => { if (s.includes(a)) { s = s.split(a).join(b); n++; } else console.log('MISS: ' + a.slice(0, 40)); };

// 1) 键盘缩放
rep(`      if (e.code === 'KeyE') this._interact();`,
`      if (e.code === 'KeyE') this._interact();
      // 键盘缩放视角：+/= 拉近，-/_ 拉远（滚轮之外的第二种手感）
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.camDistTarget = THREE.MathUtils.clamp(this.camDistTarget - 2.2, 2.8, 60);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.camDistTarget = THREE.MathUtils.clamp(this.camDistTarget + 2.2, 2.8, 60);`);

// 2) 每帧平滑趋近缩放目标（放在 _updateCamera 轨道计算前）
rep(`    if (this.cinematic) return;
    const target = this.player.position;`,
`    if (this.cinematic) return;
    this.camDist += (this.camDistTarget - this.camDist) * Math.min(1, dt * 7);   // 缩放丝滑过渡
    const target = this.player.position;`);

// 3) 点一下走一步：移动目标最多距玩家 2.2 米（孩子要自己一步步探索，不许一键瞬达）
rep(`    this.moveTarget = { x: pt.x, z: pt.z };
    this.moveMarker.position.set(pt.x, groundY + 0.06, pt.z);
    this.moveMarker.visible = true;
  }`,
`    // 点一下走一步：目标点最远只取距玩家 2.2 米处，走完这步再点下一步（孩子自己探索）
    const pp = this.player.position;
    const ddx = pt.x - pp.x, ddz = pt.z - pp.z;
    const dd = Math.hypot(ddx, ddz);
    const STEP = 2.2;
    if (dd > STEP) { pt.x = pp.x + ddx / dd * STEP; pt.z = pp.z + ddz / dd * STEP; }
    this.moveTarget = { x: pt.x, z: pt.z };
    this.moveMarker.position.set(pt.x, groundY + 0.06, pt.z);
    this.moveMarker.visible = true;
  }`);

// 4) 移除按住左键持续跟随（点一次走一步后，按住跟随就矛盾了）
rep(`    this.canvas.addEventListener('pointerdown', e => {
      if (this.lockInput) return;   // 通关卡/演出期间不响应世界交互
      if (e.pointerType === 'touch') {`,
`    this.canvas.addEventListener('pointerdown', e => {
      if (this.lockInput) return;   // 通关卡/演出期间不响应世界交互
      if (e.pointerType === 'touch') { // eslint-disable-line`);
rep(`      else if (e.button === 0) { this._click(e); this._holdWalk = e.pointerId; }   // 按住不放=持续走向指针`,
`      else if (e.button === 0) { this._click(e); }   // 点一下走一步（不再按住持续跟随）`);
rep(`      // 按住左键拖动 = 持续走向指针指着的地面（点哪走哪的连续版）；点了蛋/词宠的寻路不抢
      if (this._holdWalk === e.pointerId && !this.moveThenEgg && (e.buttons & 1) === 1 && !ui.challengeOpen()) {
        this._setMoveTarget(e);
      }
`, '');
rep(`  const endPointer = e => {
      if (this._holdWalk === e.pointerId) this._holdWalk = null;
`, `  const endPointer = e => {
`);

fs.writeFileSync(p, s);
console.log('done, patched ' + n);
