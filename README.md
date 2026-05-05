# TestyStuff Step Sequencer

Ein rein clientseitiger Step-Sequencer als statisches Web-Frontend. Über die
Web Audio API werden entweder synthetisierte Sounds (Default: Kick, Snare,
HiHat, Bass) oder pro Spur hochgeladene Samples abgespielt. Tempo läuft
**pro Spur**, der Pitch wird pro Step in Halbtönen gesteuert. Der Zustand
wird automatisch in `localStorage` persistiert.

Kein Build-Step, kein Bundler, keine Backend-Komponente.

## Local serve

Da der Sequencer als ES-Module-basierte App ausgeliefert wird, muss er über
einen statischen HTTP-Server geladen werden (nicht per `file://`, sonst
blockiert der Browser die `import`-Auflösung).

```bash
npm install
npm run serve
```

Öffne anschließend [http://localhost:8080](http://localhost:8080) im Browser.

Alternativ funktioniert jeder andere statische Server (z. B.
`python3 -m http.server 8080`), solange er das Repository-Root ausliefert.

## Tests

Die Test-Suite ist mit [Vitest](https://vitest.dev) + JSDOM aufgesetzt und
deckt Audio-Engine, Sequencer-Logik, Storage, UI-Renderer und einen
End-to-End-Smoke-Test ab.

```bash
npm install
npm test          # Single-Run-Modus (CI-tauglich)
npm run test:watch # Watch-Modus während der Entwicklung
```

Die Tests laufen ausschließlich in Node und benötigen keinen echten Browser
— die Web Audio API wird in `tests/setup.js` gemockt.

## Browser-Anforderungen

Der Sequencer benötigt einen Evergreen-Browser mit Unterstützung für native
**ES Modules**, die **Web Audio API**, `structuredClone` sowie
`window.localStorage`. Folgende Mindestversionen wurden getestet bzw. als
Zielmatrix gesetzt:

| Browser | Mindestversion | Begründung                        |
|---------|----------------|-----------------------------------|
| Chrome  | ≥ 90           | ES Modules, Web Audio API stabil  |
| Firefox | ≥ 88           | ES Modules, Web Audio API stabil  |
| Safari  | ≥ 14           | Web Audio API, ES Modules         |

Mobile Browser laufen, das Layout ist allerdings Desktop-First. Auf mobilen
Geräten ist `beforeunload` nicht zuverlässig — Auto-Save kann beim
abrupten Tab-Kill fehlschlagen.

Falls die Web Audio API nicht verfügbar ist (sehr alte Browser), zeigt die
App eine entsprechende Fehlermeldung und startet den Synthese-Pfad nicht.

## State Schema Versions

Changelog:

- **1.0.0 — initial.** Erste veröffentlichte Schema-Version: 4 Tracks
  (Kick, Snare, HiHat, Bass) mit je 16 Steps, Pitch pro Step in
  Halbtönen, Lautstärke und BPM pro Spur, optionaler Sample-Upload als
  Base64-Data-URL.

Der persistierte `SequencerState` lebt im `localStorage` unter dem Key
`sheep.testystuff.state.v1` und trägt eine semantische Schema-Version. Bei
einem Major-Schema-Bruch wird ein neuer Storage-Key (`...state.v2`)
eingeführt; der alte Key wird genau eine Release-Generation lang weiter
gelesen und migriert, danach gelöscht.

Bekannt inkompatible Zustände werden beim Laden verworfen, die App startet
in dem Fall mit dem Default-State und loggt eine Warnung über den
strukturierten Logger.

## Deployment

Die App wird als statisches Artefakt aus dem Repository-Root via GitHub
Pages ausgeliefert. Der Workflow ist in `.github/workflows/pages.yml`
definiert und löst auf jedem Push nach `main` aus.
