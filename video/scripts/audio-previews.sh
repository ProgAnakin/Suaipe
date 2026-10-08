#!/bin/bash
# Listening package for the sound checkpoint (BRIEF v2, 4.9): one silent picture x every soundtrack variant -> small MP4s you can play
# on a phone, with headphones and on a laptop. Nothing here is the final render; it is only the fastest way to hear the mix in sync.
#
#   scripts/audio-previews.sh <master-picture.mp4> <cut-picture.mp4> [out-dir=out/audio-ab] [excerpt-start=14] [excerpt-len=20]
#
# <master-picture> is a silent render of SuaipeFilm (a half-resolution preview is fine), <cut-picture> one of SuaipeFilm15.
# Audio comes from tools/audio/generate.py:
#   public/audio/soundtrack.wav, soundtrack-15s.wav        direction A, the chosen one
#   out/audio-b/soundtrack-B.wav                           direction B (for the A/B excerpt)
#   <out-dir>/soundtrack_music-2.wav, soundtrack_sfx-3.wav the alternative mixes of the master (music -2 dB, effects -3 dB; --from-stems)
# Environment: FFMPEG (a full ffmpeg; defaults to the one on PATH).
set -euo pipefail
cd "$(dirname "$0")/.."

PIC=${1:?master picture}
CUTPIC=${2:?15 s picture}
OUT=${3:-out/audio-ab}
AT=${4:-14}
LEN=${5:-20}
FFMPEG=${FFMPEG:-ffmpeg}
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

mux "$PIC" public/audio/soundtrack.wav "$OUT/film-A.mp4"
[[ -f $OUT/soundtrack_music-2.wav ]] && mux "$PIC" "$OUT/soundtrack_music-2.wav" "$OUT/film-A-music-2.mp4"
[[ -f $OUT/soundtrack_sfx-3.wav ]] && mux "$PIC" "$OUT/soundtrack_sfx-3.wav" "$OUT/film-A-sfx-3.mp4"
if [[ -f out/audio-b/soundtrack-B.wav ]]; then
  mux "$PIC" public/audio/soundtrack.wav "$OUT/ab-${LEN}s-A.mp4" "$AT" "$LEN"
  mux "$PIC" out/audio-b/soundtrack-B.wav "$OUT/ab-${LEN}s-B.mp4" "$AT" "$LEN"
fi
mux "$CUTPIC" public/audio/soundtrack-15s.wav "$OUT/cut-15s-A.mp4"
ls -la "$OUT"/*.mp4
