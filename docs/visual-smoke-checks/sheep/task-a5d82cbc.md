# Visual Smoke Check — Projekt-Scaffold mit Vitest und JSDOM

**Branch:** sheep/task-a5d82cbc

**Acceptance Criteria:**
npm install und npm test laufen ohne Fehler durch (no test files); AudioContextMock ist in setup.js global registriert; vitest nutzt jsdom-Environment

This change was classified by the test-writer as effectively `trivial` (pure project scaffold; AC1 explicitly forbids test files — see "Note for downstream agents" below). No automated tests were added. After the implementation lands, manually verify:

- Run `npm install` from the repository root — completes without errors and produces `node_modules/` plus `package-lock.json`. (AC1)
- Run `npm test` — exits with code `0` and prints vitest's "No test files found" message (or equivalent empty-suite output). No test errors are reported. (AC1)
- Open `tests/setup.js` — defines `AudioContextMock` (with members like `currentTime`, `destination`, `state`, `resume`, `createOscillator`, `createGain`, `createBiquadFilter`, `createBufferSource`, `createBuffer`, `decodeAudioData`) and assigns it to **both** `globalThis.AudioContext` and `globalThis.webkitAudioContext`. (AC2)
- Open `vitest.config.js` — exports a vitest config whose `test.environment` is `'jsdom'` and whose `test.setupFiles` includes the path to `tests/setup.js`. (AC3)
- Open `package.json` — `"type": "module"`, `scripts.test` invokes vitest, and `devDependencies` lists `vitest` and `jsdom`.
- Open `.gitignore` — at minimum ignores `node_modules` and `coverage`.

## Note for downstream agents (tdd-coder, tdd-reviewer)

The test-writer deliberately did **not** add any test file in this Red phase. Reasoning:

1. **AC1 explicitly states** the success condition is `npm test` reporting "no test files". Adding any `*.test.js` here would falsify AC1.
2. **The plan's Task 1, Step 5** confirms: *"`npm install` & `npm test` (erwartet: 'no test files')"*.
3. **Behavioral testing begins in the plan's Task 2** (`tests/integration/bootstrap.test.js`) — that is the first opportunity for a real failing test, and a separate story.
4. The Impact Level was empty in the prompt; the test-writer treated this scaffold task as `trivial` because the standard "every AC has a failing test" rule is logically incompatible with AC1's "no test files" requirement.

Consequence for the **tdd-coder**: this task's deliverables are pure scaffold artifacts:

- `package.json` (with `type: "module"`, scripts `test`, `test:watch`, `serve`, devDependencies `vitest`, `jsdom`, `@vitest/coverage-v8`)
- `vitest.config.js` (`environment: 'jsdom'`, `setupFiles: ['./tests/setup.js']`, `include: ['tests/**/*.test.js']`)
- `.gitignore` (`node_modules`, `coverage`, `.DS_Store`)
- `README.md` (stub with project name; full content lands in plan Task 22)
- `tests/setup.js` (AudioContext mock classes registered on `globalThis`)

The coder should run `npm install` followed by `npm test` and confirm the suite reports "No test files found" with exit code `0` — that is the verification of done for this story.

Consequence for the **tdd-reviewer**: please verify that no `*.test.js` files were added in this commit range and that `npm test` from a clean checkout reports "No test files found". This is the intended Red→Green outcome for a scaffold-only story.
