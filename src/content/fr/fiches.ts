import type { BodyId } from '../../data/bodies';
import type { SourceId } from '../sources';

export interface Chiffre {
  libelle: string;
  valeur: string;
  comparaison: string;
  sourceId: SourceId;
}

export interface Fiche {
  titre: string;
  chiffres: Chiffre[];
  /** Notes du présentateur : phrases à dire ou à adapter, réponses aux questions fréquentes. */
  notes: string[];
}

// Conventions de calcul des comparaisons :
// - voiture à 130 km/h, sans arrêt (vitesse sur autoroute) ; avion de ligne à 900 km/h ;
// - lumière à 299 792,458 km/s ; année = 8 766 h (365,25 j) ;
// - diamètres : 2 × le rayon équatorial de la fiche NASA.
const NASA = 'nasa-fact-sheet';
const NASA_SOLEIL = 'nasa-sun-fact-sheet';
const NASA_LUNE = 'nasa-moon-fact-sheet';
const NASA_ANNEAUX = 'nasa-saturn-rings-fact-sheet';
const LUMIERE = 'bipm-si';

export const FICHES: Record<BodyId, Fiche> = {
  sun: {
    titre: 'Soleil',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '1 391 000 km',
        comparaison: 'Il faudrait aligner 109 Terres pour couvrir son diamètre.',
        sourceId: NASA_SOLEIL,
      },
      {
        libelle: 'Volume',
        valeur: '1,3 million de Terres',
        comparaison: 'En le remplissant de Terres, il en rentrerait 1,3 million.',
        sourceId: NASA_SOLEIL,
      },
      {
        libelle: 'Température de surface',
        valeur: '5 500 °C',
        comparaison: 'Un four de cuisine chauffe à 250 °C : la surface du Soleil est 22 fois plus chaude.',
        sourceId: NASA_SOLEIL,
      },
      {
        libelle: 'Distance à la Terre',
        valeur: '149,6 millions de km',
        comparaison:
          'La lumière du Soleil met 8 min 19 s pour arriver jusqu’ici. En voiture à 130 km/h sans s’arrêter, le trajet durerait 131 ans.',
        sourceId: LUMIERE,
      },
    ],
    notes: [
      'Le Soleil est une étoile, une boule de gaz. Il est fait d’atomes d’hydrogène (91 %) et d’hélium (9 %). Il n’a pas de surface solide.',
      '« Pourquoi le Soleil ne brûle pas la Terre ? » Il est à 150 millions de km, et la lumière perd de sa force avec la distance. Sur Mercure, 2,6 fois plus près, il arrive 6,7 fois plus d’énergie qu’ici. Sur Neptune, il en arrive environ 900 fois moins.',
      '« Est-ce que le Soleil est en feu ? » Pas comme un feu de bois. Au centre, l’hydrogène se transforme en hélium et libère de l’énergie : 4,26 millions de tonnes de matière sont transformées chaque seconde.',
      'À regarder avec la Lune : le Soleil est 400 fois plus large qu’elle et 390 fois plus loin. Vus d’ici, ils ont presque la même taille dans le ciel, environ un demi-degré. C’est ce qui permet une éclipse totale.',
      'Ne jamais regarder le Soleil en face, même quand il est bas ou partiellement caché.',
    ],
  },

  mercury: {
    titre: 'Mercure',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '4 880 km',
        comparaison:
          'C’est 0,38 fois la Terre et 1,4 fois la Lune. Un avion à 900 km/h le traverserait en 5 h 25 min.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '58 millions de km',
        comparaison:
          'La lumière du Soleil met 3 min 13 s pour y arriver. En voiture à 130 km/h, il faudrait 51 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '88 jours',
        comparaison:
          'En une année terrestre, Mercure fait 4 tours du Soleil. À 7 ans sur Terre, on aurait 29 ans sur Mercure.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '176 jours',
        comparaison:
          'Entre deux levers de Soleil, il s’écoule 176 jours terrestres, soit deux années de Mercure : un jour y dure plus longtemps que l’année.',
        sourceId: NASA,
      },
    ],
    notes: [
      'Mercure est la planète la plus proche du Soleil, mais ce n’est pas la plus chaude. C’est Vénus : 464 °C en moyenne contre 167 °C pour Mercure.',
      'Mercure n’a presque pas d’atmosphère : la pression y est plus de 100 000 milliards de fois plus faible qu’ici. Rien ne garde la chaleur, donc côté Soleil il fait entre 320 et 450 °C, et la nuit il fait très froid.',
      'Elle ressemble à la Lune, avec des cratères partout. Sa surface est restée en l’état parce qu’il n’y a ni vent ni pluie pour l’user.',
      '« Pourquoi un jour dure deux années ? » Mercure tourne très lentement sur elle-même (un tour en 59 jours) et très vite autour du Soleil (88 jours). Les deux se combinent : le Soleil met 176 jours à revenir au même endroit dans son ciel.',
    ],
  },

  venus: {
    titre: 'Vénus',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '12 100 km',
        comparaison:
          'C’est 0,95 fois la Terre : presque la même taille. Un avion à 900 km/h le traverserait en 13 h 27 min.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '108 millions de km',
        comparaison:
          'La lumière du Soleil met 6 min 1 s pour y arriver. En voiture à 130 km/h, il faudrait 95 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '225 jours',
        comparaison:
          'Un peu plus de 7 mois terrestres. À 7 ans sur Terre, on aurait 11 ans sur Vénus.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '117 jours',
        comparaison:
          'Il faut 117 jours terrestres entre deux levers de Soleil. Vénus tourne sur elle-même en 243 jours, ce qui est plus long que son année de 225 jours.',
        sourceId: NASA,
      },
    ],
    notes: [
      'Vénus a presque la taille de la Terre, mais ce n’est pas une jumelle accueillante : 464 °C à la surface, jour et nuit, et une pression de 92 bars.',
      'Pour comparer avec la mer : 92 bars, c’est la pression que subit un sous-marin à environ 900 mètres de profondeur. Les sondes qui se sont posées sur Vénus ont fonctionné deux heures au mieux.',
      'Vénus tourne dans le sens inverse des autres planètes. Le Soleil s’y lève à l’ouest et se couche à l’est.',
      '« On peut la voir ? » Oui, à l’œil nu, juste après le coucher du Soleil ou avant son lever. Elle brille plus que toutes les étoiles. C’est ce qu’on appelait l’étoile du berger.',
      'Elle est plus chaude que Mercure à cause de son atmosphère épaisse de gaz carbonique, qui retient la chaleur. C’est l’effet de serre, poussé très loin.',
    ],
  },

  earth: {
    titre: 'Terre',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '12 760 km',
        comparaison:
          'Le tour de l’équateur fait 40 075 km. En avion à 900 km/h, il faudrait 44 h 32 min, soit presque 2 jours.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '150 millions de km',
        comparaison:
          'La lumière du Soleil met 8 min 19 s pour y arriver. En voiture à 130 km/h, il faudrait 131 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '365 jours et 6 heures',
        comparaison:
          'Les 6 heures en plus s’accumulent : en 4 ans, cela fait un jour de plus. C’est l’année bissextile.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '24 heures',
        comparaison:
          'La Terre fait un tour sur elle-même en 23 h 56 min. Il faut 4 minutes de plus pour que le Soleil revienne au même endroit du ciel. À l’équateur, le sol file à 1 674 km/h.',
        sourceId: NASA,
      },
    ],
    notes: [
      'La Terre est la seule planète connue avec de l’eau liquide à la surface, et la seule avec de la vie. Sa distance au Soleil permet cette eau : ni gelée, ni évaporée.',
      '« Pourquoi on ne sent pas la Terre tourner ? » Elle tourne à vitesse constante. On ne sent que les changements de vitesse, comme dans une voiture qui freine. Dans un avion qui vole droit à 900 km/h, on ne sent rien non plus.',
      '« Pourquoi il y a des saisons ? » À cause de l’axe de la Terre, incliné de 23,4°. L’hémisphère tourné vers le Soleil reçoit des rayons plus directs et des jours plus longs : c’est l’été. La distance joue très peu : la Terre est un peu plus près du Soleil début janvier, en plein hiver chez nous.',
      'La Terre avance sur son orbite à 29,8 km/s, soit plus de 107 000 km/h. Elle fait le tour du Soleil en un peu plus de 365 jours.',
      'Elle a une seule Lune. Mars en a deux, Jupiter 95, Saturne 274.',
    ],
  },

  moon: {
    titre: 'Lune',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '3 476 km',
        comparaison:
          'C’est un peu plus d’un quart du diamètre de la Terre (0,27). Un avion à 900 km/h le traverserait en 3 h 52 min.',
        sourceId: NASA_LUNE,
      },
      {
        libelle: 'Distance à la Terre',
        valeur: '384 400 km',
        comparaison:
          'Il faudrait aligner 30 Terres entre elle et nous. La lumière met 1,3 seconde pour faire le trajet. En voiture à 130 km/h, il faudrait 123 jours, soit un peu plus de 4 mois.',
        sourceId: NASA_LUNE,
      },
      {
        libelle: 'Durée d’une lunaison',
        valeur: '29,5 jours',
        comparaison:
          'C’est le temps entre deux pleines Lunes : un peu moins d’un mois. Le mot « mois » vient de là.',
        sourceId: NASA_LUNE,
      },
      {
        libelle: 'Pesanteur à la surface',
        valeur: '1,62 m/s²',
        comparaison:
          'C’est 0,17 fois la pesanteur terrestre (9,80 m/s²). Un enfant de 25 kg verrait 4 kg sur la balance.',
        sourceId: NASA_LUNE,
      },
    ],
    notes: [
      'La Lune montre toujours la même face à la Terre. Elle tourne sur elle-même en 27,3 jours, le temps qu’elle met à faire le tour de la Terre. La question de la voiture est traitée dans les notes du chapitre de la Lune.',
      'La Lune est à 30 Terres de nous. Pour que l’enfant le visualise : si la Terre est une balle de 6 cm, la Lune est une balle de 1,6 cm à 1,8 mètre.',
      'La Lune s’éloigne de la Terre d’environ 3,8 cm par an, à peu près la vitesse à laquelle poussent les ongles.',
      '« On peut marcher sur la Lune ? » Oui, douze astronautes l’ont fait entre 1969 et 1972. La pesanteur y est 6 fois plus faible : on y saute haut, mais il faut un scaphandre, parce qu’il n’y a pas d’air.',
      'Les phases, le lever, la face cachée et les éclipses ont leurs propres notes dans le chapitre de la Lune.',
    ],
  },

  mars: {
    titre: 'Mars',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '6 790 km',
        comparaison:
          'C’est 0,53 fois la Terre, à peu près la moitié. Un avion à 900 km/h le traverserait en 7 h 33 min.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '228 millions de km',
        comparaison:
          'La lumière du Soleil met 12 min 40 s pour y arriver. En voiture à 130 km/h, il faudrait 200 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '687 jours',
        comparaison:
          'C’est 1,9 année terrestre. À 7 ans sur Terre, on aurait 3,7 ans sur Mars.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '24 h 40 min',
        comparaison:
          'C’est 40 minutes de plus qu’un jour terrestre : le rythme d’une journée y serait presque le nôtre.',
        sourceId: NASA,
      },
    ],
    notes: [
      'Mars est rouge parce que son sol contient de la rouille, de l’oxyde de fer.',
      '« Est-ce qu’on peut y aller ? » Pas encore pour des personnes. Les sondes mettent environ 7 mois, et la distance varie de 55 à 401 millions de km selon la position des deux planètes : les lancements se font quand elles sont proches. Les messages radio mettent entre 3 et 22 minutes.',
      'Il y fait en moyenne -59 °C, et la pression de l’air est 160 fois plus faible qu’ici (6,4 mbar contre 1 014 mbar). Sans combinaison, on ne pourrait pas respirer.',
      'La pesanteur y est 0,38 fois la nôtre. Un enfant de 25 kg verrait 9,5 kg sur la balance.',
      'Mars a deux petites lunes, Phobos et Déimos. Phobos mesure environ 26 km sur sa plus grande longueur, Déimos environ 16 km. Ce sont des blocs en forme de pomme de terre, bien plus petits que la Lune.',
    ],
  },

  jupiter: {
    titre: 'Jupiter',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '143 000 km',
        comparaison:
          'Il faudrait aligner 11 Terres pour couvrir son diamètre. Un avion à 900 km/h mettrait 6 jours et 15 heures à le traverser.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '778 millions de km',
        comparaison:
          'La lumière du Soleil met 43 min 17 s pour y arriver. En voiture à 130 km/h, il faudrait 683 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '11,9 ans',
        comparaison:
          'Jupiter met presque 12 ans pour faire un tour. À 7 ans sur Terre, on aurait 0,6 an sur Jupiter, soit 7 mois.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '9 h 56 min',
        comparaison:
          'Jupiter fait 2,4 tours sur elle-même pendant que la Terre en fait un. Une journée y dure moins de 10 heures.',
        sourceId: NASA,
      },
    ],
    notes: [
      '« Est-ce qu’on peut marcher sur Jupiter ? » Non. Jupiter est une planète de gaz, sans sol : on s’enfoncerait dans des couches de plus en plus denses et chaudes. Les mesures de pesanteur se font à un niveau de référence, là où la pression est de 1 bar.',
      'À ce niveau, la pesanteur est 2,6 fois celle de la Terre. Un enfant de 25 kg verrait 66 kg sur la balance.',
      'Il rentrerait plus de 1 300 Terres dans Jupiter. Pourtant elle est moins dense que la Terre : 1 326 kg/m³ contre 5 513.',
      'Elle tourne très vite sur elle-même, en 9 h 56 min. Cette rotation étire les nuages en bandes et aplatit la planète aux pôles.',
      'La Grande Tache rouge est une tempête observée depuis plus de 150 ans. Elle est plus large que la Terre.',
      'Jupiter a 95 lunes connues. Quatre sont visibles avec des jumelles : Io, Europe, Ganymède et Callisto.',
    ],
  },

  saturn: {
    titre: 'Saturne',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '120 500 km',
        comparaison:
          'Il faudrait aligner 9,4 Terres pour couvrir son diamètre. Un avion à 900 km/h mettrait 5 jours et 14 heures à le traverser.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '1,43 milliard de km',
        comparaison:
          'La lumière du Soleil met 1 h 20 min pour y arriver. En voiture à 130 km/h, il faudrait 1 257 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '29,4 ans',
        comparaison:
          'Saturne met presque 30 ans pour faire un tour. À 7 ans sur Terre, on aurait 0,24 an sur Saturne, soit un peu moins de 3 mois.',
        sourceId: NASA,
      },
      {
        libelle: 'Largeur des anneaux principaux',
        valeur: '62 000 km',
        comparaison:
          'C’est presque 5 Terres alignées. Leur épaisseur, elle, est de 5 à 30 mètres, la hauteur d’un immeuble de 10 étages au plus.',
        sourceId: NASA_ANNEAUX,
      },
    ],
    notes: [
      '« Pourquoi Saturne flotterait dans l’eau ? » Sa densité moyenne est de 687 kg/m³, celle de l’eau de 1 000 : Saturne est moins dense que l’eau. Il n’existe pas de bassin assez grand pour le vérifier.',
      'Les anneaux sont faits de blocs de glace, de la taille d’un grain de poussière à celle d’une maison. Ils sont larges de 62 000 km et épais de 5 à 30 mètres. Réduits à la largeur d’un terrain de football (105 m), ils seraient épais de 0,05 mm, moins qu’une feuille de papier.',
      'Les anneaux sont visibles avec une petite lunette. Galilée les a vus en 1610 sans comprendre ce que c’était.',
      'Saturne a 274 lunes connues. La plus grosse, Titan, est plus large que Mercure et possède une atmosphère.',
      'Comme Jupiter, c’est une planète de gaz : on ne peut pas s’y poser.',
    ],
  },

  uranus: {
    titre: 'Uranus',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '51 100 km',
        comparaison:
          'C’est 4 fois la Terre. Un avion à 900 km/h mettrait 2 jours et 9 heures à le traverser.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '2,87 milliards de km',
        comparaison:
          'La lumière du Soleil met 2 h 39 min pour y arriver. En voiture à 130 km/h, il faudrait 2 516 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '84 ans',
        comparaison:
          'Une personne de 84 ans aurait fait un seul tour du Soleil sur Uranus. À 7 ans sur Terre, on aurait 1 mois.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '17 h 14 min',
        comparaison:
          'Uranus tourne sur elle-même en 17 heures, couchée sur le côté : son axe est incliné de 82°.',
        sourceId: NASA,
      },
    ],
    notes: [
      'Uranus est couchée sur le côté : son axe est incliné de 82° au lieu de 23° pour la Terre. Elle roule autour du Soleil comme une bille.',
      'Conséquence : chaque pôle reçoit environ 42 ans de lumière continue, puis 42 ans de nuit continue, puisque l’année dure 84 ans.',
      'Elle tourne aussi dans le sens inverse de la plupart des planètes. On ne sait pas avec certitude pourquoi, mais un choc ancien avec un gros objet est l’hypothèse la plus étudiée.',
      '« Pourquoi elle est bleu-vert ? » Le méthane de son atmosphère absorbe le rouge de la lumière du Soleil. Il reste le bleu et le vert.',
      'Elle est à la limite de la visibilité à l’œil nu dans un ciel très noir. Elle a été prise pour une étoile jusqu’en 1781, quand William Herschel a vu que c’était une planète.',
    ],
  },

  neptune: {
    titre: 'Neptune',
    chiffres: [
      {
        libelle: 'Diamètre',
        valeur: '49 500 km',
        comparaison:
          'C’est 3,9 fois la Terre. Un avion à 900 km/h mettrait 2 jours et 7 heures à le traverser.',
        sourceId: NASA,
      },
      {
        libelle: 'Distance moyenne au Soleil',
        valeur: '4,51 milliards de km',
        comparaison:
          'La lumière du Soleil met 4 h 11 min pour y arriver. En voiture à 130 km/h, il faudrait 3 962 ans.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée de l’année',
        valeur: '165 ans',
        comparaison:
          'Depuis sa découverte en 1846, Neptune a fait son premier tour du Soleil en 2011. Un enfant de 7 ans n’aurait vécu que 0,04 année de Neptune, environ 15 jours sur les 165 ans d’un tour.',
        sourceId: NASA,
      },
      {
        libelle: 'Durée du jour',
        valeur: '16 h 7 min',
        comparaison:
          'Neptune tourne 1,5 fois plus vite que la Terre : un peu plus de 16 heures par jour.',
        sourceId: NASA,
      },
    ],
    notes: [
      'Neptune a été trouvée par le calcul avant d’être vue. Urbain Le Verrier, un Français, a prédit sa position en 1846 d’après les irrégularités de l’orbite d’Uranus. L’astronome Galle l’a vue la nuit même où il a reçu la lettre.',
      'Elle est trop loin et trop faible pour être vue à l’œil nu. C’est la seule planète du système solaire dans ce cas.',
      'Il y fait très froid : -201 °C au niveau de 1 bar dans l’atmosphère. Vu de Neptune, le Soleil est 30 fois plus étroit que vu d’ici : un point très lumineux plutôt qu’un disque.',
      '« Pourquoi Neptune est bleue ? » Même explication qu’Uranus : le méthane absorbe le rouge. Le bleu de Neptune est un peu plus soutenu.',
      'Neptune a 16 lunes connues. La plus grosse, Triton, tourne à l’envers de la rotation de la planète.',
    ],
  },
};
