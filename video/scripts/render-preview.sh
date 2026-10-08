#!/bin/bash
# Half-resolution, silent preview of a composition, in resumable chunks (the scheme of render-film.sh, ~4x quicker): for contact sheets,
# continuity checks and the listening package. Not a deliverable.
#
#   scripts/render-preview.sh <out.mp4> [Composition=SuaipeFilm] [CHUNKS=6]
#
# Chunks land in out/preview-chunks/<name>/NN.mp4; delete one to re-render just that part after a fix, delete the folder to start over.
# Environment: REMOTION_BROWSER (see remotion.config.ts), FFMPEG (a full ffmpeg; defaults to the one on PATH), CONCURRENCY (default 4).
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=${1:?out.mp4}
COMP=${2:-SuaipeFilm}
CHUNKS=${3:-6}
CONCURRENCY=${CONCURRENCY:-4}
FFMPEG=${FFMPEG:-ffmpeg}
FPS=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const FPS = (\d+)/.exec(s)[1])")
case $COMP in
  SuaipeFilm)   DUR=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const DURATION_S = ([\d.]+)/.exec(s)[1])") ;;
  SuaipeFilm15) DUR=$(node -e "const s=require('fs').readFileSync('src/cutdown.ts','utf8');console.log(/export const CUT_DURATION_S = ([\d.]+)/.exec(s)[1])") ;;
  *) echo "unknown composition $COMP (SuaipeFilm or SuaipeFilm15)"; exit 1 ;;
esac
TOTAL=$(node -e "console.log(Math.round($DUR*$FPS))")
PER=$(( (TOTAL + CHUNKS - 1) / CHUNKS ))
DIR=out/preview-chunks/$(basename "$OUT" .mp4)
mkdir -p "$DIR" "$(dirname "$OUT")"

echo "→ bundling"
rm -rf out/bundle-preview
npx remotion bundle src/index.ts --out-dir=out/bundle-preview >/dev/null

for ((i=0; i<CHUNKS; i++)); do
  a=$(( i * PER )); b=$(( a + PER - 1 )); (( b > TOTAL - 1 )) && b=$(( TOTAL - 1 ))
  (( a > b )) && continue
  chunk=$DIR/$(printf "%02d" $i).mp4
  if [[ -s $chunk ]]; then echo "→ chunk $i ($a-$b) exists, skipping"; continue; fi
  echo "→ chunk $i: frames $a-$b"
  npx remotion render out/bundle-preview "$COMP" "$chunk" --frames=$a-$b --muted --scale=0.5 --codec=h264 --crf=20 --x264-preset=fast \
    --pixel-format=yuv420p --image-format=jpeg --jpeg-quality=92 --gl=angle --concurrency=$CONCURRENCY --props='{"withAudio":false}' \
    > "$DIR/$(printf "%02d" $i).log" 2>&1 || { echo "chunk $i failed, see $DIR/$(printf "%02d" $i).log"; exit 1; }
done

: > "$DIR/list.txt"
for f in "$DIR"/[0-9][0-9].mp4; do echo "file '$(basename "$f")'" >> "$DIR/list.txt"; done
$FFMPEG -y -hide_banner -loglevel error -f concat -safe 0 -i "$DIR/list.txt" -c copy -movflags +faststart "$OUT"
ls -la "$OUT"
