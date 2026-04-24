# DrumAPPBass — Drum & Bass Machine

**Fork esteso di [DrumAPP](https://github.com/pezzaliapp/DrumAPP)** che aggiunge una sezione **BASS** completamente sintetizzata in Web Audio: step sequencer dedicato con accent e slide (stile TB-303), looper live con tastiera on-screen e shortcut pianistiche. Tutto il resto di DrumAPP — 8 voci drum, swing, velocity/probability/ratchet/nudge, pan/pitch/decay/filter per traccia, 4 pattern live, song mode, bounce WAV, REC live, Web MIDI out, undo/redo — resta identico e perfettamente funzionante.

**Demo live:** [pezzaliapp.github.io/DrumAPPBass](https://pezzaliapp.github.io/DrumAPPBass/)

> Prima volta qui? Premi il bottone **?** nel footer (o il tasto `?`) per aprire la guida integrata con tutte le istruzioni passo-passo, inclusa la nuova sezione BASS.

---

## ✨ Novità rispetto a DrumAPP

### 🎸 Sezione BASS

Sotto il sequencer drum c'è un **nuovo pannello dedicato al basso**, con due modalità complementari commutabili con un toggle `STEP / LOOPER`:

**STEP MODE (default)** — griglia di 16 step (o `patternLength`) sincronizzata col drum. Per ogni step:
- **Note** pitch selezionabile `C1 – B3` (3 ottave). Scroll/drag verticale sullo step per cambiare pitch, oppure click sull'etichetta per il mini-selettore.
- **Velocity** 0.05–1.0 (drag verticale)
- **Length (gate)** 10–100% dello step (quanto tiene la nota)
- **Accent** boolean (+6 dB, filtro più aperto, Q più alta — stile 303)
- **Slide** boolean (portamento 30 ms verso la nota successiva, senza ritriggerare l'envelope del filtro — stile tie-note 303)

EDIT MODE bass-only: `NOTE / VEL / LEN / ACC / SLIDE`. Non tocca la griglia drum e viceversa.

**LOOPER MODE** — si suona dal vivo con la **tastiera on-screen** (1 ottava con bottoni ottava ±) o con la **tastiera del computer** mappata pianistica (`A W S E D F T G Y H U J K`). REC (dedicato al basso) aspetta il prossimo downbeat, poi registra nota+timestamp fino a fine pattern e parte in overdub mode. Toggle `QUANT 1/16` opzionale. Checkbox `PLAY STEP TOO` per fondere step-pattern e loop live.

### 🔊 Sintesi basso

- **Oscillatore principale** sawtooth + secondo osc square sub-ottava (`-12` semitoni) mixati 70/30
- **BiquadFilter lowpass** con cutoff modulato da envelope ADSR (attack 2 ms, decay regolabile 60–800 ms, sustain 0, release 50 ms) e Q regolabile 1–15
- **Envelope ampiezza** attack 3 ms, decay `length × stepDuration`, sustain 0.7, release 60 ms. Con **accent** picco iniziale 1.2 e env filtro raddoppia intensità.
- **WaveShaper soft-clipping** per il carattere "drive" (0–100%)
- **Parametri bass track** nel pannello: `VOLUME`, `PAN`, `CUTOFF` (50 Hz – 5 kHz), `RES` (0.5–15), `ENV` amount (−100..+100), `DECAY` env (60–800 ms), `DRIVE` (0–100%)
- **Routing MIDI**: canale 2 (le drum restano su canale 10 GM standard)
- Tutti i pattern A/B/C/D hanno ciascuno il proprio step-bass **e** il proprio live-loop (4+4 slot indipendenti).
- Humanize e swing si applicano anche al basso. Ratchet/Prob/Nudge restano drum-only (il basso ha parametri suoi: accent/slide/length).

### 🎛 Integrazione completa

- **BOUNCE WAV**: il render offline include anche la sintesi del basso (stessa catena nell'`OfflineAudioContext`).
- **REC live**: il basso passa per il `MediaStreamDestination`, quindi viene registrato come il resto.
- **Slot localStorage A/B/C/D**: un set salvato contiene anche bass pattern, bass live loop, bass track params.
- **Export/Import JSON**: nuovo **formato v3** con blocco `bass`. Backward compatible: file v1/v2 caricano normalmente, il basso si inizializza vuoto.
- **Share link**: include anche il bass step pattern nel base64 dopo il drum hex. Il live loop è escluso (è performance, non pattern).
- **Guida integrata HELP**: nuova sezione "BASS" che spiega note/vel/len/accent/slide, looper live, sintesi e shortcut.

---

## 🎛 Feature originali DrumAPP (invariate)

### Sequencer
- 16 step di default, lunghezza variabile (8 / 12 / 16 / 24 / 32)
- 8 voci sintetiche: Kick · Snare · Hi-Hat · Open HH · Clap · Tom · Rimshot · Cowbell
- 4 pattern live A/B/C/D con switch istantaneo durante il play (tasti `1-4` o `[` / `]`)
- Copy/Paste pattern, Song editor visuale, click-to-cycle

### Timing & Groove
- BPM 60–200, Swing 0–75%, Tap tempo, Humanize, Metronome

### Per ogni traccia drum
Volume · Pan (double click = centro) · Pitch ±12 · Decay 0.4×–2.5× · Filter LP/HP + Cutoff · Mute/Solo

### Per ogni step drum (edit mode drag-verticale)
`TRIG / VEL / PROB / RATCH / NUDGE`

### Output
BOUNCE WAV (offline, deterministico, include basso), REC live (MediaRecorder webm/opus, include basso), Export/Import JSON v3, Share link, Web MIDI out (kick=36 snare=38 hihat=42 openhat=46 clap=39 tom=45 rim=37 cow=56, bass canale 2).

### Storage
4 slot localStorage (tap load, hold 500 ms save), Copy/Paste, Undo/Redo (40 step), Demo/Clear.

---

## ⌨️ Scorciatoie tastiera

| Tasto | Azione |
|---|---|
| `SPACE` | Play / Stop |
| `T` | Tap tempo |
| `1` – `4` | Switch pattern A/B/C/D |
| `[` / `]` | Pattern precedente / successivo |
| `↑` / `↓` | Traccia attiva precedente / successiva |
| `M` / `S` | Mute / Solo sulla traccia attiva |
| `C` | Clear pattern corrente (drum + bass) |
| `D` | Load demo |
| `B` | Toggle focus sezione bass (il pannello ACTIVE TRACK mostra parametri basso) |
| `L` | Toggle modalità bass STEP ⇄ LOOPER |
| `R` *(solo in LOOPER)* | Start/Stop REC live bass |
| `A W S E D F T G Y H U J K` *(solo in LOOPER)* | Note di basso mappatura pianistica |
| `Z` / `X` *(solo in LOOPER)* | Ottava giù / su della tastiera on-screen |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo |
| `?` | Apri guida |
| `ESC` | Chiudi modali |

> Le shortcut `A..K` pianistiche e `R/Z/X` del looper sono **attive solo in modalità LOOPER** per non collidere con le shortcut esistenti (`T` tap, `M` mute, `S` solo, `C` clear, `D` demo).

---

## 🏗 Architettura tecnica

**Sintesi sonora** — ogni voce (drum e bass) costruita con `OscillatorNode` + `GainNode` + `BiquadFilterNode`, niente sample.

**Catena audio**: ciascuna delle 8 tracce drum passa per `voice → trackPanner[i] → trackFilter[i] → trackGain[i] → masterGain → destination`. La voce bass ha la sua catena parallela `bassVoice → bassPanner → bassFilter (LP + env) → bassDrive (WaveShaper) → bassGain → masterGain`. In parallelo il masterGain è connesso a un `MediaStreamDestination` per il REC live, quindi il basso è sempre incluso nelle registrazioni.

**Scheduler** — pattern di Chris Wilson: `setInterval` ogni 25 ms programma gli step nei 100 ms successivi via `AudioContext.currentTime`. Il bass step sequencer si innesta nello stesso scheduler, nello stesso `scheduleStep(stepIdx, baseTime)`. Il bass looper schedula le note dal proprio array `bassLiveLoop[pattern]` in base alla posizione frazionaria dentro il pattern.

**Pattern drum** — matrice `[track][step]` dove ogni cella è `null` oppure `{vel, prob, ratch, nudge}`. **Pattern bass** — array `[step]` dove ogni cella è `null` oppure `{note, vel, len, accent, slide}`. **Live loop bass** — array `[{step: float, note, vel, len}]` con timestamp in step frazionari.

**Bounce WAV** — `OfflineAudioContext` ricostruisce l'intera catena audio (incluso basso) e schedula tutti gli step drum+bass della sequenza scelta. PCM 16-bit stereo → WAV RIFF.

**REC live** — `MediaStreamDestination` in parallelo a `destination`. Formato auto-negoziato webm/opus (fallback mp4 su Safari).

**PWA** — `service-worker.js` (cache `drumappbass-v1`) serve tutti gli asset offline. Network-first per HTML/JS/CSS/JSON, cache-first per icone e font.

---

## 📦 Struttura del progetto

```
DrumAPPBass/
├── index.html          # markup esteso con sezione .bass-panel + tastiera on-screen
├── style.css           # Studio Press palette + stili bass panel/keyboard/accent/slide
├── app.js              # Web Audio, sintesi drum+bass, scheduler, bass looper, UI, bounce, rec, MIDI
├── manifest.json       # PWA manifest DrumAPPBass
├── service-worker.js   # offline cache drumappbass-v1
├── icons/              # 192/512/maskable PNG
├── examples/           # set JSON importabili (14 demo v2 drum-only + 8 nuove demo bass v3)
├── python/
│   └── drum_machine.py # versione desktop legacy (invariata)
├── generate_icons.py
├── CHANGELOG.md
└── .gitignore
```

---

## 🚀 Installazione & deploy

**Locale (test):**
```bash
git clone https://github.com/pezzaliapp/DrumAPPBass.git
cd DrumAPPBass
python3 -m http.server 8000
# apri http://localhost:8000
```

**GitHub Pages:** Settings → Pages → Source: `main` branch, root folder. L'URL pubblico diventa `https://pezzaliapp.github.io/DrumAPPBass/`.

**Aggiornamento:**
```bash
git add .
git commit -m "Update DrumAPPBass"
git push origin main
```

Dopo un push, per vedere la nuova versione serve un **hard reload** per bypassare il service worker:
- Desktop Chrome/Safari: `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Win/Linux)
- iOS: chiudi e riapri la PWA **due volte** (la prima scarica la nuova versione, la seconda la attiva)

---

## 📋 Formato dati v3

```json
{
  "version": 3,
  "bpm": 120,
  "swing": 25,
  "patternLength": 16,
  "humanize": false,
  "trackParams": [ /* 8 tracce drum come v2 */ ],
  "patterns": { "A": [...], "B": [...], "C": [...], "D": [...] },
  "songSequence": ["A", "A", "B", "A"],
  "bass": {
    "trackParams": {
      "volume": 0.85, "pan": 0, "cutoff": 0.4, "resonance": 5,
      "envAmount": 0.7, "decay": 250, "drive": 0.2,
      "mute": false, "solo": false
    },
    "patterns": {
      "A": [ null, {"note":"C2","vel":0.9,"len":0.5,"accent":false,"slide":false}, ... ],
      "B": [...], "C": [...], "D": [...]
    },
    "liveLoops": {
      "A": [ {"step":0,"note":"C2","vel":0.9,"len":0.5}, {"step":3.5,"note":"E2","vel":0.8,"len":0.3} ],
      "B": [...], "C": [...], "D": [...]
    },
    "mode": "step"
  }
}
```

**Backward compatibility**: se `version < 3` o `bass` assente → si inizializzano i campi bass con default (pattern vuoti, loop vuoti, track params default). I file v1/v2 continuano a caricarsi senza errori.

---

## 🎁 Demo incluse

Nella cartella [`examples/`](examples/) trovi **22 set completi** importabili col bottone **DEMOS** o **IMPORT**:

- **14 demo drum-only v2** (DrumAPP originale, invariate): house, trap, boombap, dnb, makesomenoise, ukhardcore, onedrop, dadada, wewillrockyou, sevennation, anotherone, superstition, rosanna, stayinalive, takefive, wipeout, billiejean, funkydrummer, levee, apache, impeach, ashleysroachclip, synthsub.
- **8 nuove demo drum+bass v3** (esclusive DrumAPPBass): `demo-bass-sevennation`, `demo-bass-anotherone`, `demo-bass-billiejean`, `demo-bass-superstition`, `demo-bass-onedrop`, `demo-bass-house`, `demo-bass-boombap`, `demo-bass-trap`.

> ⚠️ Tutte le demo sono **ricostruzioni ritmico-armoniche generiche** (scheletro kick/snare/percussion e movimento di basso). Non riproducono melodie, voci, arrangement o timbri specifici delle registrazioni originali, che restano protetti.

Vedi il [README degli esempi](examples/README.md) per dettagli su ciascuna demo.

---

## 🎯 Scelte di design

- **Niente sample, zero dipendenze**: anche il basso è 100% sintesi (saw+square+filter+env), nessun campione audio esterno.
- **Vanilla JS, IIFE unica**: tutto `app.js` in un'unica IIFE con sezioni commentate (`// ========== BASS SYNTH ==========` ecc.). Nessun framework, nessun bundler, nessun npm. Un solo `<script>` tag, compatibile col service worker e il caricamento PWA.
- **Non rompere niente di esistente**: tutte le feature DrumAPP continuano a funzionare identicamente. Il basso è additivo.
- **Estetica Studio Press**: palette carta avorio `#eae3d2` + inchiostro `#1a1a22` + accento arancione `#f77f00`, con accento complementare **blu notte** `#2a3a5c` per gli elementi del pannello bass.
- **Una sola griglia visiva**: step drum e bass si allineano verticalmente sulla stessa larghezza, così il flusso visivo resta top→bottom.
- **Filosofia 303**: accent+slide ricreano il carattere del tie-note 303 senza mimare il timbro specifico — resta un basso ibrido utilizzabile in molti generi.

---

## 👤 Autore

**Alessandro Pezzali** — [pezzaliapp.github.io](https://pezzaliapp.github.io)

## 📄 Licenza

MIT — vedi [LICENSE](LICENSE)
