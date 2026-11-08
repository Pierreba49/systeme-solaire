/** Sur perte du contexte WebGL : on empêche l'abandon définitif ; au rétablissement, on recharge la page (le hash conserve le chapitre). */
export function installContextLossRecovery(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => location.reload());
}
