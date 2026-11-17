// LUMEN DRIFT — every pixel. Canvas 2D with additive glow: a deep-indigo night, a
// drifting starfield, neon shards, and screens for title, play, victory and defeat.
// The HUD is drawn big and plain on purpose: hull, wave, score and combo must read
// at a glance, in the game and in a screenshot shrunk to a thumbnail alike.

import { COLOURS, FIELD, FOE, PICKUP, SHIP, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, COLOURS.bgTop);
  gradient.addColorStop(1, COLOURS.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Two slow nebula washes, fixed to the seed's sky.
  const nebulae = [
    { x: 260, y: 170, r: 340, colour: 'rgba(64, 44, 160, 0.20)' },
    { x: 1030, y: 610, r: 380, colour: 'rgba(14, 92, 120, 0.16)' },
    { x: 900, y: 120, r: 240, colour: 'rgba(150, 40, 110, 0.10)' },
  ];
  for (const n of nebulae) {
    const wash = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    wash.addColorStop(0, n.colour);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Starfield: nearer stars drift faster and twinkle.
  for (const star of world.stars) {
    const drift = (world.time * 6 * star.depth) % FIELD.width;
    const x = (star.x + drift) % FIELD.width;
    const alpha = 0.35 + 0.4 * star.depth + 0.25 * Math.sin(world.time * 1.7 + star.twinkle);
    ctx.globalAlpha = Math.max(0.08, Math.min(1, alpha));
    ctx.fillStyle = COLOURS.star;
    ctx.beginPath();
    ctx.arc(x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The arena rim.
  ctx.strokeStyle = 'rgba(120, 140, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD.wall - 8, FIELD.wall - 8, FIELD.width - (FIELD.wall - 8) * 2, FIELD.height - (FIELD.wall - 8) * 2);
}

function drawPickup(ctx, world, pickup) {
  const pulse = 1 + 0.18 * Math.sin(world.time * 5 + pickup.x);
  const fading = pickup.age > PICKUP.lifetime - 2.5 && Math.sin(world.time * 14) > 0;
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = fading ? 0.35 : 1;
  if (pickup.kind === 'core') {
    ctx.shadowColor = COLOURS.core;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLOURS.core;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff6cf';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.shadowColor = COLOURS.heart;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLOURS.heart;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-11, -2, -7, -10, 0, -4.5);
    ctx.bezierCurveTo(7, -10, 11, -2, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawFoe(ctx, world, foe) {
  const spec = FOE[foe.kind];
  ctx.save();
  ctx.translate(foe.x, foe.y);
  ctx.shadowColor = spec.colour;
  ctx.shadowBlur = 16;
  ctx.fillStyle = spec.colour;
  ctx.strokeStyle = spec.colour;
  const spin = world.time * 1.4 + foe.phase;
  if (foe.kind === 'shard') {
    ctx.rotate(spin);
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const a2 = a + Math.PI / 4;
      ctx.lineTo(Math.cos(a) * foe.radius, Math.sin(a) * foe.radius);
      ctx.lineTo(Math.cos(a2) * foe.radius * 0.45, Math.sin(a2) * foe.radius * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  } else if (foe.kind === 'weaver') {
    ctx.rotate(Math.atan2(foe.vy, foe.vx));
    ctx.beginPath();
    ctx.moveTo(foe.radius + 3, 0);
    ctx.lineTo(-foe.radius, -foe.radius * 0.8);
    ctx.lineTo(-foe.radius * 0.4, 0);
    ctx.lineTo(-foe.radius, foe.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else {
    // bulwark: a heavy hexagon with a rotating broken ring
    ctx.rotate(spin * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * foe.radius, Math.sin(a) * foe.radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const a = spin * 0.9 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, foe.radius + 7, a, a + 0.8);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0e24';
  ctx.beginPath();
  ctx.arc(0, 0, foe.radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, foe.radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  if (foe.flash > 0) {
    ctx.globalAlpha = Math.min(1, foe.flash * 9);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, foe.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // A bulwark shows its remaining armour as a bar.
  if (foe.kind === 'bulwark' && foe.hp < foe.maxHp) {
    const w = foe.radius * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(foe.x - foe.radius, foe.y - foe.radius - 14, w, 5);
    ctx.fillStyle = spec.colour;
    ctx.fillRect(foe.x - foe.radius, foe.y - foe.radius - 14, w * (foe.hp / foe.maxHp), 5);
  }
}

function drawShip(ctx, world) {
  const ship = world.ship;
  if (world.outcome === 'over') return; // the ship is gone; only sparks remain
  ctx.save();
  ctx.translate(ship.x, ship.y);
  // Blink while the mercy invulnerability lasts.
  if (ship.hurtTimer > 0 && Math.sin(world.time * 34) > 0.2) ctx.globalAlpha = 0.35;

  // Aim guide: a short dotted ray toward the pointer.
  ctx.rotate(ship.angle);
  ctx.strokeStyle = 'rgba(95, 242, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([2, 9]);
  ctx.beginPath();
  ctx.moveTo(SHIP.radius + 8, 0);
  ctx.lineTo(SHIP.radius + 30, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  // Engine flame, longer while thrusting or dashing.
  const speed = Math.hypot(ship.vx, ship.vy);
  const flame = 8 + speed * 0.05 + Math.sin(world.time * 41) * 2.5;
  ctx.fillStyle = ship.dashTimer > 0 ? '#aefcff' : '#ff9a3d';
  ctx.beginPath();
  ctx.moveTo(-SHIP.radius + 2, -4.5);
  ctx.lineTo(-SHIP.radius - flame, 0);
  ctx.lineTo(-SHIP.radius + 2, 4.5);
  ctx.closePath();
  ctx.fill();

  // Hull: a sleek dart with a bright cockpit.
  ctx.shadowColor = COLOURS.ship;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLOURS.ship;
  ctx.beginPath();
  ctx.moveTo(SHIP.radius + 6, 0);
  ctx.lineTo(-SHIP.radius + 3, -SHIP.radius);
  ctx.lineTo(-SHIP.radius - 3, -4);
  ctx.lineTo(-SHIP.radius - 3, 4);
  ctx.lineTo(-SHIP.radius + 3, SHIP.radius);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLOURS.shipCore;
  ctx.beginPath();
  ctx.arc(3, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWorld(ctx, world) {
  for (const pickup of world.pickups) drawPickup(ctx, world, pickup);
  for (const foe of world.foes) drawFoe(ctx, world, foe);

  // Bullets as bright comets.
  ctx.save();
  ctx.shadowColor = COLOURS.bullet;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLOURS.bullet;
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, SHIP.bulletRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawShip(ctx, world);

  // Particles.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating score text.
  ctx.save();
  ctx.font = `700 17px ${FONT}`;
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, 1 - t.age / t.life);
    ctx.fillStyle = t.colour;
    ctx.fillText(t.label, t.x, t.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  ctx.save();
  ctx.font = `700 15px ${FONT}`;
  ctx.textBaseline = 'middle';

  // Hull bar, top left.
  const hullRatio = Math.max(0, world.ship.hull / SHIP.hull);
  ctx.fillStyle = COLOURS.dim;
  ctx.textAlign = 'left';
  ctx.fillText('HULL', 34, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, 84, 27, 190, 17, 6);
  ctx.fill();
  ctx.fillStyle = hullRatio > 0.35 ? '#52ffa8' : COLOURS.danger;
  if (hullRatio > 0) {
    roundRect(ctx, 84, 27, 190 * hullRatio, 17, 6);
    ctx.fill();
  }
  ctx.fillStyle = COLOURS.text;
  ctx.fillText(`${Math.ceil(world.ship.hull)}`, 284, 36);

  // Dash pip under the hull bar.
  const dashReady = world.ship.dashCooldown <= 0;
  ctx.fillStyle = COLOURS.dim;
  ctx.fillText('DASH', 34, 62);
  ctx.fillStyle = dashReady ? COLOURS.ship : 'rgba(255,255,255,0.16)';
  roundRect(ctx, 84, 54, 90, 10, 5);
  ctx.fill();
  if (!dashReady) {
    ctx.fillStyle = 'rgba(10, 12, 30, 0.55)';
    const spent = 1 - world.ship.dashCooldown / SHIP.dashCooldown;
    roundRect(ctx, 84, 54, 90 * spent, 10, 5);
    ctx.fill();
  }

  // Wave, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOURS.text;
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText(`WAVE ${world.waveDisplay} / ${WAVES.length}`, FIELD.width / 2, 38);
  ctx.font = `600 14px ${FONT}`;
  ctx.fillStyle = COLOURS.dim;
  const remaining = world.foes.length + world.spawnQueue.length;
  ctx.fillText(remaining > 0 ? `${remaining} shards remain` : 'wave clear', FIELD.width / 2, 63);

  // Score, combo and cores, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOURS.dim;
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText('SCORE', FIELD.width - 150, 36);
  ctx.fillStyle = COLOURS.text;
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText(`${world.score.toLocaleString('en-US')}`, FIELD.width - 34, 36);
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = world.multiplier > 1 ? COLOURS.core : COLOURS.dim;
  ctx.fillText(`COMBO x${world.multiplier}`, FIELD.width - 34, 63);
  ctx.fillStyle = COLOURS.core;
  ctx.fillText(`◆ ${world.cores}`, FIELD.width - 120, 63);

  // Controls reminder, bottom centre, quiet.
  ctx.textAlign = 'center';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = 'rgba(139, 147, 184, 0.8)';
  ctx.fillText('WASD move · mouse aim · hold click to fire · SHIFT dash · M mute', FIELD.width / 2, FIELD.height - 16);
  ctx.restore();

  // Wave banner during the intermission.
  if (world.intermission > 0.25 && !world.outcome) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, world.intermission);
    ctx.fillStyle = COLOURS.dawn;
    ctx.font = `800 44px ${FONT}`;
    ctx.shadowColor = COLOURS.dawn;
    ctx.shadowBlur = 24;
    ctx.fillText(`WAVE ${world.waveDisplay}`, FIELD.width / 2, FIELD.height / 2 - 90);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLOURS.text;
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(world.wave === 0 ? 'the shards are coming — hold the light' : 'the night deepens', FIELD.width / 2, FIELD.height / 2 - 52);
    ctx.restore();
  }
}

function panel(ctx, title, titleColour, lines, prompt) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 18, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColour;
  ctx.font = `900 76px ${FONT}`;
  ctx.shadowColor = titleColour;
  ctx.shadowBlur = 34;
  ctx.fillText(title, FIELD.width / 2, 268);
  ctx.shadowBlur = 0;
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = COLOURS.text;
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 348 + i * 32));
  if (prompt) {
    const blink = Math.sin(performance.now() / 380) > -0.4;
    ctx.globalAlpha = blink ? 1 : 0.25;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = COLOURS.core;
    ctx.fillText(prompt, FIELD.width / 2, 348 + lines.length * 32 + 44);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawTitle(ctx, world, best) {
  drawWorld(ctx, world);
  panel(ctx, 'LUMEN DRIFT', COLOURS.ship, [
    'Pilot the last light-ship. Shatter the void shards, harvest their lumen,',
    `and survive all ${WAVES.length} waves to ignite the dawn.`,
    '',
    'WASD / arrows — move      Mouse — aim      Hold click — fire',
    'SHIFT / SPACE — dash (untouchable)      M — mute',
    best > 0 ? `Best score so far: ${best.toLocaleString('en-US')}` : '',
  ], 'CLICK OR PRESS ENTER TO START');
}

function drawOver(ctx, world, best) {
  drawWorld(ctx, world);
  panel(ctx, 'THE LIGHT FADES', COLOURS.danger, [
    `You held the night until wave ${world.waveDisplay} of ${WAVES.length}.`,
    '',
    `SCORE  ${world.score.toLocaleString('en-US')}      BEST  ${Math.max(best, world.score).toLocaleString('en-US')}`,
    `Shards shattered: ${world.kills}      Lumen harvested: ${world.cores}`,
  ], 'PRESS R OR CLICK TO DRIFT AGAIN');
}

function drawWin(ctx, world, best) {
  drawWorld(ctx, world);
  panel(ctx, 'DAWN IGNITED', COLOURS.dawn, [
    `All ${WAVES.length} waves cleared — the sun rises on a quiet field.`,
    '',
    `SCORE  ${world.score.toLocaleString('en-US')}      BEST  ${Math.max(best, world.score).toLocaleString('en-US')}`,
    `Shards shattered: ${world.kills}      Lumen harvested: ${world.cores}      Hull left: ${Math.ceil(world.ship.hull)}`,
  ], 'PRESS R OR CLICK TO DRIFT AGAIN');
}

/**
 * Draw one frame. `screen` is one of the SCREEN_* constants; `best` is the best
 * score the shell remembers between runs.
 */
export function drawScene(ctx, world, screen, best) {
  ctx.save();
  if (world.shake > 0.2) {
    const dx = Math.sin(world.time * 71) * world.shake * 0.5;
    const dy = Math.cos(world.time * 83) * world.shake * 0.5;
    ctx.translate(dx, dy);
  }
  drawBackground(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  else if (screen === SCREEN_OVER) drawOver(ctx, world, best);
  else if (screen === SCREEN_WIN) drawWin(ctx, world, best);
  else {
    drawWorld(ctx, world);
    drawHud(ctx, world);
  }
  ctx.restore();

  // Vignette to seat the scene.
  const vignette = ctx.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}
