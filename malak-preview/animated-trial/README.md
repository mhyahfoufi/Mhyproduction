# Malak animated integration — 2026-11-02

Implemented: provider-neutral controller, Original/Animated controls, connection timeout,
quota/error/expiry fallback, cancellation of stale connections, disconnect on close,
hide and page exit. Original portrait and catalog engine remain unchanged.
No service is configured or loaded automatically. No live lip-sync test has passed.

## Provider contract

Load controller.js, the existing chat script, then ui.js (already wired in index.html).
Register a factory with `MalakAnimation.register(id, factory)` and set
`MalakAnimation.providerId = id`. Factory returns:
- connect({onFailure}): Promise; call onFailure('quota'|'expired'|'provider-error') for asynchronous failures.
- speak(text, options): Promise; receives the exact public catalog reply.
- disconnect(): Promise; MUST abort in-flight requests, stop media and release resources,
  including if connect finishes after disconnection. No automatic retries/billing.

The controller's success state means connection/request acceptance only, never proof
of audible speech or lip sync. Runtime fallback is verified with a fake provider.

## D-ID (not activated)

`did-adapter.js` wraps the official SDK createAgentManager/connect/speak/disconnect.
Bundle a reviewed SDK locally; create an agent with the exact approved portrait;
confirm a card-free trial, Arabic voice and embed entitlement. Supply agent ID,
domain-scoped client key and trial expiration; never put Basic/API credentials in
source/browser. Register the returned factory. Provider is not loaded by default.
Actual account limits, SDK errors, audio and lip sync still require live validation.

## Offline / self-hosted media

`media-adapter.js` takes render({text,lang,imageUrl,signal}) returning a video Blob.
It plays the returned audio/video together and aborts/revokes on disconnect. This
is an interface, NOT a claim that Vivora exposes this exact render endpoint.
A server-side render bridge must bypass Vivora's LLM and use the provided reply
verbatim. Keep authentication server-side and the endpoint private/rate-limited.
No server has been provisioned.

## Alternatives checked

Talking Avatar Open Source: installed @interviewflowai/talking-avatar 0.3.0 in an
isolated scratch probe, imported TalkingAvatar successfully. Browser demo attempted: it reported WebGL unavailable and disabled playback.
No 3D rendering or audio was verified in this cloud browser. MIT, Three.js/WebGL2/Web Audio, GLB with visemes, audio Blob/stream.
Does not animate a PNG. No approved Malak GLB exists; therefore NOT substituted.
Web Speech synthesis provides no portable audio Blob/MediaStream for this SDK;
Arabic recorded/TTS audio is an additional requirement. No paid TTS enabled.
https://github.com/InterviewFlowAI/talking-avatar

Vivora means https://github.com/sur950/vivora (not vivora.ai, a study app).
Source/dependency review: Python 3.11+, Node18+, FFmpeg, Postgres, Redis/Celery,
Torch + MuseTalk weights, TTS. Docker Compose is the optional installation route.
Local CPU testing is documented as slow; GPU needed for useful real-time playback.
This environment has no docker command, no torch package and no nvidia-smi.
Full synthesis was NOT run. Arabic output and exact facial fidelity unverified.
Open source code is not free hosted compute. No cloud resources purchased.

## D-ID access check

Independent Chrome reached auth.d-id.com login normally on 2026-11-02.
This does not prove handset browser vs network vs region vs session root cause.
No credentials submitted or access controls bypassed.

## Tests

node --test malak-preview/animated-trial/controller.test.cjs malak-preview/speech.test.cjs malak-preview/knowledge.test.cjs malak-preview/conversation.test.cjs
NODE_PATH=<linkedom modules> node malak-preview/ui.test.cjs

The old speech test expected missing-voice rejection, contradicting f5dc3645.
Updated it to assert ar-SA fallback, starting and actual onstart state.
Phone hearing/stop/long answers and genuine Arabic lip sync require field testing.
