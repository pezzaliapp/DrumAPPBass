# Changelog — DrumAPPBass

## v1.0 — 2026-04-24 · Fork di DrumAPP con sezione Bass

**Primo rilascio di DrumAPPBass**, fork esteso di DrumAPP.

### Aggiunte

- **Sezione BASS** completa, sintetizzata 100% Web Audio (saw + square sub + BiquadFilter LP + envelope ADSR + WaveShaper drive). Nessun sample esterno.
- **Bass Step Sequencer**: griglia 16-step dedicata, sincronizzata col drum, con parametri per step: `note` (C1–B3), `vel`, `len` (gate 10–100%), `accent` (+6 dB + env 2×), `slide` (portamento 30 ms tie-note stile 303).
- **Bass Looper Live**: registrazione live via tastiera on-screen (1 ottava) o shortcut pianistiche della computer keyboard (`A..K`). Attende il prossimo downbeat, registra note+timestamp, overdub automatico, quantizzazione opzionale 1/16, checkbox `PLAY STEP TOO` per fondere step e live.
- **EDIT MODE bass-only**: `NOTE / VEL / LEN / ACC / SLIDE`, indipendenti dagli edit mode drum.
- **Pannello ACTIVE TRACK bass**: `VOLUME · PAN · CUTOFF · RES · ENV · DECAY · DRIVE · MUTE · SOLO`, accessibile con il tasto `B`.
- **4 pattern A/B/C/D bass** + **4 live loop A/B/C/D bass** indipendenti, entrambi persistiti insieme al drum.
- **Integrazione completa**: il basso è incluso in bounce WAV (OfflineAudioContext), REC live (MediaRecorder), 4 slot localStorage, export/import JSON v3, share link (solo step pattern).
- **8 nuove demo drum+bass v3** in `examples/`: sevennation, anotherone, billiejean, superstition, onedrop, house, boombap, trap.
- Script `examples/_build_bass_demos.py` per rigenerare programmaticamente le demo bass.
- **Shortcut nuove**: `B` focus bass panel, `L` toggle STEP/LOOPER, `R` rec loop (in LOOPER), `A..K` note pianistiche (in LOOPER), `Z`/`X` ottava giù/su (in LOOPER).
- **Guida HELP estesa**: nuova sezione "BASS" con spiegazione di note/vel/len/accent/slide, looper live, sintesi, routing MIDI.
- **Routing MIDI bass** sul canale 2 (le drum restano su canale 10 GM standard).

### Modifiche

- **Formato dati** bump da `version: 2` → `version: 3` con blocco `bass` (trackParams, patterns, liveLoops, mode). Backward compatibility piena: file v1/v2 si caricano normalmente con basso vuoto inizializzato.
- `CACHE_NAME` service worker bumpata da `drumapp-v9` → `drumappbass-v1`.
- `manifest.json`: nome aggiornato a "DrumAPPBass — Drum & Bass Machine", short_name "DrumAPPBass", descrizione aggiornata.
- `index.html`: title, meta description, apple-mobile-web-app-title, brand__name aggiornati a DrumAPPBass.
- `DEMO_LIBRARY` estesa con le 8 nuove voci bass (tag `bass`).

### Invariato

- **Tutte le feature DrumAPP** continuano a funzionare identicamente: 8 voci drum, scheduler, swing, humanize, metronomo, pattern multipli, song mode, copy/paste, undo/redo, slot, share, bounce, REC live, Web MIDI drum, hint contestuale, modal DEMOS/HELP, tap tempo.
- **Estetica Studio Press** (palette avorio/inchiostro/arancione, font Anton+VT323+IBM Plex Sans, noise overlay SVG). Il basso usa un accento blu notte `#2a3a5c` complementare.
- **14 demo originali** v2 drum-only preservate e caricabili come prima.
- **Python desktop legacy** (`python/drum_machine.py`) invariato.
- **Licenza MIT** invariata, autore Alessandro Pezzali.
