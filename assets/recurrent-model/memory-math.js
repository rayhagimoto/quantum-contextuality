import { Animation, ValueTracker } from 'manim-web';

export class OdometerRoll extends Animation {
  constructor(fields, renderGlyph = (glyph, node) => { node.textContent = glyph; }) {
    super(new ValueTracker(0));
    this.fields = fields;
    this.renderGlyph = renderGlyph;
  }

  buildWheels(field, before, after) {
    const from = Array.from(before);
    const to = Array.from(after);
    const length = Math.max(from.length, to.length);
    const wheels = Array.from({ length }, (_, index) => {
      // Align places at the right when the number of digits changes.
      const oldDigit = from.at(index - length) ?? '';
      const newDigit = to.at(index - length) ?? '';
      const cell = document.createElement('span');
      cell.className = 'recurrent-wheel';
      const oldGlyph = document.createElement('span');
      if (oldDigit) this.renderGlyph(oldDigit, oldGlyph);
      cell.append(oldGlyph);
      if (oldDigit === newDigit) return { cell };
      const newGlyph = document.createElement('span');
      if (newDigit) this.renderGlyph(newDigit, newGlyph);
      cell.append(newGlyph);
      return { cell, oldGlyph, newGlyph };
    });
    field.replaceChildren(...wheels.map(wheel => wheel.cell));
    return wheels.filter(wheel => wheel.newGlyph);
  }

  seek(from, to, progress, direction) {
    const pair = JSON.stringify([from, to]);
    if (pair !== this.pair) {
      this.pair = pair;
      this.wheels = this.fields.flatMap((field, index) => this.buildWheels(field, from[index], to[index]));
    }
    this.direction = direction;
    this.interpolateAt(progress);
  }

  interpolate(alpha) {
    for (const { oldGlyph, newGlyph } of this.wheels) {
      oldGlyph.style.transform = `translateY(${-this.direction * alpha * 100}%)`;
      newGlyph.style.transform = `translateY(${this.direction * (1 - alpha) * 100}%)`;
    }
  }
}

const readout = document.querySelector('.recurrent-state');
if (readout) {
  const index = document.createElement('sub');
  const value = document.createElement('span');
  const expression = document.createElement('span');
  expression.className = 'math-text';
  expression.ariaHidden = 'true';
  expression.innerHTML = '<i class="math-variable">λ</i>';
  expression.append(index, ' = ', value);
  readout.replaceChildren(expression);
  const odometer = new OdometerRoll([index, value]);
  readout.addEventListener('recurrent-memory-seek', ({ detail: { from, to, progress, direction } }) => {
    odometer.seek([from.index, from.bits], [to.index, to.bits], progress, direction);
    const state = progress === 1 ? to : from;
    const label = `Lambda${state.index ? ` ${state.index}` : ''} equals ${state.bits}`;
    if (label !== readout.ariaLabel) readout.ariaLabel = label;
  });
  readout.dataset.morphReady = 'true';
}
