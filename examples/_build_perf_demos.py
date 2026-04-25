#!/usr/bin/env python3
"""
Genera 4 demo drum+bass v3 (Round 7) — una per ogni Performance Mode.

Le demo sono astratte per GENERE (non ricostruzioni di brani specifici):
ognuna è scritta per VALORIZZARE la modalità di sintesi che dichiara
nel campo `performanceMode` al root del JSON.

Usage:
    python3 _build_perf_demos.py

Produce nella stessa cartella:
    demo-bass-synthwave.json  (Bm,  110 BPM, performanceMode=classic)
    demo-bass-synthpop.json   (Cm,  120 BPM, performanceMode=wide)
    demo-bass-neosoul.json    (F#m, 96  BPM, performanceMode=punch)
    demo-bass-dub.json        (Gm,  92  BPM, performanceMode=sub)

Note:
- Le 5 demo bass storiche non hanno `performanceMode` -> caricano in CLASSIC
  per backward compat (gestita da applyFull in app.js).
- Tonalità nuove (Bm/Cm/F#m/Gm) per non sovrapporsi a quelle esistenti
  (Em/Am/Dm/Fm). Il parser app.js accetta solo sharps: F#=F#, Bb=A#, Eb=D#.
"""

import json
import os
from datetime import datetime

# ---------- Template tracce drum (parità con _build_bass_demos.py) ----------

def tp(volume=0.85, mute=False, solo=False, pitch=0, decay=1.0,
       ftype='off', fcut=0.7, fq=1.0, pan=0.0):
    return {
        "volume": volume, "mute": mute, "solo": solo,
        "pitch": pitch, "decay": decay,
        "filterType": ftype, "filterCutoff": fcut, "filterQ": fq,
        "pan": pan,
    }

# Allineamento pitch kick alla tonica del basso:
# il kick playKick() sweepa da 165 Hz a 45 Hz, fondamentale ~F1 a pitch=0.
# pitch = 12 * log2(target / 45)
#   B1  (61.7 Hz)  ->  +5 semitoni
#   C2  (65.4 Hz)  ->  +6 semitoni  (per synthpop in Cm useremo C1 ~32.7 Hz)
#   C1  (32.7 Hz)  ->  -6 semitoni
#   F#1 (46.2 Hz)  ->  +0 semitoni  (quasi allineato di base)
#   G1  (49.0 Hz)  ->  +1 semitono
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
              bass_A, performance_mode='classic', humanize=False, song=None):
    return {
        "version": 3,
        "exportedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "bpm": bpm,
        "swing": swing,
        "patternLength": pattern_len,
        "humanize": humanize,
        "masterDrum": 0.9,
        "masterBass": 0.8,
        "performanceMode": performance_mode,
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
# DEMO 1 — SYNTHWAVE (B minor, 110 BPM, performanceMode=classic)
# ==============================================================
def demo_synthwave():
    """B minor, 110 BPM, four-on-the-floor synthwave/italo-disco.
    Mostra la baseline CLASSIC in tonalità nuova (Bm).
    Bassline: tonica B1 sui downbeat (con kick), arpeggio Bm-D-F# in alto
    fra un kick e l'altro. Niente slide aggressivi, carattere "drive notturno"."""
    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 4, 8, 12], vel=1.0)        # kick four-on-the-floor
    set_steps_0(drum[1], [4, 12], vel=0.85)             # snare 2/4
    set_steps_0(drum[2], list(range(16)), vel=0.55)     # closed hat ogni step
    set_steps_0(drum[3], [2, 6, 10, 14], vel=0.55)      # open hat off-beat (synthwave)
    drum[2][2] = cell(vel=0.4)                          # ghost hat
    drum[2][6] = cell(vel=0.4)
    drum[2][10] = cell(vel=0.4)
    drum[2][14] = cell(vel=0.4)

    # Bass B minor
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("B1",  vel=0.90, length=0.30, accent=True)   # step 1 (con kick)
    bass[2]  = bass_cell("F#2", vel=0.55, length=0.18)                # step 3 (quinta alta)
    bass[3]  = bass_cell("D2",  vel=0.55, length=0.18)                # step 4 (terza)
    # step 5 null (lascia il kick parlare)
    bass[5]  = bass_cell("B2",  vel=0.55, length=0.18)                # step 6 (ottava alta)
    bass[6]  = bass_cell("F#2", vel=0.50, length=0.15)                # step 7
    bass[7]  = bass_cell("D2",  vel=0.65, length=0.22, slide=True)    # step 8 slide alla tonica
    bass[8]  = bass_cell("B1",  vel=0.85, length=0.30, accent=True)   # step 9 (con kick)
    # step 10 null
    bass[10] = bass_cell("A1",  vel=0.65, length=0.22)                # step 11 (settima minore)
    bass[11] = bass_cell("F#2", vel=0.55, length=0.18)                # step 12
    # step 13 null (kick step 13)
    bass[13] = bass_cell("D2",  vel=0.55, length=0.18)                # step 14
    bass[14] = bass_cell("F#2", vel=0.65, length=0.22, slide=True)    # step 15 slide
    bass[15] = bass_cell("E2",  vel=0.55, length=0.18)                # step 16 (quarta, tensione)

    return make_demo(
        bpm=110, swing=0, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=5),  # ~B1
        drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.72, cutoff=0.55, resonance=3.5,
            envAmount=0.55, decay=160, drive=0.18,
        ),
        bass_A=bass,
        performance_mode='classic',
    )

# ==============================================================
# DEMO 2 — SYNTHPOP (C minor, 120 BPM, performanceMode=wide)
# ==============================================================
def demo_synthpop():
    """C minor, 120 BPM, 80s synth-pop/electro.
    Mostra WIDE: il supersaw con stereo spread ±100% trasforma il basso in
    un wash spaziale che riempie il mix. Bassline lineare ma melodica con
    ottave, slide e tonica/quinta. Kick four-on-the-floor leggermente più
    morbido per non mascherare la spazialità del basso.
    Tonica C2 (non C1) per stare nel registro dove il WIDE brilla
    (sotto C2 il sub-osc smaterializza il movimento stereo)."""
    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 4, 8, 12], vel=0.95)       # kick 4/4 morbido
    set_steps_0(drum[1], [4, 12], vel=0.80)             # snare 2/4
    set_steps_0(drum[2], list(range(0, 16, 2)), vel=0.55)  # closed hat ottavi
    drum[3][6] = cell(vel=0.55)                         # open hat 7
    drum[3][14] = cell(vel=0.55)                        # open hat 15
    set_steps_0(drum[6], [2, 10], vel=0.45)             # rim leggero per groove

    # Bass C minor (registro medio)
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("C2",  vel=0.90, length=0.45, accent=True)    # step 1
    bass[3]  = bass_cell("G2",  vel=0.60, length=0.20)                 # step 4 (quinta alta)
    # step 5 null (kick respira)
    bass[6]  = bass_cell("C3",  vel=0.65, length=0.22)                 # step 7 (ottava)
    bass[7]  = bass_cell("D#2", vel=0.65, length=0.22, slide=True)     # step 8 slide a Eb
    bass[8]  = bass_cell("C2",  vel=0.85, length=0.45, accent=True)    # step 9
    bass[10] = bass_cell("G2",  vel=0.60, length=0.22)                 # step 11
    bass[11] = bass_cell("A#2", vel=0.55, length=0.18)                 # step 12 (settima minore)
    # step 13 null (kick)
    bass[13] = bass_cell("D#2", vel=0.65, length=0.22)                 # step 14
    bass[14] = bass_cell("G2",  vel=0.70, length=0.25, slide=True)     # step 15 slide
    bass[15] = bass_cell("C3",  vel=0.65, length=0.22)                 # step 16 ottava

    return make_demo(
        bpm=120, swing=0, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=6),  # ~C2 (kick morbido)
        drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.70, cutoff=0.50, resonance=3.0,
            envAmount=0.55, decay=180, drive=0.20,
        ),
        bass_A=bass,
        performance_mode='wide',
    )

# ==============================================================
# DEMO 3 — NEO-SOUL (F# minor, 96 BPM, performanceMode=punch)
# ==============================================================
def demo_neosoul():
    """F# minor, 96 BPM, neo-soul / hip-hop dirty.
    Mostra PUNCH: drive alto + decay rapido + sub al 45% creano un basso
    asciutto e percussivo perfetto per il dialogo serrato col kick.
    Bassline con ghost notes ravvicinate, accenti sui downbeat, pause
    strategiche per lasciare il pocket. Swing 25 per groove neo-soul.
    Note: F#=F# (sharp accettato dal parser)."""
    drum = empty_drum_pattern()
    set_steps_0(drum[0], [0, 6, 10], vel=1.0)           # kick neo-soul (1, 7, 11)
    set_steps_0(drum[1], [4, 12], vel=0.90)             # snare 2/4
    # hat 16th con ghost alternate (groove neo-soul)
    for s in range(16):
        v = 0.70 if s % 4 == 0 else (0.45 if s % 2 == 0 else 0.30)
        drum[2][s] = cell(vel=v)
    drum[6][14] = cell(vel=0.55)                        # rim sul 15 per fill

    # Bass F# minor (F#1=46.25 Hz, abbastanza alto da non collidere col kick)
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("F#1", vel=0.92, length=0.35, accent=True)    # step 1 (con kick)
    bass[2]  = bass_cell("F#1", vel=0.40, length=0.12)                 # step 3 ghost
    bass[3]  = bass_cell("A1",  vel=0.55, length=0.18)                 # step 4 (terza minore)
    # step 5 null (snare respira)
    bass[5]  = bass_cell("F#2", vel=0.50, length=0.15)                 # step 6 ottava ghost
    # step 7 null (kick step 7)
    bass[7]  = bass_cell("E2",  vel=0.65, length=0.22, slide=True)     # step 8 slide
    bass[8]  = bass_cell("F#1", vel=0.80, length=0.30, accent=True)    # step 9
    bass[10] = bass_cell("A1",  vel=0.55, length=0.18)                 # step 11 (con kick)
    # step 11 ha kick step 11, ok per neo-soul (registro alto del bass non collide)
    bass[12] = bass_cell("C#2", vel=0.55, length=0.18)                 # step 13 (quinta)
    # step 13 null (snare)
    bass[14] = bass_cell("F#1", vel=0.45, length=0.15)                 # step 15 ghost
    bass[15] = bass_cell("E2",  vel=0.55, length=0.20, slide=True)     # step 16 slide al downbeat

    return make_demo(
        bpm=96, swing=25, pattern_len=16,
        drum_params=default_drum_params(kick_pitch=0),  # ~F#1
        drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.75, cutoff=0.45, resonance=4.5,
            envAmount=0.65, decay=140, drive=0.25,
        ),
        bass_A=bass,
        performance_mode='punch',
        humanize=True,
    )

# ==============================================================
# DEMO 4 — DUB ROLLING (G minor, 92 BPM, performanceMode=sub)
# ==============================================================
def demo_dub():
    """G minor, 92 BPM, dub rolling / half-time.
    Mostra SUB: 3 voci + sub al 65% dominano lo spettro basso, creando
    note lunghe sustained che "dialogano" con il kick reggae one-drop.
    BPM 92 mid-tempo (non DnB) per dare spazio al sub di respirare.
    Bassline: tonica G1 con length lungo, slide alla quinta, pause sacre.
    Note: G1=49 Hz, sopra B1 (soglia sub abbassata di SUB)."""
    dp = default_drum_params(kick_pitch=1)              # ~G1
    dp[0]["decay"] = 1.6                                 # kick lungo dub
    dp[2]["pan"] = 0.4                                   # hat skank ben pannato

    drum = empty_drum_pattern()
    drum[0][8] = cell(vel=1.0)                          # kick SOLO step 9 (one-drop dub)
    set_steps_0(drum[1], [4, 12], vel=0.85)             # snare 2/4
    set_steps_0(drum[2], [2, 6, 10, 14], vel=0.60)      # skank off-beat
    drum[3][14] = cell(vel=0.45)                         # open hat 15 dub-trail

    # Bass G minor: note lunghe per dare al sub primario tempo di emergere
    bass = empty_bass_pattern()
    bass[0]  = bass_cell("G1",  vel=0.90, length=0.85, accent=True)    # step 1 lungo
    # step 2-4 null (sub respira)
    bass[4]  = bass_cell("D2",  vel=0.70, length=0.40, slide=True)     # step 5 slide quinta
    bass[5]  = bass_cell("A#1", vel=0.65, length=0.30)                 # step 6 (terza minore)
    # step 7 null (snare step 5 = nessuna collisione, ma respiro)
    # step 8 null
    # step 9 null (kick one-drop step 9 ha la sua scena)
    bass[10] = bass_cell("G1",  vel=0.85, length=0.65, accent=True)    # step 11
    # step 12 null
    bass[12] = bass_cell("D2",  vel=0.65, length=0.30)                 # step 13 (snare-aware)
    # step 13 null after, snare al 13
    bass[14] = bass_cell("F2",  vel=0.70, length=0.30, slide=True)     # step 15 slide
    bass[15] = bass_cell("D2",  vel=0.60, length=0.25)                 # step 16

    return make_demo(
        bpm=92, swing=0, pattern_len=16,
        drum_params=dp, drum_A=drum,
        bass_params_obj=bass_params(
            volume=0.78, cutoff=0.35, resonance=3.0,
            envAmount=0.45, decay=300, drive=0.25,
        ),
        bass_A=bass,
        performance_mode='sub',
    )

# ---------- main ----------

DEMOS = {
    "demo-bass-synthwave.json": demo_synthwave,
    "demo-bass-synthpop.json":  demo_synthpop,
    "demo-bass-neosoul.json":   demo_neosoul,
    "demo-bass-dub.json":       demo_dub,
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
