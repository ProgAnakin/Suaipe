#!/bin/bash
# Listening package (BRIEF v2, 4.9): one silent picture x every soundtrack variant -> small MP4s you can play on a phone, with headphones and on a laptop.
# Nothing here is the final render; it is only the fastest way to hear the mix in sync.
#
#   scripts/audio-previews.sh <master-picture.mp4> <cut-picture.mp4> [out-dir=out/audio-ab] [excerpt-start=8] [excerpt-len=20]
#
# <master-picture> is a silent render of SuaipeFilm (a half-resolution preview is fine, scripts/render-preview.sh), <cut-picture> one of SuaipeFilm15.
# Audio (tools/audio/generate.py):
#   public/audio/soundtrack.wav, soundtrack-15s.wav            the film's sound: every picture event has its sound (qa/SOUND-AUDIT.md)
#   <out-dir>/soundtrack_effects-3.wav, soundtrack_effects+2.wav   the same mix with the effects 3 dB lower / 2 dB higher (generate.py --from-stems --sfx-gain-db)
#   out/audio-minimal/soundtrack.wav                           the first cut of this sound (65 effects), kept for the before / after excerpt
# Environment: FFMPEG (a full ffmpeg; defaults to the one on PATH).
set -euo pipefail
cd "$(dirname "$0")/.."

PIC=${1:?master picture}
CUTPIC=${2:?15 s picture}
OUT=${3:-out/audio-ab}
AT=${4:-8}
LEN=${5:-20}
FFMPEG=${FFMPEG:-ffmpeg}
BEFORE=out/audio-minimal/soundtrack.wav
mkdir -p "$OUT"

mux() { # <picture> <audio> <out> [start len]
  local pic=$1 aud=$2 out=$3
  if [[ $# -ge 5 ]]; then
    $FFMPEG -y -hide_banner -loglevel error -ss "$4" -t "$5" -i "$pic" -ss "$4" -t "$5" -i "$aud" -map 0:v -map 1:a \
      -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$out"
  else
    $FFMPEG -y -hide_banner -loglevel error -i "$pic" -i "$aud" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest \
      -movflags +faststart "$out"
  fi
  echo "→ $out"
}

mux "$PIC" public/audio/soundtrack.wav "$OUT/film-complete.mp4"
[[ -f $OUT/soundtrack_effects-3.wav ]] && mux "$PIC" "$OUT/soundtrack_effects-3.wav" "$OUT/film-complete-effects-minus3.mp4"
[[ -f $OUT/soundtrack_effects+2.wav ]] && mux "$PIC" "$OUT/soundtrack_effects+2.wav" "$OUT/film-complete-effects-plus2.mp4"
if [[ -f $BEFORE ]]; then
  mux "$PIC" "$BEFORE" "$OUT/ab-${AT}-$((AT + LEN))s-before.mp4" "$AT" "$LEN"
  mux "$PIC" public/audio/soundtrack.wav "$OUT/ab-${AT}-$((AT + LEN))s-after.mp4" "$AT" "$LEN"
fi
mux "$CUTPIC" public/audio/soundtrack-15s.wav "$OUT/cut-15s-complete.mp4"
ls -la "$OUT"/*.mp4
