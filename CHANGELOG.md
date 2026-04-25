# Changelog — DrumAPPBass

## v1.1 — 2026-04-25 · Round 7: Performance Modes (CLASSIC / WIDE / PUNCH / SUB)

Quattro **scenari di sintesi bass** selezionabili al volo che ridefiniscono in
modo coerente architettura e timbro. Il selettore vive nel pannello bass come
tab arancio (per distinguersi dai toggle MODE blu di STEP/LOOPER) ed è ciclabile
con la nuova shortcut **`P`**. Le 4 nuove demo dichiarano la propria modalità
nel JSON v3 via campo `performanceMode` al root; le 5 demo bass storiche e
qualsiasi file privo del campo caricano in **CLASSIC** (parità Round 6).

### Aggiunte

- **PERFORMANCE_MODES** (4 scenari) — `playBassNote` e `playBassOffline`
  ora consumano i parametri della modalità attiva: `detunes`, `pans`, `gains`,
  `subEnabled`, `subMixRatio`/`sawMixRatio`, `subMidiThreshold`, `driveBoost`,
  `cutoffOffset`, `resonanceBoost`, `envAmountBoost`, `sustainLevel`,
  `attackSec`, `releaseSec`. Bounce WAV in parità.
  - **CLASSIC** — baseline Round 6: mono, 5 voci ±10c, sub -12 st al 30%, soglia C2.
  - **WIDE** — stereo spread: 5 voci ±18c pannate `[-1, -0.5, 0, +0.5, +1]`
    (4 `StereoPannerNode` per voce; la voce centrale è mono nello stack).
    Sub al 25%, drive ×0.85, sustain alta.
  - **PUNCH** — mono compatto: 5 voci ±5c, sub al 45%, drive ×1.5, decay
    rapido (sustain 0.55, release 25 ms). Carattere percussivo per funk/hip-hop.
  - **SUB** — sub primario: 3 voci ±5c (stack ridotto), sub al 65%,
    soglia abbassata a B1 (MIDI 35), drive ×1.6, sustain 0.85.
- **Selettore UI** — nuova fascia `bass-panel__perf` con 4 bottoni arancioni
  (`CLASSIC / WIDE / PUNCH / SUB`) nel pannello bass, accanto a STEP/LOOPER.
- **Shortcut** — `P` cycla CLASSIC → WIDE → PUNCH → SUB → CLASSIC (mostra toast).
- **4 nuove demo** che dimostrano ciascuna modalità con tonalità non ancora usate:
  - `demo-bass-synthwave.json` — Synthwave (CLASSIC), Bm, 110 BPM
  - `demo-bass-synthpop.json`  — Synth-Pop (WIDE), Cm, 120 BPM
  - `demo-bass-neosoul.json`   — Neo-Soul (PUNCH), F#m, 96 BPM, swing 25
  - `demo-bass-dub.json`       — Dub Rolling (SUB), Gm, 92 BPM
- Script `examples/_build_perf_demos.py` per rigenerarle programmaticamente.
- Smoke test `tests/test_perf_modes.js` (Node + vm + mock AudioContext, 53
  assertions) che verifica la topologia dei nodi per modalità, l'auto-apply
  delle nuove demo e la backward compat delle 5 demo storiche.

### Modifiche

- **Formato dati v3** — campo additivo `performanceMode` al root del JSON.
  File senza il campo (incluso il v3 pre-Round 7) caricano in `classic`.
  Versione resta `3` (additive, no bump).
- `serializeFull` / `applyFull` / `snapshot` / `restoreFrom` includono la modalità.
- `applyBassParams` e `buildOfflineBassChain` applicano `driveBoost`/`resonanceBoost`
  della modalità attiva al WaveShaper e al BiquadFilter globali.
- `setPerformanceMode` chiude la voce attiva con ramp 10 ms al cambio di
  modalità per evitare crepe su detune/pan diversi.
- HELP modal — nuova sezione "PERF (Performance Mode)" con descrizione delle 4 modalità.
- `DEMO_LIBRARY` estesa con i 4 set perf (tag `perf`, icona ⚡, palette arancio).
- Footer — shortcut `P` aggiunta tra `L` e `⌘Z`.

### Invariato

- **5 demo bass storiche** (funk, house, onedrop, boombap, trap) — pattern,
  trackParams e timbro identici, caricano automaticamente in CLASSIC.
- Pipeline Round 6 (supersaw stack 5 voci ±10c, sub hard-cutoff a C2,
  Q dynamics, env scaling per velocity, HPF 30 Hz sul bus) preservata in CLASSIC.
- Web Audio API vanilla, zero asset, zero dipendenze npm. PWA leggera.

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
