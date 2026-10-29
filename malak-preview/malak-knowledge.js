/* Public, deterministic knowledge lookup. No external AI or paid APIs. */
(function(scope){
'use strict';
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0300-\u036fـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
function answer(kb,query){
 const q=normalize(query),english=/[a-z]/i.test(query)&&!/[\u0600-\u06ff]/.test(query),lang=english?'En':'Ar';
 const result=(text,rows=[])=>({text,links:rows.filter(x=>x.visibility!=='private').map(x=>({label:x['title'+lang]||x.label||x.nameEn,url:x.url})).filter(x=>x.url),language:english?'en':'ar'});
 const unknown=()=>result(english?'That detail is not documented in the verified public studio information. I cannot confirm it.':'هالتفصيل مش موثّق ضمن معلومات الاستوديو العامة المعتمدة، وما فيني أكّده.');
 if(!kb||kb.visibility!=='public-only')return result(english?'Knowledge is unavailable. Please try again later.':'قاعدة المعرفة غير متاحة حالياً. جرّب لاحقاً.');
 if(/spoiler|ending|who dies|who kills|killer|betray|secret|نهاي|يموت|موت|مات|قتل|قاتل|خيان|سر الفيلم|اسرار|احرق|حرق/.test(q))return result(english?'Plot spoilers and endings are blocked in this preview.':'تفاصيل الحرق والنهايات محجوبة بهالنسخة التجريبية.');
 if(/ignore.*(rule|instruction)|تجاهل.*(تعليم|قواعد)|api key|password|كلمه السر|مفتاح/.test(q))return unknown();
 if(/^(who is malak|what is malak|malak|ملك|مين ملك|من هي ملك)$/.test(q))return result(kb.identity.name+' — '+(kb.identity['personality'+lang]||kb.identity.personalityAr));
 if(/تواصل|واتس|بريد|ايميل|contact|whatsapp|email/.test(q))return result(english?'Official studio contact links:':'روابط التواصل الرسمية مع الاستوديو:',kb.contacts||[]);
 if(/^(who (are you|is mhyproduction)|what is mhyproduction|about( the studio| mhyproduction)?|من انتم|مين انتو|عن الاستوديو|شو هي mhyproduction|ما هي mhyproduction|mhyproduction)$/.test(q)){const text=kb.studio?.['description'+lang];return text?result(text):unknown();}
 const all=kb.items.filter(x=>x.status==='published'&&x.visibility!=='private');
 const stop=new Set('شو في وين اين هل عندكم بدي اريد اعرض لي عن من هو هي مين فيلم افلام اغنيه اغاني موسيقي كليب شاهد مشاهده رابط روابط the a an what which where is are do you have show me tell about film films movie movies song songs music video videos available watch link links please'.split(' '));
 for(const word of [...stop]){stop.add(normalize(word));stop.add('ال'+normalize(word));}
 const tokens=q.split(' ').filter(t=>(t.length>1||/^\d+$/.test(t))&&!stop.has(t));
 const matches=tokens.length?all.filter(x=>[x.titleAr,x.titleEn,...(x.aliases||[])].some(t=>{const n=normalize(t);return tokens.every(token=>n.includes(token));})):[];
 if(matches.length){return result((english?'Verified published catalog entries:\n':'عناصر منشورة موثّقة في الكتالوج:\n')+matches.map(x=>(x['title'+lang]||x.titleAr||x.titleEn)+(x['summary'+lang]?' — '+x['summary'+lang]:'')).join('\n'),matches);}
 // Unmatched specific questions never fall through to an unrelated catalog listing.
 if(tokens.some(t=>!/^(صور|معرض|صوتيه|قصيره|مسلسلات|series|episodes|gallery|image|images|poster|posters|audio|short|trailers|reels|اقسام|sections|categories)$/.test(t.replace(/^ال/,''))))return unknown();
 let ids=[];
 if(/series|episode|مسلسل|مسلسلات|حلق/.test(q))ids=['series'];
 else if(/gallery|image|poster|معرض|صور/.test(q))ids=['gallery'];
 else if(/short film|short movies|افلام قصيره|الافلام القصيره/.test(q))ids=['short-films'];
 else if(/trailer|reel|تريلر|ريلز/.test(q))ids=['trailers'];
 else if(/audio|صوتي/.test(q))ids=['audio'];
 else if(/song|music|اغان|اغني|موسيق|كليب/.test(q))ids=['audio','music-videos','soundtracks','studio-music'];
 else if(/film|movie|افلام|فيلم/.test(q))ids=['films','short-films'];
 else if(/section|categor|اقسام/.test(q))return result(english?'Studio collections:':'أقسام الاستوديو:',kb.categories);
 if(ids.length){const rows=all.filter(x=>ids.includes(x.category)&&x.status==='published');if(rows.length)return result(english?'Published entries in the current catalog (publication refers to each listed item):':'العناصر المنشورة في الكتالوج الحالي (حالة النشر تخص كل عنصر بحد ذاته):',rows);return result(english?'No published entries are documented in this collection yet. This does not establish whether unlisted projects exist.':'ما في عناصر منشورة موثّقة بهالقسم بعد. هيدا ما بيحسم وجود مشاريع غير مسجّلة.',kb.categories.filter(x=>ids.includes(x.id)));}
 return unknown();
}
function build(catalog,identity,base,site={}){
 if(!catalog||!Array.isArray(catalog.items)||!Array.isArray(catalog.categories))throw Error('Invalid catalog');
 const url=value=>{if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,base);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
 const categories=catalog.categories.map(x=>({id:x.id,titleAr:x.titleAr,titleEn:x.titleEn,url:url(x.page)}));
 const items=catalog.items.filter(x=>x.status==='published'&&x.visibility!=='private').map(x=>({id:x.id,category:x.category,status:x.status,visibility:'public',titleAr:x.titleAr||x.titleEn||'',titleEn:x.titleEn||x.titleAr||'',aliases:Array.isArray(x.aliases)?x.aliases:[],summaryAr:x.descriptionAr||'',summaryEn:x.descriptionEn||'',image:url(x.image||x.cover),url:url(x.youtubeUrl||x.url||x.image),source:'assets/content-data.js#'+x.id}));
 return {visibility:'public-only',identity,categories,items,contacts:site.contacts||[],studio:site.studio};
}
// Load the source itself, never a copied catalog. Unique URL bypasses browser/CDN caches.
function loadCatalog(doc,base){return new Promise((resolve,reject)=>{
 const script=doc.createElement('script');const u=new URL('assets/content-data.js',base);u.searchParams.set('malak_refresh',Date.now()+'-'+Math.random());
 scope.MHY_CONTENT=undefined;script.src=u.href;
 const timer=setTimeout(()=>finish(Error('Catalog timeout')),12000);
 function finish(error){clearTimeout(timer);script.remove();script.onload=script.onerror=null;if(error)reject(error);else resolve(scope.MHY_CONTENT);}
 script.onload=()=>finish();script.onerror=()=>finish(Error('Catalog load failed'));doc.head.append(script);
});}
const api={answer,normalize,build,loadCatalog};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.MalakKnowledge=api;
})(typeof globalThis!=='undefined'?globalThis:this);
