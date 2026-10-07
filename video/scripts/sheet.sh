#!/bin/bash
# usage: sheet.sh <out.png> <cols> <tileWidth> <img1> <img2> ...   — quick contact sheet for visual QA
FF=${FF:-/tmp/claude-0/-home-user-Suaipe/91ebded4-514a-5195-8835-fb6e819ce7ee/scratchpad/render-deps/node_modules/@ffmpeg-installer/linux-x64/ffmpeg}
out=$1; cols=$2; w=$3; shift 3
n=$#; rows=$(( (n + cols - 1) / cols ))
args=(); filt=""; i=0
for f in "$@"; do args+=(-i "$f"); filt+="[$i:v]scale=$w:-1[s$i];"; i=$((i+1)); done
ins=""; for ((j=0;j<n;j++)); do ins+="[s$j]"; done
$FF -y -hide_banner -loglevel error "${args[@]}" -filter_complex "${filt}${ins}xstack=inputs=$n:layout=$(python3 - "$n" "$cols" <<'PY'
import sys
n,c=int(sys.argv[1]),int(sys.argv[2])
# layout string for xstack with equal tiles: use w0/h0 references of first input
parts=[]
for i in range(n):
    col=i%c; row=i//c
    x='+'.join(['w0']*col) if col else '0'
    y='+'.join(['h0']*row) if row else '0'
    parts.append(f"{x}_{y}")
print('|'.join(parts))
PY
)" -frames:v 1 "$out"
