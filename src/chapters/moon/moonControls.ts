/** Commandes de la face cachée, des éclipses et de la vue de côté : un panneau à gauche, sous la loupe. */

export type EclipseBody = 'lunar' | 'solar';

const KIND_FR: Record<string, string> = {
  penumbral: 'pénombrale',
  partial: 'partielle',
  total: 'totale',
  annular: 'annulaire',
  hybrid: 'hybride',
};

/** « Éclipse pénombrale de Lune — 20 février 2027 », la date au jour local. */
export function eclipseLabel(body: EclipseBody, kind: string, peak: Date): string {
  const date = peak.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Éclipse ${KIND_FR[kind] ?? kind} de ${body === 'lunar' ? 'Lune' : 'Soleil'} — ${date}`;
}

export interface MoonControlsHandlers {
  onEclipse(body: EclipseBody): void;
  onSideView(side: boolean): void;
  onShowAll(): void;
  onMarkVisible(visible: boolean): void;
  onSpinFrozen(frozen: boolean): void;
}

function makeButton(text: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  return b;
}

export class MoonControls {
  readonly element: HTMLElement;
  private readonly eclipseEl: HTMLElement;
  private readonly sideButton: HTMLButtonElement;
  private readonly showAllButton: HTMLButtonElement;
  private readonly markToggle: HTMLInputElement;
  private readonly freezeButton: HTMLButtonElement;
  private side = false;
  private frozen = false;

  constructor(private readonly handlers: MoonControlsHandlers) {
    const panel = document.createElement('div');
    panel.className = 'moon-tools';

    const lunar = makeButton('Prochaine éclipse de Lune');
    lunar.addEventListener('click', () => handlers.onEclipse('lunar'));
    const solar = makeButton('Prochaine éclipse de Soleil');
    solar.addEventListener('click', () => handlers.onEclipse('solar'));
    this.sideButton = makeButton('Vue de côté');
    this.sideButton.addEventListener('click', () => this.setSide(!this.side, true));
    this.showAllButton = makeButton('Vue d’ensemble');
    this.showAllButton.hidden = true;
    this.showAllButton.addEventListener('click', () => handlers.onShowAll());
    this.eclipseEl = document.createElement('div');
    this.eclipseEl.className = 'moon-tools__eclipse';
    this.eclipseEl.setAttribute('role', 'status');

    const mark = document.createElement('label');
    mark.className = 'moon-tools__toggle';
    this.markToggle = document.createElement('input');
    this.markToggle.type = 'checkbox';
    this.markToggle.addEventListener('change', () => handlers.onMarkVisible(this.markToggle.checked));
    mark.append(this.markToggle, document.createTextNode('Montrer le repère'));

    this.freezeButton = makeButton('Et si la Lune ne tournait pas ?');
    this.freezeButton.classList.add('moon-tools__freeze');
    this.freezeButton.setAttribute('aria-pressed', 'false');
    this.freezeButton.addEventListener('click', () => this.setFrozen(!this.frozen, true));

    panel.append(lunar, solar, this.sideButton, this.showAllButton, this.eclipseEl, mark, this.freezeButton);
    this.element = panel;
  }

  setEclipseText(text: string): void {
    this.eclipseEl.textContent = text;
  }

  /** Le bouton de retour au cadrage d'ensemble n'apparaît qu'après un zoom sur une éclipse. */
  setShowAllVisible(visible: boolean): void {
    this.showAllButton.hidden = !visible;
  }

  setSide(side: boolean, notify = false): void {
    this.side = side;
    this.sideButton.textContent = side ? 'Vue de dessus' : 'Vue de côté';
    if (notify) this.handlers.onSideView(side);
  }

  /** Fige ou libère la Lune ; figer affiche aussi le repère, sinon la démonstration ne montrerait rien. */
  setFrozen(frozen: boolean, notify = false): void {
    this.frozen = frozen;
    this.freezeButton.setAttribute('aria-pressed', String(frozen));
    if (notify) {
      this.handlers.onSpinFrozen(frozen);
      if (frozen && !this.markToggle.checked) {
        this.markToggle.checked = true;
        this.handlers.onMarkVisible(true);
      }
    }
  }
}
