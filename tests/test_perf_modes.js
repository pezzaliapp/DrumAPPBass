#!/usr/bin/env node
// =============================================================================
// Smoke test "headless" per le 4 Performance Modes (Round 7).
//
// Carica app.js in un vm.Context con mock minimali di window/document/
// AudioContext, espone le funzioni interne (PERFORMANCE_MODES, playBassNote,
// applyFull) tramite un piccolo hack al sorgente, e verifica:
//
//   1) Le 4 modalità sono definite e hanno la struttura attesa.
//   2) playBassNote in CLASSIC crea esattamente 5 oscillator saw + 1 sub
//      (per nota >= C2). Mono: 0 StereoPannerNodes per voce.
//   3) playBassNote in WIDE crea 5 oscillator saw + 5 StereoPannerNodes
//      (uno per voce) + 1 sub.
//   4) playBassNote in PUNCH crea 5 saw + 1 sub (mono).
//   5) playBassNote in SUB crea 3 saw + 1 sub (anche su nota B1, soglia
//      abbassata) e che a A1 (sotto la soglia 35) il sub si disabilita.
//   6) Le 4 nuove demo dichiarano `performanceMode` correttamente e
//      l'applyFull lo applica a `performanceMode` globale.
//   7) Le 5 demo bass storiche (senza performanceMode) caricano con
//      performanceMode === 'classic' (back-compat).
//   8) `setPerformanceMode` con chiave invalida non rompe lo stato.
//
// NOTA: mock molto leggero. Non simula il timing audio (testiamo solo la
// topologia del grafo). Run: `node tests/test_perf_modes.js`
// =============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// L'IIFE è `(() => { ... })();` o `(function(){ ... })();`
// Hackatura: prima di `})();` finale iniettiamo un export su globalThis
// per esporre i simboli interni che ci servono.
const HOOK = `
  globalThis.__TESTAPI__ = {
    PERFORMANCE_MODES,
    PERFORMANCE_MODE_KEYS,
    getPerfMode: () => getPerfMode(),
    getPerfKey: () => performanceMode,
    setPerformanceMode,
    applyFull,
    playBassNote,
    bassParams,
    initAudio,
    setAudioCtx: (c) => { audioCtx = c; },
    setBassChain: (chain) => {
      bassFilter = chain.filter;
      bassPanner = chain.panner;
      bassGain   = chain.gain;
      bassDrive  = chain.drive;
      bassBus    = chain.bus;
      masterGain = chain.master;
    },
  };
`;
const closeIdx = src.lastIndexOf('})();');
if (closeIdx < 0) { console.error('IIFE close not found'); process.exit(1); }
src = src.slice(0, closeIdx) + HOOK + '\n' + src.slice(closeIdx);

// ---- Mock minimali ----
let assertions = 0;
let failures = 0;
function assert(cond, msg) {
  assertions++;
  if (!cond) { failures++; console.error('  ✘', msg); }
  else { console.log('  ✓', msg); }
}

class MockAudioParam {
  constructor(v=0){ this.value=v; }
  setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){}
  setTargetAtTime(){} cancelScheduledValues(){}
}
class MockNode {
  constructor(kind, ctx){ this.kind=kind; this.ctx=ctx; this._connections=[]; ctx._nodes.push(this); }
  connect(dst){ this._connections.push(dst); return dst; }
  disconnect(){}
  start(){}
  stop(){}
}
class MockGain extends MockNode { constructor(ctx){ super('gain', ctx); this.gain=new MockAudioParam(1); } }
class MockOsc extends MockNode {
  constructor(ctx){ super('osc', ctx); this.frequency=new MockAudioParam(440); this.detune=new MockAudioParam(0); this.type='sine'; }
}
class MockBiquad extends MockNode {
  constructor(ctx){ super('biquad', ctx); this.frequency=new MockAudioParam(20000); this.Q=new MockAudioParam(1); this.type='lowpass'; }
}
class MockShaper extends MockNode { constructor(ctx){ super('shaper', ctx); this.curve=null; this.oversample='none'; } }
class MockPanner extends MockNode { constructor(ctx){ super('panner', ctx); this.pan=new MockAudioParam(0); } }
class MockBuffer { constructor(){ this._data=new Float32Array(2); } getChannelData(){ return this._data; } }

class MockAudioContext {
  constructor(){
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = { _kind: 'destination' };
    this._nodes = [];
  }
  createGain(){ return new MockGain(this); }
  createOscillator(){ return new MockOsc(this); }
  createBiquadFilter(){ return new MockBiquad(this); }
  createWaveShaper(){ return new MockShaper(this); }
  createStereoPanner(){ return new MockPanner(this); }
  createBuffer(ch, len, sr){ return new MockBuffer(); }
  createMediaStreamDestination(){ throw new Error('no MSD'); }
  resume(){ return Promise.resolve(); }
}

// ---- Mock document/window ----
function makeEl(tag){
  return {
    tag, value: '', textContent: '', innerHTML: '', children: [], dataset: {},
    classList: { _set: new Set(),
      add(...a){ a.forEach(x=>this._set.add(x)); },
      remove(...a){ a.forEach(x=>this._set.delete(x)); },
      toggle(c, on){ if (on === undefined) on = !this._set.has(c); on ? this._set.add(c) : this._set.delete(c); },
      contains(c){ return this._set.has(c); },
    },
    style: {},
    addEventListener(){}, removeEventListener(){}, focus(){}, blur(){},
    click(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
    appendChild(c){ this.children.push(c); return c; },
    setAttribute(){}, getAttribute(){ return null; },
    closest(){ return null; },
    getBoundingClientRect(){ return {top:0,left:0,width:100,height:30,right:100,bottom:30}; },
    offsetWidth: 100,
  };
}
const elementsById = {};
const document = {
  body: makeEl('body'),
  documentElement: makeEl('html'),
  getElementById(id){ if (!elementsById[id]) elementsById[id] = makeEl('div'); return elementsById[id]; },
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
  createElement(tag){ return makeEl(tag); },
  addEventListener(){}, removeEventListener(){},
};
const window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  document,
  navigator: { userAgent: 'node-test', requestMIDIAccess: undefined, share: undefined },
  location: { protocol: 'file:', href: 'file:///', search: '' },
  localStorage: { _m: {}, getItem(k){ return this._m[k] || null; }, setItem(k,v){ this._m[k]=String(v); }, removeItem(k){ delete this._m[k]; }, clear(){ this._m={}; }},
  performance: { now: () => Date.now() },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  fetch: undefined,
  setTimeout, clearTimeout, setInterval, clearInterval,
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
};

const ctx = vm.createContext({
  window, document, navigator: window.navigator, localStorage: window.localStorage,
  AudioContext: MockAudioContext, webkitAudioContext: MockAudioContext,
  fetch: undefined, console, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: window.performance, URL: window.URL,
  globalThis: {},
});
ctx.globalThis = ctx;
ctx.self = ctx;
// expose top-level "document/window" lookups inside app.js
ctx.window.window = ctx.window;

vm.runInContext(src, ctx);

const API = ctx.globalThis.__TESTAPI__;
if (!API) { console.error('TESTAPI not exposed'); process.exit(1); }

// =============================================================================
console.log('\n[1] PERFORMANCE_MODES struttura');
const PM = API.PERFORMANCE_MODES;
assert(PM && typeof PM === 'object', 'PERFORMANCE_MODES esiste');
['classic','wide','punch','sub'].forEach(k => {
  assert(PM[k], `mode "${k}" definita`);
  if (PM[k]) {
    assert(Array.isArray(PM[k].detunes), `${k}.detunes è array`);
    assert(Array.isArray(PM[k].pans), `${k}.pans è array`);
    assert(PM[k].detunes.length === PM[k].pans.length && PM[k].pans.length === PM[k].gains.length,
      `${k}: detunes/pans/gains stessa lunghezza`);
    assert(typeof PM[k].driveBoost === 'number', `${k}.driveBoost è number`);
  }
});
assert(API.PERFORMANCE_MODE_KEYS.length === 4, 'PERFORMANCE_MODE_KEYS ha 4 elementi');
assert(API.getPerfKey() === 'classic', 'default performanceMode = classic');

// Setup mock chain (init audio is costly, init manually)
function setupMockChain() {
  const mctx = new MockAudioContext();
  const master = mctx.createGain();
  const bus = mctx.createGain();
  const filter = mctx.createBiquadFilter();
  const drive = mctx.createWaveShaper();
  const gain = mctx.createGain();
  const panner = mctx.createStereoPanner();
  // Topologia minimale: filter -> drive -> gain -> bus -> master
  panner.connect(filter); filter.connect(drive); drive.connect(gain); gain.connect(bus); bus.connect(master);
  API.setAudioCtx(mctx);
  API.setBassChain({ master, bus, filter, drive, gain, panner });
  return mctx;
}

console.log('\n[2] CLASSIC: 5 saw + 1 sub, 0 panner-per-voce');
{
  API.setPerformanceMode('classic');
  const mctx = setupMockChain();
  const before = mctx._nodes.length;
  API.playBassNote(0, { note: 'E2', vel: 0.9, durationSec: 0.4, accent: false });
  const created = mctx._nodes.slice(before);
  const oscs = created.filter(n => n.kind === 'osc');
  const panners = created.filter(n => n.kind === 'panner');
  assert(oscs.length === 6, `oscillators creati: ${oscs.length} (atteso 6 = 5 saw + 1 sub)`);
  assert(panners.length === 0, `panners per voce: ${panners.length} (atteso 0 mono)`);
}

console.log('\n[3] WIDE: 5 saw + 1 sub + 4 panner-per-voce (la voce centrale ha pan=0, niente nodo)');
{
  API.setPerformanceMode('wide');
  const mctx = setupMockChain();
  const before = mctx._nodes.length;
  API.playBassNote(0, { note: 'C2', vel: 0.9, durationSec: 0.4, accent: false });
  const created = mctx._nodes.slice(before);
  const oscs = created.filter(n => n.kind === 'osc');
  const panners = created.filter(n => n.kind === 'panner');
  assert(oscs.length === 6, `oscillators creati: ${oscs.length} (atteso 6 = 5 saw + 1 sub)`);
  // 4 panner: solo le voci con pan != 0 ottengono uno StereoPannerNode dedicato
  // (-1, -0.5, +0.5, +1). La voce centrale (pan 0) sta dritta nel mix mono.
  assert(panners.length === 4, `panners per voce: ${panners.length} (atteso 4: 5 voci ma quella centrale ha pan=0)`);
}

console.log('\n[4] PUNCH: 5 saw + 1 sub su C2 (mono)');
{
  API.setPerformanceMode('punch');
  const mctx = setupMockChain();
  const before = mctx._nodes.length;
  // C2 = MIDI 36, soglia PUNCH = 36, sub attivo
  API.playBassNote(0, { note: 'C2', vel: 0.92, durationSec: 0.35, accent: true });
  const created = mctx._nodes.slice(before);
  const oscs = created.filter(n => n.kind === 'osc');
  const panners = created.filter(n => n.kind === 'panner');
  assert(oscs.length === 6, `oscillators creati: ${oscs.length} (atteso 6 = 5 saw + 1 sub)`);
  assert(panners.length === 0, `panners per voce: ${panners.length} (atteso 0 mono)`);

  // Su F#1 (MIDI 30, sotto soglia C2) il sub è off in PUNCH
  const mctx2 = setupMockChain();
  const before2 = mctx2._nodes.length;
  API.playBassNote(0, { note: 'F#1', vel: 0.92, durationSec: 0.35, accent: true });
  const oscs2 = mctx2._nodes.slice(before2).filter(n => n.kind === 'osc');
  assert(oscs2.length === 5, `F#1 (sotto soglia C2): ${oscs2.length} oscillators (atteso 5 saw, sub off)`);
}

console.log('\n[5] SUB: 3 saw + 1 sub su B1, e sub disabilitato su A1 (sotto soglia 35)');
{
  API.setPerformanceMode('sub');
  // Caso A: B1 (MIDI 35) — sopra soglia abbassata SUB (35)
  let mctx = setupMockChain();
  let before = mctx._nodes.length;
  API.playBassNote(0, { note: 'B1', vel: 0.9, durationSec: 0.5, accent: false });
  let created = mctx._nodes.slice(before);
  let oscs = created.filter(n => n.kind === 'osc');
  assert(oscs.length === 4, `B1: oscillators ${oscs.length} (atteso 4 = 3 saw + 1 sub, soglia abbassata SUB)`);

  // Caso B: A1 (MIDI 33) — sotto soglia 35 -> sub disabilitato
  mctx = setupMockChain();
  before = mctx._nodes.length;
  API.playBassNote(0, { note: 'A1', vel: 0.9, durationSec: 0.5, accent: false });
  created = mctx._nodes.slice(before);
  oscs = created.filter(n => n.kind === 'osc');
  assert(oscs.length === 3, `A1: oscillators ${oscs.length} (atteso 3 = solo saw, sub off)`);
}

// applyFull richiama refreshAllUI che usa stepElements; nei test questo non
// è popolato (no DOM). Wrappiamo in try/catch: il valore di performanceMode
// è scritto PRIMA di refreshAllUI, quindi anche se l'UI crasha la verifica
// del campo è valida.
function applyFullSafe(data) {
  try { API.applyFull(data); } catch(e) { /* UI render errs OK in headless */ }
}

console.log('\n[6] applyFull legge performanceMode dalle 4 nuove demo');
{
  const demos = [
    ['demo-bass-synthwave.json', 'classic'],
    ['demo-bass-synthpop.json',  'wide'],
    ['demo-bass-neosoul.json',   'punch'],
    ['demo-bass-dub.json',       'sub'],
  ];
  for (const [file, expected] of demos) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', file), 'utf8'));
    applyFullSafe(data);
    assert(API.getPerfKey() === expected, `${file} -> performanceMode = "${expected}" (got "${API.getPerfKey()}")`);
    assert(data.performanceMode === expected, `${file} JSON ha performanceMode field corretto`);
  }
}

console.log('\n[7] back-compat: 5 demo bass storiche caricano in CLASSIC');
{
  const legacy = ['demo-bass-funk.json','demo-bass-house.json','demo-bass-onedrop.json','demo-bass-boombap.json','demo-bass-trap.json'];
  for (const file of legacy) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', file), 'utf8'));
    assert(data.performanceMode === undefined, `${file} non dichiara performanceMode (legacy)`);
    API.setPerformanceMode('wide'); // sporco lo stato
    applyFullSafe(data);
    assert(API.getPerfKey() === 'classic', `${file} -> resetta a classic`);
  }
}

console.log('\n[8] setPerformanceMode con chiave invalida non rompe lo stato');
{
  API.setPerformanceMode('punch');
  API.setPerformanceMode('xxx-invalid');
  assert(API.getPerfKey() === 'punch', 'chiave invalida ignorata, modalità invariata');
}

console.log('\n[9] switching mode al volo durante voce attiva non crasha');
{
  setupMockChain();
  API.setPerformanceMode('classic');
  API.playBassNote(0, { note: 'E2', vel: 0.9, durationSec: 1.0, accent: false });
  // Cambia mode mentre la voce è viva
  let crashed = false;
  try { API.setPerformanceMode('wide'); } catch(e){ crashed = true; }
  assert(!crashed, 'switch classic->wide con voce attiva non crasha');
  try { API.playBassNote(0.1, { note: 'B1', vel: 0.7, durationSec: 0.4, accent: true }); } catch(e){ crashed = true; }
  assert(!crashed, 'playBassNote post-switch non crasha');
}

console.log(`\n=== ${assertions - failures}/${assertions} OK${failures ? ` · ${failures} FAIL` : ''} ===`);
process.exit(failures ? 1 : 0);
