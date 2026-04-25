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
#
# Allineamento pitch kick alla tonica del basso (FIX 2026-04-25):
# il kick playKick() sweepa da 165 Hz a 45 Hz, quindi a pitch=0 la
# fondamentale percepita è ~45 Hz ≈ F1. Per allineare il kick alla
# tonica del basso si calcola: pitch = 12 * log2(target / 45).
#   A1 (55 Hz)   ->  +4 semitoni (delta 3.5, arrotondato)
#   D1 (36.7 Hz) ->  -3 semitoni
#   F1 (43.6 Hz) ->   0 semitoni
def default_drum_params(kick_pitch=-2):
    return [
        tp(volume=0.9, pitch=kick_pitch, decay=1.3),  # kick
        tp(volume=0.82),                              # snare
        tp(volume=0.65, pan=0.3, decay=0.7),          # hihat
        tp(volume=0.55, pan=0.3, decay=1.2),          # openhat
        tp(volume=0.75, pan=-0.3),                    # clap
        tp(volume=0.6),                               # tom
        tp(volume=0.55),                              # rim
        tp(volume=0.55, pan=0.4),                     # cow
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
    Kick pitch +4 (kick fondamentale ~A1, allineato alla tonica).
    Bassline: A1 sui downbeat 1/9 (in fase col kick = peso). Sugli altri
    downbeat (5/13) il basso resta in pausa, lascia che il kick parli.
    Note medie/alte (E2, G2, A2) tra i kick: dialogo, non collisione."""
    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 4, 8, 12], vel=1.0)        # kick four-on-the-floor
    set_steps_0(drum[1], [4, 12], vel=0.85)             # snare 2/4
    set_steps_0(drum[2], list(range(16)), vel=0.55)     # closed hat ogni step
    set_steps_0(drum[3], [6, 14], vel=0.5)              # open hat off-beat

    # Bass A minor: tonica A1 sulla "one", silenzio sugli altri kick step,
    # risposte medie tra un kick e l'altro
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("A1", vel=0.85, length=0.30, accent=True)     # step 1 (con kick)
    # step 2-3 null
    bass[3]  = bass_cell("E2", vel=0.55, length=0.15)                  # step 4 (anticipo)
    # step 5 null (lascia spazio al kick step 5)
    bass[5]  = bass_cell("A2", vel=0.60, length=0.20)                  # step 6
    # step 7 null
    bass[7]  = bass_cell("G2", vel=0.65, length=0.25, slide=True)      # step 8 (slide)
    bass[8]  = bass_cell("A1", vel=0.85, length=0.30, accent=True)     # step 9 (con kick)
    # step 10 null
    # step 11 null
    bass[11] = bass_cell("E2", vel=0.55, length=0.15)                  # step 12
    # step 13 null (lascia spazio al kick step 13)
    bass[13] = bass_cell("A2", vel=0.60, length=0.20)                  # step 14
    bass[14] = bass_cell("G2", vel=0.70, length=0.25, slide=True)      # step 15 (slide)
    bass[15] = bass_cell("E2", vel=0.60, length=0.20)                  # step 16

    return make_demo(
        bpm=124, swing=0, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=4), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.70, cutoff=0.55, resonance=3.0,
            envAmount=0.5, decay=120, drive=0.15,
        ),
        bass_A=bass,
    )

# ==============================================================
# DEMO 2 — ONE-DROP (A minor, 80 BPM, reggae)
# ==============================================================

def demo_onedrop():
    """A minor, 80 BPM, reggae one-drop.
    Kick pitch +4 (~A1, allineato alla tonica).
    Il kick suona SOLO sul 3 (step 9, one-drop). Il basso reggae è
    melodico, suona DOPO il kick, lascia silenzio totale sul drop.
    Niente drive, decay medio, cutoff morbido per carattere reggae."""
    drum = empty_drum_pattern()
    drum[0][8] = cell(vel=1.0)                          # kick SOLO step 9 (one-drop)
    set_steps_0(drum[1], [4, 12], vel=0.9)              # snare 2/4
    set_steps_0(drum[2], [2, 6, 10, 14], vel=0.65)      # skank off-beat reggae

    # Bass A minor: la pausa è sacra in reggae, niente sotto C2 oltre A1
    bass = empty_bass_pattern()
    # step 1-2 null
    bass[2]  = bass_cell("A1", vel=0.70, length=0.30)                  # step 3
    # step 4-6 null
    bass[6]  = bass_cell("C2", vel=0.75, length=0.35)                  # step 7
    bass[7]  = bass_cell("E2", vel=0.65, length=0.25)                  # step 8
    # step 9 null (silenzio totale sul kick one-drop)
    # step 10 null
    bass[10] = bass_cell("A1", vel=0.80, length=0.40, accent=True)     # step 11
    # step 12 null
    bass[12] = bass_cell("G2", vel=0.70, length=0.30, slide=True)      # step 13 (slide)
    bass[13] = bass_cell("E2", vel=0.65, length=0.25)                  # step 14
    # step 15-16 null

    return make_demo(
        bpm=80, swing=0, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=4), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.72, cutoff=0.40, resonance=2.0,
            envAmount=0.35, decay=200, drive=0.10,
        ),
        bass_A=bass,
    )

# ==============================================================
# DEMO 3 — BOOM BAP (D minor, 90 BPM, swing 55)
# ==============================================================

def demo_boombap():
    """D minor, 90 BPM, swing 55, hip-hop boom bap.
    Kick pitch -3 (kick fondamentale ~D1, allineato alla tonica).
    Bassline: D2 (NON D1) sulla "one" — registro più definito col kick
    che ha già il D1. Poche note, molto spazio, classico hip-hop.
    Bass step 11 muto per non collidere col kick step 11."""
    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 10], vel=1.0)              # kick 1 + 11 boom bap
    set_steps_0(drum[1], [4, 12], vel=0.9)              # snare 2/4
    # hat 16th con velocity ghost alternata
    for s in range(16):
        v = 0.65 if s % 2 == 0 else 0.35
        drum[2][s] = cell(vel=v)

    # Bass D minor: tonica D2 (octave up dal kick), terza F2, quinta A2
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("D2", vel=0.90, length=0.40, accent=True)     # step 1 (con kick)
    # step 2-5 null
    bass[5]  = bass_cell("F2", vel=0.65, length=0.25)                  # step 6
    # step 7-8 null
    bass[8]  = bass_cell("A2", vel=0.80, length=0.35, accent=True)     # step 9 (quinta)
    # step 10 null
    # step 11 null (lascia spazio al kick step 11)
    # step 12-13 null
    bass[13] = bass_cell("D2", vel=0.55, length=0.20)                  # step 14
    bass[14] = bass_cell("C2", vel=0.65, length=0.25, slide=True)      # step 15 (slide)
    # step 16 null

    return make_demo(
        bpm=90, swing=55, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=-3), drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.72, cutoff=0.50, resonance=3.0,
            envAmount=0.55, decay=180, drive=0.18,
        ),
        bass_A=bass,
        humanize=True,
    )

# ==============================================================
# DEMO 4 — TRAP 808 (F minor, 140 BPM)
# ==============================================================

def demo_trap():
    """F minor, 140 BPM, trap 808.
    Kick pitch 0 (~F1, già allineato alla tonica).
    Bassline in registro MEDIO (F2/Eb2/Ab2, non F1/Ab1) per evitare
    battimenti col kick e per il fix sub-osc<C2: sopra C2 il sub-osc
    rimane attivo ma il "peso 808" arriva dal cutoff 0.28 + drive 0.30.
    Nota: Eb->D# e Ab->G# enarmonici (parser accetta solo sharps).
    Il basso non collide mai con i kick step 1/7/11 (pause strategiche)."""
    dp = default_drum_params(kick_pitch=0)  # kick a F1 (già allineato)
    dp[0]["decay"] = 1.6                     # kick 808 con decay lungo

    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 6, 10], vel=1.0)           # kick 1/7/11 (sparso)
    set_steps_0(drum[1], [4, 12], vel=0.85)             # snare 2/4
    for s in range(0, 16, 2):
        drum[2][s] = cell(vel=0.65)                    # closed hat ottavi
    # Ratchet trap signature 2×/3×
    drum[2][2]  = cell(vel=0.6, ratch=2)
    drum[2][6]  = cell(vel=0.6, ratch=3)
    drum[2][10] = cell(vel=0.6, ratch=2)
    drum[2][14] = cell(vel=0.6, ratch=3)

    # Bass F minor REGISTRO MEDIO: F2 tonica, D#2 settima minore (=Eb2),
    # G#2 (=Ab2) terza minore alta, C3 ottava alta della quinta
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("F2",  vel=0.90, length=0.85, accent=True)    # step 1 (con kick)
    # step 2-6 null (sub lungo respira)
    # step 7 null (lascia spazio al kick step 7)
    bass[7]  = bass_cell("D#2", vel=0.75, length=0.30, slide=True)     # step 8 slide
    bass[8]  = bass_cell("G#2", vel=0.85, length=0.65, accent=True)    # step 9
    # step 10 null
    # step 11 null (lascia spazio al kick step 11)
    # step 12-13 null
    bass[13] = bass_cell("F2",  vel=0.65, length=0.30)                 # step 14
    bass[14] = bass_cell("C3",  vel=0.70, length=0.25)                 # step 15
    # step 16 null

    return make_demo(
        bpm=140, swing=0, pattern_len=16,
        drum_params=dp, drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.74, cutoff=0.32, resonance=4.0,
            envAmount=0.65, decay=350, drive=0.30,
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
