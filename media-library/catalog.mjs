export const publicBase='https://mhy-media-public.mhyprodection.workers.dev';
export const normalizeCategory=c=>c==='audio'?'songs':c;
export function mergeCatalog(legacy={},remote=[]){
 const works=new Map(),items=[],folders=[];
 const addWork=(id,titleAr,titleEn,cover)=>{if(!works.has(id))works.set(id,{id,titleAr,titleEn,cover})};
 for(const item of legacy.items||[]){if(item.status!=='published')continue;const workId=item.workId||(item.category==='gallery'?'legacy-gallery':item.id);addWork(workId,item.workTitleAr||(item.category==='gallery'?'صور الاستوديو':item.titleAr),item.workTitleEn||(item.category==='gallery'?'Studio gallery':item.titleEn),item.cover||item.image);items.push({...item,workId,categories:[normalizeCategory(item.category)],source:item.youtubeUrl?'external':'site',kind:item.image?'image':'youtube'})}
 for(const s of legacy.series||[]){if(s.status!=='published')continue;addWork(s.id,s.titleAr,s.titleEn,s.cover);for(const e of s.episodes||[])if(e.status==='published')items.push({...e,id:s.id+'-'+e.season+'-'+e.episode,workId:s.id,categories:['series'],source:'external',kind:'youtube'})}
 addWork('studio','MHYPRODUCTION','MHYPRODUCTION');items.push({id:'studio-ad',workId:'studio',titleAr:'الإعلان الرسمي',titleEn:'Official advertisement',categories:['studio-music','trailers'],source:'external',kind:'youtube',youtubeUrl:'https://www.youtube.com/watch?v=DjLYWdz-1hA'});
 const published=remote.filter(r=>r.status==='published'&&!r.deleted),byId=new Map(published.map(r=>[r.id,r]));
 for(const r of published)if(r.kind==='work')works.set(r.id,{...r,titleAr:r.title,titleEn:r.title});
 const parentsOK=r=>byId.get(r.workId)?.kind==='work'&&(!r.folderId||(byId.get(r.folderId)?.kind==='folder'&&byId.get(r.folderId)?.workId===r.workId));
 for(const r of published){if(r.kind==='folder'&&parentsOK(r)){folders.push({...r,titleAr:r.title,titleEn:r.title});continue}if(!parentsOK(r))continue;
  const base={...r,titleAr:r.title,titleEn:r.title,categories:(r.categories||[]).map(normalizeCategory)};
  if(r.kind==='media'&&r.verified&&['png','jpg','jpeg','webp','mp4','webm','mp3','m4a','wav','ogg'].includes(r.ext))items.push({...base,source:'r2',kind:['png','jpg','jpeg','webp'].includes(r.ext)?'image':['mp4','webm'].includes(r.ext)?'video':'audio',src:publicBase+'/media/'+encodeURIComponent(r.id)});
  if(r.kind==='external'){try{const u=new URL(r.url);if(u.protocol==='https:'&&!u.username&&!u.password)items.push({...base,source:'external',kind:'link',url:u.href})}catch{}}
 }
 return {works,items,folders};
}
