/* Run with a locally installed linkedom: NODE_PATH=/path/to/node_modules node malak-preview/ui.test.cjs */
'use strict';
const {parseHTML,DOMParser}=require('linkedom');const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base='https://example.org/Mhyproduction/';
async function run(supported){
 const {window,document}=parseHTML(fs.readFileSync('malak-preview/index.html','utf8'));let calls=[],cancels=0,voiceListener;
 const voices=[{name:'Salma',lang:'ar-SA',voiceURI:'ar'},{name:'English',lang:'en-US',voiceURI:'en'}];
 const synth={getVoices:()=>voices,cancel(){cancels++},speak(u){calls.push(u)},addEventListener(e,f){voiceListener=f},removeEventListener(){}};
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.options].find(o=>o.hasAttribute('selected'))?.value||this.options[0]?.value||'';},set(v){for(const o of this.options){if(o.value===v)o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 const context={window,document,location:{href:base+'malak-preview/'},URL,DOMParser,console,setTimeout,clearTimeout,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:supported?synth:undefined};
 window.speechSynthesis=context.speechSynthesis;window.SpeechSynthesisUtterance=supported?context.SpeechSynthesisUtterance:undefined;
 context.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('malak-preview/knowledge.public.json')),text:async()=>fs.readFileSync('index.html','utf8')});
 vm.createContext(context);
 for(const file of ['malak-knowledge.js','malak-speech.js'])vm.runInContext(fs.readFileSync('malak-preview/'+file,'utf8'),context);
 window.MalakKnowledge=context.MalakKnowledge;window.MalakSpeech=context.MalakSpeech;
 const append=document.head.append.bind(document.head);document.head.append=function(s){append(s);if(s.tagName==='SCRIPT'){vm.runInContext(fs.readFileSync('assets/content-data.js','utf8'),context);context.MHY_CONTENT=window.MHY_CONTENT;queueMicrotask(()=>s.onload());}};
 vm.runInContext(fs.readFileSync('malak-preview/malak-preview.js','utf8'),context);
 const tick=()=>new Promise(r=>setTimeout(r,25));await tick();document.getElementById('open').click();await tick();
 assert.equal(document.getElementById('chat').hidden,false);
 document.querySelector('[data-q]').click();await tick();assert.match(document.getElementById('messages').textContent,/العناصر المنشورة/);
 if(supported){document.querySelector('.malak-listen').click();assert.equal(calls.length,1);assert.equal(calls[0].lang,'ar-SA');document.querySelector('.malak-voice-controls button').click();assert.ok(cancels>=2);document.getElementById('close').click();assert.equal(document.getElementById('chat').hidden,true);assert.ok(cancels>=3);voiceListener();}
 else assert.match(document.querySelector('.malak-voice-controls').textContent,/غير مدعوم/);
 assert.ok(!document.querySelector('.portrait img').hidden);console.log('UI simulation passed, speech support = '+supported);
}
run(true).then(()=>run(false)).catch(e=>{console.error(e);process.exitCode=1});
