/* ==============================================================
   DrumAPPBass · Drum & Bass Machine
   Drum machine 8 voci, 16-step con swing/velocity/probability/ratchet,
   filter+pitch+decay per traccia, 4 pattern live + song mode,
   export WAV, Web MIDI, undo/redo
   + SEZIONE BASS: step sequencer con note/vel/len/accent/slide
     e looper live con tastiera on-screen e shortcut pianistiche.

   Tutto Web Audio, niente samples, niente dipendenze esterne.
   Un'unica IIFE, sezioni commentate in italiano.
   ============================================================== */

(() => {
  'use strict';

  // ============================================================
  // 1) COSTANTI
  // ============================================================
  const NUM_STEPS_DEFAULT = 16;
  const MIN_STEPS = 8;
  const MAX_STEPS = 32;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.1; // secondi
  const HOLD_MS = 500;
  const MAX_HISTORY = 40;

  // ============================================================
  // 2) DEFINIZIONE TRACCE (8 voci)
  // ============================================================
  const TRACK_DEFS = [
    { id: 'kick',    name: 'KICK',    color: 'var(--track-kick)' },
    { id: 'snare',   name: 'SNARE',   color: 'var(--track-snare)' },
    { id: 'hihat',   name: 'HI-HAT',  color: 'var(--track-hihat)' },
    { id: 'openhat', name: 'OPEN HH', color: 'var(--track-openhat)' },
    { id: 'clap',    name: 'CLAP',    color: 'var(--track-clap)' },
    { id: 'tom',     name: 'TOM',     color: 'var(--track-tom)' },
    { id: 'rim',     name: 'RIMSHOT', color: 'var(--track-rim)' },
    { id: 'cow',     name: 'COWBELL', color: 'var(--track-cow)' },
  ];
  const NUM_TRACKS = TRACK_DEFS.length;

  // ============================================================
  // 3) STATO
  // ============================================================

  /**
   * Ogni "cella" del sequencer è:
   *   null  -> step spento
   *   { vel, prob, ratch, nudge }  -> step attivo
   *
   *   vel:   0.05-1.0   (velocity 0=silenzio, 1=max)
   *   prob:  0-100      (% di probabilità di triggerare)
   *   ratch: 1-4        (ripetizioni dentro lo step)
   *   nudge: -50..+50   (millisecondi di sposto dal grid)
   */
  function makeEmptyPattern() {
    const p = [];
    for (let t = 0; t < NUM_TRACKS; t++) {
      p.push(new Array(MAX_STEPS).fill(null));
    }
    return p;
  }

  let patterns = {
    A: makeEmptyPattern(),
    B: makeEmptyPattern(),
    C: makeEmptyPattern(),
    D: makeEmptyPattern(),
  };
  let currentPattern = 'A';

  /** Parametri per traccia (condivisi tra tutti i pattern) */
  let trackParams = TRACK_DEFS.map(() => ({
    volume: 0.85,
    mute: false,
    solo: false,
    pitch: 0,            // semitoni ±12
    decay: 1.0,          // moltiplicatore (0.4 - 2.5)
    filterType: 'off',   // off / lowpass / highpass
    filterCutoff: 0.7,   // 0-1 (mappato 20Hz-20kHz esponenziale)
    filterQ: 1.0,        // 0.5-10
    pan: 0,              // -1 (full L) .. +1 (full R)
  }));

  // Globals
  let bpm = 120;
  let swing = 0;           // 0-75 (%)
  let humanize = false;
  let metronome = false;
  let patternLength = 16;

  let editMode = 'trig';   // trig / vel / prob / ratch / nudge
  let activeTrack = 0;     // traccia selezionata (per panel di editing)

  // Song mode
  let songMode = false;
  let songSequence = ['A', 'A', 'B', 'A'];
  let songStep = 0;

  // Undo/redo
  let history = [];
  let historyIndex = -1;

  // Audio
  let audioCtx = null;
  let masterGain = null;
  let noiseBuffer = null;

  // Bus intermedi: drumBus (somma delle 8 tracce drum) e bassBus (bass chain).
  // Entrambi a valle di masterGain, così REC live e bounce li rispettano.
  //   masterGain
  //      ├── drumBus ← trackGains[i] (8)
  //      └── bassBus ← bassGain
  let drumBus = null;
  let bassBus = null;
  let bassBusComp = null;   // safety-net compressor sulla somma del basso
  let drumBusLevel = 0.9;   // master drum 0-1 (default 0.9)
  let bassBusLevel = 0.8;   // master bass 0-1 (default 0.8)

  // Catena audio per traccia
  let trackFilters = [];
  let trackGains = [];
  let trackPanners = [];

  // Pattern clipboard (copy/paste)
  let patternClipboard = null;

  // Scheduler
  let nextStepTime = 0;
  let schedulerTimer = null;
  let currentStep = 0;
  let uiQueue = [];
  let playing = false;

  // DOM cache
  let stepElements = []; // [track][step] -> button

  // MIDI
  let midiAccess = null;
  let midiOut = null;

  // REC live (MediaRecorder su MediaStreamDestination)
  let mediaRecDest = null;
  let mediaRecorder = null;
  let recChunks = [];
  let isRecording = false;
  let recStartTime = 0;
  let recTimerHandle = null;

  // Tap tempo state
  let tapTimes = [];

  // ============================================================
  // 3b) STATO BASS
  // ============================================================
  // Catena bass: bassVoice -> bassPanner -> bassFilter (LP con env) ->
  //              bassDrive (WaveShaper) -> bassGain -> masterGain
  let bassPanner = null;
  let bassFilter = null;
  let bassDrive = null;     // WaveShaper
  let bassGain = null;
  let bassDriveDry = null;  // gain dry
  let bassDriveWet = null;  // gain wet (per drive controllabile)

  /** Parametri traccia bass */
  let bassParams = {
    volume: 0.85,
    mute: false,
    solo: false,
    pan: 0,
    cutoff: 0.4,        // 0-1 -> 50 Hz..5 kHz (esponenziale)
    resonance: 5.0,     // Q 0.5-15
    envAmount: 0.7,     // -1..+1
    decay: 250,         // ms env filter (60..800)
    drive: 0.2,         // 0..1 WaveShaper amount
  };

  /** 4 pattern bass (step sequence).
      Ogni step è null (off) oppure
      { note: "C2"..., vel: 0-1, len: 0.1-1, accent: bool, slide: bool } */
  function makeEmptyBassPattern() {
    return new Array(MAX_STEPS).fill(null);
  }
  let bassPatterns = {
    A: makeEmptyBassPattern(),
    B: makeEmptyBassPattern(),
    C: makeEmptyBassPattern(),
    D: makeEmptyBassPattern(),
  };

  /** 4 live loop bass, paralleli ai pattern.
      Array di eventi { step: number frazionario (0..patternLength), note, vel, len } */
  let bassLiveLoops = { A: [], B: [], C: [], D: [] };

  /** Modalità bass: 'step' | 'looper' */
  let bassMode = 'step';

  /** EDIT mode della griglia bass: 'note' | 'vel' | 'len' | 'acc' | 'slide' */
  let bassEditMode = 'note';

  /** Focus UI: 'drum' -> mostra panel drum; 'bass' -> mostra panel bass */
  let atFocus = 'drum';

  /** Tastiera bass on-screen, ottava corrente (1..4 dove 2 mostra C2..B2) */
  let bassKbOctave = 2;

  /** Nota di default quando accendi uno step bass la prima volta */
  const BASS_DEFAULT_NOTE = 'C2';

  /** Stato looper live */
  let bassRecArmed = false;    // armato, aspetta il prossimo downbeat
  let bassRecActive = false;   // sta registrando
  let bassRecPattern = 'A';    // pattern corrente quando partì il rec
  let bassActiveNote = null;   // nota premuta live per calcolarne la length
  let bassActiveNoteStart = 0; // timestamp inizio (audio time)
  let bassActiveNoteStepPos = 0; // posizione frazionaria dentro il pattern
  let bassQuantOn = true;      // quantizza 1/16 all'inserimento
  let bassPlayStepToo = false; // in looper, suona anche gli step
  let bassCurrentFracStep = 0; // posizione frazionaria corrente del playhead
  let bassLastSchedulerBase = 0;

  /** Per gestire la continuità dello slide (ultima voce ancora attiva) */
  let bassLastVoice = null;   // { osc1, osc2, gain, filter, endTime, note, slideNext }
  let bassSolo = () => bassParams.solo; // shortcut

  /** DOM cache bass */
  let bassStepElements = []; // [step] -> button
  let bassKeyboardButtons = []; // [0..12] tasti della tastiera on-screen

  /** Mappe nota<->freq/midi */
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function parseNote(n) {
    // "C2" -> { name: 'C', octave: 2 }
    const m = /^([A-G]#?)(-?\d+)$/.exec(n);
    if (!m) return { name: 'C', octave: 2 };
    return { name: m[1], octave: parseInt(m[2], 10) };
  }
  function noteToMidi(n) {
    const p = parseNote(n);
    const idx = NOTE_NAMES.indexOf(p.name);
    return 12 * (p.octave + 1) + idx; // MIDI standard: C-1 = 0
  }
  function midiToNote(m) {
    const idx = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    return NOTE_NAMES[idx] + oct;
  }
  function noteToFreq(n) {
    const m = noteToMidi(n);
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  // ============================================================
  // 4) INIZIALIZZAZIONE AUDIO
  // ============================================================
  function initAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.75;
    masterGain.connect(audioCtx.destination);

    // Destination parallelo per il REC live (MediaRecorder)
    try {
      mediaRecDest = audioCtx.createMediaStreamDestination();
      masterGain.connect(mediaRecDest);
    } catch (e) {
      mediaRecDest = null;
    }

    // Bus intermedi drum e bass, entrambi a valle di masterGain
    drumBus = audioCtx.createGain();
    drumBus.gain.value = drumBusLevel;
    drumBus.connect(masterGain);

    bassBus = audioCtx.createGain();
    bassBus.gain.value = bassBusLevel;
    // Niente compressore sul bass bus: il synth ha dinamica già controllata
    // (peakGain = velBase * accent, range determinato 0.05-1.2). Comprimere
    // qui significa squashare il sustain dopo i transient accent — peggiora
    // note lunghe (trap F2 length 0.85, funk slap accent).
    bassBus.connect(masterGain);

    // Rumore bianco pregenerato, condiviso
    const len = audioCtx.sampleRate * 2;
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Catena per traccia: voice -> trackPanner[i] -> trackFilter[i] -> trackGain[i] -> drumBus -> masterGain
    for (let i = 0; i < NUM_TRACKS; i++) {
      const pan = audioCtx.createStereoPanner
        ? audioCtx.createStereoPanner()
        : null;

      const f = audioCtx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 20000;
      f.Q.value = 1.0;

      const g = audioCtx.createGain();
      g.gain.value = trackParams[i].volume;

      if (pan) {
        pan.pan.value = trackParams[i].pan || 0;
        pan.connect(f).connect(g).connect(drumBus);
      } else {
        f.connect(g).connect(drumBus);
      }

      trackPanners.push(pan); // può essere null su browser vintage
      trackFilters.push(f);
      trackGains.push(g);
    }

    // ------ Catena bass ------
    // bassVoice -> bassPanner -> bassFilter (LP, modulato per nota) ->
    //              bassDrive (WaveShaper) -> bassGain -> masterGain
    bassPanner = audioCtx.createStereoPanner
      ? audioCtx.createStereoPanner()
      : null;
    bassFilter = audioCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 800;
    bassFilter.Q.value = bassParams.resonance;

    bassDrive = audioCtx.createWaveShaper();
    bassDrive.curve = makeDriveCurve(bassParams.drive);
    bassDrive.oversample = '2x';

    bassGain = audioCtx.createGain();
    bassGain.gain.value = bassParams.volume;

    if (bassPanner) {
      bassPanner.pan.value = bassParams.pan;
      bassPanner.connect(bassFilter);
    }
    bassFilter.connect(bassDrive).connect(bassGain).connect(bassBus);

    applyTrackParams();
    applyBassParams();
    applyMasterBuses();
  }

  /** Aggiorna i livelli dei bus drum e bass */
  function applyMasterBuses() {
    if (!audioCtx) return;
    if (drumBus) drumBus.gain.setTargetAtTime(drumBusLevel, audioCtx.currentTime, 0.02);
    if (bassBus) bassBus.gain.setTargetAtTime(bassBusLevel, audioCtx.currentTime, 0.02);
  }

  /** Aggiorna gli slider master nell'header in base allo stato */
  function updateMasterMixerUI() {
    const ds = document.getElementById('drumBusSlider');
    const dv = document.getElementById('drumBusVal');
    const bs = document.getElementById('bassBusSlider');
    const bv = document.getElementById('bassBusVal');
    const dVal = Math.round(drumBusLevel * 100);
    const bVal = Math.round(bassBusLevel * 100);
    if (ds) ds.value = dVal;
    if (dv) dv.textContent = dVal;
    if (bs) bs.value = bVal;
    if (bv) bv.textContent = bVal;
  }

  /** Curva WaveShaper per il drive (soft clipping tipo tanh) */
  function makeDriveCurve(amount) {
    // amount in [0,1] -> k in [0..8]
    const k = amount * 8;
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = k > 0.01 ? Math.tanh(x * (1 + k)) : x;
    }
    return curve;
  }

  /** Applica bassParams alla catena audio runtime */
  function applyBassParams() {
    if (!audioCtx) return;
    const anySoloDrum = trackParams.some(p => p.solo);
    const bassIsSolo = bassParams.solo;
    const someoneElseSolo = anySoloDrum && !bassIsSolo;
    let vol = bassParams.volume;
    if (bassParams.mute) vol = 0;
    else if (someoneElseSolo) vol = 0;
    bassGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.02);

    if (bassPanner) {
      bassPanner.pan.setTargetAtTime(bassParams.pan, audioCtx.currentTime, 0.02);
    }
    bassFilter.Q.setTargetAtTime(bassParams.resonance, audioCtx.currentTime, 0.02);
    bassDrive.curve = makeDriveCurve(bassParams.drive);

    // Se il drum passa in solo, dobbiamo anche silenziare il basso: il flag
    // bassParams.solo è indipendente, quindi il calcolo gain sopra già
    // gestisce "altri in solo + basso non in solo -> mute basso".
  }

  function unlockAudio() {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  /** Aggiorna ogni filter/gain/pan in base a trackParams e mute/solo.
      Chiama anche applyBassParams() perché il solo di una drum deve silenziare
      il basso (a meno che anche il basso sia in solo). */
  function applyTrackParams() {
    if (!audioCtx) return;
    const anySolo = trackParams.some(p => p.solo) || bassParams.solo;
    for (let i = 0; i < NUM_TRACKS; i++) {
      const p = trackParams[i];
      // Gain (mute/solo)
      let vol = p.volume;
      if (p.mute) vol = 0;
      else if (anySolo && !p.solo) vol = 0;
      trackGains[i].gain.setTargetAtTime(vol, audioCtx.currentTime, 0.01);

      // Pan
      if (trackPanners[i]) {
        trackPanners[i].pan.setTargetAtTime(p.pan || 0, audioCtx.currentTime, 0.01);
      }

      // Filter
      const f = trackFilters[i];
      if (p.filterType === 'off') {
        f.type = 'lowpass';
        f.frequency.setTargetAtTime(20000, audioCtx.currentTime, 0.01);
        f.Q.setTargetAtTime(0.707, audioCtx.currentTime, 0.01);
      } else {
        f.type = p.filterType;
        // Mapping esponenziale 0-1 -> 50Hz-18kHz
        const hz = 50 * Math.pow(360, p.filterCutoff);
        f.frequency.setTargetAtTime(hz, audioCtx.currentTime, 0.01);
        f.Q.setTargetAtTime(p.filterQ, audioCtx.currentTime, 0.01);
      }
    }
    // Il solo del basso influenza anche le drum (gestito sopra via anySolo),
    // quindi aggiorniamo il bassGain coerentemente con il nuovo stato.
    if (typeof applyBassParams === 'function') applyBassParams();
  }

  // ============================================================
  // 5) SINTESI DELLE 8 VOCI
  //    Ogni voce accetta (time, params) dove params include:
  //      - trackIdx (per connettersi al filter/gain corretto)
  //      - pitch (semitoni)
  //      - decayMul (moltiplicatore decay)
  //      - vel (0-1 velocity per lo step)
  // ============================================================

  /** Utility: fattore di pitch da semitoni */
  const semi = s => Math.pow(2, s / 12);

  /** Ritorna il nodo di uscita della traccia i (dove connettere le voci) */
  function trackOut(i) {
    return trackPanners[i] || trackFilters[i];
  }

  function playKick(time, p) {
    const out = trackOut(p.trackIdx);
    const pitch = semi(p.pitch);
    const dMul = p.decayMul;
    const vel = p.vel;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(45 * pitch, time + 0.12 * dMul);
    gain.gain.setValueAtTime(vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45 * dMul);
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(time + 0.5 * dMul + 0.02);

    // Click
    const click = audioCtx.createOscillator();
    const cGain = audioCtx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1200 * pitch, time);
    cGain.gain.setValueAtTime(0.35 * vel, time);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    click.connect(cGain).connect(out);
    click.start(time);
    click.stop(time + 0.05);
  }

  function playSnare(time, p) {
    const out = trackOut(p.trackIdx);
    const pitch = semi(p.pitch);
    const dMul = p.decayMul;
    const vel = p.vel;

    const osc = audioCtx.createOscillator();
    const oGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 * pitch, time);
    oGain.gain.setValueAtTime(0.5 * vel, time);
    oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11 * dMul);
    osc.connect(oGain).connect(out);
    osc.start(time);
    osc.stop(time + 0.2 * dMul);

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1000;
    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.7 * vel, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.17 * dMul);
    noise.connect(hp).connect(nGain).connect(out);
    noise.start(time);
    noise.stop(time + 0.22 * dMul);
  }

  function playHihat(time, p) {
    const out = trackOut(p.trackIdx);
    const dMul = p.decayMul;
    const vel = p.vel;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000 * semi(p.pitch * 0.5);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.45 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055 * dMul);
    noise.connect(hp).connect(gain).connect(out);
    noise.start(time);
    noise.stop(time + 0.1 * dMul);
  }

  function playOpenhat(time, p) {
    const out = trackOut(p.trackIdx);
    const dMul = p.decayMul;
    const vel = p.vel;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500 * semi(p.pitch * 0.5);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.4 * vel, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45 * dMul);
    noise.connect(hp).connect(gain).connect(out);
    noise.start(time);
    noise.stop(time + 0.5 * dMul);
  }

  function playClap(time, p) {
    const out = trackOut(p.trackIdx);
    const dMul = p.decayMul;
    const vel = p.vel;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500 * semi(p.pitch);
    bp.Q.value = 0.9;
    const gain = audioCtx.createGain();

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.85 * vel, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.15, time + 0.013);
    gain.gain.linearRampToValueAtTime(0.85 * vel, time + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.15, time + 0.027);
    gain.gain.linearRampToValueAtTime(0.85 * vel, time + 0.030);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32 * dMul);

    noise.connect(bp).connect(gain).connect(out);
    noise.start(time);
    noise.stop(time + 0.35 * dMul);
  }

  function playTom(time, p) {
    const out = trackOut(p.trackIdx);
    const pitch = semi(p.pitch);
    const dMul = p.decayMul;
    const vel = p.vel;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180 * pitch, time);
    osc.frequency.exponentialRampToValueAtTime(90 * pitch, time + 0.15 * dMul);
    gain.gain.setValueAtTime(0.8 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6 * dMul);
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(time + 0.65 * dMul);

    // piccolo noise transient
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 1.2;
    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.2 * vel, time);
    nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    noise.connect(bp).connect(nGain).connect(out);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  function playRim(time, p) {
    const out = trackOut(p.trackIdx);
    const pitch = semi(p.pitch);
    const vel = p.vel;

    // Due oscillatori stretti con attacco brutale
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o1.type = 'square';
    o2.type = 'triangle';
    o1.frequency.setValueAtTime(800 * pitch, time);
    o2.frequency.setValueAtTime(380 * pitch, time);
    g.gain.setValueAtTime(0.5 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05 * p.decayMul);
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 * pitch;
    bp.Q.value = 3;
    o1.connect(bp);
    o2.connect(bp);
    bp.connect(g).connect(out);
    o1.start(time); o2.start(time);
    o1.stop(time + 0.08); o2.stop(time + 0.08);
  }

  function playCow(time, p) {
    const out = trackOut(p.trackIdx);
    const pitch = semi(p.pitch);
    const dMul = p.decayMul;
    const vel = p.vel;

    // Cowbell TR-808 classica: due square a 540Hz e 800Hz
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    o1.type = 'square';
    o2.type = 'square';
    o1.frequency.setValueAtTime(540 * pitch, time);
    o2.frequency.setValueAtTime(800 * pitch, time);

    const mix = audioCtx.createGain();
    mix.gain.value = 0.5;
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 * pitch;
    bp.Q.value = 1.5;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(0.35 * vel, time + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.3 * dMul);

    o1.connect(mix); o2.connect(mix);
    mix.connect(bp).connect(env).connect(out);
    o1.start(time); o2.start(time);
    o1.stop(time + 0.35 * dMul);
    o2.stop(time + 0.35 * dMul);
  }

  const VOICES = {
    kick:    playKick,
    snare:   playSnare,
    hihat:   playHihat,
    openhat: playOpenhat,
    clap:    playClap,
    tom:     playTom,
    rim:     playRim,
    cow:     playCow,
  };

  // ============================================================
  // 5b) SINTESI BASS
  //
  // Oscillatore principale saw + secondo osc square sub-ottava (-12 st)
  // mixati 70/30, filtrati con BiquadFilter lowpass modulato da envelope
  // ADSR. Accent aumenta gain iniziale e intensità env filtro (stile 303).
  // Slide: la nota successiva ramp-lineare in 30 ms e non ri-triggera
  // l'envelope del filtro (tie-note).
  // ============================================================

  /** Ingresso bass: nodo a cui connettere le voci bass (saltando il panner
      se non supportato, altrimenti parte dal panner). */
  function bassIn() {
    return bassPanner || bassFilter;
  }

  /** Suona una nota bass. Ritorna l'oggetto "voice" per poter applicare slide. */
  function playBassNote(time, p) {
    // p: { note, vel, len (frazione step), durationSec, accent, slideFromVoice, willSlideNext }
    if (!audioCtx) return null;

    const freq = noteToFreq(p.note);
    const subFreq = freq / 2; // -12 st = sub-ottava
    // Hard cutoff a C2 (MIDI 36): sotto questa soglia il sub a -12 st scende
    // sotto 33 Hz e interferisce con la fondamentale del kick (~40-45 Hz),
    // creando battimenti percepiti come 'stonatura'. Isolamento spettrale
    // pulito > continuità timbrica teorica del crossfade.
    const noteMidi = noteToMidi(p.note);
    const useSub = noteMidi >= 36;

    const accent = !!p.accent;
    const velBase = Math.max(0.05, Math.min(1, p.vel));
    const peakGain = velBase * (accent ? 1.2 : 1.0);

    // Evita picchi brutali se c'è già una voce attiva: la chiudiamo velocemente
    // a meno di tie-slide
    if (bassLastVoice && bassLastVoice.endTime > time && !p.slideFromVoice) {
      try { bassLastVoice.gain.gain.cancelScheduledValues(time); } catch(e){}
      bassLastVoice.gain.gain.setTargetAtTime(0.0001, time, 0.01);
      try { bassLastVoice.osc1.stop(time + 0.05); } catch(e){}
      if (bassLastVoice.osc2) { try { bassLastVoice.osc2.stop(time + 0.05); } catch(e){} }
      bassLastVoice = null;
    }

    // Se c'è tie-slide dalla voce precedente, NON creiamo una nuova voce:
    // pitch-ramp sulla voce esistente.
    if (p.slideFromVoice && bassLastVoice) {
      const v = bassLastVoice;
      // Glide 30 ms
      try { v.osc1.frequency.cancelScheduledValues(time); } catch(e){}
      v.osc1.frequency.setValueAtTime(v.osc1.frequency.value, time);
      v.osc1.frequency.linearRampToValueAtTime(freq, time + 0.030);
      // osc2 può essere null se la voce è stata creata sotto C2 (sub disabilitato)
      if (v.osc2) {
        try { v.osc2.frequency.cancelScheduledValues(time); } catch(e){}
        v.osc2.frequency.setValueAtTime(v.osc2.frequency.value, time);
        v.osc2.frequency.linearRampToValueAtTime(subFreq, time + 0.030);
      }

      // Aggiorna il gate amp decay per la durata della nuova nota (non
      // ri-triggera env filtro come 303). La sustain resta.
      const durationSec = Math.max(0.03, p.durationSec);
      const releaseAt = time + durationSec;
      try { v.gain.gain.cancelScheduledValues(time); } catch(e){}
      v.gain.gain.setTargetAtTime(peakGain * 0.9, time, 0.01);
      v.gain.gain.setTargetAtTime(peakGain * 0.7, time + 0.02, 0.03); // sustain ~0.7
      v.gain.gain.setTargetAtTime(0.0001, releaseAt, 0.02);
      v.endTime = releaseAt + 0.08;
      v.note = p.note;
      v.slideNext = !!p.willSlideNext;
      // Osc stop va spostato
      try { v.osc1.stop(releaseAt + 0.12); } catch(e){}
      if (v.osc2) { try { v.osc2.stop(releaseAt + 0.12); } catch(e){} }
      return v;
    }

    // Nuova voce. Niente detune: il bass è monofonico, le voci non si
    // sovrappongono mai (la precedente è chiusa al trigger della successiva
    // tranne in slide), quindi non c'è rischio di phase-stack. Pitch lock
    // assoluto = bass più "stabile" e definito.
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    let osc2 = null;
    let mixSub = null;
    if (useSub) {
      osc2 = audioCtx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(subFreq, time);
    }

    // Mixer 70/30 quando il sub è attivo, 100/0 quando off.
    const mixSaw = audioCtx.createGain();
    mixSaw.gain.value = useSub ? 0.7 : 1.0;
    if (useSub) {
      mixSub = audioCtx.createGain();
      mixSub.gain.value = 0.3;
    }

    // Envelope di ampiezza: A 3ms, D=len*stepDur, S 0.7, R 60ms
    const gate = audioCtx.createGain();
    gate.gain.setValueAtTime(0.0001, time);
    gate.gain.linearRampToValueAtTime(peakGain, time + 0.003);

    const durationSec = Math.max(0.03, p.durationSec);
    const releaseAt = time + durationSec;
    // decay a sustain
    gate.gain.setTargetAtTime(peakGain * 0.7, time + 0.04, 0.08);
    // release
    gate.gain.setTargetAtTime(0.0001, releaseAt, 0.03);

    // Envelope del filtro: attack 2 ms, decay dal parametro, sustain 0, release 50 ms
    // Il cutoff base è bassParams.cutoff mappato 50Hz..5kHz.
    // envAmount [-1..+1] modula (in positivo il filtro si apre fino a ~6 kHz oltre il base)
    const baseHz = 50 * Math.pow(100, bassParams.cutoff);
    const envMax = bassParams.envAmount >= 0
      ? baseHz + bassParams.envAmount * 4500 * (accent ? 2 : 1)
      : baseHz + bassParams.envAmount * (baseHz - 50) * (accent ? 2 : 1);
    const envMaxClamped = Math.max(40, Math.min(8000, envMax));
    const decaySec = Math.max(0.06, Math.min(0.8, bassParams.decay / 1000));

    // Un filter dedicato per questa voce, in serie con bassFilter globale (che
    // in realtà usiamo come "color/res" sempre attivo sul bus). Semplifichiamo
    // usando direttamente bassFilter come filter modulato:
    // automatizziamo la frequency del bassFilter per questa nota.
    const fFreq = bassFilter.frequency;
    try { fFreq.cancelScheduledValues(time); } catch(e){}
    fFreq.setValueAtTime(baseHz, time);
    fFreq.linearRampToValueAtTime(envMaxClamped, time + 0.002);
    fFreq.exponentialRampToValueAtTime(Math.max(50, baseHz), time + 0.002 + decaySec);
    // release (dopo releaseAt)
    fFreq.setTargetAtTime(baseHz, releaseAt, 0.05);

    // Routing
    osc1.connect(mixSaw).connect(gate);
    if (osc2 && mixSub) osc2.connect(mixSub).connect(gate);
    gate.connect(bassIn());

    osc1.start(time);
    osc1.stop(releaseAt + 0.12);
    if (osc2) {
      osc2.start(time);
      osc2.stop(releaseAt + 0.12);
    }

    const voice = {
      osc1, osc2, gain: gate, endTime: releaseAt + 0.1,
      note: p.note, slideNext: !!p.willSlideNext,
    };
    bassLastVoice = voice;

    // MIDI bass: canale 2 (0x91 / 0x81)
    sendBassMidi(p.note, velBase, time, durationSec);

    return voice;
  }

  // ============================================================
  // 6) METRONOMO (click alto sul primo beat, basso sugli altri)
  // ============================================================
  function playMetronome(time, isDownbeat) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1600 : 1000, time);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain).connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  // ============================================================
  // 7) SCHEDULER
  // ============================================================

  /** Calcola il tempo di inizio di uno step considerando swing */
  function stepTimeOffset(stepIdx, secondsPerStep) {
    // Swing: ritarda gli step dispari (off-beat) di una frazione
    if (stepIdx % 2 === 1 && swing > 0) {
      return (swing / 100) * secondsPerStep * 0.5;
    }
    return 0;
  }

  function playTrackStep(trackIdx, stepIdx, time) {
    const pattern = patterns[currentPattern][trackIdx];
    const cell = pattern[stepIdx];
    if (!cell) return;

    // Probability (dado)
    if (cell.prob < 100 && Math.random() * 100 >= cell.prob) return;

    const tp = trackParams[trackIdx];
    // Se in mute o non in solo mentre qualcuno solo -> skip (il gain e' gia' 0 ma evitiamo sprechi)
    const anySolo = trackParams.some(p => p.solo);
    if (tp.mute || (anySolo && !tp.solo)) return;

    // Humanize: piccola variazione di timing/velocity
    const hTime = humanize ? (Math.random() - 0.5) * 0.012 : 0;
    const hVel  = humanize ? (Math.random() - 0.5) * 0.15 : 0;

    // Nudge manuale (ms)
    const nudgeSec = (cell.nudge || 0) / 1000;

    // Ratchet: N hit in un singolo step
    const ratch = cell.ratch || 1;
    const secondsPerStep = (60.0 / bpm) / 4;
    const ratchGap = (secondsPerStep * 0.9) / ratch;

    for (let r = 0; r < ratch; r++) {
      const t = time + nudgeSec + hTime + r * ratchGap;
      if (t < audioCtx.currentTime) continue;
      const vel = Math.max(0.05, Math.min(1, cell.vel + hVel));
      const voice = VOICES[TRACK_DEFS[trackIdx].id];
      voice(t, {
        trackIdx,
        pitch: tp.pitch,
        decayMul: tp.decay,
        vel: vel * (r === 0 ? 1.0 : 0.7), // i ratchet successivi più deboli
      });
    }

    // MIDI out (note on/off)
    sendMidiForTrack(trackIdx, cell.vel, time);
  }

  function scheduleStep(stepIdx, baseTime) {
    const secondsPerStep = (60.0 / bpm) / 4;
    const stepTime = baseTime + stepTimeOffset(stepIdx, secondsPerStep);

    for (let t = 0; t < NUM_TRACKS; t++) {
      playTrackStep(t, stepIdx, stepTime);
    }

    // Bass step + bass live loop
    scheduleBassForStep(stepIdx, baseTime, secondsPerStep);

    // Metronome (un click ogni quarto = ogni 4 step)
    if (metronome && stepIdx % 4 === 0) {
      playMetronome(baseTime, stepIdx === 0);
    }

    uiQueue.push({ step: stepIdx, time: stepTime });
  }

  /** Schedula per uno step: il pattern bass (se STEP o se PLAY STEP TOO in
      LOOPER) e gli eventi live loop che cadono dentro questo step. */
  function scheduleBassForStep(stepIdx, baseTime, secondsPerStep) {
    const pat = bassPatterns[currentPattern];
    const loop = bassLiveLoops[currentPattern] || [];

    const playStepGrid = (bassMode === 'step') || bassPlayStepToo;
    const playLiveLoop = (bassMode === 'looper');

    // ---- STEP pattern ----
    if (playStepGrid && pat) {
      const cell = pat[stepIdx];
      if (cell) {
        const stepTime = baseTime + stepTimeOffset(stepIdx, secondsPerStep);
        const hTime = humanize ? (Math.random() - 0.5) * 0.012 : 0;
        const hVel  = humanize ? (Math.random() - 0.5) * 0.15 : 0;
        const durationSec = Math.max(0.05, (cell.len || 0.5) * secondsPerStep);

        // slide: se la voce precedente era marcata slideNext, collega.
        // Per gestire bene lo slide dobbiamo guardare il cell precedente:
        const prevIdx = (stepIdx - 1 + patternLength) % patternLength;
        const prevCell = pat[prevIdx];
        const slideFrom = !!(prevCell && prevCell.slide);

        playBassNote(stepTime + hTime, {
          note: cell.note,
          vel: Math.max(0.05, Math.min(1, cell.vel + hVel)),
          len: cell.len,
          durationSec,
          accent: cell.accent,
          slideFromVoice: slideFrom,
          willSlideNext: !!cell.slide,
        });
      }
    }

    // ---- LIVE LOOP ----
    if (playLiveLoop && loop.length > 0) {
      for (const ev of loop) {
        // Gli step frazionari sono modulo patternLength.
        // Questo evento appartiene a stepIdx se floor(step) === stepIdx.
        if (Math.floor(ev.step) !== stepIdx) continue;
        const frac = ev.step - stepIdx; // 0..1
        // Humanize anche sul live loop: stesso shift random del drum e dello
        // step pattern, così basso e drum 'respirano insieme' invece di avere
        // il basso quantizzato perfetto contro un drum umanizzato.
        const hTime = humanize ? (Math.random() - 0.5) * 0.012 : 0;
        const hVel  = humanize ? (Math.random() - 0.5) * 0.15 : 0;
        const when = baseTime + stepTimeOffset(stepIdx, secondsPerStep) + frac * secondsPerStep + hTime;
        const durationSec = Math.max(0.05, (ev.len || 0.4) * secondsPerStep);
        playBassNote(when, {
          note: ev.note,
          vel: Math.max(0.05, Math.min(1, ev.vel + hVel)),
          len: ev.len || 0.4,
          durationSec,
          accent: false,
          slideFromVoice: false,
          willSlideNext: false,
        });
      }
    }

    // Registrazione: se stepIdx === 0 e siamo armati -> start rec
    if (bassRecArmed && stepIdx === 0) {
      bassRecArmed = false;
      bassRecActive = true;
      bassRecPattern = currentPattern;
      // Inizializza il loop (mantiene note esistenti per overdub)
      updateBassRecBtn();
      showToast('REC bass: suona!');
    } else if (bassRecActive && stepIdx === 0 && currentPattern === bassRecPattern) {
      // Un giro completo: il loop resta attivo in overdub mode
      // (non azzeriamo, il loop si limita a wrappare).
      // L'utente ferma col bottone o con R.
    }
  }

  function advance() {
    const secondsPerBeat = 60.0 / bpm;
    nextStepTime += 0.25 * secondsPerBeat;
    currentStep++;
    if (currentStep >= patternLength) {
      currentStep = 0;
      // Song mode: avanza al prossimo pattern
      if (songMode && songSequence.length > 0) {
        songStep = (songStep + 1) % songSequence.length;
        const nextName = songSequence[songStep];
        if (patterns[nextName]) {
          currentPattern = nextName;
          refreshPatternUI();
          refreshBassUI();
          updatePatternButtons();
          updateSongCurrentSlot();
        }
      }
    }
  }

  function scheduler() {
    while (nextStepTime < audioCtx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(currentStep, nextStepTime);
      advance();
    }
  }

  // ============================================================
  // 8) PLAY / STOP
  // ============================================================
  function start() {
    unlockAudio();
    playing = true;
    currentStep = 0;
    songStep = 0;
    nextStepTime = audioCtx.currentTime + 0.08;
    uiQueue = [];
    schedulerTimer = setInterval(scheduler, LOOKAHEAD_MS);
    updateTransportUI();
    requestAnimationFrame(tickUI);
  }

  function stop() {
    playing = false;
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    uiQueue = [];
    clearPlayingHighlights();
    updateTransportUI();
    // Stop basso eventualmente attivo
    if (bassLastVoice && audioCtx) {
      try { bassLastVoice.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.02); } catch(e){}
      try { bassLastVoice.osc1.stop(audioCtx.currentTime + 0.1); } catch(e){}
      if (bassLastVoice.osc2) { try { bassLastVoice.osc2.stop(audioCtx.currentTime + 0.1); } catch(e){} }
      bassLastVoice = null;
    }
    // All notes off MIDI
    if (midiOut) {
      for (let n = 35; n < 82; n++) midiOut.send([0x80, n, 0]);        // drum ch10
      for (let n = 24; n < 60; n++) midiOut.send([0x81, n, 0]);        // bass ch2
    }
    // Arm rec sì, ma fermiamo la registrazione in corso
    if (bassRecActive) {
      bassRecActive = false;
      updateBassRecBtn();
    }
  }

  function toggleTransport() {
    playing ? stop() : start();
  }

  // ============================================================
  // 9) UNDO / REDO
  // ============================================================
  function snapshot() {
    // Salva pattern + trackParams + stato bass + master buses
    return JSON.stringify({
      patterns,
      trackParams,
      bpm, swing, patternLength, songSequence,
      bassPatterns,
      bassLiveLoops,
      bassParams,
      bassMode,
      masterDrum: drumBusLevel,
      masterBass: bassBusLevel,
    });
  }

  function pushHistory() {
    // Tronca il "futuro" se siamo in mezzo a una sequenza di undo
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot());
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }

  function restoreFrom(jsonStr) {
    try {
      const s = JSON.parse(jsonStr);
      patterns = s.patterns;
      trackParams = s.trackParams;
      bpm = s.bpm; swing = s.swing;
      patternLength = s.patternLength;
      songSequence = s.songSequence;
      if (s.bassPatterns) bassPatterns = s.bassPatterns;
      if (s.bassLiveLoops) bassLiveLoops = s.bassLiveLoops;
      if (s.bassParams) bassParams = Object.assign({}, bassParams, s.bassParams);
      if (s.bassMode) bassMode = s.bassMode;
      if (typeof s.masterDrum === 'number') drumBusLevel = s.masterDrum;
      if (typeof s.masterBass === 'number') bassBusLevel = s.masterBass;
      refreshAllUI();
      applyTrackParams();
      applyBassParams();
      applyMasterBuses();
    } catch (e) {
      showToast('Undo fallito', true);
    }
  }

  function undo() {
    if (historyIndex <= 0) { showToast('Niente da annullare'); return; }
    historyIndex--;
    restoreFrom(history[historyIndex]);
    showToast('Annullato');
  }

  function redo() {
    if (historyIndex >= history.length - 1) { showToast('Niente da ripetere'); return; }
    historyIndex++;
    restoreFrom(history[historyIndex]);
    showToast('Ripetuto');
  }

  // ============================================================
  // 10) COSTRUZIONE SEQUENCER UI
  // ============================================================
  function buildSequencer() {
    const root = document.getElementById('sequencer');
    root.innerHTML = '';
    stepElements = TRACK_DEFS.map(() => new Array(MAX_STEPS));

    // Riga numeri step
    const numRow = document.createElement('div');
    numRow.className = 'seq__row seq__row--numbers';
    numRow.appendChild(makeTrackLabelPlaceholder());
    numRow.appendChild(makeStepGrid((s) => {
      const el = document.createElement('div');
      el.className = 'step-number' + (s % 4 === 0 ? ' step-number--downbeat' : '');
      el.textContent = String(s + 1).padStart(2, '0');
      return el;
    }));
    root.appendChild(numRow);

    // Righe tracce
    TRACK_DEFS.forEach((track, trackIdx) => {
      const row = document.createElement('div');
      row.className = 'seq__row';
      row.dataset.track = String(trackIdx);
      row.style.setProperty('--track-color', track.color);

      // Etichetta traccia (con mute/solo)
      row.appendChild(makeTrackLabel(track, trackIdx));

      // Griglia degli step
      row.appendChild(makeStepGrid((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'step';
        btn.dataset.track = String(trackIdx);
        btn.dataset.step = String(s);
        btn.setAttribute('aria-label', `${track.name} step ${s + 1}`);

        // Inner: barra velocity
        const bar = document.createElement('span');
        bar.className = 'step__bar';
        btn.appendChild(bar);

        // Indicatori (prob / ratch / nudge)
        const ind = document.createElement('span');
        ind.className = 'step__ind';
        btn.appendChild(ind);

        attachStepHandlers(btn, trackIdx, s);
        stepElements[trackIdx][s] = btn;
        return btn;
      }));

      root.appendChild(row);
    });
  }

  function makeStepGrid(cellFactory) {
    const wrap = document.createElement('div');
    wrap.className = 'beats';
    // Le celle sono generate come grid CSS. Numero visibile dipende da patternLength.
    for (let s = 0; s < MAX_STEPS; s++) {
      const cell = cellFactory(s);
      cell.classList.add('beat-cell');
      if (s >= patternLength) cell.classList.add('beat-cell--hidden');
      if (s % 4 === 0) cell.classList.add('beat-cell--downbeat');
      wrap.appendChild(cell);
    }
    return wrap;
  }

  function makeTrackLabel(track, idx) {
    const label = document.createElement('div');
    label.className = 'seq__label';
    label.dataset.track = String(idx);

    const dot = document.createElement('span');
    dot.className = 'seq__dot';
    label.appendChild(dot);

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'seq__name';
    name.textContent = track.name;
    name.addEventListener('click', () => setActiveTrack(idx));
    label.appendChild(name);

    const mute = document.createElement('button');
    mute.type = 'button';
    mute.className = 'ts-btn ts-btn--mute';
    mute.textContent = 'M';
    mute.title = 'Mute';
    mute.addEventListener('click', () => {
      trackParams[idx].mute = !trackParams[idx].mute;
      applyTrackParams();
      updateTrackControls();
    });
    label.appendChild(mute);

    const solo = document.createElement('button');
    solo.type = 'button';
    solo.className = 'ts-btn ts-btn--solo';
    solo.textContent = 'S';
    solo.title = 'Solo';
    solo.addEventListener('click', () => {
      trackParams[idx].solo = !trackParams[idx].solo;
      applyTrackParams();
      updateTrackControls();
    });
    label.appendChild(solo);

    return label;
  }

  function makeTrackLabelPlaceholder() {
    const label = document.createElement('div');
    label.className = 'seq__label seq__label--placeholder';
    return label;
  }

  // ============================================================
  // 11) GESTORI STEP (click / drag per edit mode)
  // ============================================================
  function attachStepHandlers(btn, trackIdx, stepIdx) {
    let dragStartY = null;
    let dragStartValue = null;
    let didDrag = false;

    btn.addEventListener('pointerdown', (e) => {
      unlockAudio();
      didDrag = false;

      if (editMode === 'trig') {
        // TRIG: toggle secco on/off. Nessun setPointerCapture (non serve, e
        // su alcuni browser può lanciare eccezioni interrompendo il toggle).
        const cell = patterns[currentPattern][trackIdx][stepIdx];
        if (cell) {
          patterns[currentPattern][trackIdx][stepIdx] = null;
        } else {
          patterns[currentPattern][trackIdx][stepIdx] = newCell();
          if (audioCtx) {
            VOICES[TRACK_DEFS[trackIdx].id](audioCtx.currentTime, {
              trackIdx, pitch: trackParams[trackIdx].pitch,
              decayMul: trackParams[trackIdx].decay, vel: 0.9,
            });
          }
        }
        refreshStep(trackIdx, stepIdx);
        pushHistory();
        return;
      }

      // VEL / PROB / RATCH / NUDGE: drag-to-edit
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* safari antico */ }
      const cell = patterns[currentPattern][trackIdx][stepIdx];
      if (!cell) {
        patterns[currentPattern][trackIdx][stepIdx] = newCell();
      }
      dragStartY = e.clientY;
      const c = patterns[currentPattern][trackIdx][stepIdx];
      dragStartValue = {
        vel: c.vel, prob: c.prob, ratch: c.ratch, nudge: c.nudge
      };
      refreshStep(trackIdx, stepIdx);
    });

    btn.addEventListener('pointermove', (e) => {
      if (dragStartY === null) return;
      const dy = dragStartY - e.clientY; // verso l'alto = positivo
      if (Math.abs(dy) > 3) didDrag = true;
      const cell = patterns[currentPattern][trackIdx][stepIdx];
      if (!cell) return;

      if (editMode === 'vel') {
        cell.vel = clamp(dragStartValue.vel + dy / 120, 0.05, 1);
      } else if (editMode === 'prob') {
        cell.prob = clamp(dragStartValue.prob + dy * 2, 0, 100);
      } else if (editMode === 'ratch') {
        cell.ratch = Math.round(clamp(dragStartValue.ratch + dy / 20, 1, 4));
      } else if (editMode === 'nudge') {
        cell.nudge = clamp(dragStartValue.nudge + dy, -50, 50);
      }
      refreshStep(trackIdx, stepIdx);
      updateStepReadout(trackIdx, stepIdx);
    });

    btn.addEventListener('pointerup', () => {
      if (dragStartY !== null) {
        dragStartY = null;
        dragStartValue = null;
        if (didDrag) pushHistory();
      }
    });

    btn.addEventListener('pointercancel', () => {
      dragStartY = null; dragStartValue = null;
    });
  }

  function newCell() {
    return { vel: 0.9, prob: 100, ratch: 1, nudge: 0 };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ============================================================
  // 12) REFRESH UI
  // ============================================================
  function refreshStep(trackIdx, stepIdx) {
    const btn = stepElements[trackIdx][stepIdx];
    if (!btn) return;
    const cell = patterns[currentPattern][trackIdx][stepIdx];
    btn.classList.toggle('step--active', !!cell);
    btn.classList.toggle('step--prob-partial', !!cell && cell.prob < 100);
    btn.classList.toggle('step--ratch', !!cell && cell.ratch > 1);
    btn.classList.toggle('step--nudged', !!cell && Math.abs(cell.nudge) > 3);

    const bar = btn.querySelector('.step__bar');
    if (cell) {
      bar.style.height = `${cell.vel * 100}%`;
    } else {
      bar.style.height = '0%';
    }

    const ind = btn.querySelector('.step__ind');
    if (cell && cell.ratch > 1) {
      ind.textContent = 'x' + cell.ratch;
    } else if (cell && cell.prob < 100) {
      ind.textContent = cell.prob + '%';
    } else {
      ind.textContent = '';
    }
  }

  function refreshPatternUI() {
    for (let t = 0; t < NUM_TRACKS; t++) {
      for (let s = 0; s < MAX_STEPS; s++) {
        refreshStep(t, s);
      }
    }
  }

  function refreshStepVisibility() {
    document.querySelectorAll('.beat-cell').forEach(el => {
      const s = parseInt(el.dataset.step || el.textContent, 10) - 1;
      // Sulla riga numeri non ha dataset.step
    });
    // Piuttosto mostriamo/nascondiamo via grid-template in CSS variable
    document.documentElement.style.setProperty('--pattern-length', patternLength);
    document.querySelectorAll('.beats').forEach(wrap => {
      [...wrap.children].forEach((el, i) => {
        el.classList.toggle('beat-cell--hidden', i >= patternLength);
      });
    });
  }

  function refreshAllUI() {
    refreshPatternUI();
    refreshStepVisibility();
    document.getElementById('bpmValue').textContent = bpm;
    document.getElementById('bpmSlider').value = bpm;
    document.getElementById('swingValue').textContent = swing + '%';
    document.getElementById('swingSlider').value = swing;
    document.getElementById('lengthSelect').value = patternLength;
    updateMasterMixerUI();
    updateTrackControls();
    updatePatternButtons();
    updateActiveTrackPanel();
    renderSongBar();
    updateClipboardUI();
    // Bass
    refreshBassUI();
    updateBassModeButtons();
    updateBassEditButtons();
    updateBassLooperCtlVisibility();
    updateBassParamPanel();
    updateAtFocus();
    updateBassHint();
  }

  function updateTransportUI() {
    const btn = document.getElementById('playButton');
    const icon = document.getElementById('playIcon');
    const label = document.getElementById('playLabel');
    if (playing) {
      btn.classList.add('transport--playing');
      icon.textContent = '■';
      label.textContent = 'STOP';
    } else {
      btn.classList.remove('transport--playing');
      icon.textContent = '▶';
      label.textContent = 'PLAY';
    }
  }

  function tickUI() {
    if (!playing) return;
    const now = audioCtx.currentTime;
    while (uiQueue.length && uiQueue[0].time <= now) {
      const ev = uiQueue.shift();
      flashColumn(ev.step);
    }
    requestAnimationFrame(tickUI);
  }

  function flashColumn(step) {
    for (let t = 0; t < NUM_TRACKS; t++) {
      for (let s = 0; s < MAX_STEPS; s++) {
        const el = stepElements[t][s];
        if (!el) continue;
        el.classList.remove('step--current-column');
        el.classList.remove('step--playing');
      }
    }
    for (let t = 0; t < NUM_TRACKS; t++) {
      const el = stepElements[t][step];
      if (!el) continue;
      el.classList.add('step--current-column');
      void el.offsetWidth;
      el.classList.add('step--playing');
    }
  }

  function clearPlayingHighlights() {
    for (let t = 0; t < NUM_TRACKS; t++) {
      for (let s = 0; s < MAX_STEPS; s++) {
        const el = stepElements[t][s];
        if (!el) continue;
        el.classList.remove('step--current-column');
        el.classList.remove('step--playing');
      }
    }
  }

  // ============================================================
  // 13) ACTIVE TRACK PANEL (pitch, decay, volume, filter per traccia)
  // ============================================================
  function setActiveTrack(idx) {
    activeTrack = idx;
    updateActiveTrackPanel();
    // evidenzia la riga
    document.querySelectorAll('.seq__row').forEach(r => {
      r.classList.toggle('seq__row--active', r.dataset.track === String(idx));
    });
  }

  function updateActiveTrackPanel() {
    const i = activeTrack;
    const p = trackParams[i];
    const def = TRACK_DEFS[i];
    document.getElementById('atName').textContent = def.name;
    const dot = document.getElementById('atDot');
    if (dot) dot.style.background = def.color;

    document.getElementById('atVol').value = Math.round(p.volume * 100);
    document.getElementById('atVolV').textContent = Math.round(p.volume * 100);
    document.getElementById('atPitch').value = p.pitch;
    document.getElementById('atPitchV').textContent = (p.pitch >= 0 ? '+' : '') + p.pitch;
    document.getElementById('atDecay').value = Math.round(p.decay * 100);
    document.getElementById('atDecayV').textContent = p.decay.toFixed(2);
    document.getElementById('atFilter').value = p.filterType;
    document.getElementById('atCutoff').value = Math.round(p.filterCutoff * 100);
    document.getElementById('atCutoffV').textContent = Math.round(p.filterCutoff * 100);

    const atPan = document.getElementById('atPan');
    if (atPan) {
      const panVal = Math.round((p.pan || 0) * 100);
      atPan.value = panVal;
      const atPanV = document.getElementById('atPanV');
      if (atPanV) atPanV.textContent = panToLabel(p.pan || 0);
    }

    document.querySelectorAll('.seq__row').forEach(r => {
      r.classList.toggle('seq__row--active', r.dataset.track === String(i));
    });
  }

  function panToLabel(v) {
    if (Math.abs(v) < 0.02) return 'C';
    const pct = Math.round(Math.abs(v) * 100);
    return (v < 0 ? 'L' : 'R') + pct;
  }

  function updateTrackControls() {
    // Aggiorna classi mute/solo
    document.querySelectorAll('.seq__row').forEach(row => {
      const idx = parseInt(row.dataset.track, 10);
      if (isNaN(idx)) return;
      const p = trackParams[idx];
      const mute = row.querySelector('.ts-btn--mute');
      const solo = row.querySelector('.ts-btn--solo');
      if (mute) mute.classList.toggle('ts-btn--on', p.mute);
      if (solo) solo.classList.toggle('ts-btn--on', p.solo);
    });
  }

  // ============================================================
  // 14) STEP READOUT (parametri del "step corrente" per edit mode)
  // ============================================================
  let lastReadoutStep = null;

  /** Testo guida contestuale per ogni edit mode */
  const EDIT_HINTS = {
    trig:  'TRIG · click su uno step per accenderlo/spegnerlo',
    vel:   'VEL · click + trascina verticalmente su uno step per la velocity (volume del singolo colpo)',
    prob:  'PROB · click + trascina per la probabilità 0–100% (a 50% lo step suona metà delle volte)',
    ratch: 'RATCH · click + trascina per ratchet 1–4× (ripete lo stesso step, utile per hi-hat trap)',
    nudge: 'NUDGE · click + trascina per spostare lo step ±50 ms fuori dalla griglia',
  };

  function updateStepReadout(trackIdx, stepIdx) {
    const el = document.getElementById('stepReadout');
    if (!el) return;
    // Se non passato uno step specifico, mostra l'hint dell'edit mode
    if (trackIdx === undefined || stepIdx === undefined) {
      el.textContent = EDIT_HINTS[editMode] || '—';
      el.classList.add('step-readout--hint');
      return;
    }
    const cell = patterns[currentPattern][trackIdx][stepIdx];
    if (!cell) {
      el.textContent = EDIT_HINTS[editMode] || '—';
      el.classList.add('step-readout--hint');
      return;
    }
    el.classList.remove('step-readout--hint');
    const track = TRACK_DEFS[trackIdx].name;
    const parts = [
      `${track} • step ${stepIdx + 1}`,
      `vel ${Math.round(cell.vel * 100)}%`,
      `prob ${cell.prob}%`,
      `x${cell.ratch}`,
      `nudge ${cell.nudge > 0 ? '+' : ''}${cell.nudge}ms`,
    ];
    el.textContent = parts.join('  ·  ');
  }

  // ============================================================
  // 15) PATTERN A/B/C/D (live switch) + CLEAR / DEMO
  // ============================================================
  function switchPattern(name) {
    if (!patterns[name]) return;
    currentPattern = name;
    refreshPatternUI();
    refreshBassUI();
    updatePatternButtons();
    showToast(`Pattern ${name}`);
  }

  function updatePatternButtons() {
    ['A','B','C','D'].forEach(n => {
      const b = document.querySelector(`[data-pattern="${n}"]`);
      if (!b) return;
      b.classList.toggle('pat-btn--active', n === currentPattern);
      b.classList.toggle('pat-btn--has-content', patternHasContent(n));
    });
  }

  function patternHasContent(name) {
    const p = patterns[name];
    if (!p) return false;
    for (let t = 0; t < NUM_TRACKS; t++) {
      for (let s = 0; s < patternLength; s++) {
        if (p[t][s]) return true;
      }
    }
    return false;
  }

  function clearCurrentPattern() {
    patterns[currentPattern] = makeEmptyPattern();
    bassPatterns[currentPattern] = makeEmptyBassPattern();
    bassLiveLoops[currentPattern] = [];
    refreshPatternUI();
    refreshBassUI();
    updatePatternButtons();
    pushHistory();
    showToast(`Pattern ${currentPattern} pulito (drum + bass)`);
  }

  // ============================================================
  // 15b) COPY / PASTE pattern
  // ============================================================
  function copyPattern() {
    patternClipboard = JSON.parse(JSON.stringify(patterns[currentPattern]));
    showToast(`Pattern ${currentPattern} copiato`);
    updateClipboardUI();
  }

  function pastePattern() {
    if (!patternClipboard) {
      showToast('Clipboard vuota', true);
      return;
    }
    patterns[currentPattern] = JSON.parse(JSON.stringify(patternClipboard));
    refreshPatternUI();
    updatePatternButtons();
    pushHistory();
    showToast(`Incollato in ${currentPattern}`);
  }

  function updateClipboardUI() {
    const pb = document.getElementById('pasteBtn');
    if (pb) pb.classList.toggle('chip--armed', !!patternClipboard);
  }

  // ============================================================
  // 15d) HELP MODAL
  // ============================================================
  function openHelp() {
    const m = document.getElementById('helpModal');
    if (m) m.classList.add('modal--open');
  }
  function closeHelp() {
    const m = document.getElementById('helpModal');
    if (m) m.classList.remove('modal--open');
  }

  // ============================================================
  // 15e) DEMO LIBRARY (fetch JSON dalla cartella examples/)
  // ============================================================
  const DEMO_LIBRARY = [
    // Generi moderni
    { file: 'demo-house.json',            name: 'House / Techno',       bpm: 124, tag: 'modern', desc: '4/4 dritto, build + drop' },
    { file: 'demo-trap.json',             name: 'Trap moderno',         bpm: 140, tag: 'modern', desc: '808 + ratchet hats' },
    { file: 'demo-boombap.json',          name: 'Boom Bap anni 90',     bpm:  90, tag: 'modern', desc: 'Swing 52% Dilla style' },
    { file: 'demo-dnb.json',               name: 'DNB / Amen break',     bpm: 170, tag: 'modern', desc: 'Jungle, ghost snare al 7' },
    { file: 'demo-makesomenoise.json',    name: 'NYC Hip-Hop 2011',     bpm: 105, tag: 'modern', desc: 'Kick doppio, cowbell' },
    { file: 'demo-ukhardcore.json',       name: 'UK Hardcore 92-93',    bpm: 140, tag: 'modern', desc: 'Pre-jungle rave' },
    { file: 'demo-onedrop.json',          name: 'Dub / Reggae',         bpm:  80, tag: 'modern', desc: '★ Beat sul 3, filosofia invertita' },

    // ★ Iconici "DA DA DA" / da stadio
    { file: 'demo-dadada.json',           name: 'Da Da Da-style',       bpm: 120, tag: 'iconic', desc: '1982 · Trio, Casio VL-Tone preset' },
    { file: 'demo-wewillrockyou.json',    name: 'We Will Rock You',     bpm:  81, tag: 'iconic', desc: '1977 · stomp-stomp-CLAP universale' },
    { file: 'demo-sevennation.json',      name: 'Seven Nation Army',    bpm: 124, tag: 'iconic', desc: '2003 · DA-da-DA-DA da stadio' },
    { file: 'demo-anotherone.json',       name: 'Another One-style',    bpm: 110, tag: 'iconic', desc: '1980 · Queen rock-disco' },

    // Funk-riff iconici
    { file: 'demo-superstition.json',     name: 'Superstition-style',   bpm: 100, tag: 'iconic', desc: '1972 · Stevie funky ghost' },
    { file: 'demo-rosanna.json',          name: 'Rosanna Shuffle',      bpm:  87, tag: 'iconic', desc: '1982 · Porcaro half-time shuffle' },
    { file: 'demo-stayinalive.json',      name: "Stayin' Alive",        bpm: 103, tag: 'iconic', desc: '1977 · disco (ritmo RCP!)' },

    // Cinematografici / speciali
    { file: 'demo-takefive.json',         name: 'Take Five (5/4!)',     bpm: 172, tag: 'iconic', desc: '1959 · ★ unico in 5/4' },
    { file: 'demo-wipeout.json',          name: 'Wipe Out',             bpm: 162, tag: 'iconic', desc: '1963 · surf drum solo 16th' },

    // Break storici
    { file: 'demo-billiejean.json',       name: 'Billie Jean-style',    bpm: 117, tag: 'classic', desc: '1982 · Linn LM-1 metronomica' },
    { file: 'demo-funkydrummer.json',     name: 'Funky Drummer-style',  bpm: 103, tag: 'classic', desc: '1970 · break piu campionato' },
    { file: 'demo-levee.json',            name: 'Levee Breaks-style',   bpm:  72, tag: 'classic', desc: '1971 · Bonham massiccio' },
    { file: 'demo-apache.json',           name: 'Apache-style',         bpm: 112, tag: 'classic', desc: '1973 · genesi hip-hop' },
    { file: 'demo-impeach.json',          name: 'Impeach-style',        bpm: 100, tag: 'classic', desc: '1973 · drum-solo pulito' },
    { file: 'demo-ashleysroachclip.json', name: "Ashley's Roachclip",   bpm: 100, tag: 'classic', desc: '1974 · funky con open hat' },
    { file: 'demo-synthsub.json',         name: 'Synthetic Sub-style',  bpm:  91, tag: 'classic', desc: '1973 · sparso, spazio per voce' },

    // 🎸 Demo drum+bass curate (v3) — 5 set astratti per genere
    { file: 'demo-bass-funk.json',    name: 'Funk Em + Bass',   bpm: 108, tag: 'bass', desc: 'E minor · slap-style con ghost notes, dialogo kick/basso' },
    { file: 'demo-bass-house.json',   name: 'House + Bass',     bpm: 124, tag: 'bass', desc: 'A minor 4/4 · tonica + slide alla dominante' },
    { file: 'demo-bass-onedrop.json', name: 'Reggae One-drop',  bpm:  80, tag: 'bass', desc: 'A minor · kick sul 3, bass con pause sacre' },
    { file: 'demo-bass-boombap.json', name: 'Boom Bap + Bass',  bpm:  90, tag: 'bass', desc: 'D minor swing 55 · tonica/terza/quinta' },
    { file: 'demo-bass-trap.json',    name: 'Trap 808 Bass',    bpm: 140, tag: 'bass', desc: 'F minor · sub lungo + slide, ratchet hats' },
  ];

  function openDemos() {
    const m = document.getElementById('demosModal');
    if (!m) return;
    // Aggiorna il titolo col numero corretto di demo
    const titleEl = document.getElementById('demosTitle');
    if (titleEl) titleEl.textContent = `DEMO LIBRARY · ${DEMO_LIBRARY.length} SET`;
    // Popola la grid se non già fatto
    const grid = document.getElementById('demosGrid');
    if (grid && grid.children.length === 0) {
      DEMO_LIBRARY.forEach(d => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'demo-card demo-card--' + d.tag;
        card.dataset.demo = d.file;
        const icon = d.tag === 'classic' ? '🏛' : d.tag === 'iconic' ? '⭐' : d.tag === 'bass' ? '🎸' : '🎛';
        card.innerHTML = `
          <div class="demo-card__head">
            <span class="demo-card__bpm">${d.bpm}</span>
            <span class="demo-card__tag">${icon}</span>
          </div>
          <div class="demo-card__name">${d.name}</div>
          <div class="demo-card__desc">${d.desc}</div>
        `;
        card.addEventListener('click', () => loadDemoFile(d.file, d.name));
        grid.appendChild(card);
      });
    }
    m.classList.add('modal--open');
  }

  function closeDemos() {
    const m = document.getElementById('demosModal');
    if (m) m.classList.remove('modal--open');
  }

  async function loadDemoFile(file, displayName) {
    try {
      showToast(`Carico ${displayName}…`);
      const resp = await fetch('examples/' + file);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (applyFull(data)) {
        pushHistory();
        closeDemos();
        showToast(`${displayName} caricata · attiva SONG + PLAY`);
      } else {
        showToast('JSON non valido', true);
      }
    } catch (e) {
      console.error(e);
      showToast(`Errore caricamento: ${e.message}`, true);
    }
  }

  // ============================================================
  // 15c) SONG EDITOR (sequence A/B/C/D con click-to-cycle)
  // ============================================================
  const SONG_ORDER = ['A','B','C','D'];

  function renderSongBar() {
    const wrap = document.getElementById('songSlots');
    if (!wrap) return;
    wrap.innerHTML = '';
    songSequence.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'song-slot';
      btn.dataset.songIdx = String(i);
      btn.textContent = name;
      btn.classList.toggle('song-slot--current', playing && songMode && i === songStep);
      btn.setAttribute('aria-label', `Slot ${i + 1}: pattern ${name}`);
      btn.addEventListener('click', () => cycleSongSlot(i));
      wrap.appendChild(btn);
    });
    const len = document.getElementById('songLenVal');
    if (len) len.textContent = String(songSequence.length);
  }

  function cycleSongSlot(i) {
    const cur = songSequence[i];
    const idx = SONG_ORDER.indexOf(cur);
    songSequence[i] = SONG_ORDER[(idx + 1) % SONG_ORDER.length];
    renderSongBar();
    pushHistory();
  }

  function songAddSlot() {
    if (songSequence.length >= 16) { showToast('Max 16 slot'); return; }
    songSequence.push(songSequence[songSequence.length - 1] || 'A');
    renderSongBar();
    pushHistory();
  }

  function songRemoveSlot() {
    if (songSequence.length <= 1) { showToast('Minimo 1 slot'); return; }
    songSequence.pop();
    renderSongBar();
    pushHistory();
  }

  function updateSongCurrentSlot() {
    // Aggiorna solo l'evidenziazione (performance-friendly)
    const slots = document.querySelectorAll('.song-slot');
    slots.forEach((el, i) => {
      el.classList.toggle('song-slot--current', playing && songMode && i === songStep);
    });
  }

  function loadDemo() {
    // Demo principale in A: classico four-on-the-floor + hi-hat ottavi + clap
    const demoA = makeEmptyPattern();
    // kick 1,5,9,13
    [0,4,8,12].forEach(s => demoA[0][s] = newCell());
    // snare 5,13
    [4,12].forEach(s => demoA[1][s] = newCell());
    // hi-hat ottavi
    for (let s = 0; s < 16; s += 2) demoA[2][s] = newCell();
    // clap 13
    demoA[4][12] = newCell();
    patterns.A = demoA;

    // B: variazione con open hat
    const demoB = makeEmptyPattern();
    [0,4,8,12].forEach(s => demoB[0][s] = newCell());
    [4,12].forEach(s => demoB[1][s] = newCell());
    for (let s = 0; s < 16; s += 2) demoB[2][s] = newCell();
    [2,6,10,14].forEach(s => demoB[3][s] = newCell());
    patterns.B = demoB;

    currentPattern = 'A';
    refreshPatternUI();
    updatePatternButtons();
    pushHistory();
  }

  // ============================================================
  // ========== BASS UI & LOOPER (§4.A + §4.B del prompt) ==========
  // ============================================================
  //
  // Griglia bass: una singola riga di 16 step (come patternLength) sotto il
  // drum sequencer. Edit mode bass-only: NOTE/VEL/LEN/ACC/SLIDE.
  // In modalità LOOPER la griglia è readonly e visualizza pallini per gli
  // eventi registrati (overdub).
  // ============================================================

  function buildBassGrid() {
    const root = document.getElementById('bassGrid');
    if (!root) return;
    root.innerHTML = '';
    bassStepElements = new Array(MAX_STEPS);

    // Riga numeri sintetica sopra (usa CSS grid con patternLength)
    for (let s = 0; s < MAX_STEPS; s++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bass-step beat-cell';
      if (s % 4 === 0) btn.classList.add('beat-cell--downbeat');
      if (s >= patternLength) btn.classList.add('beat-cell--hidden');
      btn.dataset.step = String(s);
      btn.setAttribute('aria-label', `Bass step ${s + 1}`);

      const noteLbl = document.createElement('span');
      noteLbl.className = 'bass-step__note';
      noteLbl.textContent = '';
      btn.appendChild(noteLbl);

      const velBar = document.createElement('span');
      velBar.className = 'bass-step__bar';
      btn.appendChild(velBar);

      const ind = document.createElement('span');
      ind.className = 'bass-step__ind';
      btn.appendChild(ind);

      const loopDots = document.createElement('span');
      loopDots.className = 'bass-step__loopdots';
      btn.appendChild(loopDots);

      attachBassStepHandlers(btn, s);
      bassStepElements[s] = btn;
      root.appendChild(btn);
    }
  }

  /**
   * Handler step bass: distingue TAP, DRAG verticale e LONG-PRESS (500 ms).
   * Decide l'azione al pointerup in base a cosa è successo durante il gesto,
   * così il toggle on/off non viene consumato prima del tempo dal drag.
   *
   *   NOTE mode:
   *     - tap breve su cella attiva → toggle off (cella -> null)
   *     - tap breve su cella spenta → toggle on (cella -> C2 default)
   *     - drag verticale su cella attiva → cambia pitch C1..B3
   *     - wheel su cella attiva → cambia pitch di 1 semitono
   *     - long-press 500 ms → apre mini-selettore di nota C1..B3
   *   VEL / LEN mode:
   *     - drag verticale su cella attiva → cambia parametro
   *     - tap su cella spenta → NO-OP (devi prima accenderla in NOTE)
   *   ACC / SLIDE mode:
   *     - tap su cella attiva → toggle flag
   *     - tap su cella spenta → NO-OP
   */
  function attachBassStepHandlers(btn, stepIdx) {
    let dragStartY = null;
    let dragStartValue = null;
    let didDrag = false;
    let longpressTimer = null;
    let longpressFired = false;

    const cancelLongpress = () => {
      if (longpressTimer) { clearTimeout(longpressTimer); longpressTimer = null; }
    };

    btn.addEventListener('pointerdown', (e) => {
      unlockAudio();
      if (bassMode === 'looper') return; // readonly durante LOOPER
      didDrag = false;
      longpressFired = false;

      const cell = bassPatterns[currentPattern][stepIdx];

      // Long-press apre il selettore nota (solo NOTE mode + cella attiva)
      if (bassEditMode === 'note' && cell) {
        longpressTimer = setTimeout(() => {
          longpressTimer = null;
          longpressFired = true;
          openBassNoteSelector(stepIdx);
        }, 500);
      }

      // Arma drag se la cella è attiva E il mode supporta drag
      const dragModes = ['note', 'vel', 'len'];
      if (cell && dragModes.indexOf(bassEditMode) !== -1) {
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* safari antico */ }
        dragStartY = e.clientY;
        dragStartValue = { vel: cell.vel, len: cell.len, midi: noteToMidi(cell.note) };
      }
    });

    btn.addEventListener('pointermove', (e) => {
      if (bassMode === 'looper') return;
      if (dragStartY === null) return;
      const dy = dragStartY - e.clientY;
      if (Math.abs(dy) > 3) {
        didDrag = true;
        cancelLongpress();
      }
      const cell = bassPatterns[currentPattern][stepIdx];
      if (!cell) return;

      if (bassEditMode === 'vel') {
        cell.vel = clamp(dragStartValue.vel + dy / 120, 0.05, 1);
      } else if (bassEditMode === 'len') {
        cell.len = clamp(dragStartValue.len + dy / 120, 0.1, 1);
      } else if (bassEditMode === 'note') {
        const deltaSemi = Math.round(dy / 8);
        const newMidi = clamp(dragStartValue.midi + deltaSemi, noteToMidi('C1'), noteToMidi('B3'));
        cell.note = midiToNote(newMidi);
      }
      refreshBassStep(stepIdx);
      updateBassHint(stepIdx);
    });

    btn.addEventListener('pointerup', () => {
      cancelLongpress();
      if (bassMode === 'looper') return;
      const wasDragging = dragStartY !== null && didDrag;
      dragStartY = null;
      dragStartValue = null;

      // Se il longpress ha già aperto il selettore, non fare altro
      if (longpressFired) return;

      const cell = bassPatterns[currentPattern][stepIdx];

      if (wasDragging) {
        pushHistory();
        return;
      }

      // Tap breve: decidi in base all'edit mode
      if (bassEditMode === 'note') {
        if (cell) {
          // Toggle OFF
          bassPatterns[currentPattern][stepIdx] = null;
        } else {
          // Toggle ON con default C2
          bassPatterns[currentPattern][stepIdx] = {
            note: BASS_DEFAULT_NOTE, vel: 0.9, len: 0.5, accent: false, slide: false,
          };
          if (audioCtx) {
            playBassNote(audioCtx.currentTime, {
              note: BASS_DEFAULT_NOTE, vel: 0.9, len: 0.5,
              durationSec: 0.25, accent: false, slideFromVoice: false, willSlideNext: false,
            });
          }
        }
        refreshBassStep(stepIdx);
        pushHistory();
      } else if (bassEditMode === 'acc') {
        if (cell) {
          cell.accent = !cell.accent;
          refreshBassStep(stepIdx);
          pushHistory();
        }
      } else if (bassEditMode === 'slide') {
        if (cell) {
          cell.slide = !cell.slide;
          refreshBassStep(stepIdx);
          refreshBassStep((stepIdx + 1) % patternLength);
          pushHistory();
        }
      }
      // VEL / LEN: tap su cella spenta = NO-OP (volutamente)
    });

    btn.addEventListener('pointercancel', () => {
      cancelLongpress();
      dragStartY = null;
      dragStartValue = null;
      longpressFired = false;
    });

    // Scroll wheel (desktop): cambia pitch di 1 semitono per notch
    btn.addEventListener('wheel', (e) => {
      if (bassMode === 'looper') return;
      if (bassEditMode !== 'note') return;
      const cell = bassPatterns[currentPattern][stepIdx];
      if (!cell) return;
      e.preventDefault();
      const m = noteToMidi(cell.note);
      const delta = e.deltaY > 0 ? -1 : 1;
      const newM = clamp(m + delta, noteToMidi('C1'), noteToMidi('B3'));
      cell.note = midiToNote(newM);
      refreshBassStep(stepIdx);
      pushHistory();
    }, { passive: false });
  }

  // ---------- Mini note selector (long-press) ----------
  function openBassNoteSelector(stepIdx) {
    closeBassNoteSelector();
    const cell = bassPatterns[currentPattern][stepIdx];
    if (!cell) return;
    const anchor = bassStepElements[stepIdx];
    if (!anchor) return;

    const pop = document.createElement('div');
    pop.className = 'bass-note-selector';
    pop.id = '_bassNoteSelector';

    for (let oct = 3; oct >= 1; oct--) {
      const row = document.createElement('div');
      row.className = 'bass-note-selector__row';
      const lbl = document.createElement('span');
      lbl.className = 'bass-note-selector__oct';
      lbl.textContent = 'OCT' + oct;
      row.appendChild(lbl);
      for (let n = 0; n < 12; n++) {
        const noteName = NOTE_NAMES[n] + oct;
        const nb = document.createElement('button');
        nb.type = 'button';
        nb.className = 'bass-note-selector__btn' +
          (NOTE_NAMES[n].indexOf('#') !== -1 ? ' bass-note-selector__btn--black' : '');
        if (noteName === cell.note) nb.classList.add('bass-note-selector__btn--on');
        nb.textContent = NOTE_NAMES[n];
        nb.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          cell.note = noteName;
          refreshBassStep(stepIdx);
          pushHistory();
          closeBassNoteSelector();
        });
        row.appendChild(nb);
      }
      pop.appendChild(row);
    }

    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    pop.style.position = 'fixed';
    let left = rect.left - 40;
    const maxLeft = window.innerWidth - 330;
    if (left < 8) left = 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    pop.style.left = left + 'px';
    let top = rect.bottom + 4;
    if (top + 140 > window.innerHeight) top = rect.top - 144;
    pop.style.top = top + 'px';
    pop.style.zIndex = '9999';

    setTimeout(() => {
      document.addEventListener('pointerdown', closeBassNoteSelectorOnOutside);
    }, 0);
  }

  function closeBassNoteSelectorOnOutside(e) {
    const pop = document.getElementById('_bassNoteSelector');
    if (!pop) {
      document.removeEventListener('pointerdown', closeBassNoteSelectorOnOutside);
      return;
    }
    if (!pop.contains(e.target)) closeBassNoteSelector();
  }

  function closeBassNoteSelector() {
    const pop = document.getElementById('_bassNoteSelector');
    if (pop) pop.remove();
    document.removeEventListener('pointerdown', closeBassNoteSelectorOnOutside);
  }

  function refreshBassStep(stepIdx) {
    const btn = bassStepElements[stepIdx];
    if (!btn) return;
    const cell = bassPatterns[currentPattern][stepIdx];
    const noteLbl = btn.querySelector('.bass-step__note');
    const bar = btn.querySelector('.bass-step__bar');
    const ind = btn.querySelector('.bass-step__ind');
    const loopDots = btn.querySelector('.bass-step__loopdots');

    btn.classList.toggle('bass-step--active', !!cell);
    btn.classList.toggle('bass-step--accent', !!cell && cell.accent);
    btn.classList.toggle('bass-step--slide', !!cell && cell.slide);

    if (cell) {
      noteLbl.textContent = cell.note;
      bar.style.height = `${(cell.vel || 0.9) * 100}%`;
      ind.textContent = cell.slide ? '→' : (cell.accent ? '>' : '');
    } else {
      noteLbl.textContent = '';
      bar.style.height = '0%';
      ind.textContent = '';
    }

    // Loop dots (pallini delle note registrate live)
    const loop = bassLiveLoops[currentPattern] || [];
    const here = loop.filter(ev => Math.floor(ev.step) === stepIdx);
    loopDots.innerHTML = '';
    here.forEach(ev => {
      const dot = document.createElement('span');
      dot.className = 'bass-step__dot';
      const frac = ev.step - stepIdx;
      dot.style.left = (frac * 100) + '%';
      loopDots.appendChild(dot);
    });
  }

  function refreshBassUI() {
    if (!bassStepElements.length) return;
    for (let s = 0; s < MAX_STEPS; s++) refreshBassStep(s);
    refreshBassStepVisibility();
    const root = document.getElementById('bassGrid');
    if (root) {
      root.classList.toggle('bass-grid--looper', bassMode === 'looper');
      root.classList.toggle('bass-grid--step', bassMode === 'step');
    }
  }

  function refreshBassStepVisibility() {
    for (let s = 0; s < MAX_STEPS; s++) {
      const btn = bassStepElements[s];
      if (!btn) continue;
      btn.classList.toggle('beat-cell--hidden', s >= patternLength);
    }
  }

  // -------- Bass mode / edit mode toggles --------
  function setBassMode(mode) {
    bassMode = mode;
    updateBassModeButtons();
    updateBassLooperCtlVisibility();
    refreshBassUI();
    updateBassHint();
  }

  function updateBassModeButtons() {
    document.querySelectorAll('[data-bass-mode]').forEach(b => {
      b.classList.toggle('bass-mode-btn--on', b.dataset.bassMode === bassMode);
    });
  }

  function setBassEditMode(mode) {
    bassEditMode = mode;
    updateBassEditButtons();
    updateBassHint();
  }

  function updateBassEditButtons() {
    document.querySelectorAll('[data-bass-edit]').forEach(b => {
      b.classList.toggle('bass-edit-btn--on', b.dataset.bassEdit === bassEditMode);
    });
    const editGroup = document.getElementById('bassEditGroup');
    if (editGroup) editGroup.style.opacity = (bassMode === 'step') ? '1' : '0.35';
  }

  function updateBassLooperCtlVisibility() {
    const ctl = document.getElementById('bassLooperCtl');
    if (ctl) ctl.style.display = (bassMode === 'looper') ? '' : 'none';
  }

  const BASS_HINTS = {
    step_note:  'STEP·NOTE — click per accendere/spegnere, scroll/drag verticale per cambiare nota (C1–B3)',
    step_vel:   'STEP·VEL — drag verticale per la velocity della nota (0.05–1.0)',
    step_len:   'STEP·LEN — drag verticale per la length/gate (10–100% dello step)',
    step_acc:   'STEP·ACC — click per toggle accent (+6 dB, filtro più aperto, stile 303)',
    step_slide: 'STEP·SLIDE — click per toggle slide (portamento 30 ms verso la nota successiva, tie-note 303)',
    looper:     'LOOPER — suona con la tastiera on-screen o con A..K del computer. REC (R) aspetta il downbeat, poi registra in overdub',
  };

  function updateBassHint(stepIdx) {
    const el = document.getElementById('bassHint');
    if (!el) return;
    if (bassMode === 'looper') {
      el.textContent = BASS_HINTS.looper;
      return;
    }
    if (stepIdx !== undefined) {
      const cell = bassPatterns[currentPattern][stepIdx];
      if (cell) {
        el.textContent = `step ${stepIdx + 1} · ${cell.note} · vel ${Math.round(cell.vel * 100)}% · len ${Math.round(cell.len * 100)}%` +
          (cell.accent ? ' · accent' : '') + (cell.slide ? ' · slide' : '');
        return;
      }
    }
    el.textContent = BASS_HINTS['step_' + bassEditMode] || BASS_HINTS.step_note;
  }

  // -------- Active Track panel (drum vs bass) --------
  function updateAtFocus() {
    const dPanel = document.getElementById('atrackDrum');
    const bPanel = document.getElementById('atrackBass');
    if (dPanel) dPanel.classList.toggle('atrack--hidden', atFocus !== 'drum');
    if (bPanel) bPanel.classList.toggle('atrack--hidden', atFocus !== 'bass');
  }

  function toggleAtFocus() {
    atFocus = (atFocus === 'drum') ? 'bass' : 'drum';
    updateAtFocus();
    showToast(`Focus: ${atFocus === 'bass' ? 'BASS' : 'DRUM'}`);
  }

  function updateBassParamPanel() {
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setI = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setI('bVol',    Math.round(bassParams.volume * 100));
    setV('bVolV',   Math.round(bassParams.volume * 100));
    setI('bPan',    Math.round(bassParams.pan * 100));
    setV('bPanV',   panToLabel(bassParams.pan));
    setI('bCutoff', Math.round(bassParams.cutoff * 100));
    setV('bCutoffV',Math.round(bassParams.cutoff * 100));
    setI('bRes',    Math.round(bassParams.resonance * 10));
    setV('bResV',   bassParams.resonance.toFixed(1));
    setI('bEnv',    Math.round(bassParams.envAmount * 100));
    setV('bEnvV',   (bassParams.envAmount >= 0 ? '+' : '') + Math.round(bassParams.envAmount * 100));
    setI('bDecay',  bassParams.decay);
    setV('bDecayV', Math.round(bassParams.decay));
    setI('bDrive',  Math.round(bassParams.drive * 100));
    setV('bDriveV', Math.round(bassParams.drive * 100));

    const mb = document.getElementById('bassMuteBtn');
    const sb = document.getElementById('bassSoloBtn');
    if (mb) mb.classList.toggle('ts-btn--on', !!bassParams.mute);
    if (sb) sb.classList.toggle('ts-btn--on', !!bassParams.solo);
  }

  // -------- Tastiera on-screen --------
  function buildBassKeyboard() {
    const root = document.getElementById('bassKeyboard');
    if (!root) return;
    root.innerHTML = '';
    bassKeyboardButtons = [];
    // 13 tasti: C..C ottava successiva
    for (let i = 0; i <= 12; i++) {
      const noteName = NOTE_NAMES[i % 12];
      const isBlack = noteName.includes('#');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bass-key' + (isBlack ? ' bass-key--black' : ' bass-key--white');
      btn.dataset.noteIdx = String(i);
      const lbl = document.createElement('span');
      lbl.className = 'bass-key__label';
      lbl.textContent = noteName + bassKbOctave;
      btn.appendChild(lbl);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        unlockAudio();
        const note = noteName + (noteName === 'C' && i === 12 ? (bassKbOctave + 1) : bassKbOctave);
        triggerLiveBassNoteDown(note);
      });
      btn.addEventListener('pointerup', () => triggerLiveBassNoteUp());
      btn.addEventListener('pointerleave', () => triggerLiveBassNoteUp());
      bassKeyboardButtons.push(btn);
      root.appendChild(btn);
    }
    updateBassKeyboardLabels();
  }

  function updateBassKeyboardLabels() {
    const octLbl = document.getElementById('bassOctLabel');
    if (octLbl) octLbl.textContent = String(bassKbOctave);
    bassKeyboardButtons.forEach((btn, i) => {
      const noteName = NOTE_NAMES[i % 12];
      const oct = (noteName === 'C' && i === 12) ? (bassKbOctave + 1) : bassKbOctave;
      const lbl = btn.querySelector('.bass-key__label');
      if (lbl) lbl.textContent = noteName + oct;
    });
  }

  function bassOctaveChange(delta) {
    bassKbOctave = clamp(bassKbOctave + delta, 1, 3);
    updateBassKeyboardLabels();
  }

  // -------- Trigger live di una nota (tastiera o keyboard computer) --------
  // Calcola la posizione frazionaria dentro il pattern per registrare.
  function currentFracStep() {
    if (!audioCtx || !playing) return 0;
    // Calcola via nextStepTime e currentStep quanto manca al prossimo step
    const secondsPerStep = (60.0 / bpm) / 4;
    const now = audioCtx.currentTime;
    // Lo step attualmente "in produzione" è (currentStep - 1 + patternLength) % patternLength
    // ma per una stima valida usiamo il delta col nextStepTime
    const untilNext = nextStepTime - now;
    const fracWithinStep = 1 - Math.max(0, Math.min(1, untilNext / secondsPerStep));
    const stepNow = (currentStep - 1 + patternLength) % patternLength;
    return (stepNow + fracWithinStep) % patternLength;
  }

  function triggerLiveBassNoteDown(note) {
    unlockAudio();
    if (bassActiveNote) triggerLiveBassNoteUp();
    const now = audioCtx.currentTime;
    // Suona la nota con durata lunga (verrà tagliata al keyup)
    playBassNote(now, {
      note, vel: 0.9, len: 0.7, durationSec: 2.0,
      accent: false, slideFromVoice: false, willSlideNext: false,
    });
    bassActiveNote = note;
    bassActiveNoteStart = now;
    bassActiveNoteStepPos = currentFracStep();
  }

  function triggerLiveBassNoteUp() {
    if (!bassActiveNote || !audioCtx) return;
    const now = audioCtx.currentTime;
    const heldSec = now - bassActiveNoteStart;
    // Chiudi voce
    if (bassLastVoice) {
      try { bassLastVoice.gain.gain.setTargetAtTime(0.0001, now, 0.02); } catch(e){}
      try { bassLastVoice.osc1.stop(now + 0.1); } catch(e){}
      if (bassLastVoice.osc2) { try { bassLastVoice.osc2.stop(now + 0.1); } catch(e){} }
      bassLastVoice = null;
    }
    // Registra in loop se rec attivo
    if (bassRecActive && playing) {
      const secondsPerStep = (60.0 / bpm) / 4;
      const lenFrac = clamp(heldSec / secondsPerStep, 0.1, 1.0);
      let stepPos = bassActiveNoteStepPos;
      if (bassQuantOn) {
        stepPos = Math.round(stepPos) % patternLength;
      }
      bassLiveLoops[currentPattern] = bassLiveLoops[currentPattern] || [];
      bassLiveLoops[currentPattern].push({
        step: stepPos, note: bassActiveNote, vel: 0.85, len: lenFrac,
      });
      refreshBassUI();
    }
    bassActiveNote = null;
  }

  function bassArmRec() {
    if (bassRecActive) {
      // Se già rec -> stop
      bassRecActive = false;
      bassRecArmed = false;
      updateBassRecBtn();
      showToast('REC bass fermato');
      pushHistory();
      return;
    }
    if (!playing) {
      showToast('Premi PLAY prima di armare il REC bass', true);
      return;
    }
    bassRecArmed = true;
    updateBassRecBtn();
    showToast('REC bass armato — parte al prossimo downbeat');
  }

  function updateBassRecBtn() {
    const btn = document.getElementById('bassRecBtn');
    if (!btn) return;
    btn.classList.toggle('chip--rec', bassRecActive);
    btn.classList.toggle('chip--armed', bassRecArmed);
    btn.textContent = bassRecActive ? 'REC ●' : (bassRecArmed ? 'REC…' : 'REC');
  }

  function clearBassLoop() {
    bassLiveLoops[currentPattern] = [];
    refreshBassUI();
    pushHistory();
    showToast(`Loop bass ${currentPattern} cancellato`);
  }

  // -------- MIDI bass (canale 2) --------
  function sendBassMidi(note, vel, time, durationSec) {
    if (!midiOut) return;
    const midiNum = noteToMidi(note);
    const v = Math.round(Math.max(0, Math.min(1, vel)) * 127);
    const delayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
    try {
      // Canale 2 = 0x91 / 0x81
      midiOut.send([0x91, midiNum, v], performance.now() + delayMs);
      midiOut.send([0x81, midiNum, 0], performance.now() + delayMs + durationSec * 1000);
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // 16) STORAGE: slot localStorage (legacy A/B/C/D)
  //     Manteniamo la vecchia API ma ora salviamo l'intero "set"
  //     (tutti e 4 i pattern + trackParams + swing + bass).
  // ============================================================
  const STORAGE_PREFIX = 'drumapp.slot.';
  const SLOTS = ['A','B','C','D'];

  function serializeFull() {
    return {
      version: 3,
      bpm, swing, patternLength, humanize,
      masterDrum: drumBusLevel,
      masterBass: bassBusLevel,
      trackParams,
      patterns,
      songSequence,
      bass: {
        trackParams: {
          volume: bassParams.volume,
          pan: bassParams.pan,
          cutoff: bassParams.cutoff,
          resonance: bassParams.resonance,
          envAmount: bassParams.envAmount,
          decay: bassParams.decay,
          drive: bassParams.drive,
          mute: bassParams.mute,
          solo: bassParams.solo,
        },
        patterns: bassPatterns,
        liveLoops: bassLiveLoops,
        mode: bassMode,
      },
    };
  }

  function applyFull(data) {
    if (!data) return false;
    if (typeof data.bpm === 'number') bpm = data.bpm;
    if (typeof data.swing === 'number') swing = data.swing;
    if (typeof data.patternLength === 'number') patternLength = data.patternLength;
    if (typeof data.humanize === 'boolean') humanize = data.humanize;
    // Master buses (backward compat v1/v2: defaults)
    drumBusLevel = (typeof data.masterDrum === 'number') ? data.masterDrum : 0.9;
    bassBusLevel = (typeof data.masterBass === 'number') ? data.masterBass : 0.8;
    if (Array.isArray(data.trackParams) && data.trackParams.length === NUM_TRACKS) {
      // Merge con default per backward compatibility (pan è recente)
      trackParams = data.trackParams.map(p => ({
        volume: 0.85, mute: false, solo: false,
        pitch: 0, decay: 1.0,
        filterType: 'off', filterCutoff: 0.7, filterQ: 1.0,
        pan: 0,
        ...p,
      }));
    }
    if (data.patterns && typeof data.patterns === 'object') {
      patterns = data.patterns;
    }
    if (Array.isArray(data.songSequence) && data.songSequence.length > 0) {
      songSequence = data.songSequence;
    }

    // ---- Bass (v3). Backward compat: se manca, reset a default. ----
    if (data.bass && typeof data.bass === 'object') {
      if (data.bass.trackParams && typeof data.bass.trackParams === 'object') {
        bassParams = Object.assign({
          volume: 0.85, mute: false, solo: false, pan: 0,
          cutoff: 0.4, resonance: 5.0, envAmount: 0.7, decay: 250, drive: 0.2,
        }, data.bass.trackParams);
      }
      if (data.bass.patterns && typeof data.bass.patterns === 'object') {
        bassPatterns = {
          A: Array.isArray(data.bass.patterns.A) ? padBassPattern(data.bass.patterns.A) : makeEmptyBassPattern(),
          B: Array.isArray(data.bass.patterns.B) ? padBassPattern(data.bass.patterns.B) : makeEmptyBassPattern(),
          C: Array.isArray(data.bass.patterns.C) ? padBassPattern(data.bass.patterns.C) : makeEmptyBassPattern(),
          D: Array.isArray(data.bass.patterns.D) ? padBassPattern(data.bass.patterns.D) : makeEmptyBassPattern(),
        };
      }
      if (data.bass.liveLoops && typeof data.bass.liveLoops === 'object') {
        bassLiveLoops = {
          A: Array.isArray(data.bass.liveLoops.A) ? data.bass.liveLoops.A.slice() : [],
          B: Array.isArray(data.bass.liveLoops.B) ? data.bass.liveLoops.B.slice() : [],
          C: Array.isArray(data.bass.liveLoops.C) ? data.bass.liveLoops.C.slice() : [],
          D: Array.isArray(data.bass.liveLoops.D) ? data.bass.liveLoops.D.slice() : [],
        };
      }
      if (typeof data.bass.mode === 'string') bassMode = data.bass.mode;
    } else {
      // Backward compat v1/v2: reset bass a default vuoto
      bassPatterns = {
        A: makeEmptyBassPattern(), B: makeEmptyBassPattern(),
        C: makeEmptyBassPattern(), D: makeEmptyBassPattern(),
      };
      bassLiveLoops = { A: [], B: [], C: [], D: [] };
      bassMode = 'step';
    }
    refreshAllUI();
    applyTrackParams();
    applyBassParams();
    applyMasterBuses();
    return true;
  }

  /** Assicura che un bass pattern abbia MAX_STEPS celle (padding con null). */
  function padBassPattern(arr) {
    const out = new Array(MAX_STEPS).fill(null);
    for (let i = 0; i < Math.min(arr.length, MAX_STEPS); i++) out[i] = arr[i];
    return out;
  }

  function hasSlot(slot) {
    try { return !!localStorage.getItem(STORAGE_PREFIX + slot); }
    catch (e) { return false; }
  }

  function saveToSlot(slot) {
    try {
      localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(serializeFull()));
      updateSlotButtons();
      flashSlot(slot, 'saving');
      showToast(`Set salvato in slot ${slot}`);
    } catch (e) { showToast('Salvataggio fallito', true); }
  }

  function loadFromSlot(slot) {
    let raw; try { raw = localStorage.getItem(STORAGE_PREFIX + slot); } catch(e) { raw = null; }
    if (!raw) { showToast(`Slot ${slot} vuoto — hold per salvare`); return; }
    try {
      const data = JSON.parse(raw);
      if (applyFull(data)) {
        flashSlot(slot, 'loading');
        showToast(`Set caricato da slot ${slot}`);
        pushHistory();
      } else showToast('Slot non valido', true);
    } catch (e) { showToast('Errore slot', true); }
  }

  function updateSlotButtons() {
    SLOTS.forEach(slot => {
      const btn = document.querySelector(`[data-slot="${slot}"]`);
      if (btn) btn.classList.toggle('slot--filled', hasSlot(slot));
    });
  }

  function flashSlot(slot, type) {
    const btn = document.querySelector(`[data-slot="${slot}"]`);
    if (!btn) return;
    const cls = 'slot--' + type;
    btn.classList.remove(cls);
    void btn.offsetWidth;
    btn.classList.add(cls);
    setTimeout(() => btn.classList.remove(cls), 600);
  }

  function attachSlotGestures(btn, slot) {
    let timer = null, fired = false;
    const down = (e) => {
      e.preventDefault(); fired = false;
      btn.classList.add('slot--holding');
      timer = setTimeout(() => {
        fired = true;
        btn.classList.remove('slot--holding');
        saveToSlot(slot);
      }, HOLD_MS);
    };
    const up = () => {
      btn.classList.remove('slot--holding');
      if (timer) { clearTimeout(timer); timer = null; }
      if (!fired) {
        if (hasSlot(slot)) loadFromSlot(slot);
        else saveToSlot(slot);
      }
    };
    const cancel = () => {
      btn.classList.remove('slot--holding');
      if (timer) { clearTimeout(timer); timer = null; }
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', cancel);
    btn.addEventListener('pointercancel', cancel);
  }

  // ============================================================
  // 17) EXPORT / IMPORT JSON
  // ============================================================
  function exportJSON() {
    const data = serializeFull();
    data.exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `drumappbass-${ts}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Set esportato');
  }

  function importJSONFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (applyFull(data)) {
          showToast(`Importato: ${file.name}`);
          pushHistory();
        } else showToast('File non valido', true);
      } catch (err) { showToast('JSON non leggibile', true); }
    };
    reader.onerror = () => showToast('Errore lettura', true);
    reader.readAsText(file);
  }

  // ============================================================
  // 18) SHARE LINK (solo pattern corrente, hex compatto)
  // ============================================================
  function packToHex() {
    // Drum: 8 tracce × 16 step on/off -> 8 hex da 4 char
    const parts = [];
    for (let t = 0; t < NUM_TRACKS; t++) {
      let bits = 0;
      const row = patterns[currentPattern][t];
      for (let s = 0; s < 16; s++) {
        if (row[s]) bits |= (1 << (15 - s));
      }
      parts.push(bits.toString(16).padStart(4, '0'));
    }
    // Master drum/bass come 2 segmenti hex (valori 0-100 → max 2 char hex "64")
    const md = Math.round(clamp(drumBusLevel, 0, 1) * 100).toString(16);
    const mb = Math.round(clamp(bassBusLevel, 0, 1) * 100).toString(16);
    const base = parts.join('-') + '-' + bpm.toString(16) + '-' + md + '-' + mb;

    // Bass: JSON base64 url-safe (solo step pattern corrente; il live loop
    // è performance, non va nello share).
    const bPat = bassPatterns[currentPattern] || [];
    const bSlice = bPat.slice(0, 16); // share sempre 16 step max, come il drum
    try {
      const bStr = JSON.stringify(bSlice);
      const bB64 = btoa(unescape(encodeURIComponent(bStr)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return base + '|B' + bB64;
    } catch (e) {
      return base;
    }
  }

  function unpackFromHex(hash) {
    // Split optional bass part
    let hex = hash;
    let bassPart = null;
    const pipeIdx = hash.indexOf('|B');
    if (pipeIdx > -1) {
      hex = hash.slice(0, pipeIdx);
      bassPart = hash.slice(pipeIdx + 2);
    }

    const segs = hex.split('-');
    // Formato corrente: NUM_TRACKS + bpm + md + mb = NUM_TRACKS + 3
    // Formato legacy: NUM_TRACKS + bpm = NUM_TRACKS + 1
    if (segs.length < NUM_TRACKS + 1) return false;
    const newBpm = parseInt(segs[NUM_TRACKS], 16);
    if (isNaN(newBpm) || newBpm < 60 || newBpm > 200) return false;

    const newPattern = makeEmptyPattern();
    for (let t = 0; t < NUM_TRACKS; t++) {
      const bits = parseInt(segs[t], 16);
      if (isNaN(bits)) return false;
      for (let s = 0; s < 16; s++) {
        if (bits & (1 << (15 - s))) newPattern[t][s] = newCell();
      }
    }
    bpm = newBpm;
    patterns[currentPattern] = newPattern;

    // Master drum/bass (opzionali, backward compat)
    if (segs.length >= NUM_TRACKS + 3) {
      const md = parseInt(segs[NUM_TRACKS + 1], 16);
      const mb = parseInt(segs[NUM_TRACKS + 2], 16);
      if (!isNaN(md)) drumBusLevel = clamp(md / 100, 0, 1);
      if (!isNaN(mb)) bassBusLevel = clamp(mb / 100, 0, 1);
    }

    // Bass (opzionale, backward compat)
    if (bassPart) {
      try {
        const b64 = bassPart.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 ? b64 + '='.repeat(4 - (b64.length % 4)) : b64;
        const json = decodeURIComponent(escape(atob(pad)));
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) {
          bassPatterns[currentPattern] = padBassPattern(arr);
        }
      } catch (e) { /* ignore malformed bass part */ }
    }

    refreshAllUI();
    applyMasterBuses();
    return true;
  }

  function shareLink() {
    const hex = packToHex();
    const url = `${location.origin}${location.pathname}#${hex}`;
    // Nota: `history` qui è la variabile locale (undo stack), non
    // window.history. Usa il global esplicitamente.
    try { window.history.replaceState(null, '', '#' + hex); } catch (e) { /* ignore */ }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => showToast('Link copiato'))
        .catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Link copiato'); }
    catch (e) { showToast('Copia manuale'); }
    document.body.removeChild(ta);
  }

  function loadFromURLHash() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return false;
    if (unpackFromHex(hash)) {
      showToast('Pattern caricato dal link');
      return true;
    }
    return false;
  }

  // ============================================================
  // 19) BOUNCE WAV (OfflineAudioContext - render deterministic)
  //     Opzioni: numero di loop oppure intera song sequence
  // ============================================================

  /**
   * Apre il modal di selezione loops/song.
   */
  function openBounceDialog() {
    unlockAudio();
    const modal = document.getElementById('bounceModal');
    if (!modal) return;
    // Mostra/nascondi opzione song in base a sequence presente
    const songOpt = document.getElementById('bounceSongOpt');
    if (songOpt) {
      songOpt.style.display = (songSequence && songSequence.length > 0) ? '' : 'none';
    }
    // Default: ultima scelta o 2 loops
    updateBounceDuration();
    modal.classList.add('modal--open');
  }

  function closeBounceDialog() {
    const modal = document.getElementById('bounceModal');
    if (modal) modal.classList.remove('modal--open');
  }

  function updateBounceDuration() {
    const choice = document.querySelector('input[name="bloops"]:checked');
    if (!choice) return;
    const secondsPerStep = (60 / bpm) / 4;
    let totalSec = 0;
    if (choice.value === 'song') {
      totalSec = songSequence.length * patternLength * secondsPerStep;
    } else {
      const n = parseInt(choice.value, 10);
      totalSec = n * patternLength * secondsPerStep;
    }
    const el = document.getElementById('bounceDuration');
    if (el) el.textContent = totalSec.toFixed(1) + 's';
  }

  async function doBounce() {
    const choice = document.querySelector('input[name="bloops"]:checked');
    if (!choice) return;

    // Costruisci la sequenza di pattern da renderizzare
    let sequence;
    if (choice.value === 'song') {
      sequence = songSequence.slice();
    } else {
      const n = parseInt(choice.value, 10);
      sequence = new Array(n).fill(currentPattern);
    }

    closeBounceDialog();
    showToast('Bounce in corso…');

    try {
      const secondsPerStep = (60 / bpm) / 4;
      const totalSteps = sequence.length * patternLength;
      const totalSec = totalSteps * secondsPerStep + 0.6; // tail
      const sr = 44100;
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ctx = new OfflineCtx(2, Math.ceil(sr * totalSec), sr);

      const master = ctx.createGain();
      master.gain.value = 0.75;
      master.connect(ctx.destination);

      // Bus drum e bass nell'offline, allineati al runtime (no compressor).
      const drumBusOff = ctx.createGain();
      drumBusOff.gain.value = drumBusLevel;
      drumBusOff.connect(master);
      const bassBusOff = ctx.createGain();
      bassBusOff.gain.value = bassBusLevel;
      bassBusOff.connect(master);

      const len = sr;
      const noise = ctx.createBuffer(1, len, sr);
      const nd = noise.getChannelData(0);
      for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

      const oFilters = [];
      const oPanners = [];
      for (let i = 0; i < NUM_TRACKS; i++) {
        const f = ctx.createBiquadFilter();
        const p = trackParams[i];
        if (p.filterType === 'off') { f.type = 'lowpass'; f.frequency.value = 20000; f.Q.value = 0.707; }
        else { f.type = p.filterType; f.frequency.value = 50 * Math.pow(360, p.filterCutoff); f.Q.value = p.filterQ; }

        const g = ctx.createGain();
        const anySolo = trackParams.some(pp => pp.solo) || bassParams.solo;
        g.gain.value = p.mute ? 0 : (anySolo && !p.solo ? 0 : p.volume);

        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = p.pan || 0;
          pan.connect(f).connect(g).connect(drumBusOff);
        } else {
          f.connect(g).connect(drumBusOff);
        }
        oFilters.push(f);
        oPanners.push(pan);
      }

      const ofVoices = buildOfflineVoices(ctx, noise, oPanners.map((p, i) => p || oFilters[i]));

      // Costruisci catena bass offline agganciata a bassBusOff
      const bassOut = buildOfflineBassChain(ctx, bassBusOff);

      // Schedula ogni pattern della sequenza, uno dopo l'altro
      sequence.forEach((patName, idxInSeq) => {
        const pat = patterns[patName];
        if (!pat) return;
        const seqOffset = idxInSeq * patternLength * secondsPerStep;

        for (let s = 0; s < patternLength; s++) {
          const baseTime = seqOffset + s * secondsPerStep + stepTimeOffset(s, secondsPerStep);
          for (let t = 0; t < NUM_TRACKS; t++) {
            const cell = pat[t][s];
            if (!cell) continue;
            if (cell.prob < 100 && Math.random() * 100 >= cell.prob) continue;
            const tp = trackParams[t];
            const ratch = cell.ratch || 1;
            const ratchGap = (secondsPerStep * 0.9) / ratch;
            const nudgeSec = (cell.nudge || 0) / 1000;
            for (let r = 0; r < ratch; r++) {
              const tt = baseTime + nudgeSec + r * ratchGap;
              if (tt < 0) continue;
              ofVoices[TRACK_DEFS[t].id](tt, {
                trackIdx: t,
                pitch: tp.pitch,
                decayMul: tp.decay,
                vel: cell.vel * (r === 0 ? 1 : 0.7),
              });
            }
          }
        }
      });

      // Bass render (step pattern + live loop se rispecchia il runtime)
      const bassIncludeStep = (bassMode === 'step') || bassPlayStepToo;
      const bassIncludeLive = (bassMode === 'looper');
      sequence.forEach((patName, idxInSeq) => {
        const bPat = bassPatterns[patName];
        const bLoop = bassLiveLoops[patName] || [];
        const seqOffset = idxInSeq * patternLength * secondsPerStep;

        if (bassIncludeStep && bPat) {
          for (let s = 0; s < patternLength; s++) {
            const cell = bPat[s];
            if (!cell) continue;
            const baseTime = seqOffset + s * secondsPerStep + stepTimeOffset(s, secondsPerStep);
            const durationSec = Math.max(0.05, (cell.len || 0.5) * secondsPerStep);
            const prevCell = bPat[(s - 1 + patternLength) % patternLength];
            const slideFrom = !!(prevCell && prevCell.slide);
            playBassOffline(ctx, bassOut, baseTime, {
              note: cell.note, vel: cell.vel, durationSec,
              accent: cell.accent, slideFrom,
            });
          }
        }

        if (bassIncludeLive && bLoop.length > 0) {
          for (const ev of bLoop) {
            const baseTime = seqOffset + ev.step * secondsPerStep;
            const durationSec = Math.max(0.05, (ev.len || 0.4) * secondsPerStep);
            playBassOffline(ctx, bassOut, baseTime, {
              note: ev.note, vel: ev.vel, durationSec,
              accent: false, slideFrom: false,
            });
          }
        }
      });

      const buffer = await ctx.startRendering();
      const wav = bufferToWav(buffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
      const tag = choice.value === 'song' ? 'song' : `${choice.value}loops`;
      a.download = `drumappbass-bounce-${tag}-${ts}.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('Bounce pronto');
    } catch (e) {
      console.error(e);
      showToast('Errore bounce', true);
    }
  }

  /** Costruisce voci identiche per un OfflineAudioContext */
  function buildOfflineVoices(ctx, noise, filters) {
    const out = i => filters[i];
    const semi = s => Math.pow(2, s / 12);
    return {
      kick: (time, p) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165 * semi(p.pitch), time);
        o.frequency.exponentialRampToValueAtTime(45 * semi(p.pitch), time + 0.12 * p.decayMul);
        g.gain.setValueAtTime(p.vel, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.45 * p.decayMul);
        o.connect(g).connect(out(p.trackIdx));
        o.start(time); o.stop(time + 0.5 * p.decayMul + 0.02);
        const c = ctx.createOscillator(), cg = ctx.createGain();
        c.type='sine'; c.frequency.setValueAtTime(1200*semi(p.pitch),time);
        cg.gain.setValueAtTime(0.35*p.vel,time);
        cg.gain.exponentialRampToValueAtTime(0.001,time+0.025);
        c.connect(cg).connect(out(p.trackIdx));
        c.start(time); c.stop(time+0.05);
      },
      snare: (time, p) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type='triangle'; o.frequency.setValueAtTime(220*semi(p.pitch),time);
        og.gain.setValueAtTime(0.5*p.vel,time);
        og.gain.exponentialRampToValueAtTime(0.001,time+0.11*p.decayMul);
        o.connect(og).connect(out(p.trackIdx));
        o.start(time); o.stop(time+0.2*p.decayMul);
        const n = ctx.createBufferSource(); n.buffer = noise;
        const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1000;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.7*p.vel,time);
        ng.gain.exponentialRampToValueAtTime(0.001,time+0.17*p.decayMul);
        n.connect(hp).connect(ng).connect(out(p.trackIdx));
        n.start(time); n.stop(time+0.22*p.decayMul);
      },
      hihat: (time, p) => {
        const n = ctx.createBufferSource(); n.buffer = noise;
        const hp = ctx.createBiquadFilter(); hp.type='highpass';
        hp.frequency.value=7000*semi(p.pitch*0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.45*p.vel,time);
        g.gain.exponentialRampToValueAtTime(0.001,time+0.055*p.decayMul);
        n.connect(hp).connect(g).connect(out(p.trackIdx));
        n.start(time); n.stop(time+0.1*p.decayMul);
      },
      openhat: (time, p) => {
        const n = ctx.createBufferSource(); n.buffer = noise;
        const hp = ctx.createBiquadFilter(); hp.type='highpass';
        hp.frequency.value=6500*semi(p.pitch*0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001,time);
        g.gain.linearRampToValueAtTime(0.4*p.vel,time+0.003);
        g.gain.exponentialRampToValueAtTime(0.001,time+0.45*p.decayMul);
        n.connect(hp).connect(g).connect(out(p.trackIdx));
        n.start(time); n.stop(time+0.5*p.decayMul);
      },
      clap: (time, p) => {
        const n = ctx.createBufferSource(); n.buffer = noise;
        const bp = ctx.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value=1500*semi(p.pitch); bp.Q.value=0.9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001,time);
        g.gain.linearRampToValueAtTime(0.85*p.vel,time+0.002);
        g.gain.exponentialRampToValueAtTime(0.15,time+0.013);
        g.gain.linearRampToValueAtTime(0.85*p.vel,time+0.016);
        g.gain.exponentialRampToValueAtTime(0.15,time+0.027);
        g.gain.linearRampToValueAtTime(0.85*p.vel,time+0.030);
        g.gain.exponentialRampToValueAtTime(0.001,time+0.32*p.decayMul);
        n.connect(bp).connect(g).connect(out(p.trackIdx));
        n.start(time); n.stop(time+0.35*p.decayMul);
      },
      tom: (time, p) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type='sine'; o.frequency.setValueAtTime(180*semi(p.pitch),time);
        o.frequency.exponentialRampToValueAtTime(90*semi(p.pitch),time+0.15*p.decayMul);
        g.gain.setValueAtTime(0.8*p.vel,time);
        g.gain.exponentialRampToValueAtTime(0.001,time+0.6*p.decayMul);
        o.connect(g).connect(out(p.trackIdx));
        o.start(time); o.stop(time+0.65*p.decayMul);
      },
      rim: (time, p) => {
        const o1=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain();
        o1.type='square'; o2.type='triangle';
        o1.frequency.setValueAtTime(800*semi(p.pitch),time);
        o2.frequency.setValueAtTime(380*semi(p.pitch),time);
        g.gain.setValueAtTime(0.5*p.vel,time);
        g.gain.exponentialRampToValueAtTime(0.001,time+0.05*p.decayMul);
        const bp=ctx.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value=1800*semi(p.pitch); bp.Q.value=3;
        o1.connect(bp); o2.connect(bp);
        bp.connect(g).connect(out(p.trackIdx));
        o1.start(time); o2.start(time);
        o1.stop(time+0.08); o2.stop(time+0.08);
      },
      cow: (time, p) => {
        const o1=ctx.createOscillator(),o2=ctx.createOscillator();
        o1.type='square'; o2.type='square';
        o1.frequency.setValueAtTime(540*semi(p.pitch),time);
        o2.frequency.setValueAtTime(800*semi(p.pitch),time);
        const mix=ctx.createGain(); mix.gain.value=0.5;
        const bp=ctx.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value=2000*semi(p.pitch); bp.Q.value=1.5;
        const env=ctx.createGain();
        env.gain.setValueAtTime(0.0001,time);
        env.gain.linearRampToValueAtTime(0.35*p.vel,time+0.004);
        env.gain.exponentialRampToValueAtTime(0.001,time+0.3*p.decayMul);
        o1.connect(mix); o2.connect(mix);
        mix.connect(bp).connect(env).connect(out(p.trackIdx));
        o1.start(time); o2.start(time);
        o1.stop(time+0.35*p.decayMul); o2.stop(time+0.35*p.decayMul);
      },
    };
  }

  /** Costruisce la catena bass nell'OfflineAudioContext (parallelo alla runtime) */
  function buildOfflineBassChain(ctx, master) {
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 800;
    filt.Q.value = bassParams.resonance;

    const drv = ctx.createWaveShaper();
    drv.curve = makeDriveCurve(bassParams.drive);
    drv.oversample = '2x';

    const g = ctx.createGain();
    const anySoloDrum = trackParams.some(p => p.solo);
    const bassIsSolo = bassParams.solo;
    let vol = bassParams.volume;
    if (bassParams.mute) vol = 0;
    else if (anySoloDrum && !bassIsSolo) vol = 0;
    g.gain.value = vol;

    if (pan) {
      pan.pan.value = bassParams.pan;
      pan.connect(filt);
    }
    filt.connect(drv).connect(g).connect(master);
    return { panner: pan, filter: filt, drive: drv, gain: g, input: pan || filt };
  }

  /** Suona una nota bass in offline. Replica fedelmente la sintesi runtime:
      hard cutoff sub a C2, niente detune, niente compressore. */
  function playBassOffline(ctx, chain, time, p) {
    const freq = noteToFreq(p.note);
    const subFreq = freq / 2;
    const noteMidi = noteToMidi(p.note);
    const useSub = noteMidi >= 36; // hard cutoff a C2
    const accent = !!p.accent;
    const velBase = Math.max(0.05, Math.min(1, p.vel));
    const peakGain = velBase * (accent ? 1.2 : 1.0);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    let osc2 = null;
    let mix2 = null;
    if (useSub) {
      osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(subFreq, time);
      mix2 = ctx.createGain();
      mix2.gain.value = 0.3;
    }

    const mix1 = ctx.createGain();
    mix1.gain.value = useSub ? 0.7 : 1.0;

    const gate = ctx.createGain();
    gate.gain.setValueAtTime(0.0001, time);
    gate.gain.linearRampToValueAtTime(peakGain, time + 0.003);

    const durationSec = Math.max(0.03, p.durationSec);
    const releaseAt = time + durationSec;
    gate.gain.setTargetAtTime(peakGain * 0.7, time + 0.04, 0.08);
    gate.gain.setTargetAtTime(0.0001, releaseAt, 0.03);

    const baseHz = 50 * Math.pow(100, bassParams.cutoff);
    const envMax = bassParams.envAmount >= 0
      ? baseHz + bassParams.envAmount * 4500 * (accent ? 2 : 1)
      : baseHz + bassParams.envAmount * (baseHz - 50) * (accent ? 2 : 1);
    const envMaxClamped = Math.max(40, Math.min(8000, envMax));
    const decaySec = Math.max(0.06, Math.min(0.8, bassParams.decay / 1000));

    const f = chain.filter.frequency;
    f.setValueAtTime(baseHz, time);
    if (!p.slideFrom) {
      f.linearRampToValueAtTime(envMaxClamped, time + 0.002);
      f.exponentialRampToValueAtTime(Math.max(50, baseHz), time + 0.002 + decaySec);
    } else {
      // Tie-slide: non ri-triggera env filtro (rampa lineare pitch sulle osc)
      // (gli osc di nota precedente offline non esistono, simuliamo mantenendo
      //  il cutoff costante su questa nota)
    }
    f.setTargetAtTime(baseHz, releaseAt, 0.05);

    osc1.connect(mix1).connect(gate);
    if (osc2 && mix2) osc2.connect(mix2).connect(gate);
    gate.connect(chain.input);

    osc1.start(time);
    osc1.stop(releaseAt + 0.12);
    if (osc2) {
      osc2.start(time);
      osc2.stop(releaseAt + 0.12);
    }
  }

  /** AudioBuffer -> WAV 16-bit PCM */
  function bufferToWav(buffer) {
    const nCh = buffer.numberOfChannels;
    const sr = buffer.sampleRate;
    const nFrames = buffer.length;
    const blockAlign = nCh * 2;
    const dataSize = nFrames * blockAlign;
    const ab = new ArrayBuffer(44 + dataSize);
    const dv = new DataView(ab);
    let o = 0;
    const wStr = s => { for (let i=0;i<s.length;i++) dv.setUint8(o++, s.charCodeAt(i)); };
    wStr('RIFF');
    dv.setUint32(o, 36 + dataSize, true); o += 4;
    wStr('WAVE');
    wStr('fmt ');
    dv.setUint32(o, 16, true); o += 4;
    dv.setUint16(o, 1, true); o += 2;           // PCM
    dv.setUint16(o, nCh, true); o += 2;
    dv.setUint32(o, sr, true); o += 4;
    dv.setUint32(o, sr * blockAlign, true); o += 4;
    dv.setUint16(o, blockAlign, true); o += 2;
    dv.setUint16(o, 16, true); o += 2;
    wStr('data');
    dv.setUint32(o, dataSize, true); o += 4;

    const channels = [];
    for (let c = 0; c < nCh; c++) channels.push(buffer.getChannelData(c));
    for (let i = 0; i < nFrames; i++) {
      for (let c = 0; c < nCh; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return ab;
  }

  // ============================================================
  // 20) WEB MIDI
  // ============================================================
  // Mapping General MIDI standard drum notes
  const MIDI_NOTES = {
    kick: 36, snare: 38, hihat: 42, openhat: 46,
    clap: 39, tom: 45, rim: 37, cow: 56,
  };

  async function initMIDI() {
    if (!navigator.requestMIDIAccess) {
      showToast('Web MIDI non supportato', true);
      return;
    }
    try {
      midiAccess = await navigator.requestMIDIAccess();
      // prima uscita disponibile
      const outs = [...midiAccess.outputs.values()];
      if (outs.length === 0) {
        showToast('Nessuna porta MIDI trovata', true);
        document.getElementById('midiBtn').classList.remove('chip--on');
        return;
      }
      midiOut = outs[0];
      document.getElementById('midiBtn').classList.add('chip--on');
      document.getElementById('midiBtn').textContent = 'MIDI: ' + midiOut.name.slice(0, 14);
      showToast('MIDI: ' + midiOut.name);
    } catch (e) {
      showToast('Accesso MIDI negato', true);
    }
  }

  function sendMidiForTrack(trackIdx, vel, time) {
    if (!midiOut) return;
    const note = MIDI_NOTES[TRACK_DEFS[trackIdx].id];
    if (!note) return;
    const v = Math.round(vel * 127);
    const delayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
    try {
      midiOut.send([0x99, note, v], performance.now() + delayMs);
      midiOut.send([0x89, note, 0], performance.now() + delayMs + 80);
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // 20b) REC LIVE (MediaRecorder -> cattura tutto cio' che suona)
  // ============================================================

  /** Cerca il miglior MIME type supportato dal browser */
  function getRecMime() {
    if (!window.MediaRecorder) return null;
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const t of candidates) {
      try { if (MediaRecorder.isTypeSupported(t)) return t; }
      catch (e) { /* ignore */ }
    }
    return '';
  }

  function recExtension(mime) {
    if (!mime) return 'webm';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('ogg'))  return 'ogg';
    if (mime.includes('mp4'))  return 'm4a';
    return 'webm';
  }

  function toggleRec() {
    unlockAudio();
    if (!window.MediaRecorder) {
      showToast('MediaRecorder non supportato qui', true);
      return;
    }
    if (!mediaRecDest) {
      showToast('Destination audio non disponibile', true);
      return;
    }
    if (isRecording) stopRec();
    else startRec();
  }

  function startRec() {
    try {
      const mime = getRecMime();
      const opts = mime ? { mimeType: mime } : {};
      mediaRecorder = new MediaRecorder(mediaRecDest.stream, opts);
      recChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recChunks.push(e.data);
      };
      mediaRecorder.onstop = () => finalizeRec(mime);
      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        showToast('Errore REC', true);
        isRecording = false; updateRecButton();
      };
      mediaRecorder.start(200);
      isRecording = true;
      recStartTime = performance.now();
      updateRecButton();
      showToast('REC avviato — premi di nuovo per fermare');
      // Timer visivo per il tempo di registrazione
      tickRecTimer();
    } catch (e) {
      console.error(e);
      showToast('REC fallita: ' + e.message, true);
      isRecording = false; updateRecButton();
    }
  }

  function stopRec() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) { /* ignore */ }
    }
    isRecording = false;
    if (recTimerHandle) { clearInterval(recTimerHandle); recTimerHandle = null; }
    updateRecButton();
  }

  function finalizeRec(mime) {
    const blob = new Blob(recChunks, { type: mime || 'audio/webm' });
    const ext = recExtension(mime);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    a.download = `drumappbass-live-${ts}.${ext}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`REC salvato (${(blob.size / 1024).toFixed(0)} kB)`);
    recChunks = [];
  }

  function tickRecTimer() {
    if (recTimerHandle) clearInterval(recTimerHandle);
    const btn = document.getElementById('recBtn');
    if (!btn) return;
    recTimerHandle = setInterval(() => {
      if (!isRecording) { clearInterval(recTimerHandle); recTimerHandle = null; return; }
      const sec = (performance.now() - recStartTime) / 1000;
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      btn.textContent = `REC ${m}:${String(s).padStart(2,'0')}`;
    }, 250);
  }

  function updateRecButton() {
    const btn = document.getElementById('recBtn');
    if (!btn) return;
    btn.classList.toggle('chip--rec', isRecording);
    btn.classList.toggle('chip--on', isRecording);
    if (!isRecording) btn.textContent = 'REC';
  }

  // ============================================================
  // 21) TAP TEMPO
  // ============================================================
  function tapTempo() {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 4) tapTimes.shift();
    // Scarta le tap piu' vecchie di 3 secondi
    tapTimes = tapTimes.filter(t => now - t < 3000);

    if (tapTimes.length >= 2) {
      const deltas = [];
      for (let i = 1; i < tapTimes.length; i++) deltas.push(tapTimes[i] - tapTimes[i-1]);
      const avg = deltas.reduce((a,b)=>a+b, 0) / deltas.length;
      const newBpm = Math.round(60000 / avg);
      if (newBpm >= 60 && newBpm <= 200) {
        bpm = newBpm;
        document.getElementById('bpmValue').textContent = bpm;
        document.getElementById('bpmSlider').value = bpm;
      }
    }
    // Piccolo flash visivo
    const el = document.getElementById('tapBtn');
    if (el) { el.classList.add('tap--flash'); setTimeout(() => el.classList.remove('tap--flash'), 120); }
  }

  // ============================================================
  // 22) TOAST
  // ============================================================
  let toastTimer = null;
  function showToast(msg, isError = false) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('toast--error', !!isError);
    el.classList.add('toast--show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('toast--show'), 2000);
  }

  // ============================================================
  // 23) BOOTSTRAP
  // ============================================================
  document.addEventListener('DOMContentLoaded', () => {
    buildSequencer();
    buildBassGrid();
    buildBassKeyboard();

    // Stato iniziale: demo o URL hash
    if (!loadFromURLHash()) {
      loadDemo();
    }
    refreshAllUI();
    pushHistory(); // stato iniziale nella cronologia

    // --- Transport ---
    document.getElementById('playButton').addEventListener('click', toggleTransport);
    document.getElementById('tapBtn').addEventListener('click', () => { unlockAudio(); tapTempo(); });

    // --- BPM ---
    const bpmSlider = document.getElementById('bpmSlider');
    bpmSlider.addEventListener('input', e => {
      bpm = parseInt(e.target.value, 10);
      document.getElementById('bpmValue').textContent = bpm;
    });

    // --- Swing ---
    const swingSlider = document.getElementById('swingSlider');
    swingSlider.addEventListener('input', e => {
      swing = parseInt(e.target.value, 10);
      document.getElementById('swingValue').textContent = swing + '%';
    });

    // --- Master mixer (drum + bass) ---
    const drumBusSlider = document.getElementById('drumBusSlider');
    if (drumBusSlider) {
      drumBusSlider.addEventListener('input', e => {
        drumBusLevel = parseInt(e.target.value, 10) / 100;
        document.getElementById('drumBusVal').textContent = e.target.value;
        applyMasterBuses();
      });
      drumBusSlider.addEventListener('change', pushHistory);
      drumBusSlider.addEventListener('dblclick', () => {
        drumBusLevel = 0.9;
        updateMasterMixerUI();
        applyMasterBuses();
        pushHistory();
      });
    }
    const bassBusSlider = document.getElementById('bassBusSlider');
    if (bassBusSlider) {
      bassBusSlider.addEventListener('input', e => {
        bassBusLevel = parseInt(e.target.value, 10) / 100;
        document.getElementById('bassBusVal').textContent = e.target.value;
        applyMasterBuses();
      });
      bassBusSlider.addEventListener('change', pushHistory);
      bassBusSlider.addEventListener('dblclick', () => {
        bassBusLevel = 0.8;
        updateMasterMixerUI();
        applyMasterBuses();
        pushHistory();
      });
    }

    // --- Pattern length ---
    document.getElementById('lengthSelect').addEventListener('change', e => {
      patternLength = parseInt(e.target.value, 10);
      refreshStepVisibility();
      refreshBassStepVisibility();
      pushHistory();
    });

    // --- Checkbox globali ---
    document.getElementById('humanizeChk').addEventListener('change', e => { humanize = e.target.checked; });
    document.getElementById('metroChk').addEventListener('change', e => { metronome = e.target.checked; });

    // --- Active track panel ---
    document.getElementById('atVol').addEventListener('input', e => {
      trackParams[activeTrack].volume = parseInt(e.target.value,10) / 100;
      document.getElementById('atVolV').textContent = e.target.value;
      applyTrackParams();
    });
    document.getElementById('atPitch').addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      trackParams[activeTrack].pitch = v;
      document.getElementById('atPitchV').textContent = (v >= 0 ? '+' : '') + v;
    });
    document.getElementById('atDecay').addEventListener('input', e => {
      const v = parseInt(e.target.value,10) / 100;
      trackParams[activeTrack].decay = v;
      document.getElementById('atDecayV').textContent = v.toFixed(2);
    });
    document.getElementById('atFilter').addEventListener('change', e => {
      trackParams[activeTrack].filterType = e.target.value;
      applyTrackParams();
    });
    document.getElementById('atCutoff').addEventListener('input', e => {
      trackParams[activeTrack].filterCutoff = parseInt(e.target.value,10) / 100;
      document.getElementById('atCutoffV').textContent = e.target.value;
      applyTrackParams();
    });

    const atPanEl = document.getElementById('atPan');
    if (atPanEl) {
      atPanEl.addEventListener('input', e => {
        const v = parseInt(e.target.value, 10) / 100;
        trackParams[activeTrack].pan = v;
        const lbl = document.getElementById('atPanV');
        if (lbl) lbl.textContent = panToLabel(v);
        applyTrackParams();
      });
      atPanEl.addEventListener('change', pushHistory);
      // Double-click to reset to center
      atPanEl.addEventListener('dblclick', () => {
        trackParams[activeTrack].pan = 0;
        atPanEl.value = 0;
        document.getElementById('atPanV').textContent = 'C';
        applyTrackParams();
        pushHistory();
      });
    }

    // Snapshot su "change" finale (non su input per evitare history gigante)
    ['atVol','atPitch','atDecay','atCutoff'].forEach(id => {
      document.getElementById(id).addEventListener('change', pushHistory);
    });
    document.getElementById('atFilter').addEventListener('change', pushHistory);

    // --- Copy / Paste pattern ---
    const copyBtn = document.getElementById('copyBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyPattern);
    if (pasteBtn) pasteBtn.addEventListener('click', pastePattern);

    // --- Song editor ---
    const songAddBtn = document.getElementById('songAddBtn');
    const songRemoveBtn = document.getElementById('songRemoveBtn');
    if (songAddBtn) songAddBtn.addEventListener('click', songAddSlot);
    if (songRemoveBtn) songRemoveBtn.addEventListener('click', songRemoveSlot);

    // --- Help modal ---
    const helpBtn = document.getElementById('helpBtn');
    const helpClose = document.getElementById('helpClose');
    const helpBackdrop = document.getElementById('helpBackdrop');
    if (helpBtn) helpBtn.addEventListener('click', openHelp);
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    if (helpBackdrop) helpBackdrop.addEventListener('click', closeHelp);

    // --- Demo library modal ---
    const demosBtn = document.getElementById('demosBtn');
    const demosClose = document.getElementById('demosClose');
    const demosBackdrop = document.getElementById('demosBackdrop');
    if (demosBtn) demosBtn.addEventListener('click', openDemos);
    if (demosClose) demosClose.addEventListener('click', closeDemos);
    if (demosBackdrop) demosBackdrop.addEventListener('click', closeDemos);

    // --- Edit mode ---
    document.querySelectorAll('[data-edit-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        editMode = btn.dataset.editMode;
        document.querySelectorAll('[data-edit-mode]').forEach(b => b.classList.toggle('mode-btn--on', b === btn));
        updateStepReadout(); // mostra l'hint del nuovo mode
      });
    });

    // --- Pattern A/B/C/D (live switch) ---
    ['A','B','C','D'].forEach(n => {
      const btn = document.querySelector(`[data-pattern="${n}"]`);
      if (btn) btn.addEventListener('click', () => switchPattern(n));
    });

    // --- Slot A/B/C/D (localStorage) ---
    SLOTS.forEach(slot => {
      const btn = document.querySelector(`[data-slot="${slot}"]`);
      if (btn) attachSlotGestures(btn, slot);
    });
    updateSlotButtons();

    // --- Demo / Clear ---
    document.getElementById('demoBtn').addEventListener('click', () => { loadDemo(); pushHistory(); });
    document.getElementById('clearBtn').addEventListener('click', clearCurrentPattern);

    // --- File ---
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSONFromFile(f);
      importFile.value = '';
    });

    // --- Share / Bounce / REC / MIDI ---
    document.getElementById('shareBtn').addEventListener('click', shareLink);
    document.getElementById('wavBtn').addEventListener('click', openBounceDialog);
    document.getElementById('recBtn').addEventListener('click', toggleRec);
    document.getElementById('midiBtn').addEventListener('click', initMIDI);

    // --- Bounce modal handlers ---
    document.querySelectorAll('input[name="bloops"]').forEach(r => {
      r.addEventListener('change', updateBounceDuration);
    });
    const bConfirm = document.getElementById('bounceConfirm');
    if (bConfirm) bConfirm.addEventListener('click', doBounce);
    const bCancel = document.getElementById('bounceCancel');
    if (bCancel) bCancel.addEventListener('click', closeBounceDialog);
    const bBackdrop = document.getElementById('bounceBackdrop');
    if (bBackdrop) bBackdrop.addEventListener('click', closeBounceDialog);

    // --- Undo / Redo ---
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    // --- Song mode ---
    document.getElementById('songChk').addEventListener('change', e => { songMode = e.target.checked; });

    // ==========================================================
    // --- BASS PANEL bindings ---
    // ==========================================================
    document.querySelectorAll('[data-bass-mode]').forEach(btn => {
      btn.addEventListener('click', () => setBassMode(btn.dataset.bassMode));
    });
    document.querySelectorAll('[data-bass-edit]').forEach(btn => {
      btn.addEventListener('click', () => setBassEditMode(btn.dataset.bassEdit));
    });

    const bassRecBtn = document.getElementById('bassRecBtn');
    if (bassRecBtn) bassRecBtn.addEventListener('click', bassArmRec);
    const bassClearLoopBtn = document.getElementById('bassClearLoopBtn');
    if (bassClearLoopBtn) bassClearLoopBtn.addEventListener('click', clearBassLoop);

    const bassQuantChk = document.getElementById('bassQuantChk');
    if (bassQuantChk) bassQuantChk.addEventListener('change', e => { bassQuantOn = e.target.checked; });
    const bassPlayStepChk = document.getElementById('bassPlayStepChk');
    if (bassPlayStepChk) bassPlayStepChk.addEventListener('change', e => { bassPlayStepToo = e.target.checked; });

    const bassOctDown = document.getElementById('bassOctDown');
    const bassOctUp   = document.getElementById('bassOctUp');
    if (bassOctDown) bassOctDown.addEventListener('click', () => bassOctaveChange(-1));
    if (bassOctUp)   bassOctUp.addEventListener('click',   () => bassOctaveChange(1));

    // Bass param panel
    const bVol = document.getElementById('bVol');
    if (bVol) bVol.addEventListener('input', e => {
      bassParams.volume = parseInt(e.target.value, 10) / 100;
      document.getElementById('bVolV').textContent = e.target.value;
      applyBassParams();
    });
    const bPan = document.getElementById('bPan');
    if (bPan) {
      bPan.addEventListener('input', e => {
        const v = parseInt(e.target.value, 10) / 100;
        bassParams.pan = v;
        document.getElementById('bPanV').textContent = panToLabel(v);
        applyBassParams();
      });
      bPan.addEventListener('dblclick', () => {
        bassParams.pan = 0;
        bPan.value = 0;
        document.getElementById('bPanV').textContent = 'C';
        applyBassParams();
        pushHistory();
      });
    }
    const bCutoff = document.getElementById('bCutoff');
    if (bCutoff) bCutoff.addEventListener('input', e => {
      bassParams.cutoff = parseInt(e.target.value, 10) / 100;
      document.getElementById('bCutoffV').textContent = e.target.value;
      applyBassParams();
    });
    const bRes = document.getElementById('bRes');
    if (bRes) bRes.addEventListener('input', e => {
      bassParams.resonance = parseInt(e.target.value, 10) / 10;
      document.getElementById('bResV').textContent = bassParams.resonance.toFixed(1);
      applyBassParams();
    });
    const bEnv = document.getElementById('bEnv');
    if (bEnv) bEnv.addEventListener('input', e => {
      bassParams.envAmount = parseInt(e.target.value, 10) / 100;
      const v = parseInt(e.target.value, 10);
      document.getElementById('bEnvV').textContent = (v >= 0 ? '+' : '') + v;
    });
    const bDecay = document.getElementById('bDecay');
    if (bDecay) bDecay.addEventListener('input', e => {
      bassParams.decay = parseInt(e.target.value, 10);
      document.getElementById('bDecayV').textContent = e.target.value;
    });
    const bDrive = document.getElementById('bDrive');
    if (bDrive) bDrive.addEventListener('input', e => {
      bassParams.drive = parseInt(e.target.value, 10) / 100;
      document.getElementById('bDriveV').textContent = e.target.value;
      applyBassParams();
    });

    ['bVol','bPan','bCutoff','bRes','bEnv','bDecay','bDrive'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', pushHistory);
    });

    const bassMuteBtn = document.getElementById('bassMuteBtn');
    if (bassMuteBtn) bassMuteBtn.addEventListener('click', () => {
      bassParams.mute = !bassParams.mute;
      applyBassParams();
      updateBassParamPanel();
    });
    const bassSoloBtn = document.getElementById('bassSoloBtn');
    if (bassSoloBtn) bassSoloBtn.addEventListener('click', () => {
      bassParams.solo = !bassParams.solo;
      applyTrackParams(); // il solo del basso influenza anche le drum
      updateBassParamPanel();
      updateTrackControls();
    });

    // --- Keyboard ---
    // Mappatura pianistica per LOOPER bass (offset semitoni dalla C dell'ottava)
    const PIANO_MAP = {
      'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4,
      'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9,
      'u': 10, 'j': 11, 'k': 12,
    };
    const activePianoKeys = new Set();

    document.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();

      // Help / esc sempre attivi
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); openHelp(); return; }
      if (e.key === 'Escape') {
        closeHelp();
        closeDemos();
        closeBounceDialog();
        return;
      }
      if (e.code === 'Space') { e.preventDefault(); toggleTransport(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

      // Shortcut bass PRIORITARIE in modalità LOOPER (A..K pianistiche + Z/X octave + R rec)
      if (bassMode === 'looper' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (PIANO_MAP.hasOwnProperty(k) && !e.repeat) {
          e.preventDefault();
          if (activePianoKeys.has(k)) return;
          activePianoKeys.add(k);
          const semi = PIANO_MAP[k];
          const startMidi = noteToMidi('C' + bassKbOctave);
          const note = midiToNote(startMidi + semi);
          triggerLiveBassNoteDown(note);
          return;
        }
        if (k === 'z') { e.preventDefault(); bassOctaveChange(-1); return; }
        if (k === 'x') { e.preventDefault(); bassOctaveChange(1);  return; }
        if (k === 'r') { e.preventDefault(); bassArmRec(); return; }
      }

      // Shortcut universali (non collidono con LOOPER bass perché gestite sopra)
      if (k === 'b') { toggleAtFocus(); return; }
      if (k === 'l') {
        setBassMode(bassMode === 'step' ? 'looper' : 'step');
        showToast(`BASS ${bassMode.toUpperCase()}`);
        return;
      }

      if (k === 't') { unlockAudio(); tapTempo(); return; }
      if (k === 'c') { clearCurrentPattern(); return; }
      if (k === 'd') { loadDemo(); pushHistory(); return; }
      if (k === 'm') {
        trackParams[activeTrack].mute = !trackParams[activeTrack].mute;
        applyTrackParams(); updateTrackControls();
        showToast(`${TRACK_DEFS[activeTrack].name} ${trackParams[activeTrack].mute ? 'muted' : 'unmuted'}`);
        return;
      }
      if (k === 's') {
        trackParams[activeTrack].solo = !trackParams[activeTrack].solo;
        applyTrackParams(); updateTrackControls();
        showToast(`${TRACK_DEFS[activeTrack].name} solo ${trackParams[activeTrack].solo ? 'on' : 'off'}`);
        return;
      }
      if (e.key === '[') {
        const i = SONG_ORDER.indexOf(currentPattern);
        switchPattern(SONG_ORDER[(i - 1 + 4) % 4]);
        return;
      }
      if (e.key === ']') {
        const i = SONG_ORDER.indexOf(currentPattern);
        switchPattern(SONG_ORDER[(i + 1) % 4]);
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        const newT = (activeTrack + dir + NUM_TRACKS) % NUM_TRACKS;
        setActiveTrack(newT);
        return;
      }
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        switchPattern(['A','B','C','D'][idx]);
      }
    });

    document.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (bassMode === 'looper' && PIANO_MAP.hasOwnProperty(k)) {
        if (activePianoKeys.has(k)) {
          activePianoKeys.delete(k);
          triggerLiveBassNoteUp();
        }
      }
    });

    // Unlock audio al primo tap
    const firstTouch = () => {
      unlockAudio();
      window.removeEventListener('touchstart', firstTouch);
      window.removeEventListener('mousedown', firstTouch);
    };
    window.addEventListener('touchstart', firstTouch, { once: true, passive: true });
    window.addEventListener('mousedown', firstTouch, { once: true });

    // Active track iniziale
    setActiveTrack(0);

    // Hint contestuale iniziale
    updateStepReadout();
  });

})();
