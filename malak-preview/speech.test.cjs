'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {speechHarness}=require('./test-support.cjs');
test('neural engine offers five voices without native speech or eager model downloads',()=>{
 const h=speechHarness(),s=h.create();assert.equal(s.supported,true);assert.equal(s.refresh().length,5);assert.equal(s.choose().voiceURI,'F1');s.select('F3');assert.equal(s.choose().voiceURI,'F3');s.select('unknown');assert.equal(s.choose().voiceURI,'F3');assert.equal(h.calls.loads,0);assert.equal(h.player.getAttribute('playsinline'),'');s.dispose();
});
test('Arabic synthesis uses selected style, current parameters and bounded playback controls',async()=>{
 const h=speechHarness(),s=h.create();s.select('F2');assert.equal(await s.speak('مرحبا',{rate:9,volume:9}),true);assert.equal(h.calls.loads,1);assert.match(h.calls.styles[0],/F2\.json$/);assert.equal(h.calls.synthesis[0][1],'ar');assert.equal(h.calls.synthesis[0][3],6);assert.equal(h.calls.synthesis[0][4],1.5);assert.equal(h.player.volume,1);assert.equal(h.calls.play,1);assert.equal(h.states.at(-1).state,'speaking');h.player.onended();assert.equal(h.states.at(-1).state,'ended');s.dispose();assert.equal(h.calls.revoked.length,1);
});
test('English is rejected without a model download and disposal clears the watchdog',async()=>{
 const h=speechHarness(),s=h.create();assert.equal(await s.speak('Hello',{lang:'en'}),false);assert.equal(h.states.at(-1).state,'missing');assert.equal(h.calls.loads,0);s.dispose();assert.equal(h.timers.size,0);
});
test('stop during generation prevents stale playback',async()=>{
 let release;const pending=new Promise(r=>release=r),h=speechHarness({generate:()=>pending}),s=h.create();const speaking=s.speak('مرحبا');await h.flushUntil(()=>h.calls.synthesis.length===1);s.stop();release({wav:new Float32Array(10),duration:[.1]});assert.equal(await speaking,false);assert.equal(h.calls.play,0);assert.equal(h.timers.size,0);assert.equal(h.states.at(-1).state,'stopped');
});
test('autoplay denial preserves manual playback; model failure reports error without playing',async()=>{
 const h=speechHarness({playError:true}),s=h.create();assert.equal(await s.speak('مرحبا'),true);assert.equal(h.states.at(-1).state,'starting');assert.match(h.states.at(-1).detail,/المتصفح منع/);assert(h.player.src);s.dispose();const bad=speechHarness({loadError:true}),b=bad.create();assert.equal(await b.speak('مرحبا'),false);assert.equal(bad.states.at(-1).state,'error');assert.equal(bad.calls.play,0);assert.equal(bad.timers.size,0);b.dispose();
});
