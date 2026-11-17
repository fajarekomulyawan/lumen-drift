// Keyboard and mouse state for the ship: held keys as a set, the pointer in field
// coordinates, and edge-triggered presses (dash, restart, mute) the loop consumes once.

export class Input {
  constructor(canvas, field) {
    this.field = field;
    this.keys = new Set();
    this.mouseX = field.width / 2;
    this.mouseY = field.height / 3;
    this.firing = false;
    this.pressed = new Set(); // one-shot codes, cleared by consume()

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.firing = false;
    });

    const updatePointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * field.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * field.height;
    };
    canvas.addEventListener('pointermove', updatePointer);
    canvas.addEventListener('pointerdown', (event) => {
      updatePointer(event);
      this.firing = true;
      this.pressed.add('Pointer');
    });
    window.addEventListener('pointerup', () => {
      this.firing = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** True while any of the given key codes is held. */
  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  /** True once per physical press of the given code, then false until pressed again. */
  consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  /** The movement vector the player is asking for, normalised, from WASD or the arrows. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }
}
