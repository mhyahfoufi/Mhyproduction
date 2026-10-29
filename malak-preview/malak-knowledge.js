/* Public, deterministic knowledge lookup. No external AI or paid APIs. */
(function(scope){
'use strict';
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0300-\u036fـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
function catalogAnswer(kb,query){
 const q=normalize(query),english=/[a-z]/i.test(query)&&!/[\u0600-\u06ff]/.test(query),lang=english?'En':'Ar';
 const result=(text,rows=[])=>({text,links:rows.filter(x=>x.visibility!=='private').map(x=>({label:x['title'+lang]||x.label||x.nameEn,url:x.url})).filter(x=>x.url),language:english?'en':'ar'});
 const unknown=()=>result(english?'That detail is not documented in the verified public studio information. I cannot confirm it.':'هالتفصيل مش موثّق ضمن معلومات الاستوديو العامة المعتمدة، وما فيني أكّده.');
 if(!kb||kb.visibility!=='public-only')return result(english?'Knowledge is unavailable. Please try again later.':'قاعدة المعرفة غير متاحة حالياً. جرّب لاحقاً.');
 if(/spoiler|ending|who dies|who kills|killer|betray|secret|نهاي|يموت|موت|مات|قتل|قاتل|خيان|سر الفيلم|اسرار|احرق|حرق/.test(q))return result(english?'Plot spoilers and endings are blocked in this preview.':'تفاصيل الحرق والنهايات محجوبة بهالنسخة التجريبية.');
 if(/ignore.*(rule|instruction)|تجاهل.*(تعليم|قواعد)|api key|password|كلمه السر|مفتاح/.test(q))return unknown();
 if(/^(who is malak|what is malak|malak|ملك|مين ملك|من هي ملك)$/.test(q))return result(kb.identity.name+' — '+(kb.identity['personality'+lang]||kb.identity.personalityAr));
 if(/تواصل|واتس|بريد|ايميل|contact|whatsapp|email/.test(q))return result(english?'Official studio contact links:':'روابط التواصل الرسمية مع الاستوديو:',kb.contacts||[]);
 if(/^(who (are you|is mhyproduction)|what is mhyproduction|about( the studio| mhyproduction)?|من انتم|مين انتو|عن الاستوديو|شو هي mhyproduction|ما هي mhyproduction|mhyproduction)$/.test(q)){const text=kb.studio?.['description'+lang];return text?result(text):unknown();}
 const projects=kb.projects||[];
 if(/قيد الانتاج|قيد التطوير|in production|in development|upcoming/.test(q))return projects.length?result(english?'Publicly announced projects in production (no plot details):':'مشاريع معلنة للعامة وقيد الإنتاج، دون تفاصيل أحداث:',projects):result(english?'No publicly announced in-production projects are documented in the catalog.':'ما في مشاريع قيد الإنتاج معلنة للعامة وموثّقة بالكتالوج حالياً.');
 const all=kb.items.filter(x=>x.status==='published'&&x.visibility!=='private');
 const stop=new Set('شو في وين اين هل عندكم عندكن خبريني احكيلي قصه بتقدر ممكن عندنا بدي اريد اعرض لي عن من هو هي مين فيلم افلام اغنيه اغاني موسيقي كليب شاهد مشاهده رابط روابط the a an what which where is are do you have show me tell about film films movie movies song songs music video videos available watch link links please'.split(' '));
 for(const word of [...stop]){stop.add(normalize(word));stop.add('ال'+normalize(word));}
 const tokens=q.split(' ').filter(t=>(t.length>1||/^\d+$/.test(t))&&!stop.has(t));
 const matches=tokens.length?all.filter(x=>[x.titleAr,x.titleEn,...(x.aliases||[])].some(t=>{const n=normalize(t);return tokens.every(token=>n.includes(token));})):[];
 if(!matches.length&&tokens.length){const pending=projects.filter(x=>[x.titleAr,x.titleEn].some(t=>tokens.every(token=>normalize(t).includes(token))));if(pending.length)return result((english?'In production — not available to watch yet: ':'قيد الإنتاج — غير متاح للمشاهدة بعد: ')+pending.map(x=>x['title'+lang]).join('، '));}
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
// Session state belongs to the caller; never shared between visitors or persisted.
function answer(kb,query,state={}){
 const q=normalize(query),english=/[a-z]/i.test(query)&&!/[\u0600-\u06ff]/.test(query);
 const reply=(ar,en,links=[])=>({text:english?en:ar,links,language:english?'en':'ar'});
 const pick=(key,ar,en)=>{state.variants=state.variants||{};const n=state.variants[key]||0;state.variants[key]=n+1;return reply(ar[n%ar.length],en[n%en.length]);};
 let out;
 if(/تجاهل.*(تعليم|قواعد)|ignore.*(rule|instruction)|password|api key|كلمه السر|مفتاح|عد[لّ].*(بيانات|كتالوج)|delete.*catalog/.test(q))out=reply('ما فيني أغيّر بيانات الاستوديو أو أكشف معلومات خاصة عبر المحادثة.','I cannot change studio data or reveal private information through chat.');
 else if(/spoiler|ending|who dies|who kills|killer|betray|نهاي|يموت|قتل|قاتل|خيان|احرق|حرق/.test(q))out=reply('تفاصيل الحرق والنهايات محجوبة. بقدر خبرك بالوصف العام.','I can share the public description, without plot spoilers or endings.');
 else if(/^(مرحبا|مرحباه|مرحبه|اهلا|اهلين|هلا|سلام|هاي|hello|hi|hey)( يا ملك| ملك| malak)?$/.test(q))out=pick('hello',['أهلا وسهلا فيك! أنا ملك، كيف فيني ساعدك اليوم؟','يا أهلا فيك! بتحب تكتشف أفلامنا أو أغانينا؟'],["Hello! I'm Malak, the virtual assistant at MHYPRODUCTION. How can I help?",'Welcome! Would you like to explore our films or music?']);
 else if(/^(السلام عليكم|سلام عليكم)/.test(q))out=reply('وعليكم السلام ورحمة الله، أهلا فيك باستوديو MHYPRODUCTION!','Peace be upon you! Welcome to MHYPRODUCTION.');
 else if(/^(كيفك|كيف حالك|شلونك|how are you)/.test(q))out=reply('الحمد لله، جاهزة ساعدك! شو بتحب تعرف اليوم؟',"I'm ready to help! What would you like to know?");
 else if(/^(صباح الخير|good morning)/.test(q))out=reply('صباح النور! بتمنالك نهار حلو ومليان إبداع.','Good morning! Wishing you a creative day.');
 else if(/^(مساء الخير|مسا الخير|good evening)/.test(q))out=reply('مسا النور وأهلا وسهلا فيك!','Good evening and welcome!');
 else if(/^(شكرا|شكراً|يسلمو|تسلم|thanks|thank you)/.test(q))out=pick('thanks',['أهلا فيك، أنا هون إذا احتجت شي!','ولو! بتحب ساعدك بشي تاني؟'],["You're welcome! I'm here if you need anything.",'Happy to help! Anything else?']);
 else if(/^(باي|مع السلامه|bye|goodbye)/.test(q))out=reply('مع السلامة! ناطرين زيارتك الجاية.','Goodbye! Come visit us again.');
 else if(/^(مين انت|من انت|مين ملك|من هي ملك|ملك|who are you|who is malak|what is malak|are you human|انت انسانه|انتي حقيقيه)/.test(q))out=reply('أنا ملك، المساعدة الافتراضية الرسمية لـ MHYPRODUCTION، ولست إنسانة حقيقية. بساعدك تتعرف على الاستوديو وأعماله.','I am Malak, the official virtual assistant for MHYPRODUCTION, not a human. I help visitors discover the studio and its work.');
 else if(/شو بتعملي|شو دورك|what do you do|what can you do/.test(q))out=reply('بساعدك تتعرف على أفلامنا وأغانينا وخدماتنا، وبوصلك للمحتوى اللي عم تفتش عليه.','I help you discover our films, music, services, and public viewing links.');
 else if(/مؤسس|موسس|صاحب (المشروع|الاستوديو)|founder|who owns/.test(q))out=reply('مؤسس وصاحب مشروع MHYPRODUCTION هو محمد يحفوفي.','MHYPRODUCTION was founded and is owned by Mohammad Yahfoufi.');
 else if(/خدمات|عن الاستوديو|شو هي mhyproduction|what is mhyproduction|who is mhyproduction|services/.test(q))out=reply('MHYPRODUCTION استوديو للقصص والأفلام والمسلسلات والأغاني والموسيقى والملصقات والشخصيات الإبداعية باستخدام الذكاء الاصطناعي.','MHYPRODUCTION creates stories, films, series, songs, music, posters, and creative characters using AI.');
 else {
  let lookup=query;
  const follow=/^(احكيلي عنه|احكي لي عنه|خبريني عنه|عنه|عنها|وين فيني شوفه|وين بشوفه|بدي رابطه|رابطه|رابطها|tell me more|tell me about it|where can i watch it|its link|link please)$/;
  if(follow.test(q)){
   if(state.lastWork)lookup=state.lastWork;
   else out=reply('أي عمل بتقصد؟ ابعتلي اسمه وبساعدك.','Which work do you mean? Please send its title.');
  }
  if(!out){
   lookup=normalize(lookup).replace(/^(خبريني عن|احكيلي عن|شو قصه|مين عمل|بدي رابط|وين فيني شوف|tell me about|who made)\s+/,'').replace(/عندكن|عندكون/g,'عندكم');
   if(/^(شو عندكم|شو عندكن|شو في جديد|في شي جديد|what is new|what s new)$/.test(lookup))lookup=english?'sections':'اقسام';
   out=catalogAnswer(kb,lookup);
   if(kb){const found=kb.items.filter(x=>x.url&&out.links.some(l=>l.url===x.url));if(found.length===1)state.lastWork=found[0].titleAr||found[0].titleEn;}
   if(/مش موث|not documented/.test(out.text))out=reply('ما لقيت جواب موثّق لهالسؤال. معرفتي الحالية عن الاستوديو وأعماله؛ فيك توضّح اسم العمل أو تسألني عن الأفلام والأغاني؟','I could not find a verified answer. My current knowledge covers the studio and its work. Please clarify the title, or ask about films or music.');
  }
 }
 state.history=state.history||[];state.history.push({query:String(query).slice(0,180),answer:out.text});state.history=state.history.slice(-20);
 return out;
}
function build(catalog,identity,base,site={}){
 if(!catalog||!Array.isArray(catalog.items)||!Array.isArray(catalog.categories))throw Error('Invalid catalog');
 const url=value=>{if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,base);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
 const categories=catalog.categories.map(x=>({id:x.id,titleAr:x.titleAr,titleEn:x.titleEn,url:url(x.page)}));
 const items=catalog.items.filter(x=>x.status==='published'&&x.visibility!=='private').map(x=>({id:x.id,category:x.category,status:x.status,visibility:'public',titleAr:x.titleAr||x.titleEn||'',titleEn:x.titleEn||x.titleAr||'',aliases:Array.isArray(x.aliases)?x.aliases:[],summaryAr:x.descriptionAr||'',summaryEn:x.descriptionEn||'',image:url(x.image||x.cover),url:url(x.youtubeUrl||x.url||x.image),source:'assets/content-data.js#'+x.id}));
 // Only explicitly public announcements expose a title/status. Draft plot text stays excluded.
 const projects=catalog.items.filter(x=>x.visibility==='public'&&['in-production','in_production','production','in-development','coming-soon'].includes(x.status)).map(x=>({titleAr:x.titleAr||x.titleEn||'',titleEn:x.titleEn||x.titleAr||'',status:x.status}));
 return {visibility:'public-only',identity,categories,items,projects,contacts:site.contacts||[],studio:site.studio};
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
