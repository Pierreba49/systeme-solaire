#!/usr/bin/env bash
# Télécharge les textures (Solar System Scope CC BY 4.0, NASA SVS domaine public),
# les redimensionne avec sips et les range dans public/textures/{low,high}/.
# Usage : scripts/fetch-textures.sh   (macOS uniquement : sips)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_LOW="$ROOT/public/textures/low"
OUT_HIGH="$ROOT/public/textures/high"
SSS="https://www.solarsystemscope.com/textures/download"
MOON_URL="https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif"
HIGH_QUALITY="${HIGH_QUALITY:-85}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT_LOW" "$OUT_HIGH"

# fetch URL DEST : télécharge puis vérifie que le contenu est une image. Échec -> arrêt.
fetch() {
  local url="$1" dest="$2" mime
  curl -fsSL --retry 2 -o "$dest" "$url" || return 1
  mime="$(file --brief --mime-type "$dest")"
  [[ "$mime" == image/* ]] || { echo "ERREUR : $url n'est pas une image ($mime)" >&2; exit 1; }
}

# Corps Solar System Scope : nom sans préfixe, extension, et s'il existe en 8k
BODIES_8K=(sun.jpg mercury.jpg venus_atmosphere.jpg earth_daymap.jpg earth_nightmap.jpg earth_clouds.jpg mars.jpg jupiter.jpg saturn.jpg stars_milky_way.jpg)
BODIES_2K_ONLY=(uranus.jpg neptune.jpg saturn_ring_alpha.png)

for name in "${BODIES_8K[@]}" "${BODIES_2K_ONLY[@]}"; do
  fetch "$SSS/2k_$name" "$TMP/2k_$name" || { echo "ERREUR : échec 2k $SSS/2k_$name" >&2; exit 1; }
  cp "$TMP/2k_$name" "$OUT_LOW/$name"
done

for name in "${BODIES_8K[@]}"; do
  if fetch "$SSS/8k_$name" "$TMP/8k_$name"; then
    sips -z 2048 4096 -s format jpeg -s formatOptions "$HIGH_QUALITY" "$TMP/8k_$name" --out "$OUT_HIGH/$name" >/dev/null
  else
    echo "AVERTISSEMENT : 8k indisponible pour $name, repli sur 2k" >&2
    cp "$TMP/2k_$name" "$OUT_HIGH/$name"
  fi
done
for name in "${BODIES_2K_ONLY[@]}"; do cp "$TMP/2k_$name" "$OUT_HIGH/$name"; done

# Lune (NASA SVS)
fetch "$MOON_URL" "$TMP/moon.tif" || { echo "ERREUR : échec $MOON_URL" >&2; exit 1; }
sips -z 2048 4096 -s format jpeg -s formatOptions 85 "$TMP/moon.tif" --out "$OUT_HIGH/moon.jpg" >/dev/null
sips -z 1024 2048 -s format jpeg -s formatOptions 85 "$TMP/moon.tif" --out "$OUT_LOW/moon.jpg" >/dev/null

echo "OK"
