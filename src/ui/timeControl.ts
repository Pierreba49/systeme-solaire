import { type RateId, type SimClock } from '../core/clock';

const RATE_BUTTONS: ReadonlyArray<{ id: RateId; label: string }> = [
  { id: 'pause', label: 'Pause' },
  { id: 'realtime', label: 'Temps réel' },
  { id: 'day', label: '1 jour/s' },
  { id: 'month', label: '1 mois/s' },
  { id: 'year', label: '1 an/s' },
];

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function mountTimeControl(root: HTMLElement, clock: SimClock): () => void {
  const panel = document.createElement('div');
  panel.className = 'time-control';

  const label = document.createElement('div');
  label.className = 'time-control__date';
  label.setAttribute('aria-live', 'off');
  panel.append(label);

  const row = document.createElement('div');
  row.className = 'time-control__buttons';
  const buttons = new Map<RateId, HTMLButtonElement>();
  for (const { id, label: text } of RATE_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', () => {
      clock.setRate(id);
      refresh();
    });
    buttons.set(id, b);
    row.append(b);
  }
  const today = document.createElement('button');
  today.type = 'button';
  today.textContent = "Aujourd'hui";
  today.addEventListener('click', () => {
    clock.resetToNow();
    refresh();
  });
  row.append(today);
  panel.append(row);
  root.append(panel);

  let shownDate = '';
  let shownRate: RateId | null = null;

  function refresh(): void {
    const text = dateFormat.format(clock.date);
    if (text !== shownDate) {
      label.textContent = text;
      shownDate = text;
    }
    if (clock.rate === shownRate) return;
    shownRate = clock.rate;
    for (const [id, b] of buttons) {
      const active = id === clock.rate;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    }
  }

  const off = clock.onChange(refresh);
  refresh();

  return () => {
    off();
    panel.remove();
  };
}
