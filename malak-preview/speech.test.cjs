'use strict';
const assert=require('node:assert/strict');const {createSpeech}=require('./malak-speech.js');
let voices=[],spoken=[],cancels=0,changed,states=[];
class Utterance{constructor(text){this.text=text;}}
const synth={getVoices:()=>voices,cancel(){cancels++},speak(u){spoken.push(u)},addEventListener(e,fn){changed=fn},removeEventListener(){}};
const speech=createSpeech({synth,Utterance,onState:s=>states.push(s)});
assert.equal(speech.speak('مرحبا'),false);assert.equal(states.at(-1).state,'missing');
voices=[{name:'Arabic Male',lang:'ar',voiceURI:'male',localService:true},{name:'Salma',lang:'ar-SA',voiceURI:'female'},{name:'English',lang:'en-US',voiceURI:'english'}];changed();
assert.equal(speech.choose('ar').name,'Salma');speech.select('male');assert.equal(speech.choose('ar').name,'Arabic Male');
speech.speak('أهلاً. كيفك؟',{rate:1.1,volume:.4});assert.equal(spoken[0].voice.voiceURI,'male');assert.equal(spoken[0].volume,.4);assert.equal(spoken[0].rate,1.1);
const old=spoken[0];speech.stop();old.onend();assert.equal(spoken.length,1);
speech.speak('Hello',{lang:'en'});assert.equal(spoken.at(-1).lang,'en-US');spoken.at(-1).onerror({error:'synthesis-failed'});assert.equal(states.at(-1).state,'error');
speech.speak('مرحبا');spoken.at(-1).onend();assert.equal(states.at(-1).state,'ended');assert.ok(cancels>=5);
const unavailable=createSpeech({synth:null,Utterance:null});assert.equal(unavailable.speak('Hi'),false);
console.log('Speech tests passed: delayed voices, Arabic fallback, female preference, manual choice, language, rate, volume, cancellation, completion, errors and unsupported browser.');
