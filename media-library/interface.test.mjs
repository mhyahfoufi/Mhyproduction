import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as catalogModule from './catalog.mjs';
import * as sectionModule from './sections.mjs';
import * as preferenceModule from './preferences.mjs';

// In-memory DOM integration tests. No browser, network, storage service or live writes.
class Storage {
 data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]}
 getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,String(v))}removeItem(k){this.data.delete(k)}
}
class Element {
 children=[];dataset={};attributes={};events=new Map();value='';checked=false;_text='';
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.currentTime=0;this.duration=120;this.ended=false;this.playCalls=0}
 set textContent(s){this._text=String(s);this.children=[]}get textContent(){return this._text+this.children.map(x=>typeof x==='string'?x:x.textContent).join('')}
 set href(s){this.attributes.href=s}get href(){return new URL(this.attributes.href||'',this.doc.context.location.href).href}
 set className(s){this.attributes.class=s}get className(){return this.attributes.class||''}
 append(...nodes){for(const n of nodes){if(typeof n!=='string')n.parent=this;this.children.push(n)}}
 prepend(...nodes){for(const n of nodes)if(typeof n!=='string')n.parent=this;this.children.unshift(...nodes)}
 replaceChildren(...nodes){this._text='';this.children=[];this.append(...nodes)}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null}
 setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}
 closest(tag){return this.tagName===tag.toUpperCase()?this:this.parent?.closest(tag)||null}
 addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn)}
 emit(name){for(const fn of this.events.get(name)||[])fn({target:this})}
 pause(){}play(){this.playCalls++;return Promise.resolve()}
 click(){const e={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};for(const fn of this.doc.events.get('click')||[])fn(e);if(!e.defaultPrevented){this.onclick?.(e);if(this.tagName==='A')this.doc.context.location.hash=new URL(this.href).hash}}
}
const UUID_WORK='11111111-1111-1111-1111-111111111111';
const UUID_VIDEO='22222222-2222-2222-2222-222222222222';
const remoteVideo=[{id:UUID_WORK,kind:'work',title:'Published video',status:'published',categories:['films']},{id:UUID_VIDEO,kind:'media',workId:UUID_WORK,title:'Original video',status:'published',categories:['films'],verified:true,ext:'mp4'}];
async function page({url='https://preview.example/media-library/',remote=[],failure=false,local=new Storage(),session=new Storage()}={}){
 const events=new Map(),frames=[];let context,currentURL=new URL(url);
 const doc={events:new Map(),nodes:[],createElement(tag){return new Element(tag,this)},documentElement:{},querySelector(s){return this.nodes.find(x=>x.id===s.slice(1))||null},addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn)}};
 function descendants(){const all=[];function walk(n){all.push(n);for(const c of n.children)if(typeof c!=='string')walk(c)}for(const n of doc.nodes)walk(n);return all}
 doc.querySelectorAll=selector=>{
  const all=descendants();if(selector==='[data-ar]')return all.filter(n=>n.dataset.ar!==undefined);
  if(selector==='[data-resume]')return all.filter(n=>n.dataset.resume!==undefined);
  if(selector==='.watch-choice input')return all.filter(n=>n.tagName==='INPUT'&&n.parent?.className==='watch-choice');
  return all.filter(n=>selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.tagName===selector.toUpperCase());
 };
 for(const id of ['content','crumb','catalog-status','library-search','language','back']){const n=doc.createElement(id==='library-search'?'input':'div');n.id=id;doc.nodes.push(n)}
 const location={get href(){return currentURL.href},get hash(){return currentURL.hash},get origin(){return currentURL.origin},set hash(value){const next=new URL(currentURL);next.hash=value;if(next.href===currentURL.href)return;currentURL=next;context.scrollY=0;emit('scroll');emit('hashchange')}};
 function emit(name){for(const fn of events.get(name)||[])fn()}
 const history={scrollRestoration:'auto',state:null,replaceState(state,unused,url){this.state=state;currentURL=new URL(url,currentURL)}};
 context={document:doc,location,history,localStorage:local,sessionStorage:session,scrollY:0,URL,AbortSignal,Date,console,...catalogModule,...sectionModule,...preferenceModule,
  fetch:async()=>{if(failure)throw Error('Offline fixture');return {ok:true,json:async()=>({items:remote})}},
  requestAnimationFrame(fn){frames.push(fn)},scrollTo(x,y){context.scrollY=y;emit('scroll')}};
 context.window=context;context.addEventListener=(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn)};doc.context=context;
 vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../assets/content-data.js',import.meta.url),'utf8'),context);
 vm.runInContext(readFileSync(new URL('../assets/library-index.js',import.meta.url),'utf8'),context);
 const source=readFileSync(new URL('./cinema.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/load\(\);\s*$/,'globalThis.ready=load();');
 vm.runInContext(source,context);await context.ready;
 const flush=()=>{while(frames.length){const next=frames.splice(0);for(const fn of next)fn()}};flush();
 return {doc,context,flush,local,session,all:descendants,emit,root:doc.querySelector('#content'),search:doc.querySelector('#library-search'),go(hash){location.hash=hash;flush()},scroll(y){context.scrollY=y;emit('scroll')},query(value){this.search.value=value;this.search.oninput();flush()}};
}
test('interface renders exactly ten illustrated section links and latest additions',async()=>{const p=await page();assert.equal(p.doc.querySelectorAll('.section-card').length,10);assert(p.root.textContent.includes('أحدث الإضافات'));for(const n of p.doc.querySelectorAll('.section-card'))assert(n.children.some(x=>x.tagName==='IMG'))});
test('global Arabic alias search returns one canonical work and works from inside a section',async()=>{const p=await page({url:'https://preview.example/media-library/#gallery/legacy-gallery'});p.query('القَرار مستحيل');assert.equal(p.context.location.hash,'');const cards=p.doc.querySelectorAll('.card');assert.equal(cards.length,1);assert(cards[0].href.endsWith('#films/al-qarar-al-mustahil'))});
test('library home clears search from results and from a work detail',async()=>{const p=await page();p.query('القرار');let a=p.doc.createElement('a');a.href='#';a.click();p.flush();assert.equal(p.search.value,'');assert(!new URL(p.context.location.href).searchParams.has('q'));assert.equal(p.doc.querySelectorAll('.section-card').length,10);p.query('القرار');p.go('#films/al-qarar-al-mustahil');const home=p.doc.querySelector('#crumb').children.find(x=>x.tagName==='A');home.click();p.flush();assert.equal(p.context.location.hash,'');assert.equal(p.doc.querySelectorAll('.section-card').length,10)});
test('canonical work provides cross-section links; series shows both season and episode numbers',async()=>{const p=await page({url:'https://preview.example/media-library/#films/al-qarar-al-mustahil'});const related=p.doc.querySelectorAll('.related')[0];assert(related.children.some(a=>a.href.endsWith('#trailers/al-qarar-al-mustahil')));p.go('#series/the-signature-universe');const labels=p.doc.querySelectorAll('.episode-label').map(x=>x.textContent);assert.deepEqual(labels,['الموسم 1 · الحلقة 1','الموسم 1 · الحلقة 2'])});
test('gateway failure preserves legacy works and exposes retry instead of losing content',async()=>{const p=await page({failure:true,url:'https://preview.example/media-library/#films/al-qarar-al-mustahil'});assert(p.root.textContent.includes('القرار المستحيل'));assert(p.doc.querySelector('#catalog-status').textContent.includes('إعادة المحاولة'))});
test('published UUID works without media remain searchable and link to their existing identity',async()=>{const p=await page({remote:[{id:UUID_WORK,kind:'work',title:'إعلان الصفحة',categories:['studio-music'],status:'published'}]});p.query('إعلان الصفحة');const links=p.doc.querySelectorAll('.card');assert.equal(links.length,1);assert(links[0].href.endsWith('#trailers/'+UUID_WORK))});
test('revoking playback consent removes resume controls, stops future writes and keeps unrelated data',async()=>{const local=new Storage();local.setItem(preferenceModule.RESUME_CONSENT,'yes');local.setItem('unrelated','preserve');preferenceModule.saveResume(local,UUID_VIDEO,35);const p=await page({url:'https://preview.example/media-library/#films/'+UUID_WORK,remote:remoteVideo,local});const player=p.doc.querySelectorAll('video')[0];player.emit('loadedmetadata');const resume=p.doc.querySelectorAll('[data-resume]')[0];assert(resume);const box=p.doc.querySelectorAll('.watch-choice input')[0];box.checked=false;box.onchange();assert.equal(p.doc.querySelectorAll('[data-resume]').length,0);assert.equal(local.getItem(preferenceModule.RESUME_PREFIX+UUID_VIDEO),null);resume.onclick();assert.equal(player.playCalls,0);player.currentTime=45;player.emit('timeupdate');assert.equal(local.getItem(preferenceModule.RESUME_PREFIX+UUID_VIDEO),null);assert.equal(local.getItem('unrelated'),'preserve')});
test('native fragment navigation does not overwrite previous scroll; same-tab reload restores it',async()=>{const session=new Storage();const p=await page({url:'https://preview.example/media-library/#gallery/legacy-gallery',session});p.scroll(1450);p.go('#gallery');p.go('#gallery/legacy-gallery');assert.equal(p.context.scrollY,1450);p.emit('pagehide');const reloaded=await page({url:'https://preview.example/media-library/#gallery/legacy-gallery',session});assert.equal(reloaded.context.scrollY,1450)});
