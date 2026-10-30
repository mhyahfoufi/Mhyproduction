# MALAK AI V2 — execution, 2026-10-29

Scope: `mhy-ai-malak-preview` only. No main edits, merge, deployment, paid service or credentials.

## Implemented
- Preserved the original portrait and existing black/gold chat. Portrait file is present at `assets/malak-original.png`.
- Kept the existing live central catalog loader and small independent identity JSON; no duplicated catalog was introduced.
- Refreshes the source on page load, chat opening and each question, using unique cache-busting URLs. Load errors discard old knowledge.
- Existing published entries provide names, summaries, image paths and viewing links. Publicly announced in-production entries now expose only their name/status, never plot descriptions or watch links. Private/draft entries stay excluded.
- Added an isolated speech controller with delayed voice loading, Arabic female-name preference (a heuristic, not a guaranteed gender), any-Arabic fallback, English matching, manual voice selection, speed/volume controls and short utterance chunks.
- Listening requires clicking the answer button. Stops on another listen action, Stop, chat close, page hide and tab hiding. Speech failure leaves text chat available.

## Verification
- `node malak-preview/knowledge.test.cjs`: 34 assertions passed, including add/edit/delete, public/private production status, bilingual answers, spoilers, cache busting and loading errors.
- `node malak-preview/speech.test.cjs`: passed with an injected speech engine (delayed voices, selection, language, rate, volume, cancel, error and completion).
- `NODE_PATH=/path/to/linkedom/node_modules node malak-preview/ui.test.cjs`: passed DOM simulations with and without speech support. Test dependency: linkedom 0.18.14 (install outside the repository or with npm --no-save).
- Syntax checks and `git diff --check` passed.
- An actual browser/audio/mobile test was NOT completed. Playwright is installed but its browser executable is absent; browser downloads returned invalid/truncated ZIP data. DOM/speech mocks do not prove audible playback or visual layout.
- No real device voice was available for identification; test fixture uses Salma ar-SA and an English fixture. Neither is a shipped voice asset.

## Independent preview
The preview entry is `malak-preview/index.html`. Serve the repository root over HTTP, for example `python3 -m http.server 8000`, and open `/malak-preview/`. This serves assets/content-data.js from the same checkout.
There is no newly hosted public preview URL. A branch source URL is not an executable preview. A standalone preview host would require deployment, which is explicitly outside this authorization. Deploy a preview of this branch with repository root as the static root and `/malak-preview/` as the entry, without changing official Pages/main.

## Free engine research and remaining limits
Reviewed upstream eSpeak NG browser-port documentation and language support:
- https://github.com/espeak-ng/espeak-ng/blob/master/emscripten/README.md
- https://github.com/espeak-ng/espeak-ng/blob/master/docs/languages.md
The upstream port requires generated worker/data artifacts and GPLv3 compliance; Arabic support has pronunciation/diacritization limitations. No verified runnable Arabic fallback bundle was integrated. Unsupported browsers or devices with no matching voice display an explicit message. This remains a limitation, not a claim of universal voice support.

The text assistant remains deterministic catalog search, not a connected generative model. No automatic voice installation, guaranteed female voice, natural Lebanese voice or animated lip sync is claimed.
