// LUMEN DRIFT — the simulation. One fixed-step world: a light-ship, three kinds of void
// shard, bullets, pickups, particles and floating score text, advanced only by step().
// It knows nothing about the DOM or sound: step() returns an event bitmask and main.js
// turns events into noise. Given the same seed and the same controls, a run replays
// exactly — the screenshot scenes and any practised route depend on that.

import { COMBO, FIELD, FOE, PICKUP, SHIP, WAVES } from './config.js';
import { makeRandom, range } from './random.js';

export const EVENT_SHOOT = 1;
export const EVENT_DASH = 2;
export const EVENT_FOE_DOWN = 4;
export const EVENT_PICKUP = 8;
export const EVENT_HEART = 16;
export const EVENT_HURT = 32;
export const EVENT_WAVE = 64;
export const EVENT_WIN = 128;
export const EVENT_OVER = 256;

const TAU = Math.PI * 2;

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export class World {
  constructor(seed) {
    this.rand = makeRandom(seed);
    this.reset(seed);
  }

  reset(seed) {
    if (seed !== undefined) this.rand = makeRandom(seed);
    const rand = this.rand;
    this.time = 0;
    this.outcome = null; // null while playing, then 'won' or 'over'
    this.ship = {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hull: SHIP.hull,
      fireTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      hurtTimer: 0,
    };
    this.bullets = [];
    this.foes = [];
    this.pickups = [];
    this.particles = [];
    this.texts = [];
    this.score = 0;
    this.kills = 0;
    this.cores = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.wave = 0; // index into WAVES; startWave raises it to 1 for display
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.intermission = 1.2; // breath before wave 1
    this.shake = 0;
    // A fixed starfield per seed: three depths of drift.
    this.stars = [];
    for (let i = 0; i < 150; i += 1) {
      this.stars.push({
        x: rand() * FIELD.width,
        y: rand() * FIELD.height,
        depth: 0.25 + rand() * 0.75,
        size: 0.6 + rand() * 1.7,
        twinkle: rand() * TAU,
      });
    }
    this.startWave();
  }

  get multiplier() {
    return Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.comboCount / 5));
  }

  get waveDisplay() {
    return Math.min(this.wave + 1, WAVES.length);
  }

  startWave() {
    const spec = WAVES[this.wave];
    const queue = [];
    for (let i = 0; i < spec.shards; i += 1) queue.push('shard');
    for (let i = 0; i < spec.weavers; i += 1) queue.push('weaver');
    for (let i = 0; i < spec.bulwarks; i += 1) queue.push('bulwark');
    // Shuffle the queue so kinds arrive mixed, not in blocks.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rand() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    this.spawnQueue = queue;
    this.spawnTimer = 0.4;
  }

  spawnFoe() {
    const kind = this.spawnQueue.pop();
    if (!kind) return;
    const spec = FOE[kind];
    // Enter from a random edge point, never on top of the ship.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries += 1) {
      const side = Math.floor(this.rand() * 4);
      if (side === 0) { x = range(this.rand, 40, FIELD.width - 40); y = 34; }
      if (side === 1) { x = range(this.rand, 40, FIELD.width - 40); y = FIELD.height - 34; }
      if (side === 2) { x = 34; y = range(this.rand, 40, FIELD.height - 40); }
      if (side === 3) { x = FIELD.width - 34; y = range(this.rand, 40, FIELD.height - 40); }
      if (distance(x, y, this.ship.x, this.ship.y) > 280) break;
    }
    this.foes.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: spec.hp,
      maxHp: spec.hp,
      radius: spec.radius,
      phase: this.rand() * TAU,
      flash: 0,
    });
    this.burst(x, y, spec.colour, 6, 90);
  }

  burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rand() * TAU;
      const v = range(this.rand, speed * 0.25, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: range(this.rand, 0.3, 0.75),
        age: 0,
        size: range(this.rand, 1.5, 3.6),
        colour,
      });
    }
  }

  addText(x, y, label, colour) {
    this.texts.push({ x, y, label, colour, age: 0, life: 0.9 });
  }

  bumpCombo() {
    this.comboCount += 1;
    this.comboTimer = COMBO.window;
  }

  dropPickups(foe) {
    if (this.rand() < PICKUP.dropHeartChance) {
      this.pickups.push({ kind: 'heart', x: foe.x, y: foe.y, vx: 0, vy: 0, age: 0 });
      return;
    }
    for (let i = 0; i < PICKUP.coresPerFoe; i += 1) {
      const angle = this.rand() * TAU;
      const v = range(this.rand, 30, 110);
      this.pickups.push({
        kind: 'core',
        x: foe.x,
        y: foe.y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        age: 0,
      });
    }
  }

  killFoe(index, events, reward = true) {
    const foe = this.foes[index];
    const spec = FOE[foe.kind];
    if (reward) {
      const gained = spec.score * this.multiplier;
      this.score += gained;
      this.kills += 1;
      this.bumpCombo();
      this.addText(foe.x, foe.y - foe.radius, `+${gained}`, spec.colour);
    }
    this.burst(foe.x, foe.y, spec.colour, foe.kind === 'bulwark' ? 30 : 14, 240);
    this.shake = Math.min(14, this.shake + (foe.kind === 'bulwark' ? 7 : 3));
    this.dropPickups(foe);
    this.foes.splice(index, 1);
    return events | EVENT_FOE_DOWN;
  }

  /**
   * Advance the world by dt seconds under `control`
   * ({ move:{x,y}, aim:{x,y}, fire:boolean, dash:boolean }).
   * Returns the event bitmask of things worth making noise about.
   */
  step(dt, control) {
    let events = 0;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 26);
    this.updateParticles(dt);
    this.updateTexts(dt);
    if (this.outcome) return events;

    const ship = this.ship;
    ship.fireTimer -= dt;
    ship.dashCooldown -= dt;
    ship.hurtTimer -= dt;
    if (ship.dashTimer > 0) ship.dashTimer -= dt;

    // --- spawning and wave flow
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0 && this.spawnQueue.length === 0 && this.foes.length === 0) {
        // startWave already queued this wave at reset / wave end.
      }
    } else if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.32, 0.85 - this.wave * 0.06);
        this.spawnFoe();
      }
    } else if (this.foes.length === 0) {
      // Wave cleared.
      if (this.wave >= WAVES.length - 1) {
        this.outcome = 'won';
        this.burst(ship.x, ship.y, '#ffe066', 60, 320);
        return events | EVENT_WIN;
      }
      this.wave += 1;
      this.startWave();
      this.intermission = 1.6;
      events |= EVENT_WAVE;
    }

    // --- ship movement: thrust, damping, dash
    const move = control.move;
    if (control.dash && ship.dashCooldown <= 0 && ship.dashTimer <= 0) {
      const dir = move.x !== 0 || move.y !== 0 ? move : { x: Math.cos(ship.angle), y: Math.sin(ship.angle) };
      ship.vx = dir.x * SHIP.dashSpeed;
      ship.vy = dir.y * SHIP.dashSpeed;
      ship.dashTimer = SHIP.dashTime;
      ship.dashCooldown = SHIP.dashCooldown;
      events |= EVENT_DASH;
    }
    if (ship.dashTimer <= 0) {
      ship.vx += move.x * SHIP.accel * dt;
      ship.vy += move.y * SHIP.accel * dt;
      const damp = Math.exp(-SHIP.friction * dt);
      ship.vx *= damp;
      ship.vy *= damp;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > SHIP.speed) {
        ship.vx = (ship.vx / speed) * SHIP.speed;
        ship.vy = (ship.vy / speed) * SHIP.speed;
      }
    } else {
      // Dash trail sparks.
      this.particles.push({
        x: ship.x, y: ship.y,
        vx: -ship.vx * 0.12, vy: -ship.vy * 0.12,
        life: 0.3, age: 0, size: 3, colour: '#5ff2ff',
      });
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.x = Math.min(FIELD.width - FIELD.wall, Math.max(FIELD.wall, ship.x));
    ship.y = Math.min(FIELD.height - FIELD.wall, Math.max(FIELD.wall, ship.y));
    ship.angle = Math.atan2(control.aim.y - ship.y, control.aim.x - ship.x);

    // --- firing
    if (control.fire && ship.fireTimer <= 0) {
      ship.fireTimer = 1 / SHIP.fireRate;
      const nx = ship.x + Math.cos(ship.angle) * (SHIP.radius + 6);
      const ny = ship.y + Math.sin(ship.angle) * (SHIP.radius + 6);
      this.bullets.push({
        x: nx, y: ny,
        vx: Math.cos(ship.angle) * SHIP.bulletSpeed,
        vy: Math.sin(ship.angle) * SHIP.bulletSpeed,
        age: 0,
      });
      events |= EVENT_SHOOT;
    }

    events = this.updateBullets(dt, events);
    events = this.updateFoes(dt, events);
    events = this.updatePickups(dt, events);

    // --- combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    return events;
  }

  updateBullets(dt, events) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.age += dt;
      let dead = bullet.age > 1.4 || bullet.x < 4 || bullet.y < 4 ||
        bullet.x > FIELD.width - 4 || bullet.y > FIELD.height - 4;
      if (!dead) {
        for (let j = this.foes.length - 1; j >= 0; j -= 1) {
          const foe = this.foes[j];
          if (distance(bullet.x, bullet.y, foe.x, foe.y) < foe.radius + SHIP.bulletRadius) {
            foe.hp -= SHIP.bulletDamage;
            foe.flash = 0.09;
            this.burst(bullet.x, bullet.y, '#aefcff', 3, 130);
            dead = true;
            if (foe.hp <= 0) events = this.killFoe(j, events);
            break;
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
    return events;
  }

  updateFoes(dt, events) {
    const ship = this.ship;
    for (let i = this.foes.length - 1; i >= 0; i -= 1) {
      const foe = this.foes[i];
      const spec = FOE[foe.kind];
      foe.flash = Math.max(0, foe.flash - dt);
      const toShip = Math.atan2(ship.y - foe.y, ship.x - foe.x);
      let dirX = Math.cos(toShip);
      let dirY = Math.sin(toShip);
      if (foe.kind === 'weaver') {
        const sway = Math.sin(this.time * 3.1 + foe.phase) * 0.85;
        const px = -dirY * sway;
        const py = dirX * sway;
        dirX += px;
        dirY += py;
        const len = Math.hypot(dirX, dirY) || 1;
        dirX /= len;
        dirY /= len;
      }
      // Gentle separation so foes do not stack into one blob.
      for (let j = 0; j < this.foes.length; j += 1) {
        if (j === i) continue;
        const other = this.foes[j];
        const d = distance(foe.x, foe.y, other.x, other.y);
        const min = foe.radius + other.radius + 4;
        if (d > 0 && d < min) {
          dirX += ((foe.x - other.x) / d) * 0.6;
          dirY += ((foe.y - other.y) / d) * 0.6;
        }
      }
      const speed = spec.speed * (1 + this.wave * 0.05);
      foe.vx += (dirX * speed - foe.vx) * Math.min(1, dt * 3);
      foe.vy += (dirY * speed - foe.vy) * Math.min(1, dt * 3);
      foe.x += foe.vx * dt;
      foe.y += foe.vy * dt;

      // --- collision with the ship
      const d = distance(foe.x, foe.y, ship.x, ship.y);
      if (d < foe.radius + SHIP.radius) {
        const invulnerable = ship.dashTimer > 0 || ship.hurtTimer > 0;
        if (!invulnerable) {
          ship.hull -= spec.damage;
          ship.hurtTimer = SHIP.hurtCooldown;
          this.shake = Math.min(18, this.shake + 8);
          this.burst(ship.x, ship.y, '#ff5d7a', 16, 260);
          events |= EVENT_HURT;
          if (foe.kind === 'bulwark') {
            foe.hp -= 3;
            foe.x -= dirX * 46;
            foe.y -= dirY * 46;
            if (foe.hp <= 0) events = this.killFoe(i, events, false);
          } else {
            // A ram kill wrecks the shard but earns no score or combo.
            events = this.killFoe(i, events, false);
          }
          if (ship.hull <= 0) {
            ship.hull = 0;
            this.outcome = 'over';
            this.burst(ship.x, ship.y, '#5ff2ff', 70, 380);
            this.burst(ship.x, ship.y, '#ffe066', 40, 260);
            events |= EVENT_OVER;
          }
        }
      }
    }
    return events;
  }

  updatePickups(dt, events) {
    const ship = this.ship;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i];
      pickup.age += dt;
      pickup.vx *= Math.exp(-2.4 * dt);
      pickup.vy *= Math.exp(-2.4 * dt);
      const d = distance(pickup.x, pickup.y, ship.x, ship.y);
      if (d < PICKUP.magnetRadius) {
        const pull = 340 * (1 - d / PICKUP.magnetRadius) + 60;
        pickup.vx += ((ship.x - pickup.x) / (d || 1)) * pull * dt * 4;
        pickup.vy += ((ship.y - pickup.y) / (d || 1)) * pull * dt * 4;
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (d < SHIP.radius + 14) {
        if (pickup.kind === 'core') {
          const gained = PICKUP.coreValue * this.multiplier;
          this.score += gained;
          this.cores += 1;
          this.bumpCombo();
          events |= EVENT_PICKUP;
        } else {
          ship.hull = Math.min(SHIP.hull, ship.hull + PICKUP.heartHeal);
          this.addText(ship.x, ship.y - 26, `+${PICKUP.heartHeal} HULL`, '#ff7aa8');
          events |= EVENT_HEART;
        }
        this.pickups.splice(i, 1);
      } else if (pickup.age > PICKUP.lifetime) {
        this.pickups.splice(i, 1);
      }
    }
    return events;
  }


  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-1.6 * dt);
      p.vy *= Math.exp(-1.6 * dt);
      if (p.age >= p.life) this.particles.splice(i, 1);
    }
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= 34 * dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  }
}
