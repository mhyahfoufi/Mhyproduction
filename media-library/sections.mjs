export const sections=[
 ['films','الأفلام السينمائية','Feature Films'],['series','المسلسلات','TV Series'],
 ['music-videos','الأغاني المصوّرة','Music Videos'],['songs','الأغاني المسموعة','Audio Songs'],
 ['soundtracks','الموسيقى التصويرية','Soundtracks'],['trailers','الإعلانات والفيديوهات التشويقية','Trailers & Advertisements'],
 ['gallery','معرض الصور','Photo Gallery'],['short-films','الأفلام القصيرة','Short Films'],
 ['external','مكتبة الروابط الخارجية','External Media'],['soon','قريباً','Coming Soon']
].map(([id,ar,en],n)=>({id,ar,en,number:String(n+1).padStart(2,'0'),cover:'covers/'+id+'.svg'}));
export const sectionOf=category=>['studio-music','studio-videos'].includes(category)?'trailers':category==='audio'?'songs':category==='music'?'soundtracks':category;
export const categoriesFor=section=>section==='trailers'?['trailers','studio-music','studio-videos']:[section];
export const normalizeSearch=value=>String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
