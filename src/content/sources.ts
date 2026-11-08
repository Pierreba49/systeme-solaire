export type SourceId = string;

export interface Source {
  id: SourceId;
  titre: string;
  url: string;
  licence: string;
  /** Date de consultation, AAAA-MM-JJ. */
  consulte: string;
}

export const SOURCES: Source[] = [
  {
    id: 'nasa-fact-sheet',
    titre: 'NASA Planetary Fact Sheet (pages de Mercure à Neptune)',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    licence: 'Données NASA, usage libre avec mention de la source',
    consulte: '2026-11-08',
  },
  {
    id: 'nasa-sun-fact-sheet',
    titre: 'NASA Sun Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html',
    licence: 'Données NASA, usage libre avec mention de la source',
    consulte: '2026-11-08',
  },
  {
    id: 'nasa-moon-fact-sheet',
    titre: 'NASA Moon Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    licence: 'Données NASA, usage libre avec mention de la source',
    consulte: '2026-11-08',
  },
  {
    id: 'nasa-saturn-rings-fact-sheet',
    titre: 'NASA Saturnian Rings Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html',
    licence: 'Données NASA, usage libre avec mention de la source',
    consulte: '2026-11-08',
  },
  {
    id: 'bipm-si',
    titre: 'BIPM, Système international d’unités : vitesse de la lumière, 299 792,458 km/s (valeur exacte)',
    url: 'https://www.bipm.org/en/measurement-units/si-defining-constants',
    licence: 'Constante définie, sans licence',
    consulte: '2026-11-08',
  },
  {
    id: 'imcce',
    titre: 'IMCCE, Observatoire de Paris : éphémérides, phases de la Lune et éclipses (recoupement)',
    url: 'https://www.imcce.fr/',
    licence: 'Consultation, aucune donnée reprise telle quelle',
    consulte: '2026-11-08',
  },
  {
    id: 'astronomy-engine',
    titre: 'astronomy-engine (positions du Soleil, de la Lune et des planètes, phases)',
    url: 'https://github.com/cosinekitty/astronomy',
    licence: 'MIT',
    consulte: '2026-11-08',
  },
  {
    id: 'three-js',
    titre: 'three.js (rendu 3D)',
    url: 'https://github.com/mrdoob/three.js',
    licence: 'MIT',
    consulte: '2026-11-09',
  },
  {
    id: 'vite-plugin-pwa',
    titre: 'vite-plugin-pwa (installation et usage hors ligne)',
    url: 'https://github.com/vite-pwa/vite-plugin-pwa',
    licence: 'MIT',
    consulte: '2026-11-09',
  },
  {
    id: 'solar-system-scope',
    titre: 'Solar System Scope : textures du Soleil, des planètes et du fond d’étoiles',
    url: 'https://www.solarsystemscope.com/textures/',
    licence: 'CC BY 4.0',
    consulte: '2026-11-08',
  },
  {
    id: 'nasa-svs-moon-kit',
    titre: 'NASA Scientific Visualization Studio, CGI Moon Kit : texture de la Lune',
    url: 'https://svs.gsfc.nasa.gov/4720',
    licence: 'Domaine public',
    consulte: '2026-11-08',
  },
];

export const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
