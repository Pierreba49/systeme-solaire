export {};

declare global {
  interface Window {
    /** Vrai quand warmTextureCache a parcouru toutes les textures du niveau courant. */
    __texturesWarm?: boolean;
  }
}
