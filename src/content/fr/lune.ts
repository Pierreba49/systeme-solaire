export const NOTES_LUNE: Record<'phases' | 'jour' | 'face-cachee' | 'eclipses', string[]> = {
  phases: [
    'La phase dépend de l’angle Soleil-Terre-Lune. Le Soleil éclaire toujours la moitié de la Lune qui lui fait face ; selon notre position, on voit plus ou moins de cette moitié éclairée.',
    'La phase n’est pas l’ombre de la Terre sur la Lune. L’ombre de la Terre ne touche la Lune que pendant une éclipse de Lune, et seulement à la pleine Lune. Le reste du mois, elle passe à côté.',
    'À la nouvelle Lune, l’angle est proche de 0° : la Lune est du même côté que le Soleil, et sa face éclairée est tournée à l’opposé de nous. À la pleine Lune, l’angle est proche de 180° : la Terre est entre les deux, et on voit toute la face éclairée. Aux quartiers, l’angle est de 90° et on voit une moitié.',
    'Un cycle complet dure 29,5 jours, de nouvelle Lune à nouvelle Lune. La Lune a besoin de 27,3 jours pour faire un tour de la Terre, mais la Terre avance sur son orbite pendant ce temps, et il faut 2 jours de plus pour retrouver le même angle avec le Soleil.',
    '« Pourquoi on voit la Lune en plein jour ? » Elle est au-dessus de l’horizon environ 12 heures sur 24, comme le Soleil, à des heures qui changent. Du premier quartier jusqu’à juste avant la pleine Lune, elle est levée dès l’après-midi. Après la pleine Lune, vers le dernier quartier et au-delà, elle se couche après le lever du Soleil : on la voit le matin, haute dans le ciel.',
    'Pour le montrer : une lampe pour le Soleil, une balle tenue à bout de bras pour la Lune, et l’enfant au centre pour la Terre. Il tourne sur lui-même et la balle fait son tour : il voit toutes les phases.',
  ],
  jour: [
    'Comme le Soleil, la Lune est au-dessus de l’horizon environ 12 heures par jour, mais pas aux mêmes heures. La durée varie un peu avec la saison et la latitude.',
    'Elle se lève environ 50 minutes plus tard chaque jour. La Lune avance de 12,2° par jour sur son orbite par rapport au Soleil, et la Terre met environ 49 minutes à tourner de cet angle (12,2° ÷ 15° par heure = 0,81 h).',
    'Conséquence sur les heures : la nouvelle Lune se lève avec le Soleil, le premier quartier vers midi, la pleine Lune au coucher du Soleil, le dernier quartier vers minuit. C’est pour cela qu’on voit la pleine Lune toute la nuit, et le croissant seulement près du Soleil.',
    '« Pourquoi la Lune nous suit en voiture ? » Elle est à 384 400 km. En une heure à 130 km/h, on avance de 130 km : l’angle sous lequel on la voit change de 0,02°, soit environ 1/27 de sa largeur apparente. Elle ne bouge pas dans le ciel, donc elle semble nous suivre, alors qu’un arbre au bord de la route défile. La vue du ciel de l’application montre où elle est à l’instant choisi, depuis Versailles ou depuis un autre lieu d’observation.',
    'Pour vérifier avec l’enfant : noter l’heure de lever ce soir, et la comparer demain. Elle aura bougé d’environ une heure.',
  ],
  'face-cachee': [
    'On voit toujours la même face de la Lune parce qu’elle tourne sur elle-même en 27,3 jours, exactement le temps qu’elle met à faire le tour de la Terre. C’est une rotation synchrone.',
    'La face cachée n’est pas une face sombre. Elle est éclairée autant que l’autre : à la nouvelle Lune, c’est elle qui reçoit le Soleil, et nous voyons l’autre côté dans l’ombre.',
    'On en voit en réalité un peu plus de la moitié, environ 59 %, parce que la Lune oscille légèrement sur son orbite. Ce balancement s’appelle la libration.',
    'Personne ne l’avait jamais vue avant 1959, quand la sonde soviétique Luna 3 en a pris les premières photos. Les astronautes d’Apollo 8 l’ont vue de leurs yeux en 1968.',
    '« Elle ressemble à l’autre ? » Pas tout à fait : la face cachée a beaucoup moins de grandes plaines sombres, les mers. On connaît la raison de cette différence en partie seulement : la croûte y est plus épaisse.',
  ],
  eclipses: [
    'Une éclipse est un alignement du Soleil, de la Terre et de la Lune : l’un des trois passe dans l’ombre d’un autre. Éclipse de Soleil à la nouvelle Lune, éclipse de Lune à la pleine Lune.',
    '« Pourquoi pas une éclipse chaque mois ? » L’orbite de la Lune est inclinée d’environ 5° sur celle de la Terre (5,1°). À la distance de la Lune, cet angle décale son orbite de 34 000 km au-dessus ou au-dessous du plan de la Terre : c’est près de trois fois le diamètre de la Terre. La plupart du temps, la Lune passe à côté de l’ombre.',
    'L’alignement n’est possible que lorsque la Lune traverse le plan de l’orbite de la Terre, à la nouvelle ou à la pleine Lune. Cela arrive deux fois par an environ, pendant des périodes d’environ un mois.',
    'Une éclipse totale de Soleil est possible parce que le Soleil et la Lune ont presque la même taille apparente dans le ciel : environ un demi-degré chacun (1 919 et 1 896 secondes d’arc). La Lune cache le disque du Soleil sans le dépasser beaucoup. Quand elle est plus loin de la Terre, elle paraît un peu plus petite et ne couvre plus tout le disque : l’éclipse est annulaire, et un anneau de Soleil reste visible autour de la Lune.',
    'Éclipse de Lune : visible de tout le côté nuit de la Terre, sans protection. La Lune devient rouge-orangé, parce que la lumière qui passe à travers l’atmosphère terrestre est rougie. Éclipse de Soleil : l’ombre de la Lune ne couvre qu’une bande étroite de la Terre, et il ne faut jamais la regarder sans lunettes spéciales.',
  ],
};
