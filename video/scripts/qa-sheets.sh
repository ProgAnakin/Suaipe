#!/bin/bash
# Visual QA: extract a frame every INTERVAL seconds from a video and tile them into numbered contact sheets.
#   scripts/qa-sheets.sh <video.mp4> <out-dir> [interval=0.5] [cols=5] [tile-width=270] [per-sheet=20]
set -euo pipefail
FF=${FF:-/tmp/claude-0/-home-user-Suaipe/91ebded4-514a-5195-8835-fb6e819ce7ee/scratchpad/render-deps/node_modules/@ffmpeg-installer/linux-x64/ffmpeg}
vid=$1; out=$2; iv=${3:-0.5}; cols=${4:-5}; tw=${5:-270}; per=${6:-20}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out/frames"; rm -f "$out"/frames/*.png "$out"/sheet-*.png
$FF -y -hide_banner -loglevel error -i "$vid" -vf "fps=1/$iv,scale=$tw:-1" "$out/frames/f%04d.png"
mapfile -t all < <(ls "$out"/frames/f*.png)
n=${#all[@]}; s=0
for ((i=0; i<n; i+=per)); do
  s=$((s+1)); chunk=("${all[@]:i:per}")
  "$here/sheet.sh" "$out/sheet-$(printf "%02d" $s).png" "$cols" "$tw" "${chunk[@]}"
  t0=$(python3 -c "print(round($i*$iv,1))"); t1=$(python3 -c "print(round(($i+${#chunk[@]}-1)*$iv,1))")
  echo "sheet-$(printf "%02d" $s).png  t=${t0}s..${t1}s"
done
