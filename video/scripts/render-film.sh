#!/bin/bash
# Production render: resumable chunks -> joined (stream copy) -> soundtrack muxed.
#
#   scripts/render-film.sh [SCALE] [CHUNKS]
#     SCALE   Remotion render scale (default 1 = 1080x1350). 2 renders 2160x2700 and Lanczos-downsamples to 1080x1350:
#             a hair crisper on hairlines, ~4x slower — see README.
#     CHUNKS  number of frame ranges (default 6)
#
# Environment: REMOTION_BROWSER (optional), FFMPEG (a full ffmpeg; defaults to the one on PATH), CONCURRENCY (default 4).
# Re-running skips chunks that already exist in out/chunks/ (delete the folder to start over).
set -euo pipefail
cd "$(dirname "$0")/.."

SCALE=${1:-1}
CHUNKS=${2:-6}
CONCURRENCY=${CONCURRENCY:-4}
FFMPEG=${FFMPEG:-ffmpeg}
FPS=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const FPS = (\d+)/.exec(s)[1])")
DUR=$(node -e "const s=require('fs').readFileSync('src/timeline.ts','utf8');console.log(/export const DURATION_S = ([\d.]+)/.exec(s)[1])")
TOTAL=$(node -e "console.log(Math.round($DUR*$FPS))")
PER=$(( (TOTAL + CHUNKS - 1) / CHUNKS ))
mkdir -p out/chunks

echo "→ bundling"
rm -rf out/bundle
npx remotion bundle src/index.ts --out-dir=out/bundle >/dev/null

for ((i=0; i<CHUNKS; i++)); do
  a=$(( i * PER )); b=$(( a + PER - 1 )); (( b > TOTAL - 1 )) && b=$(( TOTAL - 1 ))
  out=out/chunks/$(printf "%02d" $i).mp4
  if [[ -s $out ]]; then echo "→ chunk $i ($a-$b) exists, skipping"; continue; fi
  echo "→ chunk $i: frames $a-$b"
  npx remotion render out/bundle SuaipeFilm "$out" --frames=$a-$b --muted --scale=$SCALE --codec=h264 --crf=17 --max-rate=20M --buffer-size=40M --x264-preset=slow \
    --pixel-format=yuv420p --color-space=bt709 --image-format=png --gl=angle --concurrency=$CONCURRENCY \
    --props='{"withAudio":false}' > "out/chunks/$(printf "%02d" $i).log" 2>&1 || { echo "chunk $i failed, see out/chunks/$(printf "%02d" $i).log"; exit 1; }
done

echo "→ joining + muxing"
: > out/chunks/list.txt
for ((i=0; i<CHUNKS; i++)); do echo "file '$(printf "%02d" $i).mp4'" >> out/chunks/list.txt; done

AUDIO=public/audio/soundtrack.wav
[[ -f $AUDIO ]] || AUDIO=""
if [[ $SCALE == 1 ]]; then
  # single-generation video: the chunks are stream-copied
  if [[ -n $AUDIO ]]; then
    $FFMPEG -y -hide_banner -loglevel error -f concat -safe 0 -i out/chunks/list.txt -i "$AUDIO" -map 0:v -map 1:a -c:v copy \
      -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/suaipe-film.mp4
  else
    $FFMPEG -y -hide_banner -loglevel error -f concat -safe 0 -i out/chunks/list.txt -c copy -movflags +faststart out/suaipe-film.mp4
  fi
else
  $FFMPEG -y -hide_banner -loglevel error -f concat -safe 0 -i out/chunks/list.txt -c copy out/joined.mp4
  AIN=(); AMAP=(-an); if [[ -n $AUDIO ]]; then AIN=(-i "$AUDIO"); AMAP=(-map 0:v -map 1:a -c:a aac -b:a 320k -ar 48000 -shortest); fi
  $FFMPEG -y -hide_banner -loglevel error -i out/joined.mp4 "${AIN[@]}" "${AMAP[@]}" -vf "scale=1080:1350:flags=lanczos,format=yuv420p" \
    -c:v libx264 -preset slow -crf 14 -profile:v high -level 4.2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -movflags +faststart out/suaipe-film.mp4
fi
ls -la out/suaipe-film.mp4
