/* Neural Arabic voice; processing runs in a dedicated worker. */
(function(g){'use strict';function createSpeech({onState=()=>{}}={}){
const voices=['F1','F2','F3','F4','F5'].map(v=>({voiceURI:v,name:'Supertonic female '+v,lang:'ar'}));let selected='F1',worker=null,busy=false,seq=0,active=0,timer=null,url=null,lastKey='';
const notify=(state,detail='')=>onState({state,detail,voices,supported:!!g.Worker});
const player=document.createElement('audio');player.controls=true;player.preload='auto';player.setAttribute('aria-label','مشغل صوت ملك');player.style.cssText='width:100%;height:48px;min-height:48px;flex-shrink:0';document.querySelector('.malak-voice-controls')?.after(player);
const show=document.createElement('div');show.style.cssText='padding:4px 12px;font-size:12px;color:#edcf89';show.textContent='الصوت الخلفي 4 — جاهز';player.before(show);
function status(state,text){show.textContent=text;notify(state,text);}
function stop(){seq++;active=0;player.pause();if(player.readyState)player.currentTime=0;status('stopped',busy?'أُوقف التشغيل المنتظر؛ المعالجة الحالية ستنتهي في الخلفية':'تم إيقاف الصوت');}
function reset(){if(worker)worker.terminate();worker=null;busy=false;clearTimeout(timer);}
function getWorker(){if(worker)return worker;worker=new Worker(new URL('malak-voice-worker.js',document.currentScript?.src||new URL('malak-preview/',location.href)),{type:'module'});
worker.onmessage=async({data:d})=>{if(d.type==='progress'){if(active)status('starting',d.detail);return;}clearTimeout(timer);busy=false;if(d.id!==active)return;
if(d.type==='error'){status('error',d.error);reset();return;}
if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([d.wav],{type:'audio/wav'}));player.src=url;player.load();status('starting','تم توليد الملف. اضغط ▶ إذا لم يبدأ تلقائياً');
try{await player.play();}catch{status('starting','الصوت جاهز؛ اضغط ▶ في المشغّل');}};
worker.onerror=e=>{status('error','فشل عامل الصوت: '+(e.message||'تعذّر بدء المحرّك'));reset();};return worker;}
player.onplaying=()=>status('speaking','الصوت يعمل');player.onended=()=>status('ended','انتهى تشغيل الصوت');player.onerror=()=>status('error','تعذّر قراءة الملف الصوتي');
function speak(text,{lang='ar',rate=.9,volume=1}={}){if(lang==='en'||!/[\u0600-\u06ff]/.test(text)){status('missing','الصوت العربي فقط حالياً');return false;}
if(busy){status('starting','المعالجة جارية؛ لا حاجة للضغط مجدداً');return false;}player.pause();active=++seq;
player.volume=Math.max(0,Math.min(1,Number(volume)));const key=selected+'|'+rate+'|'+text;
if(url&&lastKey===key){player.currentTime=0;player.play().catch(()=>status('starting','اضغط ▶ في المشغّل'));return true;}
lastKey=key;busy=true;status('starting','بدء التحميل والتهيئة في الخلفية');
try{getWorker().postMessage({id:active,text:String(text),voice:selected,rate:Math.max(.7,Math.min(1.3,Number(rate)||.9))});timer=setTimeout(()=>{active=0;reset();lastKey='';status('error','تجاوزت تهيئة الصوت 3 دقائق. توقفت المحاولة لتحرير الذاكرة؛ لم يُنتج ملف صوت.');},180000);return true;}catch(e){reset();status('error',e.message);return false;}}
notify('ready','الصوت الخلفي 4');return {supported:!!g.Worker,speak,stop,refresh(){return voices},select(v){if(voices.some(x=>x.voiceURI===v))selected=v;},choose(){return voices.find(v=>v.voiceURI===selected)},dispose(){stop();reset();if(url)URL.revokeObjectURL(url);player.remove();show.remove();}};}
g.MalakSpeech={createSpeech};})(globalThis);