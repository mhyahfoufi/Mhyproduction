(()=>{'use strict';const root=document.getElementById('chat'),launch=document.getElementById('open'),close=document.getElementById('close'),log=document.getElementById('messages'),input=document.getElementById('question'),status=document.getElementById('status');let kb=null;
// Optional local text-to-speech. Voice availability and gender depend on Android/browser.
const speechAvailable='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let selectedVoice=null;
function chooseVoice(){
 if(!speechAvailable)return null;
 const voices=window.speechSynthesis.getVoices();
 const arabic=voices.filter(v=>/^ar(?:-|_)/i.test(v.lang));
 const femaleHint=/(female|woman|zira|hoda|salma|laila|layla|mariam|amira|sara|noura|nora)/i;
 selectedVoice=arabic.find(v=>femaleHint.test(v.name))||arabic.find(v=>v.localService)||arabic[0]||null;
 return selectedVoice;
}
if(speechAvailable){chooseVoice();window.speechSynthesis.addEventListener?.('voiceschanged',chooseVoice);}
const voiceBar=document.createElement('div');voiceBar.className='malak-voice-controls';
const voiceLabel=document.createElement('span');voiceLabel.textContent='الصوت اختياري';
const stopVoice=document.createElement('button');stopVoice.type='button';stopVoice.textContent='■ إيقاف الصوت';stopVoice.disabled=!speechAvailable;
stopVoice.addEventListener('click',()=>{if(speechAvailable)window.speechSynthesis.cancel()});
voiceBar.append(voiceLabel,stopVoice);
const chips=document.querySelector('.chips');chips?.parentNode.insertBefore(voiceBar,chips);
if(!speechAvailable)voiceLabel.textContent='الصوت غير مدعوم في هذا المتصفح';
function speak(text){
 if(!speechAvailable)return;
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 const v=chooseVoice();if(v)utterance.voice=v;
 utterance.lang=v?.lang||'ar-SA';utterance.rate=0.9;utterance.pitch=1;utterance.volume=1;
 utterance.onerror=()=>{voiceLabel.textContent='تعذّر تشغيل الصوت على هذا الجهاز'};
 window.speechSynthesis.speak(utterance);
}
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0300-\u036fـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();const en=s=>/[a-z]/i.test(s)&&!/[\u0600-\u06ff]/.test(s);function toggle(v){if(!v&&speechAvailable)window.speechSynthesis.cancel();root.hidden=!v;launch.setAttribute('aria-expanded',String(v));if(v)input.focus();else launch.focus()}launch.addEventListener('click',()=>toggle(root.hidden));close.addEventListener('click',()=>toggle(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden)toggle(false)});function add(s,cls,links=[]){const p=document.createElement('p');p.className=cls;p.textContent=s;log.append(p);if(cls==='bot'&&speechAvailable){const listen=document.createElement('button');listen.type='button';listen.className='malak-listen';listen.textContent='🔊 استماع';listen.setAttribute('aria-label','استمع إلى إجابة ملك');listen.addEventListener('click',()=>speak(s));p.append(document.createTextNode(' '),listen);}if(links.length){const div=document.createElement('div');div.className='links';for(const l of links){if(!l||typeof l.url!=='string')continue;let u;try{u=new URL(l.url,location.href)}catch{continue}if(!['https:','http:','mailto:','tel:'].includes(u.protocol))continue;const a=document.createElement('a');a.href=u.href;a.textContent=l.label||'Open';a.target='_blank';a.rel='noopener noreferrer';div.append(a)}log.append(div)}while(log.children.length>45)log.firstElementChild.remove();log.scrollTop=log.scrollHeight}function answer(q){const result=window.MalakKnowledge.answer(kb,q);return [result.text,result.links]}let identity=null;
const base=new URL('../',location.href).href;
let pending=Promise.resolve();
async function refresh(){
 kb=null;
 try{
  if(!identity){const r=await fetch('knowledge.public.json?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Identity');identity=await r.json();if(typeof identity.name!=='string'||typeof identity.greetingAr!=='string')throw Error('Identity');const greeting=log.querySelector('.bot');if(greeting)greeting.textContent=identity.greetingAr;}
  const data=await window.MalakKnowledge.loadCatalog(document,base);
  // Read public studio/contact text from the current homepage, not a second data file.
  let site={};
  try{const r=await fetch(new URL('index.html?malak_refresh='+Date.now(),base),{cache:'no-store'});if(r.ok){const doc=new DOMParser().parseFromString(await r.text(),'text/html');site.studio={descriptionAr:doc.querySelector('#about p[data-ar]')?.textContent,descriptionEn:doc.querySelector('#about p[data-en]')?.textContent};site.contacts=[...doc.querySelectorAll('#contact a[href]')].map(a=>({label:a.textContent.trim(),url:new URL(a.getAttribute('href'),base).href})).filter(x=>/^(https?:|mailto:|tel:)/.test(x.url));}}catch{}
  kb=window.MalakKnowledge.build(data,identity,base,site);
  status.textContent='كتالوج محدث • أعمال منشورة فقط • منع الحرق مفعّل';
 }catch{kb=null;status.textContent='تعذّر تحديث الكتالوج. لا تُستخدم معلومات قديمة؛ حاول مجدداً.';}
}
function ask(q){q=String(q||'').trim().slice(0,180);if(!q)return;add(q,'user');input.value='';pending=pending.then(async()=>{await refresh();const [message,links]=answer(q);add(message,'bot',links);}).catch(()=>{kb=null;});input.focus();}
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.q)));
pending=refresh();
})();
