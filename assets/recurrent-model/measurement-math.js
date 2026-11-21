import { Animation, ValueTracker } from 'manim-web';

class HistoryReveal extends Animation {
  constructor(history) {
    super(new ValueTracker(0));
    this.history = history;
  }

  build(run) {
    this.rows = run.map(({ operator, bits, showState, sign, impossible }) => {
      const row = document.createElement('div');
      row.className = 'measurement-history-row';
      const name = document.createElement('span');
      name.className = 'measurement-history-operator';
      window.katex.render(operator, name);
      const result = document.createElement('span');
      result.className = 'measurement-history-result';
      const stateValue = showState ? `${operator.toLowerCase().match(/[xy]_\d+/g).map(factor => `${factor}^{${bits}}`).join(' \\cdot ')}=` : '';
      window.katex.render(`=${stateValue}${sign.replace('−', '-')}`, result);
      if (impossible) {
        const mark = document.createElement('b');
        mark.ariaLabel = 'Impossible';
        window.katex.render('\\times', mark);
        result.append(mark);
      }
      row.append(name, result);
      return { row, name, result };
    });
    this.history.replaceChildren(...this.rows.map(({ row }) => row));
  }

  seek({ run, row, resultReady, progress, resultProgress }) {
    if (run !== this.run) this.build(run);
    if (run !== this.run || row !== this.activeRow || resultReady !== this.resultReady) {
      this.rows.forEach((entry, index) => {
        entry.row.ariaHidden = String(index > row);
        entry.result.ariaHidden = String(index > row || (index === row && !resultReady));
        entry.name.style.opacity = index < row ? 1 : 0;
        entry.result.style.opacity = index < row ? 1 : 0;
      });
    }
    this.run = run;
    this.activeRow = row;
    this.resultReady = resultReady;
    this.resultProgress = resultProgress;
    this.interpolateAt(progress);
  }

  interpolate(alpha) {
    this.rows[this.activeRow].name.style.opacity = alpha;
    this.rows[this.activeRow].result.style.opacity = this.resultProgress;
  }
}

const history = document.querySelector('.measurement-history');
if (history) {
  const reveal = new HistoryReveal(history);
  history.addEventListener('recurrent-history-seek', event => reveal.seek(event.detail));
}

