# Manuale utente — DrumAPPBass v1.0

> **Edizione di anteprima riservata · Weekend App — not Public**
> Documento distribuito in via esclusiva alla community dell'autore prima del rilascio pubblico.

---

**Versione manuale:** 1.0
**Versione applicazione:** 1.0 (Round 7 — Performance Modes)
**Data:** 25 aprile 2026
**Autore:** Alessandro Pezzali — `pezzaliapp`
**Sito:** [pezzaliapp.com](https://pezzaliapp.com) · [pezzaliapp.it](https://pezzaliapp.it)
**Repository:** [github.com/pezzaliapp/DrumAPPBass](https://github.com/pezzaliapp/DrumAPPBass)
**App live:** [pezzaliapp.github.io/DrumAPPBass](https://pezzaliapp.github.io/DrumAPPBass/)
**Licenza:** MIT

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Quick Start — cinque minuti](#2-quick-start--cinque-minuti)
3. [Interfaccia generale](#3-interfaccia-generale)
4. [Drum Machine](#4-drum-machine)
5. [Bass Synth](#5-bass-synth)
6. [Performance Modes](#6-performance-modes)
7. [Demo Library](#7-demo-library)
8. [Workflow esempi](#8-workflow-esempi)
9. [Funzionalità avanzate](#9-funzionalit-avanzate)
10. [Shortcut tastiera](#10-shortcut-tastiera)
11. [Feature roadmap](#11-feature-roadmap)
12. [FAQ](#12-faq)
13. [Risorse, licenza e contatti](#13-risorse-licenza-e-contatti)
14. [Appendice tecnica](#14-appendice-tecnica)

---

## 1. Introduzione

### 1.1 Cos'è DrumAPPBass

DrumAPPBass è una **drum machine + bass synth** che gira interamente nel browser. È un fork esteso di [DrumAPP](https://github.com/pezzaliapp/DrumAPP) e aggiunge una sezione bass completamente sintetizzata, uno step sequencer dedicato con accent e slide, un live looper con tastiera on-screen, quattro **Performance Modes** che cambiano il carattere globale del suono, e una libreria di trentadue demo importabili.

L'applicazione è una PWA: gira offline dopo la prima visita, si installa come app sul telefono o sul desktop, e non richiede registrazione né account. Tutto il suono è generato in tempo reale via Web Audio API. Non ci sono sample WAV, non ci sono librerie esterne, non ci sono dipendenze npm. È un singolo file `app.js` di circa 4000 righe, un `index.html`, un foglio di stile e un service worker.

### 1.2 Filosofia

Tre principi attraversano tutto il progetto.

**Zero asset, vanilla Web Audio.** Ogni voce drum e bass è costruita con `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `WaveShaperNode`. Non si scarica nulla oltre al codice dell'app. La conseguenza è duplice: il pacchetto resta sotto i 200 KB e ogni utente ascolta esattamente lo stesso suono in modo deterministico, indipendentemente dal browser o dal dispositivo.

**Sketch musicale, non DAW professionale.** DrumAPPBass è progettato per la fase in cui un'idea ritmica o una bassline va appuntata velocemente, su una panchina o in un treno. Non sostituisce Ableton o Logic; integra una fase precedente — quella in cui un'idea, se non viene fissata in trenta secondi, va persa.

**Non rompere niente.** Ogni feature aggiunta in un Round successivo non deve compromettere il funzionamento di quelle precedenti. Le demo storiche di DrumAPP continuano a caricarsi e a suonare identiche; le cinque demo bass curate del v1.0 base continuano a suonare in modalità CLASSIC anche dopo l'introduzione delle Performance Modes.

### 1.3 Posizionamento Weekend App

DrumAPPBass fa parte della serie **Weekend App — not Public**, una linea di applicazioni web sviluppate dall'autore nei fine settimana e distribuite in due fasi.

La prima fase è una **anteprima riservata** alla community che segue l'autore su WhatsApp e sui canali social. Gli early adopter ricevono il link dell'applicazione insieme a questo manuale, possono usare l'app prima del rilascio pubblico e hanno un canale diretto per dare feedback e segnalare bug. Questo documento accompagna proprio questa fase.

La seconda fase è il **rilascio pubblico** sui siti dell'autore (`pezzaliapp.com` e `pezzaliapp.it`) e sulle directory pubbliche di applicazioni web. La data del rilascio pubblico non è dichiarata in anticipo; dipende dal feedback raccolto in fase di anteprima e dal completamento di eventuali raffinamenti.

### 1.4 A chi si rivolge

Il manuale assume che il lettore abbia familiarità con concetti di base della produzione musicale (BPM, swing, velocity, kick, snare). Non assume conoscenze avanzate di sintesi sonora né esperienza con DAW professionali. Le sezioni tutorial sono pensate per chi parte da zero; l'appendice tecnica è per chi vuole capire l'architettura interna o estendere il codice.

---

## 2. Quick Start — cinque minuti

### 2.1 Aprire l'app

Apri l'URL dell'applicazione nel browser. Su mobile, dopo qualche secondo il browser proporrà di aggiungere l'app alla schermata home: confermando, l'app si installerà come PWA e da quel momento si aprirà in modalità standalone (senza barra del browser) e funzionerà offline.

Al primo tocco o click qualsiasi, il browser sblocca il contesto audio. Da qui in poi l'applicazione è pronta a suonare.

### 2.2 Caricare una demo

Premi il bottone **DEMOS** nel footer (oppure il tasto rapido `D` per caricare la demo predefinita). Si apre una modale con la libreria delle trentadue demo divise per categoria. Scegli per esempio **Synth-Pop (WIDE)** dalle demo di tipo perf (icona ⚡, sfondo arancio chiaro): la demo carica pattern, parametri, master mixer, song sequence e modalità performance del basso.

### 2.3 Suonare

Premi **SPACE** o il bottone **PLAY** per avviare la riproduzione. La griglia si illumina colonna per colonna seguendo lo step corrente; il drum suona in alto, il bass in basso. Premendo `1`, `2`, `3`, `4` si cambia pattern al volo (A, B, C, D); con le parentesi quadre `[` e `]` si scorre indietro e avanti tra i pattern.

### 2.4 Modificare

Tocca le celle della griglia drum per accendere o spegnere uno step. La traccia attiva è quella evidenziata nel pannello **EDITING** in alto: per cambiarla, click sul nome (KICK, SNARE, eccetera) o usa le frecce `↑` `↓`.

Per il basso premi il tasto `B`: il pannello in alto mostra ora i parametri del basso (volume, pan, cutoff, resonance, envelope, decay, drive). La griglia bass è subito sotto quella drum: tocca una cella per accendere uno step (la prima volta entra come `C2`), drag verticale per cambiare la nota.

### 2.5 Salvare e condividere

Per salvare lo stato corrente in uno slot locale, **tieni premuto** uno dei quattro bottoni A/B/C/D nella sezione SLOT per mezzo secondo. Il bottone si illumina e flash conferma. Per ricaricare lo stesso stato in seguito, basta un tocco breve sul bottone.

Per esportare il pattern come file JSON premi **EXPORT**; per condividere via link **SHARE** (l'URL viene copiato negli appunti).

---

## 3. Interfaccia generale

### 3.1 Layout

La schermata è divisa in fasce orizzontali, dall'alto verso il basso.

| Fascia | Contenuto |
|---|---|
| **Header** | Brand, transport (PLAY/STOP), tempo (BPM + TAP), swing, master mixer (DRUM e BASS) |
| **Active track panel** | Parametri della traccia attiva (drum o bass a seconda del focus) |
| **Sequencer drum** | Griglia 8 voci × 16 step (o lunghezza scelta) |
| **Bass panel** | Selettore STEP/LOOPER, EDIT, PERF mode, griglia bass, tastiera on-screen |
| **Modebar** | Edit mode drum, pattern A/B/C/D, song toggle, lunghezza pattern, humanize, metronomo |
| **Step readout** | Hint contestuale dello step e della cella attiva |
| **Songbar** | Sequence editor visuale (slot di pattern A/A/B/A…) |
| **Storage** | Slot locali, file IO, output (BOUNCE/REC/MIDI/SHARE), history (COPY/PASTE/UNDO/REDO) |
| **Footer** | DEMO, DEMOS, CLEAR, HELP e shortcut summary |

### 3.2 Palette e codici colore

L'estetica è quella della serie Studio Press dell'autore: carta avorio `#eae3d2`, inchiostro `#1a1a22`, accento arancione `#f77f00` per i call-to-action principali. La sezione bass ha un accento complementare blu notte `#2a3a5c` per distinguerla visivamente dalla drum machine. Il selettore Performance Mode usa l'arancio del brand: il bottone attivo si riempie di arancio per ricordare visivamente che si tratta di un selettore di carattere globale.

### 3.3 Responsive

Su mobile il layout collassa: i pannelli si impilano verticalmente, i bottoni delle modebar si rimpiccoliscono ma restano cliccabili. La tastiera on-screen del basso resta utilizzabile in entrambi gli orientamenti. Per uso intensivo è consigliato il landscape.

---

## 4. Drum Machine

### 4.1 Le otto voci

Le otto tracce drum sono sempre nello stesso ordine, dall'alto verso il basso.

| # | Nome | Sintesi |
|---|---|---|
| 1 | **KICK** | Sine wave 165 → 45 Hz con envelope esponenziale + click 1200 Hz a transient |
| 2 | **SNARE** | Triangle 220 Hz + noise high-pass 1 kHz, envelope indipendenti |
| 3 | **HI-HAT** | Noise high-pass 7 kHz (chiuso, decay corto) |
| 4 | **OPEN HH** | Noise high-pass 7 kHz, decay lungo |
| 5 | **CLAP** | Noise multi-burst con envelope a quattro picchi |
| 6 | **TOM** | Sine 110 Hz con sweep |
| 7 | **RIMSHOT** | Noise band-pass + click |
| 8 | **COWBELL** | Due square wave intervallate (560 Hz + 845 Hz) |

Tutte le voci sono generate in tempo reale e rispondono ai parametri di traccia (volume, pan, pitch, decay, filter, mute, solo).

### 4.2 Il sequencer

La griglia ha sedici step di default. La lunghezza del pattern è regolabile fra otto, dodici, sedici, ventiquattro e trentadue step (selettore **LEN** nella modebar). Il numero di step visibile cambia immediatamente al variare di `patternLength`.

Ogni cella della griglia rappresenta uno step della traccia corrispondente. Tocca o clicca per accendere lo step; tocca di nuovo per spegnerlo. La cella accesa mostra una piccola barra colorata che riflette il valore di velocity.

### 4.3 Edit mode

Sopra il sequencer una modebar dedicata permette di cambiare il significato di drag e tap sulle celle.

| Mode | Cosa fa |
|---|---|
| **TRIG** | Tap = accende/spegne. Default. |
| **VEL** | Drag verticale su cella accesa → velocity 0,05 – 1,0 |
| **PROB** | Drag verticale → probabilità in percentuale che lo step suoni quel ciclo |
| **RATCH** | Drag verticale → ripetizioni interne 1, 2, 3, 4 (ratchet) |
| **NUDGE** | Drag verticale → micro-timing ±50 ms fuori griglia |

Velocity, probability, ratchet e nudge convivono sulla stessa cella: una cella può essere `vel=0.85`, `prob=80`, `ratch=2`, `nudge=+12`. Tutti e quattro i valori sono persistiti nei file di salvataggio.

### 4.4 Pattern multipli e song mode

Quattro pattern indipendenti A, B, C, D coesistono nello stesso set. Si commutano al volo durante il playback con i bottoni nella modebar **PATTERN**, con i tasti `1`–`4` o con `[` e `]`. Il pattern attivo è quello evidenziato.

L'editor **SEQUENCE** in basso permette di costruire una song concatenando pattern: per esempio `A A B A C C`. Click sul singolo slot della sequence cycle attraverso A → B → C → D → A. I bottoni `−` e `+` rimuovono o aggiungono slot (minimo 1, massimo 16). Quando il toggle **SONG** è attivo, la riproduzione segue la sequence invece di restare sul pattern singolo.

### 4.5 Parametri di traccia

Premendo il nome di una traccia (KICK, SNARE…) la traccia diventa attiva e il pannello **EDITING** in alto mostra i suoi parametri. Si può anche cambiare traccia con `↑` `↓`.

| Parametro | Range | Note |
|---|---|---|
| **VOL** | 0 – 100 | Volume di traccia |
| **PAN** | −100 – +100 | Doppio click per centro |
| **PITCH** | −12 – +12 semitoni | Trasposizione cromatica |
| **DECAY** | 0,4× – 2,5× | Moltiplicatore del decay envelope |
| **FILTER** | OFF / LOW-PASS / HIGH-PASS | Filtro per voce |
| **CUTOFF** | 0 – 100 | Frequenza di taglio (dipende dal tipo) |

I parametri di traccia sono **condivisi tra tutti e quattro i pattern**: cambiano il timbro della traccia in modo globale, non per pattern.

### 4.6 Mute e solo

`M` mette in mute la traccia attiva, `S` la mette in solo. Quando una traccia è in solo, le altre vengono temporaneamente silenziate; in modalità solo, anche il basso viene silenziato a meno che il basso stesso sia in solo.

### 4.7 Master mixer

Nell'header in alto a destra ci sono due slider master: uno per il bus drum, uno per il bus bass. Sono indipendenti e si applicano a valle di ogni traccia ma a monte del master globale, quindi vengono rispettati dal bounce WAV e dal REC live. Il valore di default è 90 per il drum e 80 per il bass; doppio click ripristina il default.

---

## 5. Bass Synth

### 5.1 Architettura

La sezione bass è una sintesi sottrattiva ibrida ispirata alla TB-303 ma più moderna nel timbro. Per ogni nota suonata, l'app costruisce in tempo reale un grafo di nodi Web Audio:

- uno **stack di sawtooth detunate** (cinque voci di default in modalità CLASSIC, da tre a cinque a seconda della Performance Mode) che genera la massa armonica principale;
- un **sub-oscillatore square** a un'ottava sotto, attivo solo quando la nota è sopra una soglia minima (di default `C2`, abbassata a `B1` in modalità SUB) per evitare battimenti con il fundamental del kick;
- un **mixer saw/sub** con rapporto variabile a seconda della modalità;
- un **gate envelope** di ampiezza con attack, sustain, release configurabili;
- un **lowpass biquad** modulato per nota da un envelope ADSR del filtro, con Q dinamica scalata su velocity, accent e nota suonata;
- un **WaveShaper** con curva tanh per il soft-clipping (drive);
- un **panner globale** e un **gain di traccia** che alimentano il bus bass.

Il bus bass passa per un high-pass a 30 Hz prima del master, per rimuovere ogni residuo sub-audio (il fundamental del basso E1 a 41 Hz resta intatto).

### 5.2 STEP mode — il sequencer del basso

In modalità STEP il basso ha la sua griglia da sedici celle (sincronizzata con il drum). Ogni cella accesa è una nota con cinque parametri.

| Parametro | Significato | Range |
|---|---|---|
| **note** | Nota suonata | C1 – B3 |
| **vel** | Velocity | 0,05 – 1,0 |
| **len** | Length / gate | 10 – 100 % dello step |
| **accent** | Boolean | +6 dB e filtro più aperto |
| **slide** | Boolean | Portamento di 30 ms verso la nota successiva, tie-note in stile 303 |

Il modello è quello del 303: una sequenza monofonica dove i due parametri timbrici dominanti sono accent e slide. L'accent alza il picco iniziale a 1,2× e raddoppia l'envelope del filtro su quel colpo. Lo slide non ri-triggera l'envelope del filtro e applica un glide lineare di trenta millisecondi sulla frequenza, creando il classico "tie" della TB-303.

### 5.3 EDIT mode bass

Sopra la griglia bass una modebar dedicata permette di scegliere quale parametro modificare con drag o tap.

| Mode | Comportamento |
|---|---|
| **NOTE** | Tap su cella spenta → accende a `C2`. Tap su accesa → spegne. Drag verticale → cambia la nota. Long-press di mezzo secondo apre un mini-selettore con tutti i semitoni `C1`–`B3`. Scroll della rotella su desktop. |
| **VEL** | Drag verticale su cella accesa → velocity. Tap su spenta non fa nulla. |
| **LEN** | Drag verticale → length / gate. |
| **ACC** | Tap su cella accesa toggla accent. |
| **SLIDE** | Tap su cella accesa toggla slide. Il bordo mostra una freccia → verso lo step successivo. |

### 5.4 LOOPER mode

Il toggle **STEP / LOOPER** nel bass panel cambia il modo di registrazione del basso. In LOOPER:

- la griglia step diventa **read-only** (in grigio) e mostra eventualmente le palline delle note registrate live;
- si attiva la **tastiera on-screen** (un'ottava con bottoni `OCT −` e `OCT +`);
- si attivano le **shortcut pianistiche del computer**: `A W S E D F T G Y H U J K` mappano i dodici semitoni di un'ottava (più la C alta su `K`); `Z` e `X` cambiano l'ottava;
- il bottone **REC** (o tasto `R`) arma la registrazione: il rec parte sul prossimo downbeat e cattura nota + timestamp frazionario fino a fine pattern, poi si rinnova in overdub mode;
- l'opzione **QUANT 1/16** quantizza i timestamp al sedicesimo più vicino;
- l'opzione **PLAY STEP TOO** fonde step pattern e live loop (di default in LOOPER si suonano solo le note del loop).

I tasti pianistici sulla tastiera del computer sono attivi **solo in modalità LOOPER** per non collidere con le shortcut globali (`T` tap tempo, `S` solo, `D` demo, eccetera).

Ogni pattern A/B/C/D ha **due slot indipendenti**: uno step pattern e un live loop. Si possono usare uno, l'altro, o entrambi.

### 5.5 Parametri di traccia bass

Premendo `B` il pannello in alto mostra i parametri del basso al posto di quelli della drum.

| Parametro | Range | Descrizione |
|---|---|---|
| **VOL** | 0 – 100 | Volume di traccia bass |
| **PAN** | −100 – +100 | Posizione stereo |
| **CUTOFF** | 0 – 100 | Frequenza di taglio del filtro (50 Hz – 5 kHz, esponenziale) |
| **RES** | 5 – 150 | Q del filtro (0,5 – 15) |
| **ENV** | −100 – +100 | Modulazione del filtro tramite envelope |
| **DECAY** | 60 – 800 ms | Tempo di decay dell'envelope del filtro |
| **DRIVE** | 0 – 100 | Quantità di soft-clipping WaveShaper |

Tutti i parametri possono essere automatizzati durante il REC live: ogni movimento dei knob viene catturato nel webm/opus.

### 5.6 Routing MIDI

Le note bass vengono inviate sul **canale MIDI 2**; le drum restano sul canale 10 GM standard (kick=36, snare=38, hihat=42, openhat=46, clap=39, tom=45, rim=37, cow=56). Si può quindi triggerare uno strumento esterno via MIDI con il sequencer del basso senza interferenze con le drum.

---

## 6. Performance Modes

### 6.1 Idea

Il tasto `P` (e i quattro bottoni arancio nel bass panel) cambia il **carattere globale** del basso. Le quattro modalità sono scenari coerenti: ognuna ridefinisce insieme l'architettura della sintesi (numero di voci, spread stereo, detune, soglia del sub-oscillatore) e i parametri di timbro (drive, cutoff, resonance, forma dell'envelope).

L'utente non sente variazioni sottili: ogni modalità produce un suono riconoscibile e diverso. Questo è un selettore di **scenario**, non un tweak.

### 6.2 Le quattro modalità

| Modalità | Architettura | Timbro |
|---|---|---|
| **CLASSIC** | mono · 5 voci sawtooth ±10c · sub a –12 st al 30 % · soglia C2 | baseline Round 6, suono bilanciato per tutti i generi |
| **WIDE** | stereo · 5 voci ±18c pannate –1 / –0,5 / 0 / +0,5 / +1 · sub al 25 % | drive ×0,85, sustain alta, immersivo |
| **PUNCH** | mono · 5 voci ±5c · sub al 45 % · soglia C2 | drive ×1,5, decay rapido, sustain 0,55, release 25 ms |
| **SUB** | mono · 3 voci ±5c · sub al 65 % (primario) · soglia abbassata a B1 | drive ×1,6, sustain 0,85, sub-heavy |

### 6.3 Quando usare quale

**CLASSIC** è la scelta neutra. È la baseline del Round 6, e tutte le demo bass storiche (funk, house, onedrop, boombap, trap) suonano in CLASSIC. Da usare quando il basso deve stare in pocket senza colorare lo scenario.

**WIDE** brilla quando il basso è in registro medio (sopra `C2`) e ha un ruolo melodico. Si sente immediatamente in cuffia: lo stereo spread crea un wash dove il basso "respira" da sinistra a destra. Generi tipici: synth-pop, electro, synthwave, italo-disco, new wave.

**PUNCH** è la scelta per i groove serrati. Il drive alto e la sustain corta producono un basso percussivo che dialoga col kick senza sovrapporsi. Generi tipici: funk, neo-soul, hip-hop dirty, boom bap, breakbeat.

**SUB** sostituisce le voci sawtooth con il sub-oscillatore primario al 65 %. È il preset per i generi sub-heavy: dub, dubstep, DnB rolling, trap moderna con 808 lunghi. La soglia del sub è abbassata a `B1` per permettere note più gravi senza perdere il basso fondamentale.

### 6.4 Switching live

Il cambio di modalità si può fare in qualsiasi momento, anche durante la riproduzione. Premendo `P` si cycla CLASSIC → WIDE → PUNCH → SUB → CLASSIC; un toast a video conferma la modalità attiva. La voce eventualmente in corso viene chiusa con un fade di dieci millisecondi per evitare crepe sul cambio di detune o pan.

### 6.5 Persistenza

La modalità performance è salvata insieme al resto dello stato negli slot locali, nel JSON v3 (campo `performanceMode` al root) e nello share link (in via implicita: il pattern si carica e poi la modalità viene ripristinata dal JSON).

---

## 7. Demo Library

### 7.1 Catalogo

Il bottone **DEMOS** apre la libreria delle demo importabili: trentadue set drum (e drum + bass) divisi per categoria.

| Categoria | Numero | Tipo | Tag visivo |
|---|---|---|---|
| **Modern** | 7 | Drum-only | 🎛 grigio |
| **Iconic** | 9 | Drum-only | ⭐ giallo |
| **Classic break** | 7 | Drum-only | 🏛 marrone |
| **Bass curate** | 5 | Drum + bass (CLASSIC) | 🎸 blu notte |
| **Performance modes** | 4 | Drum + bass (mode-aware) | ⚡ arancio |

### 7.2 Demo modern (sette set drum-only)

| File | Nome | BPM | Note |
|---|---|---|---|
| `demo-house.json` | House / Techno | 124 | 4/4 dritto, build + drop |
| `demo-trap.json` | Trap moderno | 140 | 808 + ratchet hats |
| `demo-boombap.json` | Boom Bap anni 90 | 90 | Swing 52% Dilla style |
| `demo-dnb.json` | DNB / Amen break | 170 | Jungle, ghost snare al 7 |
| `demo-makesomenoise.json` | NYC Hip-Hop 2011 | 105 | Kick doppio, cowbell |
| `demo-ukhardcore.json` | UK Hardcore 92-93 | 140 | Pre-jungle rave |
| `demo-onedrop.json` | Dub / Reggae | 80 | Beat sul 3, filosofia invertita |

### 7.3 Demo iconic (nove set drum-only)

| File | Nome | BPM |
|---|---|---|
| `demo-dadada.json` | Da Da Da-style | 120 |
| `demo-wewillrockyou.json` | We Will Rock You | 81 |
| `demo-sevennation.json` | Seven Nation Army | 124 |
| `demo-anotherone.json` | Another One-style | 110 |
| `demo-superstition.json` | Superstition-style | 100 |
| `demo-rosanna.json` | Rosanna Shuffle | 87 |
| `demo-stayinalive.json` | Stayin' Alive | 103 |
| `demo-takefive.json` | Take Five (5/4!) | 172 |
| `demo-wipeout.json` | Wipe Out | 162 |

### 7.4 Demo classic break (sette break storici)

| File | Nome | BPM |
|---|---|---|
| `demo-billiejean.json` | Billie Jean-style | 117 |
| `demo-funkydrummer.json` | Funky Drummer-style | 103 |
| `demo-levee.json` | Levee Breaks-style | 72 |
| `demo-apache.json` | Apache-style | 112 |
| `demo-impeach.json` | Impeach-style | 100 |
| `demo-ashleysroachclip.json` | Ashley's Roachclip | 100 |
| `demo-synthsub.json` | Synthetic Sub-style | 91 |

### 7.5 Demo bass curate (cinque set drum + bass)

Caricano in modalità CLASSIC. Sono le demo originali della release Round 6, scritte con dialogo kick/basso ritmicamente sfalsato.

| File | Genere | BPM | Tonalità |
|---|---|---|---|
| `demo-bass-funk.json` | Funk slap-style | 108 | E minor |
| `demo-bass-house.json` | House 4/4 | 124 | A minor |
| `demo-bass-onedrop.json` | Reggae one-drop | 80 | A minor |
| `demo-bass-boombap.json` | Hip-hop boom bap | 90 | D minor |
| `demo-bass-trap.json` | Trap 808 sub | 140 | F minor |

### 7.6 Demo performance modes (quattro set drum + bass)

Una demo per ogni Performance Mode introdotta nel Round 7. Ognuna dichiara la propria modalità nel JSON (campo `performanceMode` al root) e applica automaticamente lo scenario.

| File | Genere | BPM | Tonalità | Mode |
|---|---|---|---|---|
| `demo-bass-synthwave.json` | Synthwave / italo-disco | 110 | B minor | CLASSIC |
| `demo-bass-synthpop.json` | 80s synth-pop / electro | 120 | C minor | WIDE |
| `demo-bass-neosoul.json` | Neo-soul / hip-hop dirty | 96 | F# minor | PUNCH |
| `demo-bass-dub.json` | Dub rolling / one-drop | 92 | G minor | SUB |

### 7.7 Caricare e scaricare le demo

Click su una card della modale carica la demo immediatamente (sovrascrivendo il set corrente). Per scaricare il file JSON di una demo, vai nella cartella `examples/` del repository GitHub: ogni demo è un file `.json` indipendente che può essere importato a sua volta con il bottone **IMPORT**.

> Tutte le demo sono **ricostruzioni ritmico-armoniche generiche** ispirate ai loro generi di riferimento. Non sono trascrizioni né copie di brani originali; non riproducono melodie protette da copyright. I nomi tipo "Billie Jean-style" o "Seven Nation Army" indicano lo stile, non il brano.

---

## 8. Workflow esempi

### 8.1 Costruire una traccia da zero

1. Apri l'app, premi `D` per caricare la demo predefinita (un four-on-the-floor pulito) come punto di partenza, oppure premi **CLEAR** per partire vuoto.
2. Scegli il BPM. Per un techno usa 124 – 130, per un hip-hop 85 – 95, per un drum & bass 165 – 175.
3. Costruisci il pattern A: kick sui downbeat, snare sul 5 e 13, hi-hat sugli ottavi, eventuale clap.
4. Premi `B` per passare al basso. Aggiungi la tonica sul primo step, una quinta o una settima sul step 9, qualche ghost note e uno slide tra step 8 e 9.
5. Scegli una Performance Mode (`P` cycla): WIDE per i generi sintetici, PUNCH per i groove serrati, SUB per il sub-heavy.
6. Premi `2` per passare al pattern B, copia il pattern A (`COPY` poi `PASTE` su B) e modifica leggermente: cambia un colpo di snare, sposta una nota di basso, alza il drive.
7. Costruisci la song nella sequence: per esempio `A A A B A A B B`. Attiva il toggle **SONG**.
8. Premi `SPACE` e ascolta. Se ti convince, salva con **hold** su uno slot A/B/C/D.
9. Esporta il `.json` o premi **BOUNCE** per ottenere un file `.wav`.

### 8.2 Ricreare un genere

L'approccio sano è caricare una demo del genere come scheletro, poi modificarla.

- **Reggae one-drop**: parti da `Reggae One-drop` (demo bass), tieni il kick sul 3, non aggiungere kick sul 1, lascia spazi vuoti nel basso, usa `CUTOFF` 0,40 e `RES` bassa.
- **Trap 808**: parti da `Trap 808 Bass` (demo bass), modalità SUB, basso in registro medio (F2 – C3), kick sui downbeat 1/7/11, ratchet 2× e 3× sull'hi-hat, `DRIVE` 0,3.
- **Funk**: parti da `Funk Em + Bass`, modalità PUNCH, ghost notes ravvicinate sul basso, tonica solo sui downbeat principali, hi-hat con velocity alternata.

### 8.3 Live looper bass

Per registrare al volo una bassline:

1. Premi `B` per il focus bass, poi `L` per passare in LOOPER mode.
2. Premi `SPACE` per avviare il transport.
3. Premi `R` per armare la registrazione: REC partirà sul prossimo downbeat.
4. Suona la tastiera (mouse, touch o tasti `A W S E D F T G Y H U J K`); usa `Z` `X` per cambiare ottava.
5. Al termine del pattern, REC va in overdub: puoi aggiungere altre note al loop senza fermarti.
6. Premi di nuovo `R` per fermare la registrazione.
7. Per cancellare il loop corrente, **CLEAR LOOP** nel pannello.

Il loop registrato è agganciato al pattern corrente: cambiando pattern, cambia anche il loop. Quattro pattern → quattro loop indipendenti.

### 8.4 Confrontare le Performance Modes

Per percepire al meglio la differenza tra le quattro modalità:

1. Carica `Synth-Pop (WIDE)` dalle demo perf.
2. Avvia la riproduzione.
3. Premi `P` ripetutamente per cyclare CLASSIC → WIDE → PUNCH → SUB.
4. Tieni le cuffie: WIDE produce uno spread stereo immediatamente percepibile, SUB cambia radicalmente il bilanciamento basso, PUNCH aggiunge mordente e accorcia la coda.

---

## 9. Funzionalità avanzate

### 9.1 Slot localStorage A/B/C/D

Quattro slot di salvataggio rapido nella sezione **STORAGE**. Tap breve su un bottone **carica** lo slot, tieni premuto per mezzo secondo per **salvare** lo stato corrente. Lo slot mostra un pallino di conferma quando è popolato.

Il contenuto salvato include: pattern drum, pattern bass step, live loop bass, parametri di traccia drum, parametri di traccia bass, BPM, swing, lunghezza pattern, song sequence, master mixer, modalità bass (step/looper), Performance Mode.

I dati sono persistiti in `localStorage`, quindi sopravvivono a reload e chiusure dell'app, ma non a un cambio di browser o a un wipe del profilo.

### 9.2 Export / Import JSON v3

Il bottone **EXPORT** scarica il set corrente come file `.json` in **formato v3** (vedi appendice 14.2). **IMPORT** apre un file picker per caricare un `.json` esportato in precedenza, una demo della libreria, o un set ricevuto da altri.

I file v1 e v2 (DrumAPP originale) si caricano normalmente; il blocco bass viene inizializzato vuoto. I file v3 senza il campo `performanceMode` (le cinque demo bass storiche) caricano in CLASSIC.

### 9.3 SHARE link

Il bottone **SHARE** genera un URL compatto del tipo `https://.../#0a0b…|Bxx==` e lo copia negli appunti. L'URL include:

- il pattern drum corrente (encoding hex bitmap, sedici step massimo);
- BPM, master drum, master bass;
- il pattern bass step corrente (base64 url-safe del JSON dell'array di step).

Lo SHARE link **non** include il live loop, i parametri di traccia, gli altri pattern, la song sequence, la Performance Mode. È pensato come "biglietto da visita" del groove corrente, non come backup completo. Per backup usa EXPORT.

### 9.4 BOUNCE WAV

Il bottone **BOUNCE** apre un modale con quattro opzioni:

- 2 loop del pattern corrente
- 4 loop del pattern corrente
- 8 loop del pattern corrente
- intera song (tutta la sequence A/A/B/A…)

Il render usa `OfflineAudioContext` con sample rate 44.100 Hz, 2 canali, PCM 16-bit, output `.wav` RIFF. La catena audio offline replica fedelmente quella runtime: stesse voci drum, stesso supersaw stack del basso, stessa modalità performance attiva, stesso bus drum/bass con HPF 30 Hz, stesso master gain. Il file scaricato è quindi identico a quello che ascolti in tempo reale.

Il bounce è deterministico: lo stesso set produce sempre lo stesso file.

### 9.5 REC live

Il bottone **REC** registra **tutto ciò che senti**, inclusi knob twist, pattern switch e movimenti dei master. Tecnicamente usa `MediaStreamDestination` in parallelo a `destination`; il `MediaRecorder` autonegozia il codec (di default webm/opus, fallback mp4 su Safari).

Differenza chiave rispetto al BOUNCE:

- **BOUNCE** è offline e deterministico; cattura solo il pattern (o la song) statica.
- **REC live** è in tempo reale; cattura le tue interazioni, è ideale per performance live o sketches con automazioni.

### 9.6 Web MIDI out

Il bottone **MIDI** apre `requestMIDIAccess` e si aggancia alla prima porta MIDI out disponibile. Da quel momento ogni step drum suonato invia note General MIDI sul canale 10:

| Voce | MIDI note |
|---|---|
| KICK | 36 |
| SNARE | 38 |
| HI-HAT | 42 |
| OPEN HH | 46 |
| CLAP | 39 |
| TOM | 45 |
| RIMSHOT | 37 |
| COWBELL | 56 |

Le note bass vanno sul **canale 2** con la nota suonata (C1 = 24, C2 = 36, eccetera).

L'integrazione MIDI è "out only": l'app non riceve MIDI, ma può triggerare strumenti hardware o software esterni.

### 9.7 Undo / Redo

Storico di quaranta stati. `⌘Z` (Mac) o `Ctrl+Z` annulla; `⌘⇧Z` o `Ctrl+Shift+Z` rifà. Lo storico cattura cambi di pattern, parametri di traccia, BPM, swing, modalità bass, Performance Mode, master mixer e song sequence.

### 9.8 Copy / Paste pattern

Il bottone **COPY** copia il pattern drum corrente in un buffer interno; **PASTE** lo incolla sul pattern corrente (sovrascrivendolo). Utile per duplicare A in B e modificarlo.

Nota: COPY/PASTE agisce sul **pattern drum**, non sul basso né sui parametri di traccia.

### 9.9 Tap tempo

`T` o il bottone **TAP** nel pannello tempo: ogni tocco registra un timestamp; dopo tre tocchi l'app calcola il BPM medio e lo applica in tempo reale. Usalo per allineare il tempo a un brano che stai ascoltando.

### 9.10 Humanize e metronomo

`HUMANIZE` (toggle nella modebar) applica micro-variazioni casuali di timing e velocity ad ogni step, su drum e bass insieme. `METRO` attiva un click in alta frequenza sul primo beat e in bassa frequenza sugli altri, utile per pratica e registrazione.

---

## 10. Shortcut tastiera

### 10.1 Globali

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
| `B` | Toggle focus drum ⇄ bass nel pannello editing |
| `L` | Toggle modalità bass STEP ⇄ LOOPER |
| `P` | Cycla Performance Mode CLASSIC → WIDE → PUNCH → SUB |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo |
| `?` | Apri guida integrata |
| `ESC` | Chiudi modali |

### 10.2 Solo in modalità LOOPER bass

Queste shortcut **non sono attive** in STEP mode, per non collidere con quelle globali. Si attivano automaticamente quando il bass passa in LOOPER (`L`).

| Tasto | Azione |
|---|---|
| `R` | Arma / disarma REC del loop bass |
| `A W S E D F T G Y H U J K` | Mappatura pianistica delle dodici note (più la C alta su `K`) |
| `Z` / `X` | Ottava giù / su della tastiera on-screen |

Le note pianistiche partono dalla C dell'ottava corrente (`bassKbOctave`, default 2). `A` = C, `W` = C#, `S` = D, `E` = D#, `D` = E, `F` = F, `T` = F#, `G` = G, `Y` = G#, `H` = A, `U` = A#, `J` = B, `K` = C ottava sopra.

---

## 11. Feature roadmap

> Le idee elencate in questa sezione sono **in valutazione**, non promesse. Non hanno date di rilascio né ordini di priorità dichiarati. Sono dichiarate qui per dare alla community early-adopter una finestra sulla direzione del progetto e per raccogliere feedback su cosa risuona di più con l'uso reale.

### 11.1 DrumAPPBass-Studio: sample-based bass

Un fork separato (non sostitutivo dell'attuale) con bassline costruite a partire da **sample WAV multi-velocity layer**. Obiettivo: superare il soffitto onesto della sintesi vanilla (≈ 7,5 / 10) e arrivare a un suono DAW-like (≈ 9 / 10), pur restando in ambito web. Trade-off: il pacchetto cresce di un ordine di grandezza (decine di MB di sample) e perde la portabilità "load offline in due secondi".

L'idea è di tenere DrumAPPBass come "sketch tool" leggero e DrumAPPBass-Studio come "tool da finalizzazione", entrambi parte della stessa serie Weekend App.

### 11.2 Filtro per voce in WIDE mode

In WIDE mode lo spread stereo è oggi sulle voci sawtooth ma il `BiquadFilter` è ancora globale (un singolo nodo per tutte le voci). Aggiungere cinque filtri biquad indipendenti, uno per voce, con leggere variazioni di cutoff e Q, darebbe spazialità anche al filtro stesso e renderebbe lo spread più "tridimensionale". Costo CPU stimato: +30–50 % sulla sezione bass.

### 11.3 Modalità FM / PWM

Le quattro modalità attuali variano detune, panning, mix sub, drive ed envelope, ma la **forma d'onda primaria resta sawtooth** in tutte. Una quinta modalità con waveform diversa (per esempio square con PWM, oppure FM a due operatori) introdurrebbe un carattere radicalmente nuovo. Esempio: una mode "BUZZ" con onda quadra modulata in pulse-width per un basso più 8-bit / chiptune.

### 11.4 Compressore master sul bass bus

Aggiungere un `DynamicsCompressorNode` sul `bassBus` (con preset glue: ratio 3:1, threshold −18 dB, attack 5 ms, release 100 ms) per dare quel "collante" tipico dei mix professionali, soprattutto in PUNCH e SUB. È una modifica leggera e compatibile con il bounce offline.

### 11.5 Espansione delle demo per modalità

Oggi ogni Performance Mode ha **una sola demo** rappresentativa. Espandere a tre demo per modalità (per esempio: WIDE in three flavours — synth-pop, electro funk, synthwave veloce — con tonalità e BPM diversi) renderebbe più immediato l'esplorare il "what if" del singolo scenario.

### 11.6 MIDI in (input esterno)

Oggi l'integrazione MIDI è solo `out`. Aggiungere `MIDI in` permetterebbe di pilotare il basso da una tastiera hardware, e il drum da pad esterni. Il sequencer interno resterebbe come modalità predefinita, ma l'utente potrebbe registrare il loop bass (e in futuro anche il drum) suonandolo da hardware.

### 11.7 Mobile UX improvements

Su iPhone e iPad alcune interazioni sono migliorabili: il long-press per aprire il mini-selettore di nota va affinato (oggi confligge in alcuni casi con il drag verticale), la tastiera on-screen del basso può guadagnare in altezza in landscape, il modale demos può scrollare con più fluidità su iOS Safari. È un'area di raffinamento continuo che dipende dal feedback degli early adopter.

### 11.8 Versione internazionale del manuale

Questo documento esiste oggi solo in italiano. Versioni inglese, spagnola e francese sono in valutazione per la fase di rilascio pubblico, in modo da estendere l'adozione fuori dalla community italiana iniziale.

### 11.9 Esportazioni alternative

Oltre al WAV, sono in valutazione altri formati di export: stem WAV separati (drum-only e bass-only in due file), MIDI file dei pattern (`.mid` invece del solo MIDI live), Ableton Live `.als` semplificato. Ognuna di queste è una piccola feature ma ad alto valore per chi usa DrumAPPBass come prefase di una produzione su DAW.

### 11.10 Engagement community

L'autore sta valutando — sulla base del feedback ricevuto durante la fase di anteprima — di aprire un canale Telegram o un forum Discord dedicato per chi usa l'app, dove condividere demo, fare contest periodici (per esempio "best 30-second bassline del mese"), e raccogliere bug report e idee in modo più strutturato rispetto a WhatsApp.

---

## 12. FAQ

**L'app si scarica oppure si usa solo online?**
Si usa nel browser, ma essendo una PWA viene cachata al primo accesso (via service worker `drumappbass-v2`). Da quel momento funziona offline finché il browser non svuota la cache. Su mobile si può "installare" alla home screen e si comporta come un'app standalone.

**Devo creare un account?**
No. Nessun account, nessun login, nessun tracking, nessuna telemetria. I dati sono salvati solo in `localStorage` sul tuo dispositivo.

**Funziona su iPhone? Su Android?**
Sì, su entrambi. Su iOS Safari il `MediaRecorder` usa mp4 (fallback automatico), su Chrome Android usa webm/opus. Su iOS è consigliato installare la PWA alla home per poter sbloccare il contesto audio in modo affidabile.

**Posso usare DrumAPPBass dal vivo?**
Sì, è uno degli use case principali. Il REC live cattura la performance, lo SHARE link è utile per condividere groove al volo. Per palco serio si consiglia di usare l'app installata come PWA, in modalità aereo se non serve internet, e con cuffie cablate (il Bluetooth introduce latenza che non è gestibile lato browser).

**Posso usare le demo per pubblicare un mio brano?**
Sì. Le demo sono ricostruzioni ritmico-armoniche generiche, non sample di brani originali, e il codice e gli output dell'app sono coperti da licenza MIT. Il tuo brano finale (esportato come WAV o sviluppato in DAW partendo dal MIDI / WAV bounce) è opera tua a tutti gli effetti.

**Funziona offline?**
Sì, completamente. Il service worker pre-cacha tutti gli asset core al primo accesso. Le demo si caricano via fetch dalla cartella `examples/`: se la cache contiene già i file, funzionano anche offline.

**Come aggiorno l'app dopo un nuovo Round?**
Su desktop, hard reload con `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Win/Linux). Su iOS, chiudi e riapri la PWA due volte: la prima volta scarica la nuova versione, la seconda l'attiva.

**Ho trovato un bug. Come segnalo?**
Vedi sezione 13 (Risorse). I canali sono GitHub Issues, WhatsApp diretto all'autore (per chi è nella community early-adopter), email.

**Posso modificare il codice?**
Sì, la licenza MIT lo permette. Fork del repository, modifica in locale, eventualmente apri una pull request se vuoi contribuire al progetto principale.

**C'è una versione Mac/Windows nativa?**
No, e non è prevista. La filosofia "vive nel browser" è un pilastro del progetto: una PWA si installa come app ma resta zero-dipendenze e cross-platform.

---

## 13. Risorse, licenza e contatti

### 13.1 Link

- **App live:** [pezzaliapp.github.io/DrumAPPBass](https://pezzaliapp.github.io/DrumAPPBass/) — versione canonica, sempre aggiornata.
- **Repository:** [github.com/pezzaliapp/DrumAPPBass](https://github.com/pezzaliapp/DrumAPPBass) — codice sorgente, demo, changelog.
- **Sito autore:** [pezzaliapp.com](https://pezzaliapp.com) · [pezzaliapp.it](https://pezzaliapp.it)
- **DrumAPP originale:** [github.com/pezzaliapp/DrumAPP](https://github.com/pezzaliapp/DrumAPP) — il progetto da cui DrumAPPBass è stato forkato.

### 13.2 Come dare feedback

In ordine di preferenza, a seconda del contesto.

- **Bug riproducibili o richieste tecniche:** apri una issue su GitHub (`Issues` → `New issue`). Includi browser, sistema operativo, passi per riprodurre.
- **Feedback informale, idee, prime impressioni:** WhatsApp diretto all'autore se sei nella community early-adopter; email per chi non è in community.
- **Pull request:** benvenute, soprattutto se fixano un bug riproducibile. Per feature nuove di una certa portata, consiglio di aprire prima una issue e discutere l'approccio.

### 13.3 Licenza

DrumAPPBass è distribuito sotto licenza **MIT**.

In sintesi: puoi usare, copiare, modificare, ridistribuire, vendere il software o opere derivate, a patto di mantenere il copyright notice e la licenza nei file. Il software è fornito "as is", senza garanzie. Vedi il file [`LICENSE`](https://github.com/pezzaliapp/DrumAPPBass/blob/main/LICENSE) per il testo integrale.

### 13.4 Note legali

**Demo e copyright musicale.** Le demo della libreria sono ricostruzioni ritmico-armoniche generiche ispirate ai loro generi di riferimento. Non sono trascrizioni né copie di brani specifici, non riproducono melodie identificative, non utilizzano campioni audio originali. I nomi tipo "Billie Jean-style" o "Seven Nation Army" indicano lo stile, non il brano. Ogni file generato dall'utente con DrumAPPBass è opera dell'utente.

**Tracking e privacy.** L'applicazione **non** raccoglie alcun dato dell'utente. Non c'è analytics, non c'è telemetria, non c'è tracker. Tutti i dati di salvataggio (slot, set correnti) sono in `localStorage` locale e non lasciano mai il dispositivo. Lo SHARE link contiene solo il pattern serializzato in URL hash; non passa per server di terze parti.

**Vanilla Web Audio.** L'audio è generato in tempo reale via Web Audio API standard. Non ci sono librerie audio esterne (Tone.js, Howler, eccetera). Non ci sono sample WAV inclusi o caricati. Tutto il suono è risultato di sintesi diretta dei nodi `Oscillator`, `Gain`, `BiquadFilter`, `WaveShaper`, `BufferSource` con noise pre-generato.

---

## 14. Appendice tecnica

### 14.1 Architettura della sintesi

Tutta la sintesi vive in `app.js`. Le sezioni principali sono commentate con header tipo `// 5b) SINTESI BASS`.

**Catena drum (per ciascuna delle otto tracce):**

```
voice  →  trackPanner[i]  →  trackFilter[i]  →  trackGain[i]
                                                      ↓
                                                   drumBus  →  masterGain  →  destination
```

**Catena bass:**

```
note  →  [stack supersaw 5 voci sawtooth detunate]  →  stackMix
note  →  [sub-oscillator square -12 st (condizionale)]
                          ↓                              ↓
                       mixSaw                          mixSub
                          ↓                              ↓
                                  gate (envelope amp)
                                         ↓
                                bassPanner  (globale)
                                         ↓
                                bassFilter  (LP, env+Q dinamici per nota)
                                         ↓
                                bassDrive   (WaveShaper tanh)
                                         ↓
                                bassGain    (volume traccia)
                                         ↓
                                bassBus  →  bassBusHP (30 Hz)  →  masterGain
```

**Scheduler.** Pattern di Chris Wilson: un `setInterval` ogni 25 ms programma gli step nei prossimi 100 ms via `AudioContext.currentTime`. Il bass step sequencer si innesta nello stesso scheduler, nello stesso `scheduleStep(stepIdx, baseTime)`. Il bass looper schedula le note dal proprio array `bassLiveLoop[pattern]` in base alla posizione frazionaria dentro il pattern.

**Bounce offline.** `OfflineAudioContext` ricostruisce la stessa identica catena audio (incluso il drive boost e il resonance boost della Performance Mode attiva) e schedula tutti gli step della sequenza scelta. Output PCM 16-bit stereo encodato come WAV RIFF.

### 14.2 Formato JSON v3 (esteso Round 7)

```json
{
  "version": 3,
  "exportedAt": "2026-04-25T12:00:00Z",
  "bpm": 110,
  "swing": 0,
  "patternLength": 16,
  "humanize": false,
  "masterDrum": 0.9,
  "masterBass": 0.8,
  "performanceMode": "wide",
  "trackParams": [
    { "volume": 0.9, "mute": false, "solo": false, "pitch": 0, "decay": 1.3,
      "filterType": "off", "filterCutoff": 0.7, "filterQ": 1.0, "pan": 0 },
    /* … 7 altre tracce drum … */
  ],
  "patterns": {
    "A": [ /* 8 array da 16 celle */ ],
    "B": [ /* … */ ], "C": [ /* … */ ], "D": [ /* … */ ]
  },
  "songSequence": ["A", "A", "B", "A"],
  "bass": {
    "trackParams": {
      "volume": 0.75, "pan": 0, "cutoff": 0.55, "resonance": 3.0,
      "envAmount": 0.55, "decay": 160, "drive": 0.18,
      "mute": false, "solo": false
    },
    "patterns": {
      "A": [
        { "note": "B1", "vel": 0.9, "len": 0.30, "accent": true, "slide": false },
        null,
        /* … 14 celle … */
      ],
      "B": [ /* … */ ], "C": [ /* … */ ], "D": [ /* … */ ]
    },
    "liveLoops": {
      "A": [
        { "step": 0.0, "note": "B1", "vel": 0.9, "len": 0.30 },
        { "step": 3.5, "note": "F#2", "vel": 0.7, "len": 0.20 }
      ],
      "B": [], "C": [], "D": []
    },
    "mode": "step"
  }
}
```

**Backward compatibility:**
- File `version < 3` (DrumAPP pre-fork) → si carica normalmente, sezione bass inizializzata vuota.
- File `version 3` senza `performanceMode` → carica in `classic` (caso delle cinque demo bass storiche e di qualunque export pre-Round 7).
- File con `performanceMode` non noto → fallback `classic` con ignorare silenzioso.

Il numero di versione resta `3` anche dopo l'aggiunta di `performanceMode`: il campo è additivo e non rompe il parser dei consumer esistenti.

### 14.3 Performance Modes — dettaglio interno

Ciascuna modalità è un oggetto `PERFORMANCE_MODES[key]` con i seguenti campi:

| Campo | Tipo | Significato |
|---|---|---|
| `label` | string | Nome visualizzato (CLASSIC, WIDE, …) |
| `desc` | string | Descrizione one-line per UI |
| `detunes` | number[] | Array di cents per voce (5 o 3 elementi) |
| `pans` | number[] | Array di pan –1.0..+1.0 (stessa lunghezza di detunes) |
| `gains` | number[] | Array di gain normalizzati (somma ≈ 1) |
| `subEnabled` | bool | Se attivare il sub-oscillatore |
| `subMixRatio` | 0..1 | Gain del sub nel mixer |
| `sawMixRatio` | 0..1 | Gain dello stack saw nel mixer |
| `subMidiThreshold` | int | MIDI minima sotto cui il sub si disabilita (36 = C2, 35 = B1) |
| `driveBoost` | number | Moltiplicatore di `bassParams.drive` |
| `cutoffOffset` | −1..+1 | Offset additivo su `bassParams.cutoff` |
| `resonanceBoost` | number | Moltiplicatore di `bassParams.resonance` |
| `envAmountBoost` | number | Moltiplicatore di `bassParams.envAmount` |
| `sustainLevel` | 0..1 | Sustain del gate envelope amp |
| `attackSec` | sec | Attack del gate envelope amp |
| `releaseSec` | sec | Release del gate envelope amp |

I valori esatti delle quattro modalità sono nel file `app.js`, sezione `PERFORMANCE_MODES`.

### 14.4 Limiti noti

- Un solo basso monofonico (per scelta di design, non limitazione tecnica).
- Pattern multipli A/B/C/D, non "scenes" come in Live (16 scene). Per song lunghe si compone in song sequence.
- Lo SHARE link include solo il pattern corrente, non gli altri tre. Per backup completo usare EXPORT JSON.
- Web MIDI è "out only", non c'è MIDI in.
- Il REC live su iOS Safari produce mp4 invece di webm/opus (limitazione del browser).
- Il bounce WAV su pattern molto lunghi (intera song con 16 slot e patternLength 32) può richiedere 10-20 secondi di rendering: non c'è una progress bar dettagliata, solo un toast "Bounce in corso…".

### 14.5 Cambio di versione

| Versione | Data | Highlight |
|---|---|---|
| v1.1 | 2026-04-25 | Round 7 — Performance Modes (CLASSIC / WIDE / PUNCH / SUB), 4 nuove demo, shortcut `P` |
| v1.0 | 2026-04-24 | Prima release pubblica DrumAPPBass — fork DrumAPP con sezione bass completa |

---

*Fine del manuale. Buon uso e buoni groove.*

— *Alessandro Pezzali*
