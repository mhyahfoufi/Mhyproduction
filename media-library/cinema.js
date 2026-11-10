import {mountLibraryAudience} from './audience.mjs?v=staged-1';
import {publicBase,mergeCatalog} from './catalog.mjs?v=restore-2';
import {sections,sectionOf,categoriesFor,normalizeSearch} from './sections.mjs';
import {RESUME_CONSENT,RESUME_PREFIX,readResume,clearResume,saveResume,latestWorks} from './preferences.mjs';
const legacy=window.MHY_CONTENT||{},index=window.MHY_LIBRARY_INDEX||{};
let catalog=mergeCatalog(legacy,[],index),lang='ar',loadState='loading',current=location.hash,query=new URL(location.href).searchParams.get('q')||'';
const root=document.querySelector('#content'),crumb=document.querySelector('#crumb'),status=document.querySelector('#catalog-status'),search=document.querySelector('#library-search');
const t=(ar,en)=>lang==='ar'?ar:en,title=o=>t(o.titleAr,o.titleEn)||o.titleAr||o.titleEn||o.title||'';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
const link=(text,href)=>{const a=el('a',text);a.href=href;return a};
const route=(...parts)=>'#'+parts.filter(Boolean).map(encodeURIComponent).join('/');
function safeURL(src){try{const u=new URL(src,location.href);return (u.protocol==='https:'||(u.protocol==='http:'&&u.origin===location.origin))&&!u.username&&!u.password?u.href:null}catch{return null}}
function image(src,alt=''){
 if(!src)return null;if(/^(images|assets)\//.test(src))src='../'+src;src=safeURL(src);if(!src)return null;
 const im=el('img');im.src=src;im.alt=alt;im.loading='lazy';im.onerror=()=>im.remove();return im;
}
function card(o,href,cover){
 const a=link('',href);a.className='card';const poster=el('div','','poster'),im=image(cover);
 if(im)poster.append(im);else poster.append(el('span','MHY','symbol'));
 a.append(poster,el('h2',title(o)));if(o.titleAr&&o.titleEn)a.append(el('p',lang==='ar'?o.titleEn:o.titleAr));return a;
}
function sectionCard(s){
 const a=link('',route(s.id));a.className='section-card';const im=image(s.cover);if(im)a.append(im);
 a.append(el('span',s.number,'number'));const label=el('div','','section-label');label.append(el('h2',s.ar),el('p',s.en));a.append(label);return a;
}
function youtubeId(value){try{const u=new URL(value);if(!['www.youtube.com','youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))return null;const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').pop();return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}}
let dispose=[];
function resume(player,id,parent){
 const label=el('label','','watch-choice'),box=el('input');box.type='checkbox';try{box.checked=localStorage.getItem(RESUME_CONSENT)==='yes'}catch{}
 label.append(box,el('span',t('حفظ موضع المشاهدة على هذا الجهاز — اختياري','Save playback position on this device — optional')));parent.append(label);
 box.onchange=()=>{
  try{if(box.checked)localStorage.setItem(RESUME_CONSENT,'yes');else clearResume(localStorage)}catch{}
  document.querySelectorAll('.watch-choice input').forEach(x=>x.checked=box.checked);
  if(!box.checked)document.querySelectorAll('[data-resume]').forEach(b=>b.remove());
 };
 player.addEventListener('loadedmetadata',()=>{try{const p=readResume(localStorage,id,player.duration);if(p!==null){const b=el('button',t('استكمال المشاهدة من ','Resume from ')+Math.floor(p/60)+':'+String(Math.floor(p%60)).padStart(2,'0'));b.type='button';b.dataset.resume='1';b.onclick=()=>{try{if(localStorage.getItem(RESUME_CONSENT)!=='yes'){b.remove();return}}catch{b.remove();return}player.currentTime=p;player.play().catch(()=>{});b.remove()};parent.append(b)}}catch{}});
 let last=0;const remember=()=>{if(Date.now()-last<5000)return;last=Date.now();try{saveResume(localStorage,id,player.currentTime)}catch{}};
 player.addEventListener('timeupdate',remember);player.addEventListener('ended',()=>{try{localStorage.removeItem(RESUME_PREFIX+id)}catch{}});
 dispose.push(()=>{try{if(!player.ended)saveResume(localStorage,id,player.currentTime)}catch{}player.pause()});
}
function media(i){
 const a=el('article','','media');a.dataset.recordId=i.id;
 a.append(el('p',i.source==='external'?t('مصدر خارجي','External source'):i.source==='r2'?t('ملف MHY أصلي · R2','Original MHY file · R2'):t('ملف MHY أصلي · الموقع','Original MHY file · Site'),'source'),el('h3',title(i)));
 if(i.season&&i.episode)a.append(el('p',t('الموسم','Season')+' '+i.season+' · '+t('الحلقة','Episode')+' '+i.episode,'episode-label'));
 if(i.description||i.descriptionAr)a.append(el('p',i.description||t(i.descriptionAr,i.descriptionEn)));
 if(i.source==='external'){
  const id=youtubeId(i.youtubeUrl||i.url);if(id){const b=el('button',t('تشغيل','Play'));b.type='button';b.onclick=()=>{const f=el('iframe');f.title=title(i);f.src='https://www.youtube-nocookie.com/embed/'+id;f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';a.prepend(f);b.remove()};a.append(b)}
  const u=safeURL(i.youtubeUrl||i.url);if(u){const l=link(t('فتح المصدر الأصلي','Open original source'),u);l.target='_blank';l.rel='noopener noreferrer';a.append(l)}
 }else if(i.kind==='image'){const im=image(i.image||i.src,title(i));if(im)a.append(im)}
 else if(['video','audio'].includes(i.kind)&&safeURL(i.src)){
  const p=el(i.kind);p.controls=true;p.preload='metadata';p.src=safeURL(i.src);if(i.kind==='video'){p.playsInline=true;resume(p,i.id,a)}
  p.onerror=()=>a.append(el('p',t('تعذّر تحميل الملف. حاول لاحقاً.','Unable to load media. Please try again.')));a.prepend(p);
 }
 if(i.source==='r2'&&i.allowDownload)a.append(link(t('تحميل','Download'),i.src+'?download=1'));const share=new URL(location.href);share.searchParams.delete('q');dispose.push(mountLibraryAudience(a,{item:i,mediaElement:a.querySelector('video,audio,img'),shareUrl:share.href,language:lang}));return a;
}
function inSection(i,category){return category==='external'?i.source==='external':category==='soon'?false:categoriesFor(category).some(c=>i.categories.includes(c))}
function workInSection(w,category){return categoriesFor(category).some(c=>(w.categories||[]).includes(c))}
function matches(work,item){const q=normalizeSearch(query);return !q||[work?.titleAr,work?.titleEn,...(work?.aliases||[]),item?.titleAr,item?.titleEn].some(s=>normalizeSearch(s).includes(q))}
function coverOf(w,items){return w.cover||items.find(i=>i.role==='cover'&&i.kind==='image')?.src||items.find(i=>i.cover)?.cover}
function addWorkGrid(items,category){
 const g=el('div','','grid');const ids=new Set([...items.map(i=>i.workId),...Array.from(catalog.works.values()).filter(w=>workInSection(w,category)&&matches(w)).map(w=>w.id)]);
 for(const id of ids){const w=catalog.works.get(id);if(!w)continue;g.append(card(w,route(category,id),coverOf(w,items.filter(i=>i.workId===id))))}root.append(g);return g;
}
function render(){
 for(const fn of dispose)fn();dispose=[];
 document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.querySelector('#language').textContent=t('English','العربية');document.querySelectorAll('[data-ar]').forEach(n=>n.textContent=n.dataset[lang]);
 search.placeholder=t('ابحث باسم العمل، الحلقة أو العنوان…','Search works, episodes or titles…');root.replaceChildren();crumb.replaceChildren();status.replaceChildren();
 if(loadState==='loading')status.textContent=t('جارٍ تحميل الأعمال المنشورة…','Loading published works…');
 if(loadState==='failed'){status.textContent=t('تعذّر تحديث المكتبة الآن. الأعمال السابقة متاحة؛ ','Unable to refresh the library. Existing works remain available; ');const retry=el('button',t('إعادة المحاولة','Retry'));retry.onclick=load;status.append(retry)}
 let parts;try{parts=location.hash.slice(1).split('/').map(decodeURIComponent)}catch{parts=[]}
 const [rawCategory,rawWork,folderId]=parts,category=sectionOf(rawCategory),workId=catalog.workAliases.get(rawWork)||rawWork,cat=sections.find(c=>c.id===category);
 const aliasFilter=['studio-music','studio-videos'].includes(rawCategory)?rawCategory:null;
 if(!cat){
  if(query){root.append(el('h2',t('نتائج البحث','Search results'),'results-title'));const results=catalog.items.filter(i=>matches(catalog.works.get(i.workId),i));const grid=el('div','','grid');for(const id of new Set([...results.map(i=>i.workId),...Array.from(catalog.works.values()).filter(w=>matches(w)).map(w=>w.id)])){const w=catalog.works.get(id),items=results.filter(i=>i.workId===id),section=sectionOf(items[0]?.categories[0]||w.categories?.[0]);if(sections.some(s=>s.id===section))grid.append(card(w,route(section,id),coverOf(w,items)))}root.append(grid);if(!grid.children.length)root.append(el('p',t('لا توجد نتائج مطابقة','No matching results'),'empty'));return}
  const g=el('div','','section-grid');for(const s of sections)g.append(sectionCard(s));root.append(g);
  root.append(el('h2',t('أحدث الإضافات','Latest additions'),'results-title'));const latest=latestWorks(catalog.items);if(!latest.dated)root.append(el('p',t('حسب ترتيب الفهرس؛ تواريخ نشر الأعمال القديمة غير موثقة.','By catalog order; original publication dates are undocumented.'),'muted'));
  const recent=el('div','','grid latest-grid');for(const i of latest.items){const w=catalog.works.get(i.workId);recent.append(card(w,route(sectionOf(i.categories[0]),i.workId),coverOf(w,catalog.items.filter(x=>x.workId===i.workId))))}root.append(recent);return;
 }
 crumb.append(link(t('المكتبة','Library'),'#'),el('span','/'),link(t(cat.ar,cat.en),route(category)));
 if(aliasFilter)root.append(el('p',aliasFilter==='studio-music'?t('إعلانات الصفحة','Studio advertisements'):t('فيديوهات الاستوديو الترويجية','Studio promotional videos'),'source'));
 if(category==='soon'){root.append(el('p',t('تُضاف الأعمال القادمة بعد اعتماد أغلفتها وحالة إنتاجها.','Upcoming works appear after cover and production status approval.'),'empty'));return}
 let list=catalog.items.filter(i=>inSection(i,category)&&(!aliasFilter||i.categories.includes(aliasFilter)));
 if(!workId){list=list.filter(i=>matches(catalog.works.get(i.workId),i));const g=addWorkGrid(list,aliasFilter||category);if(!g.children.length)root.append(el('p',t('لا توجد أعمال منشورة مطابقة حالياً.','No matching published works yet.'),'empty'));return}
 const work=catalog.works.get(workId);let rows=list.filter(i=>i.workId===workId);
 if(!work||(!rows.length&&!workInSection(work,aliasFilter||category))){root.append(el('p',t('لا توجد أعمال منشورة هنا حالياً.','No published works here yet.'),'empty'));return}
 crumb.append(el('span','/'),link(title(work),route(rawCategory,workId)));root.append(el('h2',title(work)));
 const related=el('nav','','related');related.setAttribute('aria-label',t('أقسام هذا العمل','Sections for this work'));
 for(const s of sections)if(s.id!==category&&catalog.items.some(i=>i.workId===workId&&inSection(i,s.id)))related.append(link(t(s.ar,s.en),route(s.id,workId)));if(related.children.length)root.append(related);
 const folders=catalog.folders.filter(f=>f.workId===workId&&rows.some(i=>i.folderId===f.id));
 if(folderId){const folder=folders.find(f=>f.id===folderId);if(!folder){root.append(el('p',t('المجلد غير متاح','Folder unavailable')));return}crumb.append(el('span','/'),el('span',title(folder)));rows=rows.filter(i=>i.folderId===folderId)}
 else{if(folders.length){const fg=el('div','','grid');for(const f of folders)fg.append(card(f,route(rawCategory,workId,f.id)));root.append(fg)}rows=rows.filter(i=>!i.folderId)}
 rows=rows.filter(i=>matches(work,i));if(!rows.length)root.append(el('p',t('لا توجد ملفات منشورة مطابقة داخل هذا العمل حالياً.','No matching published files in this work yet.'),'empty'));
 for(const external of [false,true]){const group=rows.filter(i=>(i.source==='external')===external).sort((a,b)=>(a.season||0)-(b.season||0)||(a.episode||0)-(b.episode||0));if(!group.length)continue;root.append(el('h3',external?t('الروابط الخارجية','External sources'):t('ملفات MHY الأصلية','Original MHY files')));const g=el('div','','media-grid');for(const i of group)g.append(media(i));root.append(g)}
}
const SCROLL_KEY='mhy-library-scroll-v2';let restoring=false,positions={};try{positions=JSON.parse(sessionStorage.getItem(SCROLL_KEY)||'{}')}catch{}
function remember(){positions[current]=scrollY;try{sessionStorage.setItem(SCROLL_KEY,JSON.stringify(positions))}catch{}}
function restore(){restoring=true;const y=Number(positions[current])||0;requestAnimationFrame(()=>requestAnimationFrame(()=>{scrollTo(0,y);requestAnimationFrame(()=>{restoring=false})}))}
if('scrollRestoration'in history)history.scrollRestoration='manual';
window.addEventListener('scroll',()=>{if(!restoring&&location.hash===current)remember()},{passive:true});window.addEventListener('pagehide',()=>{remember();for(const fn of dispose)fn()});
window.addEventListener('hashchange',()=>{restoring=true;current=location.hash;render();restore()});window.addEventListener('pageshow',restore);
// Save position before fragment navigation; browser/Android Back stays native.
document.addEventListener('click',e=>{
 const a=e.target.closest('a'),href=a?.getAttribute('href');if(!href?.startsWith('#'))return;
 remember();
 if(href==='#'){
  e.preventDefault();query='';search.value='';const u=new URL(location.href);u.searchParams.delete('q');history.replaceState(history.state,'',u);
  if(location.hash){restoring=true;location.hash=''}else{render();restore()}return;
 }
 if(new URL(a.href).hash!==current)restoring=true;
},true);
document.querySelector('#back').onclick=()=>{remember();const p=location.hash.slice(1).split('/');if(p.length>1)p.pop();else p.length=0;const next=p.join('/');if(next!==location.hash.slice(1))restoring=true;location.hash=next};
document.querySelector('#language').onclick=()=>{remember();lang=lang==='ar'?'en':'ar';render();restore()};
search.value=query;search.oninput=()=>{remember();query=search.value;const u=new URL(location.href);u.hash='';if(query)u.searchParams.set('q',query);else u.searchParams.delete('q');history.replaceState(history.state,'',u);current=location.hash;render()};
let loadingStarted=false;
async function load(){
 if(loadingStarted)remember();loadingStarted=true;restoring=true;loadState='loading';render();try{const r=await fetch(publicBase+'/api/catalog',{credentials:'omit',signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('Catalog unavailable');const data=await r.json();if(!Array.isArray(data.items))throw Error('Invalid catalog');catalog=mergeCatalog(legacy,data.items,index);loadState='ready'}catch{loadState='failed'}render();restore();
}
load();
