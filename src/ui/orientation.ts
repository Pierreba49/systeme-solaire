/** Ajoute l'écran plein « Tourne la tablette », visible seulement en portrait (voir styles.css). */
export function mountOrientationScreen(parent: HTMLElement = document.body): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'rotate-screen';
  screen.setAttribute('role', 'alert');
  screen.textContent = 'Tourne la tablette';
  parent.appendChild(screen);
  return screen;
}
