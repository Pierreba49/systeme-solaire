import type { Chapter, ChapterContext } from '../../app/chapter';
import { clampDate, moonPhase, nextLunarEclipse, nextSolarEclipse } from '../../astro/ephemeris';
import { ObserverStore } from '../../astro/observer';
import type { RateId } from '../../core/clock';
import { NOTES_LUNE } from '../../content/fr/lune';
import { createBodyMesh, type BodyMesh } from '../../scene/bodyMesh';
import { mountPresenterNotes } from '../../ui/presenterNotes';
import { MoonControls, eclipseLabel, type EclipseBody } from './moonControls';
import { SkyView } from './skyView';
import { LOUPE, TopView } from './topView';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MAX_DAYS = 29.5;
const MAX_HOURS = 12;
/** Distance de caméra (rayons terrestres) du zoom sur une éclipse : l'ombre sur la Lune, ou la tache d'ombre sur la Terre. */
const ECLIPSE_FRAME_DISTANCE = { lunar: 9, solar: 2.6 } as const;

const PHASE_NAMES = [
  'Nouvelle Lune',
  'Premier croissant',
  'Premier quartier',
  'Gibbeuse croissante',
  'Pleine Lune',
  'Gibbeuse décroissante',
  'Dernier quartier',
  'Dernier croissant',
] as const;

/** Nom de la phase d'après l'angle de phase (0 = nouvelle, 90 = premier quartier, 180 = pleine, 270 = dernier quartier), par secteurs de 45°. */
export function phaseName(phaseAngleDeg: number): string {
  const sector = Math.floor((((phaseAngleDeg % 360) + 360) % 360 + 22.5) / 45) % 8;
  return PHASE_NAMES[sector]!;
}

/** Date d'ancrage imposée par `?date=<ISO 8601>` dans l'URL (pour les captures et les démonstrations) ; null si absente ou invalide. */
function dateFromUrl(): Date | null {
  const raw = new URLSearchParams(location.search).get('date');
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : clampDate(d);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const signed = (n: number, digits: number): string => `${n > 0 ? '+' : ''}${n.toFixed(digits).replace('.', ',')}`;

interface Slider {
  row: HTMLElement;
  input: HTMLInputElement;
  value: HTMLElement;
}

function makeSlider(label: string, min: number, max: number, step: number): Slider {
  const row = document.createElement('label');
  row.className = 'moon-slider';
  const name = document.createElement('span');
  name.className = 'moon-slider__name';
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = '0';
  input.setAttribute('aria-label', label);
  const value = document.createElement('span');
  value.className = 'moon-slider__value';
  row.append(name, input, value);
  return { row, input, value };
}

function makeButton(text: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  return b;
}

export class MoonChapter implements Chapter {
  readonly id = 'lune' as const;
  private ctx: ChapterContext | null = null;
  private active = false;
  private readonly observers = new ObserverStore();
  private meshes: BodyMesh[] = [];
  private topView: TopView | null = null;
  private skyView: SkyView | null = null;
  private ui: HTMLElement | null = null;
  private unmountNotes: (() => void) | null = null;
  private unsubscribeObserver: (() => void) | null = null;
  private previousRate: RateId | null = null;
  private anchor = new Date();
  private appliedDate = new Date(NaN);
  private dirty = true;
  private width = window.innerWidth;
  private height = window.innerHeight;
  private hours!: Slider;
  private days!: Slider;
  private phaseEl!: HTMLElement;
  private dateEl!: HTMLElement;
  private placeEl!: HTMLElement;
  private belowEl!: HTMLElement;
  private sunHintEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private gpsButton!: HTMLButtonElement;
  private usingGps = false;
  private tools: MoonControls | null = null;
  private topTitleEl!: HTMLElement;

  async enter(ctx: ChapterContext): Promise<void> {
    this.ctx = ctx;
    this.active = true;

    const [earth, moonTop, moonSky, sun] = await Promise.all([
      createBodyMesh('earth', ctx.textures, ctx.quality),
      createBodyMesh('moon', ctx.textures, ctx.quality),
      createBodyMesh('moon', ctx.textures, ctx.quality),
      createBodyMesh('sun', ctx.textures, ctx.quality),
    ]);
    const meshes = [earth, moonTop, moonSky, sun];
    if (!this.active) {
      for (const m of meshes) m.dispose();
      return;
    }
    this.meshes = meshes;

    // Les curseurs pilotent la date : l'horloge s'arrête, et reprendra son allure à la sortie.
    this.previousRate = ctx.clock.rate;
    ctx.clock.setRate('pause');
    const fromUrl = dateFromUrl();
    if (fromUrl) ctx.clock.setDate(fromUrl);
    this.anchor = ctx.clock.date;

    const ui = document.createElement('div');
    ui.className = 'moon-ui';
    ctx.overlay.append(ui);
    this.ui = ui;
    this.buildUi(ctx, ui);

    const topHit = ui.querySelector<HTMLElement>('.moon-top-hit')!;
    this.topView = new TopView(earth, moonTop, topHit, ui.querySelector<HTMLElement>('.moon-top-labels')!);
    this.skyView = new SkyView(moonSky, sun);
    this.unsubscribeObserver = this.observers.onChange(() => (this.dirty = true));
    this.resize(this.width, this.height);
    this.refresh(true);
  }

  exit(): void {
    this.active = false;
    this.unsubscribeObserver?.();
    this.unsubscribeObserver = null;
    this.unmountNotes?.();
    this.unmountNotes = null;
    this.topView?.dispose();
    this.topView = null;
    this.skyView?.dispose();
    this.skyView = null;
    // La rotation figée, le repère, la vue de côté et le zoom d'éclipse ne survivent pas au chapitre.
    this.tools = null;
    this.ui?.remove();
    this.ui = null;
    for (const m of this.meshes) m.dispose();
    this.meshes = [];
    if (this.ctx && this.previousRate) this.ctx.clock.setRate(this.previousRate);
    this.previousRate = null;
    this.ctx = null;
  }

  update(dt: number): void {
    if (!this.ctx || !this.topView) return;
    this.refresh(false);
    this.topView.tick(dt);
    this.topView.syncMarkers();
  }

  render(): void {
    const ctx = this.ctx;
    if (!ctx || !this.topView || !this.skyView) return;
    const { renderer } = ctx;
    const half = Math.floor(this.width / 2);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, half, this.height);
    renderer.setScissor(0, 0, half, this.height);
    renderer.render(this.topView.scene, this.topView.camera);
    // Loupe sur la Terre, dans un coin de la vue de dessus (origine du viewport en bas à gauche).
    const loupeY = this.height - LOUPE.y - LOUPE.size;
    renderer.setViewport(LOUPE.x, loupeY, LOUPE.size, LOUPE.size);
    renderer.setScissor(LOUPE.x, loupeY, LOUPE.size, LOUPE.size);
    renderer.render(this.topView.scene, this.topView.loupeCamera);
    renderer.setViewport(half, 0, this.width - half, this.height);
    renderer.setScissor(half, 0, this.width - half, this.height);
    renderer.render(this.skyView.scene, this.skyView.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, this.width, this.height);
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    const half = Math.floor(w / 2);
    this.topView?.setSize(half, h);
    this.skyView?.setAspect((w - half) / h);
  }

  // --- Date et scène ---

  private applySliders(): void {
    const hours = Number(this.hours.input.value);
    const days = Number(this.days.input.value);
    this.ctx?.clock.setDate(new Date(this.anchor.getTime() + hours * HOUR_MS + days * DAY_MS));
    this.updateSliderLabels();
  }

  /** Place les curseurs autour d'une nouvelle date : ils repartent de zéro, ancrés sur elle. */
  private jumpTo(date: Date): void {
    this.hours.input.value = '0';
    this.days.input.value = '0';
    this.updateSliderLabels();
    this.ctx?.clock.setDate(date);
    this.anchor = this.ctx?.clock.date ?? date;
  }

  /** Prochaine éclipse après la date simulée (+ 1 minute, pour que deux appuis passent à la suivante) : date au pic, et zoom sur l'ombre. */
  private goToEclipse(body: EclipseBody): void {
    const ctx = this.ctx;
    if (!ctx || !this.topView) return;
    const search = (after: Date) => (body === 'lunar' ? nextLunarEclipse(after) : nextSolarEclipse(after));
    const now = ctx.clock.date.getTime();
    let eclipse = search(new Date(now + 60_000));
    // La recherche part de la pleine ou nouvelle Lune qui suit, dont l'instant peut venir après le pic : on retomberait sur l'éclipse où l'on est déjà.
    if (eclipse.peak.getTime() <= now + 60_000) eclipse = search(new Date(eclipse.peak.getTime() + DAY_MS));
    this.jumpTo(clampDate(eclipse.peak));
    this.refresh(true);
    this.topView.frame(body === 'lunar' ? 'moon' : 'shadow', ECLIPSE_FRAME_DISTANCE[body]);
    this.tools?.setEclipseText(eclipseLabel(body, eclipse.kind, eclipse.peak));
    this.tools?.setShowAllVisible(true);
  }

  private setSideView(side: boolean): void {
    this.topView?.setSideView(side);
    this.topTitleEl.textContent = `${side ? 'Vue de côté' : 'Vue de dessus'} — échelle réelle`;
  }

  private updateSliderLabels(): void {
    this.hours.value.textContent = `${signed(Number(this.hours.input.value), 1)} h`;
    this.days.value.textContent = `${signed(Number(this.days.input.value), 1)} j`;
  }

  private refresh(force: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.topView || !this.skyView) return;
    const date = ctx.clock.date;
    if (!force && !this.dirty && date.getTime() === this.appliedDate.getTime()) return;
    this.appliedDate = date;
    this.dirty = false;

    const observer = this.observers.current;
    this.topView.update(date, observer);
    const sky = this.skyView.update(date, observer);

    const phase = moonPhase(date);
    this.phaseEl.textContent = `${phaseName(phase.phaseAngleDeg)} — ${Math.round(phase.illuminatedFraction * 100)} % éclairée`;
    this.dateEl.textContent = formatDateTime(date);
    this.placeEl.textContent = `${observer.label} — ${formatTime(date)}`;
    this.belowEl.hidden = sky.moonAltitudeDeg >= 0;

    const hint = sky.sunOffScreen;
    this.sunHintEl.hidden = !hint;
    if (hint) {
      const below = sky.sunAltitudeDeg < 0 ? ' (sous l’horizon)' : '';
      this.sunHintEl.textContent = hint.side === 'right' ? `Soleil${below} ➜` : `⬅ Soleil${below}`;
      this.sunHintEl.className = `moon-sun-hint moon-sun-hint--${hint.side}`;
      this.sunHintEl.style.top = `${((1 - hint.y) * 100).toFixed(1)}%`;
    }
  }

  // --- Interface ---

  private buildUi(ctx: ChapterContext, ui: HTMLElement): void {
    const topHit = document.createElement('div');
    topHit.className = 'moon-top-hit';
    const topLabels = document.createElement('div');
    topLabels.className = 'moon-top-labels';

    const topTitle = document.createElement('div');
    this.topTitleEl = topTitle;
    topTitle.className = 'moon-title moon-title--top';
    topTitle.textContent = 'Vue de dessus — échelle réelle';
    const skyTitle = document.createElement('div');
    skyTitle.className = 'moon-title moon-title--sky';
    skyTitle.textContent = 'Vue du ciel';

    const loupeFrame = document.createElement('div');
    loupeFrame.className = 'moon-loupe-frame';
    const loupeCaption = document.createElement('div');
    loupeCaption.className = 'moon-loupe-caption';
    loupeCaption.textContent = 'Agrandissement de la Terre (hors échelle)';

    const divider = document.createElement('div');
    divider.className = 'moon-divider';

    const card = document.createElement('div');
    card.className = 'moon-card';
    const magnification = document.createElement('div');
    magnification.textContent = 'Lune et Soleil agrandis ×8';
    this.placeEl = document.createElement('div');
    this.placeEl.className = 'moon-card__place';
    this.belowEl = document.createElement('div');
    this.belowEl.className = 'moon-card__below';
    this.belowEl.textContent = 'La Lune est sous l’horizon';
    this.belowEl.hidden = true;
    card.append(magnification, this.placeEl, this.belowEl);
    this.sunHintEl = document.createElement('div');
    this.sunHintEl.className = 'moon-sun-hint';
    this.sunHintEl.hidden = true;

    const bar = document.createElement('div');
    bar.className = 'moon-bar';
    this.phaseEl = document.createElement('div');
    this.phaseEl.className = 'moon-phase';
    this.dateEl = document.createElement('div');
    this.dateEl.className = 'moon-date';
    const readout = document.createElement('div');
    readout.className = 'moon-bar__readout';
    readout.append(this.phaseEl, this.dateEl);

    this.hours = makeSlider('Heure', -MAX_HOURS, MAX_HOURS, 0.25);
    this.days = makeSlider('Jours', 0, MAX_DAYS, 0.1);
    this.updateSliderLabels();
    this.hours.input.addEventListener('input', () => this.applySliders());
    this.days.input.addEventListener('input', () => this.applySliders());

    const now = makeButton('Maintenant');
    now.addEventListener('click', () => {
      this.hours.input.value = '0';
      this.days.input.value = '0';
      this.updateSliderLabels();
      ctx.clock.resetToNow();
      this.anchor = ctx.clock.date;
    });
    this.gpsButton = makeButton('Ma position');
    this.gpsButton.addEventListener('click', () => void this.toggleGps());
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'moon-status';
    this.statusEl.setAttribute('role', 'status');

    const controls = document.createElement('div');
    controls.className = 'moon-bar__controls';
    controls.append(this.hours.row, this.days.row, now, this.gpsButton);
    bar.append(readout, controls, this.statusEl);

    this.tools = new MoonControls({
      onEclipse: (body) => this.goToEclipse(body),
      onSideView: (side) => this.setSideView(side),
      onShowAll: () => {
        this.topView?.frameAll();
        this.tools?.setShowAllVisible(false);
      },
      onMarkVisible: (visible) => this.topView?.setLunarMarkVisible(visible),
      onSpinFrozen: (frozen) => {
        this.topView?.setFrozenSpin(frozen ? this.ctx?.clock.date ?? null : null);
        this.dirty = true;
      },
    });

    ui.append(topHit, topLabels, loupeFrame, loupeCaption, divider, topTitle, skyTitle, card, this.sunHintEl, this.tools.element, bar);
    this.unmountNotes = mountPresenterNotes(ui, [...NOTES_LUNE.phases, ...NOTES_LUNE.jour, ...NOTES_LUNE['face-cachee'], ...NOTES_LUNE.eclipses]);
  }

  /** « Ma position » demande le GPS ; une fois obtenu, le même bouton ramène à Versailles. */
  private async toggleGps(): Promise<void> {
    if (this.usingGps) {
      this.observers.useDefault();
      this.usingGps = false;
      this.gpsButton.textContent = 'Ma position';
      this.statusEl.textContent = '';
      return;
    }
    this.gpsButton.disabled = true;
    this.statusEl.textContent = 'Recherche de la position…';
    const result = await this.observers.useGps();
    if (!this.active) return;
    this.gpsButton.disabled = false;
    if (result === 'ok') {
      this.usingGps = true;
      this.gpsButton.textContent = 'Revenir à Versailles';
      this.statusEl.textContent = '';
    } else {
      this.observers.useDefault();
      this.statusEl.textContent = 'Position non disponible — Versailles';
    }
  }
}
