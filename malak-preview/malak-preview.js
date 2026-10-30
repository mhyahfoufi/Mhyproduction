(()=>{'use strict';const root=document.getElementById('chat'),launch=document.getElementById('open'),close=document.getElementById('close'),log=document.getElementById('messages'),input=document.getElementById('question'),status=document.getElementById('status');let kb=null;const conversation={};
// Speech stays optional and is started only by a user button.
const voiceBar=document.createElement('div');voiceBar.className='malak-voice-controls';
const voiceLabel=document.createElement('span');voiceLabel.setAttribute('role','status');
const voiceSelect=document.createElement('select');voiceSelect.setAttribute('aria-label','اختيار الصوت / Select voice');
const rateInput=document.createElement('input');rateInput.type='range';rateInput.min='.6';rateInput.max='1.3';rateInput.step='.05';rateInput.value='.9';rateInput.setAttribute('aria-label','سرعة الكلام / Speech rate');
const volumeInput=document.createElement('input');volumeInput.type='range';volumeInput.min='0';volumeInput.max='1';volumeInput.step='.1';volumeInput.value='1';volumeInput.setAttribute('aria-label','مستوى الصوت / Volume');
const stopVoice=document.createElement('button');stopVoice.type='button';stopVoice.textContent='⏹ إيقاف / Stop';
function labelled(text,node){const label=document.createElement('label');label.append(text,node);return label;}
voiceBar.append(voiceLabel,voiceSelect,labelled('السرعة / Rate',rateInput),labelled('الصوت / Volume',volumeInput),stopVoice);
const chips=document.querySelector('.chips');chips?.parentNode.insertBefore(voiceBar,chips);
const speech=window.MalakSpeech.createSpeech({onState({state,detail,voices,supported}){
 stopVoice.disabled=!supported;
 const previous=voiceSelect.value;
 if(['ready','unsupported'].includes(state)){
  voiceSelect.replaceChildren();const auto=document.createElement('option');auto.value='';auto.textContent='اختيار تلقائي / Automatic';voiceSelect.append(auto);
  for(const v of voices){const o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' ('+v.lang+')';voiceSelect.append(o);}voiceSelect.value=previous;voiceSelect.disabled=!supported;
 }
 const arabic=voices.some(v=>/^ar(?:[-_]|$)/i.test(v.lang));
 voiceLabel.textContent=state==='unsupported'?'النطق غير مدعوم في هذا المتصفح / Speech unavailable':state==='missing'?'لا يوجد صوت للغة الإجابة على الجهاز. اختر صوتاً مناسباً من إعدادات النطق وأعد المحاولة. / No matching device voice.':state==='error'?'تعذّر النطق / Speech error: '+detail:state==='speaking'?'جارٍ الاستماع / Speaking: '+detail:!arabic?'لا تظهر أصوات عربية على الجهاز؛ لن نثبتها تلقائياً. / No Arabic device voices.':'الصوت اختياري • أنثوي إن توفر / Optional device speech';
}});
const speechAvailable=speech.supported;
voiceSelect.addEventListener('change',()=>speech.select(voiceSelect.value));
stopVoice.addEventListener('click',()=>speech.stop());
function speak(text){speech.speak(text,{lang:/[\u0600-\u06ff]/.test(text)?'ar':'en',rate:rateInput.value,volume:volumeInput.value});}
window.addEventListener('pagehide',()=>speech.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)speech.stop();});
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0300-\u036fـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();const en=s=>/[a-z]/i.test(s)&&!/[\u0600-\u06ff]/.test(s);function toggle(v){if(!v)speech.stop();root.hidden=!v;launch.setAttribute('aria-expanded',String(v));if(v){input.focus();pending=pending.then(refresh);}else launch.focus()}launch.addEventListener('click',()=>toggle(root.hidden));close.addEventListener('click',()=>toggle(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden)toggle(false)});function add(s,cls,links=[]){const p=document.createElement('p');p.className=cls;p.textContent=s;log.append(p);if(cls==='bot'&&speechAvailable){const listen=document.createElement('button');listen.type='button';listen.className='malak-listen';listen.textContent='🔊 استماع / Listen';listen.setAttribute('aria-label','استمع إلى إجابة ملك');listen.addEventListener('click',()=>speak(s));p.append(document.createTextNode(' '),listen);}if(links.length){const div=document.createElement('div');div.className='links';for(const l of links){if(!l||typeof l.url!=='string')continue;let u;try{u=new URL(l.url,location.href)}catch{continue}if(!['https:','http:','mailto:','tel:'].includes(u.protocol))continue;const a=document.createElement('a');a.href=u.href;a.textContent=l.label||'Open';a.target='_blank';a.rel='noopener noreferrer';div.append(a)}log.append(div)}while(log.children.length>45)log.firstElementChild.remove();log.scrollTop=log.scrollHeight}function answer(q){const result=window.MalakKnowledge.answer(kb,q,conversation);return [result.text,result.links]}let identity=null;
const base=new URL('../',location.href).href;
let pending=Promise.resolve();
async function refresh(){
 kb=null;
 try{
  if(!identity){const r=await fetch('knowledge.public.json?refresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Identity');identity=await r.json();if(typeof identity.name!=='string'||typeof identity.greetingAr!=='string')throw Error('Identity');const greeting=log.querySelector('.bot');if(greeting&&greeting.textContent==='…')greeting.textContent=identity.greetingAr;}
  const data=await window.MalakKnowledge.loadCatalog(document,base);
  // Read public studio/contact text from the current homepage, not a second data file.
  let site={};
  try{const r=await fetch(new URL('index.html?malak_refresh='+Date.now(),base),{cache:'no-store'});if(r.ok){const doc=new DOMParser().parseFromString(await r.text(),'text/html');site.studio={descriptionAr:doc.querySelector('#about p[data-ar]')?.textContent,descriptionEn:doc.querySelector('#about p[data-en]')?.textContent};site.contacts=[...doc.querySelectorAll('#contact a[href]')].map(a=>({label:a.textContent.trim(),url:new URL(a.getAttribute('href'),base).href})).filter(x=>/^(https?:|mailto:|tel:)/.test(x.url));}}catch{}
  kb=window.MalakKnowledge.build(data,identity,base,site);
  status.textContent='كتالوج محدث • أعمال منشورة فقط • منع الحرق مفعّل';
 }catch{kb=null;status.textContent='تعذّر تحديث الكتالوج. لا تُستخدم معلومات قديمة؛ حاول مجدداً.';}
}
function ask(q){q=String(q||'').trim().slice(0,180);if(!q)return;add(q,'user');input.value='';pending=pending.then(async()=>{await refresh();const [message,links]=answer(q);add(message,'bot',links);}).catch(()=>{kb=null;add('صار عطل مؤقت. جرّب سؤالك مرة تانية.','bot');});input.focus();}
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.q)));
pending=refresh();
})();
