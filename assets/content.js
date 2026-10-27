/* No external HTML is accepted: catalog strings are rendered as text. */
(()=>{
'use strict';
const data=window.MHY_CONTENT||{categories:[],items:[],series:[]};
const root=document.getElementById('catalog-results');
const category=document.body.dataset.collection;
if(!root)return;
const words={coming:['المحتوى سيُضاف قريبًا','Content coming soon'],soon:['نجهّز هذه المساحة لأعمال MHYPRODUCTION. تابعنا لتكتشف جديدنا.','We are preparing this collection for MHYPRODUCTION releases. Stay tuned.'],watch:['شاهد هنا','Watch here'],youtube:['شاهد على YouTube','Watch on YouTube'],episodes:['استعرض الحلقات','Browse episodes'],season:['الموسم','Season'],episode:['الحلقة','Episode'],back:['جميع المسلسلات','All series'],missing:['المسلسل غير متاح حاليًا','This series is not available'],work:['من عمل: ','From: ']};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
function bilingual(node,ar,en){const a=el('span','',ar||en||'');a.dataset.ar='';const b=el('span','',en||ar||'');b.dataset.en='';node.append(a,b);return node;}
function label(node,key){return bilingual(node,...words[key]);}
function youtubeId(value){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return null;let id=null;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];}return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
function imagePath(value){if(typeof value!=='string')return null;if(/^(?:assets\/|images\/)?[\w./-]+\.(?:png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..'))return value;try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function empty(key='coming'){const box=el('div','empty-state');box.append(el('span','empty-mark','MHY'));box.append(label(el('h2'),key),label(el('p'),'soon'));root.append(box);}
function grid(){const g=el('div','media-grid');root.append(g);return g;}
function title(item){return bilingual(el('h2'),item.titleAr,item.titleEn);}
function mediaCard(item,parent){const id=youtubeId(item.youtubeUrl);const img=imagePath(item.cover);if(category!=='gallery'&&!id)return;
const card=el('article','media-card');
if(category==='gallery'){const src=imagePath(item.image);if(!src)return;const figure=el('figure','gallery-frame');const picture=el('img');picture.src=src;picture.alt=item.altAr||item.titleAr||item.titleEn||'MHYPRODUCTION';picture.loading='lazy';figure.append(picture);card.append(figure);}
else if(img){const picture=el('img','media-art');picture.src=img;picture.alt=item.titleAr||item.titleEn||'MHYPRODUCTION';picture.loading='lazy';card.append(picture);}
const copy=el('div','media-copy');
if(item.season&&item.episode)copy.append(bilingual(el('p','work-label'),`الموسم ${item.season} · الحلقة ${item.episode}`,`Season ${item.season} · Episode ${item.episode}`));
copy.append(title(item));if(item.workTitleAr||item.workTitleEn)copy.append(bilingual(el('p','work-label'),'من عمل: '+(item.workTitleAr||item.workTitleEn),'From: '+(item.workTitleEn||item.workTitleAr)));
if(item.descriptionAr||item.descriptionEn)copy.append(bilingual(el('p'),item.descriptionAr,item.descriptionEn));
if(id){const button=label(el('button','button primary'),'watch');button.type='button';button.addEventListener('click',()=>{const frame=el('iframe','media-player');frame.src='https://www.youtube-nocookie.com/embed/'+id;frame.title=item.titleAr||item.titleEn||'MHYPRODUCTION video';frame.allow='encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';card.querySelector('.media-art')?.remove();card.prepend(frame);button.remove();frame.focus();});const link=label(el('a','button'),'youtube');link.href='https://www.youtube.com/watch?v='+id;link.target='_blank';link.rel='noopener noreferrer';copy.append(button,document.createTextNode(' '),link);}
card.append(copy);parent.append(card);}
const items=(data.items||[]).filter(x=>x.category===category&&x.status==='published');
if(category==='series'){
 const selected=new URLSearchParams(location.search).get('id');const series=(data.series||[]).filter(s=>s.status==='published');
 if(selected){const back=label(el('a','button series-back'),'back');back.href='series.html';root.append(back);const show=series.find(s=>s.id===selected);if(!show){empty('missing');return;}root.append(title(show));const episodes=(show.episodes||[]).filter(x=>x.status==='published'&&Number.isInteger(x.season)&&x.season>0&&Number.isInteger(x.episode)&&x.episode>0&&youtubeId(x.youtubeUrl)).sort((a,b)=>a.season-b.season||a.episode-b.episode);if(!episodes.length){empty();return;}let season=null,g;episodes.forEach(e=>{if(e.season!==season){season=e.season;root.append(bilingual(el('h3','season-heading'),'الموسم '+season,'Season '+season));g=grid();}mediaCard(e,g);});
 }else{if(!series.length){empty();return;}const g=grid();series.forEach(s=>{const card=el('article','media-card');const img=imagePath(s.cover);if(img){const p=el('img','media-art');p.src=img;p.alt=s.titleAr||s.titleEn;p.loading='lazy';card.append(p);}const copy=el('div','media-copy');copy.append(title(s));if(s.descriptionAr||s.descriptionEn)copy.append(bilingual(el('p'),s.descriptionAr,s.descriptionEn));const a=label(el('a','button primary'),'episodes');a.href='series.html?id='+encodeURIComponent(s.id);copy.append(a);card.append(copy);g.append(card);});}
}else{const valid=items.filter(i=>category==='gallery'?imagePath(i.image):youtubeId(i.youtubeUrl));if(!valid.length)empty();else{const g=grid();valid.forEach(i=>mediaCard(i,g));}}
})();
