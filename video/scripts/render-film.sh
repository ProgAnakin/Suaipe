#!/bin/bash
# Renders the film in resumable chunks, then joins them, downsamples (optional supersampling) and muxes the soundtrack.
#
#   scripts/render-film.sh [SCALE] [CHUNKS]
#     SCALE   Remotion render scale (default 2 = 2160x2700, supersampled down to 1080x1350 with Lanczos; use 1 for a quick pass)
#     CHUNKS  number of frame ranges (default 8)
#
# Environment: REMOTION_BROWSER (optional), FFMPEG (a full ffmpeg; defaults to the one on PATH), CONCURRENCY (default 4).
# Re-running skips chunks that already exist in out/chunks/ (delete the folder to start over).
set -euo pipefail
cd "$(dirname "$0")/.."

SCALE=${1:-2}
CHUNKS=${2:-8}
CONCURRENCY=${CONCURRENCY:-4}
FFMPEG=${FFMPEG:-ffmpeg}
FPS=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const FPS = (\d+)/.exec(s)[1])")
DUR=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const DURATION_S = ([\d.]+)/.exec(s)[1])")
TOTAL=$(node -e "console.log(Math.round($DUR*$FPS))")
PER=$(( (TOTAL + CHUNKS - 1) / CHUNKS ))
mkdir -p out/chunks

echo "→ bundling"
npx remotion bundle src/index.ts --out-dir=out/bundle >/dev/null

for ((i=0; i<CHUNKS; i++)); do
  a=$(( i * PER )); b=$(( a + PER - 1 )); (( b > TOTAL - 1 )) && b=$(( TOTAL - 1 ))
  out=out/chunks/$(printf "%02d" $i).mp4
  if [[ -s $out ]]; then echo "→ chunk $i ($a-$b) exists, skipping"; continue; fi
  echo "→ chunk $i: frames $a-$b"
  npx remotion render out/bundle SuaipeFilm "$out" --frames=$a-$b --muted --scale=$SCALE --codec=h264 --crf=10 --pixel-format=yuv420p --color-space=bt709 \
    --image-format=png --gl=angle --concurrency=$CONCURRENCY --props='{"withAudio":false}' 2>&1 | grep -E "Rendered [0-9]+/[0-9]+$|rror" | tail -1
done

echo "→ joining + muxing"
: > out/chunks/list.txt
for ((i=0; i<CHUNKS; i++)); do echo "file '$(printf "%02d" $i).mp4'" >> out/chunks/list.txt; done
$FFMPEG -y -hide_banner -loglevel error -f concat -safe 0 -i out/chunks/list.txt -c copy out/joined.mp4

AUDIO=public/audio/soundtrack.wav
VF="scale=1080:1350:flags=lanczos,format=yuv420p"
[[ $SCALE == 1 ]] && VF="format=yuv420p"
if [[ -f $AUDIO ]]; then
  $FFMPEG -y -hide_banner -loglevel error -i out/joined.mp4 -i $AUDIO -map 0:v -map 1:a -vf "$VF" \
    -c:v libx264 -preset slow -crf 14 -profile:v high -level 4.2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/suaipe-film.mp4
else
  $FFMPEG -y -hide_banner -loglevel error -i out/joined.mp4 -an -vf "$VF" \
    -c:v libx264 -preset slow -crf 14 -profile:v high -level 4.2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -movflags +faststart out/suaipe-film.mp4
fi
ls -la out/suaipe-film.mp4
