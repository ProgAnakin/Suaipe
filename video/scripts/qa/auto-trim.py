#!/usr/bin/env python3
"""Close the balance loop: events the coverage audit still finds MASKED get a few dB more, recorded in audio/trims.json (keyed "<picture event kind>@<time>",
read by scripts/export-cues.mjs), so the fix survives a regeneration and the cue sheet stays the single place the mix is described.

    python3 scripts/qa/av-coverage.py --json out/av.json
    python3 scripts/qa/auto-trim.py out/av.json        # raises the trims of the masked events (at most +4 dB per pass), prints what it did
    node scripts/export-cues.mjs && python3 tools/audio/generate.py     # and again, until the audit reports no masked event
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FLOOR = {"S": 3.0, "H": 6.0, "A": 2.5, "T": 1.0}      # the A-weighted floor of av-coverage.py (minor events: 2 dB lower, see MINOR_RELIEF there)
MARGIN = 1.5                                          # aim this far over the floor
MAX_STEP = 4.0
MAX_TRIM = 4.0        # a trim never makes a sound more than this much louder than its class: past it the music has to make room (tools/audio/mix.py), not the sound shout

rows = json.load(open(sys.argv[1]))["rows"]
path = os.path.join(ROOT, "audio", "trims.json")
trims = json.load(open(path)) if os.path.exists(path) else {}
n = 0
for r in rows:
    if r["verdict"] != "masked" or r["tier"] == "S":
        continue
    key = f'{r["kind"]}@{r["t"]:g}'
    floor = FLOOR[r["tier"]] - (2.0 if r.get("salience") == "minor" else 0.0)
    need = min(MAX_STEP, max(0.5, floor + MARGIN - r["rel_db"]))
    new = round(min(MAX_TRIM, trims.get(key, 0.0) + need), 1)
    if new <= trims.get(key, 0.0) + 1e-9:
        print(f"{key:28s} rel {r['rel_db']:5.1f} dB: already at the cap (+{MAX_TRIM:.1f} dB): the music must make room")
        continue
    trims[key] = new
    n += 1
    print(f'{key:28s} rel {r["rel_db"]:5.1f} dB -> trim now {trims[key]:+.1f} dB')
json.dump(dict(sorted(trims.items(), key=lambda kv: float(kv[0].split("@")[1]))), open(path, "w"), indent=1)
print(f"{n} trims raised, {len(trims)} in audio/trims.json")
