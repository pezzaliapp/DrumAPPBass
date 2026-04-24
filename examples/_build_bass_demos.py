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
    """Stadium rock 124 BPM in E minor.
    Bassline 7-note iconica E2-G2-E2-D2-C2-B1 con E2 lungo iniziale
    (length 0.9) e accent sul B1 finale. Tonalità E minor."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 8], vel=1.0)            # kick 1 e 3
    set_steps(drum[1], [4, 12], vel=0.9)           # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)    # hihat offbeat
    bass = empty_bass_pattern()
    # 7 note discendenti iconiche ancorate su E minor
    bass[0]  = bass_cell("E2", vel=0.95, length=0.9, accent=True)   # E2 lungo
    bass[4]  = bass_cell("E2", vel=0.85, length=0.45)
    bass[6]  = bass_cell("G2", vel=0.88, length=0.45)
    bass[8]  = bass_cell("E2", vel=0.85, length=0.45)
    bass[10] = bass_cell("D2", vel=0.85, length=0.45)
    bass[12] = bass_cell("C2", vel=0.85, length=0.45)
    bass[14] = bass_cell("B1", vel=0.95, length=0.6, accent=True)   # B1 accentato
    return make_demo(124, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.45, resonance=3.5,
                                 envAmount=0.6, decay=220, drive=0.25),
                     bass)

def demo_anotherone():
    """Rock-disco 110 BPM in E minor.
    Ostinato E1 'dun-dun-dun' caratteristico con length corta e pause
    sul 2 e 4 (lasciando spazio alla snare), slide su G1 di passaggio.
    Accent sugli step 1 e 9."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 4, 8, 12])               # kick 4/4
    set_steps(drum[1], [4, 12], vel=0.85)           # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)
    bass = empty_bass_pattern()
    # Ostinato E1 con pause sugli step del backbeat (4 e 12)
    # Length corta (0.3), accent su 1 e 9
    bass[0]  = bass_cell("E1", vel=0.95, length=0.3, accent=True)
    bass[1]  = bass_cell("E1", vel=0.8, length=0.3)
    bass[2]  = bass_cell("E1", vel=0.8, length=0.3)
    bass[3]  = bass_cell("E1", vel=0.8, length=0.3)
    # step 4 pausa (snare)
    bass[5]  = bass_cell("E1", vel=0.8, length=0.3)
    bass[6]  = bass_cell("G1", vel=0.8, length=0.3, slide=True)     # slide passaggio
    bass[7]  = bass_cell("E1", vel=0.8, length=0.3)
    bass[8]  = bass_cell("E1", vel=0.95, length=0.3, accent=True)
    bass[9]  = bass_cell("E1", vel=0.8, length=0.3)
    bass[10] = bass_cell("E1", vel=0.8, length=0.3)
    bass[11] = bass_cell("E1", vel=0.8, length=0.3)
    # step 12 pausa (snare)
    bass[13] = bass_cell("E1", vel=0.8, length=0.3)
    bass[14] = bass_cell("G1", vel=0.8, length=0.3, slide=True)
    bass[15] = bass_cell("E1", vel=0.8, length=0.3)
    return make_demo(110, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.42, resonance=4.0,
                                 envAmount=0.55, decay=200, drive=0.3),
                     bass)

def demo_billiejean():
    """Linn-style 117 BPM in F# minor.
    Groove 2-bar sincopato F#1 → A1 → E1 → F#1 con nudge su alcuni step
    per il feel 'laid-back', length media 0.5."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 10])                     # kick 1 e 2.5 (off)
    set_steps(drum[1], [4, 12])                     # snare 2 e 4
    set_steps(drum[2], [2, 6, 10, 14], vel=0.6)
    bass = empty_bass_pattern()
    # F# minor: F#, A, E (VII grado), F#. Sincopato 2-bar.
    # Step grid 16; pattern sincopato si sente meglio con nudge.
    bass[0]  = bass_cell("F#1", vel=0.9, length=0.5, accent=True)
    bass[3]  = bass_cell("F#1", vel=0.8, length=0.4)
    bass[5]  = bass_cell("A1",  vel=0.85, length=0.45)
    bass[6]  = bass_cell("E1",  vel=0.8, length=0.4)
    bass[8]  = bass_cell("F#1", vel=0.9, length=0.5, accent=True)
    bass[11] = bass_cell("F#1", vel=0.8, length=0.4)
    bass[13] = bass_cell("A1",  vel=0.85, length=0.45)
    bass[14] = bass_cell("E1",  vel=0.8, length=0.4)
    return make_demo(117, 8, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.4, resonance=5.0,
                                 envAmount=0.65, decay=220, drive=0.2),
                     bass, humanize=True)

def demo_superstition():
    """Funk 100 BPM ancorato in E minor (per semplicità di griglia;
    l'originale è in Eb minor, ma mantenere la stessa famiglia di note
    permette di usare la stessa tastiera bass on-screen).
    16th con pause, slide frequenti verso la dominante B1/B2, accent sul
    downbeat."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 6, 10])                   # kick funky
    set_steps(drum[1], [4, 12], vel=0.9)
    set_steps(drum[2], list(range(0, 16, 2)), vel=0.55)
    set_steps(drum[2], [1, 3, 5, 7, 9, 11, 13, 15], vel=0.35)   # ghost 16th
    bass = empty_bass_pattern()
    # E minor: E, G, A, B (dominante). Slide verso B1/B2 caratteristico.
    bass[0]  = bass_cell("E1", vel=0.95, length=0.35, accent=True)
    bass[2]  = bass_cell("G1", vel=0.8,  length=0.3)
    bass[3]  = bass_cell("B1", vel=0.85, length=0.25, slide=True)   # slide to dom
    bass[5]  = bass_cell("E1", vel=0.78, length=0.3)
    bass[6]  = bass_cell("A1", vel=0.8,  length=0.3, slide=True)
    bass[7]  = bass_cell("B1", vel=0.85, length=0.35)
    bass[8]  = bass_cell("E2", vel=0.95, length=0.35, accent=True)
    bass[10] = bass_cell("G1", vel=0.8,  length=0.3)
    bass[11] = bass_cell("B2", vel=0.85, length=0.25, slide=True)
    bass[13] = bass_cell("E1", vel=0.8,  length=0.3)
    bass[14] = bass_cell("B1", vel=0.85, length=0.35)
    return make_demo(100, 24, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.5, resonance=6.0,
                                 envAmount=0.75, decay=180, drive=0.35),
                     bass, humanize=True)

def demo_onedrop():
    """Reggae one-drop 80 BPM in A minor.
    Pausa sugli step 1-4, bassline A1-E2-A1-G1 dallo step 5, accent sul
    downbeat del 3 (step 8) dove anche kick+snare cadono (one-drop).
    Cutoff 0.45, decay 400, resonance 3 per il carattere reggae morbido."""
    drum = empty_drum_pattern()
    drum[0][8] = cell(vel=1.0)                       # kick solo sul 3
    drum[1][8] = cell(vel=0.9)                       # snare sul 3
    set_steps(drum[2], [0, 2, 4, 6, 10, 12, 14], vel=0.55)
    bass = empty_bass_pattern()
    # Reggae one-drop: primo quarto (step 1-4) muto, poi A-E-A-G sul resto
    # A1 tonica, E2 (5° grado sopra), G1 (VII grado) per il carattere dorico
    # Accent sul downbeat del 3 (step 8) dove anche il kick cade
    bass[6]  = bass_cell("A1", vel=0.85, length=0.45)
    bass[8]  = bass_cell("E2", vel=0.95, length=0.5, accent=True)
    bass[10] = bass_cell("A1", vel=0.85, length=0.45)
    bass[14] = bass_cell("G1", vel=0.85, length=0.45)
    return make_demo(80, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.45, resonance=3.0,
                                 envAmount=0.6, decay=400, drive=0.2),
                     bass)

def demo_house():
    """House 124 BPM in A minor.
    A1 four-on-the-floor con accent alternati (1 e 9), slide occasionale
    verso E2 (5° grado). Cutoff 0.55 decay 120 per il carattere pumping
    del basso house."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 4, 8, 12])                # kick 4/4
    set_steps(drum[1], [4, 12], vel=0.85)
    set_steps(drum[2], [2, 6, 10, 14], vel=0.7)      # off-beat closed
    set_steps(drum[3], [6, 14], vel=0.5)             # open hat off
    set_steps(drum[4], [4, 12], vel=0.6)             # clap
    bass = empty_bass_pattern()
    # A1 su ogni quarto, accent su 1 e 9; fill verso E2 con slide su step 7 e 15
    bass[0]  = bass_cell("A1", vel=0.95, length=0.35, accent=True)
    bass[2]  = bass_cell("A1", vel=0.8,  length=0.3)
    bass[4]  = bass_cell("A1", vel=0.8,  length=0.3)
    bass[6]  = bass_cell("A1", vel=0.8,  length=0.3)
    bass[7]  = bass_cell("E2", vel=0.82, length=0.25, slide=True)   # slide fill
    bass[8]  = bass_cell("A1", vel=0.95, length=0.35, accent=True)
    bass[10] = bass_cell("A1", vel=0.8,  length=0.3)
    bass[12] = bass_cell("A1", vel=0.8,  length=0.3)
    bass[14] = bass_cell("A1", vel=0.8,  length=0.3)
    bass[15] = bass_cell("E2", vel=0.82, length=0.25, slide=True)
    return make_demo(124, 0, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.55, resonance=5.0,
                                 envAmount=0.65, decay=120, drive=0.25),
                     bass, humanize=True)

def demo_boombap():
    """Hip-hop boom-bap 90 BPM (swing 52) in D minor.
    D1-D1-F1-A1 con slide verso la dominante, length media 0.4,
    groove 'lazy' stile Dilla."""
    drum = empty_drum_pattern()
    set_steps(drum[0], [0, 7, 8], vel=1.0)           # kick syncopato
    set_steps(drum[1], [4, 12], vel=0.9)
    set_steps(drum[2], list(range(0, 16, 2)), vel=0.55)
    bass = empty_bass_pattern()
    # D minor: D tonica, F 3° minore, A 5° (dominante).
    bass[0]  = bass_cell("D1", vel=0.95, length=0.4, accent=True)
    bass[3]  = bass_cell("D1", vel=0.8,  length=0.35)
    bass[5]  = bass_cell("F1", vel=0.82, length=0.35)
    bass[6]  = bass_cell("A1", vel=0.85, length=0.3, slide=True)   # slide verso A (dom)
    bass[7]  = bass_cell("F1", vel=0.8,  length=0.3)
    bass[8]  = bass_cell("D1", vel=0.95, length=0.4, accent=True)
    bass[11] = bass_cell("F1", vel=0.82, length=0.35)
    bass[13] = bass_cell("A1", vel=0.85, length=0.3, slide=True)
    bass[14] = bass_cell("F1", vel=0.8,  length=0.3)
    return make_demo(90, 52, 16, default_drum_params(), drum,
                     bass_params(cutoff=0.38, resonance=4.0,
                                 envAmount=0.55, decay=260, drive=0.3),
                     bass, humanize=True)

def demo_trap():
    """Trap 140 BPM in F minor, sub-bass 808-style.
    F1 lungo length 1.0 su step 1, pause, poi C2 e Eb2 occasionali.
    Drive 0.6, cutoff 0.25 e resonance media per il carattere 808."""
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
    # F minor: F tonica, C 5°, Eb VII minore.
    # Sub-bass 808 pattern: F1 lungo, pause, poi C2/Eb2 occasionali.
    bass[0]  = bass_cell("F1",  vel=1.0,  length=1.0, accent=True)   # sub lungo
    bass[5]  = bass_cell("F1",  vel=0.85, length=0.4)
    bass[7]  = bass_cell("C2",  vel=0.82, length=0.35, slide=True)
    bass[8]  = bass_cell("F1",  vel=0.9,  length=0.6)
    bass[11] = bass_cell("D#2", vel=0.82, length=0.35)  # = Eb2 enarmonico
    bass[12] = bass_cell("F1",  vel=0.95, length=0.7, accent=True)
    return make_demo(140, 0, 16, dp, drum,
                     bass_params(cutoff=0.25, resonance=6.0,
                                 envAmount=0.5, decay=500, drive=0.6),
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
