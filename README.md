# Système solaire

PWA tablette présentant le système solaire en 3D réaliste (three.js), conçue pour qu'un adulte la présente à un enfant. Voir `CONTEXT.md` pour le glossaire.

## Commandes

- `npm run dev` : serveur de développement
- `npm test` : tests unitaires (Vitest)
- `npm run test:e2e` : tests de bout en bout (Playwright, Chromium ; `npx playwright install chromium` la première fois)
- `npm run build` : build de production ; `BASE_PATH` fixe le chemin de base (`/` par défaut, `/systeme-solaire/` pour GitHub Pages)

## Paramètres d'URL

- `?date=<ISO>` : date d'ancrage du chapitre La Lune (par exemple `?date=2026-11-09T12:00:00Z#lune`).
- `?qualite=haute|basse` : force le niveau de qualité ; sans paramètre, le choix du menu (conservé dans `localStorage`) ou la détection automatique.

## Textures et licences

Les textures ne sont pas dans le dépôt : `scripts/fetch-textures.sh` les télécharge et les redimensionne (macOS uniquement, `sips`). Elles viennent de Solar System Scope (CC BY 4.0) et du CGI Moon Kit de la NASA SVS (domaine public). Le code est sous licence MIT (`LICENSE`) ; les crédits complets sont dans l'écran Sources de l'application.

## Déploiement

- GitHub Pages : https://pierreba49.github.io/systeme-solaire/ (build avec `BASE_PATH=/systeme-solaire/`).
- Image Docker : `ghcr.io/pierreba49/systeme-solaire` (tags `latest` et `sha-<commit court>`), build avec `BASE_PATH=/`, nginx sur le port 80.

Le workflow `.github/workflows/deploy.yml` s'exécute à chaque push sur `main` : tests unitaires et e2e, puis publication Pages et image GHCR en parallèle.

### Auto-hébergement

```bash
docker run -d -p 8090:80 ghcr.io/pierreba49/systeme-solaire:latest
```

Le fichier `deploy/compose.yaml` fait la même chose avec Docker Compose. L'installation de la PWA exige HTTPS (sauf sur `localhost`) : placer l'image derrière un reverse proxy avec certificat.

Une PWA déjà ouverte récupère la nouvelle version à son lancement suivant : `autoUpdate` installe le nouveau service worker mais ne recharge pas la page ouverte.
