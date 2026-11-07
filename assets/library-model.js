(()=>{'use strict';
const legacy=window.MHY_CONTENT||{categories:[],items:[],series:[]};
const index=window.MHY_LIBRARY_INDEX||{works:[],itemWorkIds:{},media:[]};
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
const works=new Map(index.works.map(w=>[w.id,{...w}]));
const items=legacy.items.map(i=>({...i,workId:index.itemWorkIds[i.id]||i.workId,kind:i.image?'image':'youtube'}));
for(const s of legacy.series||[]){works.set(s.id,{...s,episodes:undefined});for(const e of s.episodes||[])items.push({...e,category:'series',workId:s.id,kind:'youtube',status:s.status==='published'?e.status:'draft'});}
items.push({id:'studio-official-ad',workId:'mhy-studio',category:'studio-music',kind:'youtube',titleAr:'الإعلان الرسمي',titleEn:'Official advertisement',youtubeUrl:'https://www.youtube.com/watch?v=DjLYWdz-1hA',cover:'https://i.ytimg.com/vi/DjLYWdz-1hA/hqdefault.jpg',status:'published'});
works.set('mhy-studio',{id:'mhy-studio',titleAr:'MHYPRODUCTION',titleEn:'MHYPRODUCTION',cover:'mhy-official-logo.png'});
for(const i of items){if(!i.workId){i.workId=i.category==='gallery'?'legacy-gallery':i.id;if(!works.has(i.workId))works.set(i.workId,i.category==='gallery'?{id:i.workId,titleAr:'صور الاستوديو — بانتظار تحديد العمل',titleEn:'Studio images — awaiting work attribution',cover:i.image}:{id:i.workId,titleAr:i.titleAr,titleEn:i.titleEn,cover:i.cover});}}
const base=index.workerBase;
for(const i of index.media||[]){if(i.r2Key&&/^mhy-media\/[a-z0-9][a-z0-9/_-]{0,180}\.(png|jpe?g|webp|mp4|webm)$/.test(i.r2Key))items.push({...i,src:base+'/media/'+i.r2Key});}
const categories=[...legacy.categories,{id:'storyboard',page:'storyboard.html',titleAr:'الستوري بورد',titleEn:'Storyboard',number:'11'}];
const safeURL=s=>{if(typeof s!=='string')return null;if(s==='mhy-official-logo.png')return s;if(/^(?:images|assets)\/[\w./-]+$/.test(s)&&!s.includes('..'))return s;try{const u=new URL(s);return u.protocol==='https:'?u.href:null;}catch{return null;}};
const published=items.filter(i=>i.status==='published'&&works.has(i.workId)&&categories.some(c=>c.id===i.category));
const matches=(w,q)=>[w.titleAr,w.titleEn,...(w.aliases||[])].some(s=>normalize(s).includes(normalize(q)));
window.MHY_LIBRARY={works,categories,items,published,normalize,safeURL,matches,resolveWork(name){const n=normalize(name);return [...works.values()].find(w=>[w.id,w.titleAr,w.titleEn,...(w.aliases||[])].some(s=>normalize(s)===n));}};
})();
