'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {speechHarness}=require('./test-support.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
async function page(){
 const h=speechHarness({html:read('index.html')}),{window,document,context}=h;
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.options].find(o=>o.hasAttribute('selected'))?.value||this.options[0]?.value||''},set(v){for(const o of this.options){if(o.value===v)o.setAttribute('selected','');else o.removeAttribute('selected')}}});
 context.fetch=async()=>({ok:true,json:async()=>JSON.parse(read('knowledge.public.json')),text:async()=>read('../index.html')});vm.runInContext(read('malak-knowledge.js'),context);window.MalakKnowledge=context.MalakKnowledge;
 const append=document.head.append.bind(document.head);document.head.append=function(s){append(s);if(s.tagName==='SCRIPT'){vm.runInContext(read('../assets/content-data.js'),context);context.MHY_CONTENT=window.MHY_CONTENT;queueMicrotask(()=>s.onload());}};
 vm.runInContext(read('malak-preview.js'),context);await h.flushUntil(()=>document.querySelector('#status').textContent.includes('كتالوج محدث'));return h;
}
test('UI opens and answers from published catalog without native speech or eager model downloads',async()=>{
 const h=await page(),d=h.document;d.getElementById('open').click();assert.equal(d.getElementById('chat').hidden,false);d.querySelector('[data-q]').click();await h.flushUntil(()=>d.querySelector('.malak-listen'));assert.match(d.getElementById('messages').textContent,/العناصر المنشورة/);assert.equal(h.calls.loads,0);assert.equal(d.querySelectorAll('audio').length,1);assert.ok(!d.querySelector('.portrait img').hidden);d.getElementById('close').click();assert.equal(d.getElementById('chat').hidden,true);
});
test('listen generates Arabic; stop and close pause the player and revoke audio URLs',async()=>{
 const h=await page(),d=h.document;d.getElementById('open').click();d.querySelector('[data-q]').click();await h.flushUntil(()=>d.querySelector('.malak-listen'));d.querySelector('.malak-listen').click();await h.flushUntil(()=>h.calls.play===1);assert.equal(h.calls.synthesis[0][1],'ar');d.querySelector('.malak-voice-controls button').click();assert.equal(h.calls.pause,1);assert.equal(h.calls.revoked.length,1);d.querySelector('.malak-listen').click();await h.flushUntil(()=>h.calls.play===2);d.getElementById('close').click();assert.equal(h.calls.pause,2);assert.equal(h.calls.revoked.length,2);assert.equal(h.timers.size,0);
});
