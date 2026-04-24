#!/usr/bin/env python3
"""
Genera 4 demo drum+bass v3 curate per DrumAPPBass.

Le demo sono astratte per GENERE (non ricostruzioni di brani specifici):
groove e bassline intenzionali, scritte con approccio da bassista.

Usage:
    python3 _build_bass_demos.py

Produce nella stessa cartella:
    demo-bass-house.json    (A minor, 124 BPM, four-on-the-floor)
    demo-bass-onedrop.json  (A minor, 80 BPM, reggae one-drop)
    demo-bass-boombap.json  (D minor, 90 BPM, swing 55, hip-hop boom bap)
    demo-bass-trap.json     (F minor, 140 BPM, trap 808 sub)

Nota sugli enarmonici: il parser app.js accetta solo sharps (C#/D#/F#/G#/A#),
non flats. Quindi Eb -> D#, Ab -> G#, Bb -> A#. Enarmonicamente identiche.
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

def set_steps_0(row, steps_0idx, **kw):
    """Imposta step su una traccia drum, step 0-indexed."""
    for s in steps_0idx:
        row[s] = cell(**kw)

# ---------- Bass ----------

def bass_params(volume=0.75, pan=0.0, cutoff=0.4, resonance=5.0,
                envAmount=0.5, decay=250, drive=0.2):
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
        "masterDrum": 0.9,
        "masterBass": 0.8,
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
# DEMO 1 — HOUSE (A minor, 124 BPM, four-on-the-floor)
# ==============================================================

def demo_house():
    """A minor, 124 BPM, four-on-the-floor.
    Bassline sulla tonica A1 con accent sui 4 downbeat e slide di
    passaggio G2 -> E2 a fine misura per tensione/release."""
    drum = empty_drum_pattern()
    # kick 1/5/9/13  (step 0,4,8,12 zero-indexed)
    set_steps_0(drum[0], [0, 4, 8, 12], vel=1.0)
    # snare 5/13
    set_steps_0(drum[1], [4, 12], vel=0.85)
    # closed hat tutti i 16 step
    set_steps_0(drum[2], list(range(16)), vel=0.55)
    # open hat 7/15 (off-beat)
    set_steps_0(drum[3], [6, 14], vel=0.5)

    # Bass A minor (tonica A1), scala A C D E G A
    # 1-indexed nel prompt, 0-indexed qui
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("A1", vel=0.85, length=0.35, accent=True)     # step 1
    # step 2 null
    bass[2]  = bass_cell("A1", vel=0.65, length=0.25)                  # step 3
    # step 4 null
    bass[4]  = bass_cell("A1", vel=0.85, length=0.35, accent=True)     # step 5
    # step 6 null
    bass[6]  = bass_cell("A1", vel=0.60, length=0.20)                  # step 7
    bass[7]  = bass_cell("E2", vel=0.70, length=0.20)                  # step 8
    bass[8]  = bass_cell("A1", vel=0.85, length=0.35, accent=True)     # step 9
    # step 10 null
    bass[10] = bass_cell("A1", vel=0.65, length=0.25)                  # step 11
    # step 12 null
    bass[12] = bass_cell("A1", vel=0.85, length=0.35, accent=True)     # step 13
    # step 14 null
    bass[14] = bass_cell("G2", vel=0.70, length=0.30, slide=True)      # step 15
    bass[15] = bass_cell("E2", vel=0.75, length=0.25)                  # step 16

    return make_demo(
        bpm=124, swing=0, pattern_len=16,
        drum_params=default_drum_params(), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.7, cutoff=0.55, resonance=3.0,
            envAmount=0.5, decay=120, drive=0.15,
        ),
        bass_A=bass,
    )

# ==============================================================
# DEMO 2 — ONE-DROP (A minor, 80 BPM, reggae)
# ==============================================================

def demo_onedrop():
    """A minor, 80 BPM, reggae one-drop.
    Il kick suona SOLO sul 3 (one-drop). Il basso reggae suona DOPO il
    kick, crea suspense con pause strategiche, enfatizza upbeat.
    Niente drive, decay medio, cutoff morbido per carattere reggae."""
    drum = empty_drum_pattern()
    # Kick SOLO step 9 (0-idx 8)  → il famoso one-drop
    drum[0][8] = cell(vel=1.0)
    # Snare step 5/13 (0-idx 4/12)
    set_steps_0(drum[1], [4, 12], vel=0.9)
    # Rimshot step 9 (0-idx 8) accenta il drop insieme al kick
    drum[6][8] = cell(vel=0.75)
    # Hat step 3/7/11/15 (0-idx 2/6/10/14) — skank off-beat reggae
    set_steps_0(drum[2], [2, 6, 10, 14], vel=0.65)

    # Bass A minor: la pausa e' sacra in reggae
    bass = empty_bass_pattern()
    # step 1/2 null
    bass[2]  = bass_cell("A1", vel=0.70, length=0.30)                  # step 3
    # step 4/5/6 null
    bass[6]  = bass_cell("C2", vel=0.75, length=0.35)                  # step 7
    # step 8/9/10 null  (step 9 = kick one-drop: bass lascia spazio)
    bass[10] = bass_cell("A1", vel=0.80, length=0.40, accent=True)     # step 11
    # step 12 null
    bass[12] = bass_cell("E2", vel=0.70, length=0.30)                  # step 13
    # step 14 null
    bass[14] = bass_cell("G1", vel=0.75, length=0.35)                  # step 15
    # step 16 null

    return make_demo(
        bpm=80, swing=0, pattern_len=16,
        drum_params=default_drum_params(), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.75, cutoff=0.40, resonance=2.0,
            envAmount=0.35, decay=200, drive=0.10,
        ),
        bass_A=bass,
    )

# ==============================================================
# DEMO 3 — BOOM BAP (D minor, 90 BPM, swing 55)
# ==============================================================

def demo_boombap():
    """D minor, 90 BPM, swing 55, hip-hop boom bap.
    Poche note: tonica D1, terza F1, quinta A1. Accent sul downbeat.
    Slide di passaggio C2 -> D2 a fine misura per cadenza perfetta."""
    drum = empty_drum_pattern()
    # kick step 1 + 11  (0-idx 0, 10)  — boom bap signature
    set_steps_0(drum[0], [0, 10], vel=1.0)
    # snare step 5/13 (0-idx 4/12)
    set_steps_0(drum[1], [4, 12], vel=0.9)
    # hat 16th con velocity ghost alternata: on-beat forte, off-beat ghost
    for s in range(16):
        v = 0.65 if s % 2 == 0 else 0.35   # ghost notes 16th
        drum[2][s] = cell(vel=v)

    # Bass D minor: tonica D1, terza minore F1, quinta A1
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("D1", vel=0.90, length=0.50, accent=True)     # step 1
    # step 2/3 null
    bass[3]  = bass_cell("D1", vel=0.55, length=0.20)                  # step 4
    # step 5/6 null
    bass[6]  = bass_cell("F1", vel=0.70, length=0.35)                  # step 7
    # step 8 null
    bass[8]  = bass_cell("A1", vel=0.80, length=0.40, accent=True)     # step 9
    # step 10/11 null
    bass[11] = bass_cell("D1", vel=0.55, length=0.20)                  # step 12
    # step 13/14 null
    bass[14] = bass_cell("C2", vel=0.70, length=0.30, slide=True)      # step 15
    bass[15] = bass_cell("D2", vel=0.65, length=0.25)                  # step 16

    return make_demo(
        bpm=90, swing=55, pattern_len=16,
        drum_params=default_drum_params(), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.75, cutoff=0.50, resonance=3.0,
            envAmount=0.55, decay=180, drive=0.20,
        ),
        bass_A=bass,
        humanize=True,
    )

# ==============================================================
# DEMO 4 — TRAP 808 (F minor, 140 BPM)
# ==============================================================

def demo_trap():
    """F minor, 140 BPM, trap 808.
    Sub-bass: poche note LUNGHE, niente riempimenti, lascia respirare il
    beat. Cutoff basso, decay lungo, drive moderato.
    Nota: Eb -> D# e Ab -> G# enarmonici (parser accetta solo sharps)."""
    dp = default_drum_params()
    dp[0]["pitch"] = -4      # kick 808 grave
    dp[0]["decay"] = 1.6

    drum = empty_drum_pattern()
    # kick step 1/7/11  (0-idx 0, 6, 10)
    set_steps_0(drum[0], [0, 6, 10], vel=1.0)
    # snare step 5/13 (0-idx 4/12)
    set_steps_0(drum[1], [4, 12], vel=0.85)
    # closed hat: velocity varia + ratchet 2x/3x su step 3/7/11/15 (0-idx 2/6/10/14)
    for s in range(0, 16, 2):
        drum[2][s] = cell(vel=0.65)        # on-beat ottavi
    # Ratchet trap signature
    drum[2][2]  = cell(vel=0.6, ratch=2)
    drum[2][6]  = cell(vel=0.6, ratch=3)
    drum[2][10] = cell(vel=0.6, ratch=2)
    drum[2][14] = cell(vel=0.6, ratch=3)

    # Bass F minor: F1 tonica, G#1 (=Ab1) VII, D#2 (=Eb2) VII alto, C2 quinta
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("F1",  vel=0.90, length=0.95, accent=True)    # step 1 sub lungo
    # step 2/3/4/5/6 null
    bass[6]  = bass_cell("D#2", vel=0.80, length=0.50, slide=True)     # step 7 glide (= Eb2)
    # step 8 null
    bass[8]  = bass_cell("G#1", vel=0.85, length=0.80, accent=True)    # step 9 sub (= Ab1)
    # step 10/11/12/13 null
    # step 14 null
    bass[14] = bass_cell("C2",  vel=0.75, length=0.35)                 # step 15
    # step 16 null

    return make_demo(
        bpm=140, swing=0, pattern_len=16,
        drum_params=dp, drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.78, cutoff=0.28, resonance=4.0,
            envAmount=0.65, decay=400, drive=0.35,
        ),
        bass_A=bass,
    )

# ---------- main ----------

DEMOS = {
    "demo-bass-house.json":   demo_house,
    "demo-bass-onedrop.json": demo_onedrop,
    "demo-bass-boombap.json": demo_boombap,
    "demo-bass-trap.json":    demo_trap,
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
