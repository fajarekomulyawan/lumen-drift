// The screenshot scenes behind ?shot=start|play|over|win. Each scene replays the real
// game from a fresh world with a synthetic pilot at the controls, so a frame is what
// actual play looks like and the same seed always deals the same frame. The pilots
// differ in skill, not in rules: the play pilot kites and aims with lead, the over
// pilot charges the nearest shard and never dashes, the win pilot plays the whole
// night out with the strongest kiting the controls allow.

import { FIELD, SHIP, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function nearest(list, x, y, filter) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    if (filter && !filter(item)) continue;
    const d = Math.hypot(item.x - x, item.y - y);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best ? { item: best, distance: bestD } : null;
}

/** Shared senses: where to aim (with lead) and what is about to hurt. */
function senses(world) {
  const ship = world.ship;
  const foe = nearest(world.foes, ship.x, ship.y);
  let aim = { x: ship.x + Math.cos(ship.angle) * 100, y: ship.y + Math.sin(ship.angle) * 100 };
  if (foe) {
    const flight = foe.distance / SHIP.bulletSpeed;
    aim = {
      x: foe.item.x + foe.item.vx * flight,
      y: foe.item.y + foe.item.vy * flight,
    };
  }
  return { foe, aim };
}

/** Kiting pilot: keeps its distance, circles the nearest foe, gathers cores when safe. */
function kitePilot(world, gatherCores) {
  const ship = world.ship;
  const { foe, aim } = senses(world);
  let mx = 0;
  let my = 0;
  if (foe) {
    const dx = ship.x - foe.item.x;
    const dy = ship.y - foe.item.y;
    const d = Math.max(1, foe.distance);
    const keep = foe.item.kind === 'bulwark' ? 300 : 215;
    const radial = (d - keep) / keep; // negative: too close, back away
    mx += (dx / d) * -radial * 1.6;
    my += (dy / d) * -radial * 1.6;
    // Circle the foe so shots keep coming from a moving ship.
    mx += (-dy / d) * 0.55;
    my += (dx / d) * 0.55;
  }
  // Flee anything else that wanders close.
  for (const other of world.foes) {
    const d = Math.hypot(ship.x - other.x, ship.y - other.y);
    if (d < 130 && d > 0) {
      mx += ((ship.x - other.x) / d) * (1 - d / 130) * 2.2;
      my += ((ship.y - other.y) / d) * (1 - d / 130) * 2.2;
    }
  }
  if (gatherCores) {
    const core = nearest(world.pickups, ship.x, ship.y, (p) => p.kind === 'core');
    const heart = nearest(world.pickups, ship.x, ship.y, (p) => p.kind === 'heart');
    const target = ship.hull < 62 && heart ? heart : core;
    if (target && (!foe || foe.distance > 190)) {
      mx += (target.item.x - ship.x) / Math.max(1, target.distance);
      my += (target.item.y - ship.y) / Math.max(1, target.distance);
    }
  }
  // Stay off the walls: lean back toward the middle when near an edge.
  const margin = 150;
  if (ship.x < margin) mx += (margin - ship.x) / margin;
  if (ship.x > FIELD.width - margin) mx -= (ship.x - (FIELD.width - margin)) / margin;
  if (ship.y < margin) my += (margin - ship.y) / margin;
  if (ship.y > FIELD.height - margin) my -= (ship.y - (FIELD.height - margin)) / margin;
  const len = Math.hypot(mx, my);
  const move = len > 1 ? { x: mx / len, y: my / len } : { x: mx, y: my };
  const crowded = foe && foe.distance < 105;
  return { move, aim, fire: Boolean(foe && foe.distance < 720), dash: Boolean(crowded) };
}

/** Reckless pilot: charges the nearest shard and never fires or dashes. It does not last. */
function chargePilot(world) {
  const ship = world.ship;
  const { foe } = senses(world);
  if (!foe) return { move: { x: 0, y: 0 }, aim: { x: ship.x + 60, y: ship.y }, fire: false, dash: false };
  const d = Math.max(1, foe.distance);
  return {
    move: { x: (foe.item.x - ship.x) / d, y: (foe.item.y - ship.y) / d },
    aim: { x: foe.item.x, y: foe.item.y },
    fire: false,
    dash: false,
  };
}

/** Run a pilot until `seconds` of game time pass or the run ends; returns seconds run. */
function runScene(world, pilot, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, pilot(world));
    if (world.outcome) break;
  }
  return world.time;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * score the end screens should remember as the best.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Play until the field is busy — several foes on screen and shots in the air —
    // so the frame shows the loop mid-action, not a lull between spawns.
    const pilot = (w) => kitePilot(w, true);
    const maxSteps = Math.floor(45 / STEP);
    for (let i = 0; i < maxSteps; i += 1) {
      world.step(STEP, pilot(world));
      if (world.outcome) break;
      if (world.time > 14 && world.foes.length >= 4 && world.bullets.length >= 3) break;
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'over') {
    runScene(world, chargePilot, 300);
    return { screen: SCREEN_OVER, best: world.score };
  }
  if (name === 'win') {
    runScene(world, (w) => kitePilot(w, true), 1500);
    return { screen: world.outcome === 'won' ? SCREEN_WIN : SCREEN_PLAY, best: world.score };
  }
  // start (and anything unknown): a few seconds of the night drifting behind the title.
  runScene(world, (w) => kitePilot(w, false), 5);
  return { screen: SCREEN_TITLE, best: 0 };
}
