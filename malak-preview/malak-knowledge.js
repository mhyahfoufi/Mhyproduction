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
 if(/تواصل|واتس|بريد|ايميل|contact|whatsapp|email/.test(q))return result(english?'Official studio contact links:':'روابط التواصل الرسمية مع الاستوديو:',kb.contacts);
 if(/^(who is malak|what is malak|malak|ملك|مين ملك|من هي ملك)$/.test(q))return result(english?'Malak is the experimental virtual interface for MHY AI, using verified public studio information.':'ملك هي الواجهة الافتراضية التجريبية لـ MHY AI، وبتجاوب من معلومات الاستوديو العامة الموثّقة.');
 if(/^(who (are you|is mhyproduction)|what is mhyproduction|about( the studio| mhyproduction)?|من انتم|مين انتو|عن الاستوديو|شو هي mhyproduction|ما هي mhyproduction|mhyproduction)$/.test(q))return result(kb.studio['description'+lang],[{label:kb.studio.name,url:kb.studio.url}]);
 if(/قيد الانتاج|قيد التطوير|in production|upcoming/.test(q))return result(kb.production[0]['summary'+lang],kb.production);
 const characterIntent=/شخصي|شخصيات|character|مين امير|من هو امير|who is amir/.test(q);
 if(characterIntent){const hits=kb.characters.filter(x=>x.aliases.some(a=>q.includes(normalize(a))));if(hits.length)return result(hits.map(x=>x['summary'+lang]).join('\n'),hits);if(/^(الشخصيات|شخصيات|characters|who are the characters|مين الشخصيات)$/.test(q))return result(english?'Only Amir is explicitly named in the current catalog. No full character biographies are documented.':'أمير هو الاسم الوحيد المذكور صراحةً في الكتالوج الحالي؛ سير الشخصيات الكاملة غير موثّقة.',kb.characters);return unknown();}
 const all=[...kb.works,...kb.music];
 const stop=new Set('شو في وين اين هل عندكم بدي اريد اعرض لي عن من هو هي مين فيلم افلام اغنيه اغاني موسيقي كليب شاهد مشاهده رابط روابط the a an what which where is are do you have show me tell about film films movie movies song songs music video videos available watch link links please'.split(' '));
 for(const word of [...stop]){stop.add(normalize(word));stop.add('ال'+normalize(word));}
 const tokens=q.split(' ').filter(t=>(t.length>1||/^\d+$/.test(t))&&!stop.has(t));
 const matches=tokens.length?all.filter(x=>[x.titleAr,x.titleEn,...(x.aliases||[])].some(t=>{const n=normalize(t);return tokens.every(token=>n.includes(token));})):[];
 if(matches.length){return result((english?'Verified published catalog entries:\n':'عناصر منشورة موثّقة في الكتالوج:\n')+matches.map(x=>x['title'+lang]+(x['summary'+lang]?' — '+x['summary'+lang]:'')).join('\n'),matches);}
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
 if(ids.length){const rows=[...all,...kb.gallery,...kb.series].filter(x=>ids.includes(x.category)&&x.status==='published');if(rows.length)return result(english?'Published entries in the current catalog (publication refers to each listed item):':'العناصر المنشورة في الكتالوج الحالي (حالة النشر تخص كل عنصر بحد ذاته):',rows);return result(english?'No published entries are documented in this collection yet. This does not establish whether unlisted projects exist.':'ما في عناصر منشورة موثّقة بهالقسم بعد. هيدا ما بيحسم وجود مشاريع غير مسجّلة.',kb.categories.filter(x=>ids.includes(x.id)));}
 return unknown();
}
const api={answer,normalize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else scope.MalakKnowledge=api;
})(typeof globalThis!=='undefined'?globalThis:this);
