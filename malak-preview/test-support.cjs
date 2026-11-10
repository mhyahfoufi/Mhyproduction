'use strict';
// Real speech/UI source with simulated neural runtime and media playback. No model or audible-playback claim.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {parseHTML,DOMParser}=require('linkedom');
function speechHarness(options={}){
 const {window,document}=parseHTML(options.html||'<html><body><div class="malak-voice-controls"></div></body></html>');
 const calls={loads:0,styles:[],synthesis:[],play:0,pause:0,revoked:[]},states=[],timers=new Set();
 const create=document.createElement.bind(document);let player;
 document.createElement=function(tag){const e=create(tag);if(tag==='audio'){player=e;e.load=()=>{};e.pause=()=>calls.pause++;e.play=async()=>{calls.play++;if(options.playError)throw Error('Autoplay denied');};}return e;};
 class MediaURL extends URL{};MediaURL.createObjectURL=()=> 'blob:mock-neural-audio';MediaURL.revokeObjectURL=u=>calls.revoked.push(u);
 const context=vm.createContext({window,document,DOMParser,URL:MediaURL,Blob,console,setTimeout,clearTimeout,setInterval(fn){timers.add(fn);return fn},clearInterval(fn){timers.delete(fn)},location:{href:'https://example.org/Mhyproduction/malak-preview/'}});
 const mock={async loadTextToSpeech(){calls.loads++;if(options.loadError)throw Error('Model unavailable');return {textToSpeech:{sampleRate:100,async call(...args){calls.synthesis.push(args);return options.generate?options.generate():{wav:new Float32Array(10),duration:[.1]};}}};},async loadVoiceStyle(urls){calls.styles.push(urls[0]);return {mockStyle:urls[0]}},writeWavFile(){return new Uint8Array([82,73,70,70])}};
 const module=new vm.SyntheticModule(Object.keys(mock),function(){for(const [k,v]of Object.entries(mock))this.setExport(k,v)},{context});
 new vm.Script(fs.readFileSync(path.join(__dirname,'malak-speech.js'),'utf8'),{filename:'malak-speech.js',importModuleDynamically:async spec=>{if(spec!=='./supertonic-runtime.js')throw Error('Unexpected import');if(module.status==='unlinked')await module.link(()=>{});if(module.status==='linked')await module.evaluate();return module;}}).runInContext(context);window.MalakSpeech=context.MalakSpeech;
 return {window,document,context,calls,states,timers,get player(){return player},create(){return context.MalakSpeech.createSpeech({onState:s=>states.push(s)})},async flushUntil(predicate){for(let n=0;n<40&&!predicate();n++)await new Promise(r=>setImmediate(r));if(!predicate())throw Error('Expected asynchronous operation did not occur');}};
}
module.exports={speechHarness};
