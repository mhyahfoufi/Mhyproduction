# Malak alternative evaluation — 2026-11-02
Owner decision: D-ID is excluded for this stage. Do not retry login or recommend it as the next step.

## Implemented on preview branch only
- Original speech receives the exact failed answer and its language/rate/volume after provider error, quota or timeout.
- Disconnect is attempted before speech recovery, with a bounded wait.
- Stop, manual switching, closing/hiding, new sessions and a newer original utterance cancel obsolete recovery.
- A provider must call connect({onFailure,onSpeechEnd}).onSpeechEnd only when playback finishes, not when a request is accepted, to prevent replaying completed speech.
- Media adapter now forwards actual video ended events.
- A full failed answer restarts using existing device speech; there is no claim of resuming at the precise interrupted word.
- No provider enabled; portrait, knowledge and conversation data unchanged.

## Actual external runtime probe
WaveSpeed free Make a Photo Talk With Your Own Voice:
https://wavespeed.ai/free-tools/make-photo-talk-with-your-voice
In independent cloud Chrome, without signing in, selected vendor Relaxed portrait photo/audio sample and clicked Make it talk (Fast).
Generated a 720x900 video reported as 7 seconds. DOM playback check: duration 6.997333, paused false, readyState 4, currentTime 3.8674.
The browser reported CPU fallback, Detailed mode disabled for lack of usable graphics support.
This is an actual generated sample, not simulated provider success. It is NOT Malak, NOT an Arabic test, NOT an Android test and NOT integrated into the website.
Vendor's free tool is limited to 30 seconds and moves mouth/jaw only. No public free-tool embedding API/SDK was verified. Separate avatar-generator API does not prove this free tool is API-free.
Current SpeechSynthesis cannot provide the portable audio clip required by this tool.

## Other options
Talking Avatar Open Source:
https://talking-avatar.dev/pricing
Free MIT browser version takes a viseme-equipped 3D GLB, not the approved PNG. Hosted custom realistic avatar costs $199, excluded.
Vivora:
https://github.com/sur950/vivora
Requires backend Python/services/models; GPU for useful real-time generation. Probe: no torch, docker or nvidia-smi here; ffmpeg exists. Full synthesis not run. GitHub Pages cannot run that backend. No available user GPU assumed.
Yoob:
https://yoob.com/avatars/
Vendor explicitly says preset characters only, Android not yet supported and mobile browsers unsupported. Excluded.
Agent Human:
https://agenthuman.com/
Advertises 60 free minutes/month, no card, photo upload and audio-driven multilingual lip sync; free custom-photo entitlement not independently exercised. Docs URLs failed to load in research tool. No credentials/account created; API and Arabic test not performed. Not qualified for deployment.

## Validation and limits
14 controller tests passed (5 existing + 9 regression cases), JS syntax checks passed.
These tests prove recovery logic only; they do not prove audible Android recovery or lip sync.
No live provider integration, new hosted preview, paid service, card or main edit.
Remaining blocker: no tested free custom-photo integration accepting a usable Arabic audio source under current constraints.
