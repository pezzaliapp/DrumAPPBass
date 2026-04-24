#!/usr/bin/env python3
"""
Genera 8 demo drum+bass v3 per DrumAPPBass.

Tutte le basslines sono ricostruzioni ritmico-armoniche generiche ispirate a
brani iconici — non copia di fonogrammi originali. Stessa filosofia dei demo
drum-only di DrumAPP: ritmo/groove è grammatica musicale comune.

Usage:
    python3 _build_bass_demos.py

Produce nella stessa cartella:
    demo-bass-sevennation.json
    demo-bass-anotherone.json
    demo-bass-billiejean.json
    demo-bass-superstition.json
    demo-bass-onedrop.json
    demo-bass-house.json
    demo-bass-boombap.json
    demo-bass-trap.json
"""

import json
import os
from datetime import datetime

# ---------- Template tracce drum ----------

def tp(volume=0.85, mute=False, solo=False, pitch=0, decay=1.0,
       ftype='off', fcut=0.7, fq=1.0, pan=0.0):
    return {
        "volume": volume, "mute": mute, "solo": solo,
        "pitch": pitch, "decay": decay,
        "filterType": ftype, "filterCutoff": fcut, "filterQ": fq,
        "pan": pan,
    }

# Ordine tracce DrumAPP: 0=kick 1=snare 2=hihat 3=openhat 4=clap 5=tom 6=rim 7=cow
def default_drum_params():
    return [
        tp(volume=0.9, pitch=-2, decay=1.3),   # kick
        tp(volume=0.82),                       # snare
        tp(volume=0.65, pan=0.3, decay=0.7),   # hihat
        tp(volume=0.55, pan=0.3, decay=1.2),   # openhat
        tp(volume=0.75, pan=-0.3),             # clap
        tp(volume=0.6),                        # tom
        tp(volume=0.55),                       # rim
        tp(volume=0.55, pan=0.4),              # cow
    ]

def cell(vel=0.9, prob=100, ratch=1, nudge=0):
    return {"vel": vel, "prob": prob, "ratch": ratch, "nudge": nudge}

def empty_drum_pattern(length=16):
    return [[None] * length for _ in range(8)]

def set_steps(row, steps, **kw):
    for s in steps:
        row[s] = cell(**kw)

# ---------- Bass ----------

def bass_params(volume=0.82, pan=0.0, cutoff=0.4, resonance=5.0,
                envAmount=0.7, decay=250, drive=0.2):
    return {
        "volume": volume, "mute": False, "solo": False, "pan": pan,
        "cutoff": cutoff, "resonance": resonance,
        "envAmount": envAmount, "decay": decay, "drive": drive,
    }

def bass_cell(note, vel=0.9, length=0.5, accent=False, slide=False):
    return {"note": note, "vel": vel, "len": length,
            "accent": accent, "slide": slide}

def empty_bass_pattern(length=16):
    return [None] * length

# ---------- Builder demo ----------

def make_demo(bpm, swing, pattern_len, drum_params, drum_A, bass_params_obj,
              bass_A, humanize=False, song=None):
    return {
        "version": 3,
        "exportedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "bpm": bpm,
        "swing": swing,
        "patternLength": pattern_len,
        "humanize": humanize,
        "trackParams": drum_params,
        "patterns": {
            "A": drum_A,
            "B": empty_drum_pattern(pattern_len),
            "C": empty_drum_pattern(pattern_len),
            "D": empty_drum_pattern(pattern_len),
        },
        "songSequence": song or ["A", "A", "A", "A"],
        "bass": {
            "trackParams": bass_params_obj,
            "patterns": {
                "A": bass_A,
                "B": empty_bass_pattern(pattern_len),
                "C": empty_bass_pattern(pattern_len),
                "D": empty_bass_pattern(pattern_len),
            },
            "liveLoops": {"A": [], "B": [], "C": [], "D": []},
            "mode": "step",
        },
    }

# ==============================================================
# Le 8 demo
# ==============================================================

def demo_sevennation():
    """Stadium rock 124 BPM, bassline 7-note stile E-G-E-D-C-B-E."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 8], vel=1.0)            # kick 1 e 3
    set_steps(drum[1], [4, 12], vel=0.9)           # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)    # hihat offbeat
    bass = empty_bass_pattern()
    # 7 note discendenti distribuite
    notes = [("E2", 0), ("E2", 2), ("G2", 4), ("E2", 6),
             ("D2", 8), ("C2", 10), ("B1", 12), ("E2", 14)]
    for note, step in notes:
        bass[step] = bass_cell(note, vel=0.9, length=0.6,
                               accent=(step in (0, 8)))
    return make_demo(124, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.45, resonance=3.5,
                                 envAmount=0.6, decay=220, drive=0.25),
                     bass)

def demo_anotherone():
    """Rock-disco 110 BPM, ostinato E basso four-on-the-floor con slide finale."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 4, 8, 12])               # kick 4/4
    set_steps(drum[1], [4, 12], vel=0.85)           # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)
    bass = empty_bass_pattern()
    for step in [0, 2, 4, 6, 8, 10, 12]:
        bass[step] = bass_cell("E1", vel=0.85, length=0.45)
    bass[14] = bass_cell("G1", vel=0.9, length=0.7, slide=True)
    return make_demo(110, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.42, resonance=4.0,
                                 envAmount=0.55, decay=200, drive=0.3),
                     bass)

def demo_billiejean():
    """Linn-style 117 BPM, bass sincopato F#1 A1 B1 A1 F#1 E1."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 10])                     # kick 1 e 2.5 (off)
    set_steps(drum[1], [4, 12])                     # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)
    bass = empty_bass_pattern()
    pattern = [
        ("F#1", 0, True),
        ("F#1", 2, False),
        ("F#1", 4, False),
        ("A1", 6, False),
        ("B1", 8, True),
        ("A1", 10, False),
        ("F#1", 12, False),
        ("E1", 14, False),
    ]
    for note, step, acc in pattern:
        bass[step] = bass_cell(note, vel=0.88, length=0.5, accent=acc)
    return make_demo(117, 8, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.4, resonance=5.0,
                                 envAmount=0.65, decay=220, drive=0.2),
                     bass, humanize=True)

def demo_superstition():
    """Funk 100 BPM 16th, bassline sincopata con pause e slide."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 6, 10])                   # kick funky
    set_steps(drum[1], [4, 12], vel=0.9)
    set_steps(drum[2], list(range(0, 16, 2)), vel=0.55)
    set_steps(drum[2], [1, 3, 5, 7, 9, 11, 13, 15], vel=0.35)   # ghost 16th
    bass = empty_bass_pattern()
    pattern = [
        ("E1", 0, True, False),
        ("G1", 2, False, True),
        ("E1", 3, False, False),
        ("D1", 5, False, False),
        ("E1", 7, False, False),
        ("G1", 8, True, True),
        ("E1", 9, False, False),
        ("D1", 11, False, False),
        ("C1", 13, False, True),
        ("E1", 14, False, False),
    ]
    for note, step, acc, sl in pattern:
        bass[step] = bass_cell(note, vel=0.85, length=0.35, accent=acc, slide=sl)
    return make_demo(100, 24, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.5, resonance=6.0,
                                 envAmount=0.75, decay=180, drive=0.35),
                     bass, humanize=True)

def demo_onedrop():
    """Reggae 80 BPM one-drop: kick e snare insieme sul 3. Bass pulsante 2-4."""
    drum = empty_drum_pattern()
    drum[0][8] = cell(vel=1.0)                       # kick solo sul 3
    drum[1][8] = cell(vel=0.9)                       # snare sul 3
    set_steps(drum[2], [0, 2, 4, 6, 10, 12, 14], vel=0.55)
    bass = empty_bass_pattern()
    # reggae skank: pause su 1, attacchi 2 e 4
    bass[4] = bass_cell("A1", vel=0.85, length=0.7, accent=True)
    bass[6] = bass_cell("G1", vel=0.75, length=0.3)
    bass[12] = bass_cell("A1", vel=0.85, length=0.7, accent=True)
    bass[14] = bass_cell("E1", vel=0.75, length=0.3)
    return make_demo(80, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.35, resonance=4.5,
                                 envAmount=0.6, decay=300, drive=0.2),
                     bass)

def demo_house():
    """House 124 BPM four-on-the-floor, basso 1/8 con pattern di accenti."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 4, 8, 12])                # kick 4/4
    set_steps(drum[1], [4, 12], vel=0.85)
    set_steps(drum[2], [2, 6, 10, 14], vel=0.7)      # off-beat closed
    set_steps(drum[3], [6, 14], vel=0.5)             # open hat off
    set_steps(drum[4], [4, 12], vel=0.6)             # clap
    bass = empty_bass_pattern()
    # 8 note ripetute (eighth) con accent sul 1 e 9
    for i, s in enumerate([0, 2, 4, 6, 8, 10, 12, 14]):
        acc = (s in (0, 8))
        bass[s] = bass_cell("A1" if i % 4 != 2 else "C2",
                            vel=0.82, length=0.4, accent=acc)
    return make_demo(124, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.5, resonance=5.0,
                                 envAmount=0.65, decay=140, drive=0.25),
                     bass, humanize=True)

def demo_boombap():
    """Hip-hop 90 BPM boom-bap, basso con slide alla dominante."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 7, 8], vel=1.0)           # kick syncopato
    set_steps(drum[1], [4, 12], vel=0.9)
    set_steps(drum[2], list(range(0, 16, 2)), vel=0.55)
    bass = empty_bass_pattern()
    pattern = [
        ("D1", 0, True, False),
        ("D1", 3, False, False),
        ("A1", 5, False, True),     # slide
        ("D1", 7, False, False),
        ("D1", 8, True, False),
        ("F1", 11, False, True),    # slide
        ("D1", 13, False, False),
    ]
    for note, step, acc, sl in pattern:
        bass[step] = bass_cell(note, vel=0.82, length=0.4, accent=acc, slide=sl)
    return make_demo(90, 52, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.38, resonance=4.0,
                                 envAmount=0.55, decay=260, drive=0.3),
                     bass, humanize=True)

def demo_trap():
    """Trap 140 BPM con ratchet hats e sub-bass 808-style (low + long + drive)."""
    dp = default_drum_params()
    # Kick bello grave
    dp[0]["pitch"] = -4
    dp[0]["decay"] = 1.6
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 7, 10], vel=1.0)
    set_steps(drum[1], [4, 12], vel=0.85)
    # Hats ottavi con ratchet su alcuni step
    for s in range(0, 16, 2):
        drum[2][s] = cell(vel=0.65)
    drum[2][6]  = cell(vel=0.6, ratch=3)
    drum[2][14] = cell(vel=0.6, ratch=4)
    bass = empty_bass_pattern()
    # Sub 808: note molto basse con decay lungo
    bass[0]  = bass_cell("C1",  vel=1.0, length=0.9, accent=True)
    bass[3]  = bass_cell("C1",  vel=0.8, length=0.3)
    bass[7]  = bass_cell("F1",  vel=0.9, length=0.5, slide=True)
    bass[8]  = bass_cell("D#1", vel=0.85, length=0.6)
    bass[12] = bass_cell("A#0", vel=0.95, length=0.9, accent=True)
    return make_demo(140, 0, 16, dp, drum,
                     bass_params(cutoff=0.28, resonance=7.0,
                                 envAmount=0.5, decay=500, drive=0.55),
                     bass)

# ---------- main ----------

DEMOS = {
    "demo-bass-sevennation.json":  demo_sevennation,
    "demo-bass-anotherone.json":   demo_anotherone,
    "demo-bass-billiejean.json":   demo_billiejean,
    "demo-bass-superstition.json": demo_superstition,
    "demo-bass-onedrop.json":      demo_onedrop,
    "demo-bass-house.json":        demo_house,
    "demo-bass-boombap.json":      demo_boombap,
    "demo-bass-trap.json":         demo_trap,
}

def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    for name, fn in DEMOS.items():
        data = fn()
        path = os.path.join(out_dir, name)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"wrote {name}")

if __name__ == "__main__":
    main()
