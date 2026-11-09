export const publicBase='https://mhy-media-public.mhyprodection.workers.dev';
export const normalizeCategory=c=>c==='audio'?'songs':c==='music'?'soundtracks':c;
export function mergeCatalog(legacy={},remote=[],index={}){
 const works=new Map(),items=[],folders=[],workAliases=new Map(),mapping=index.itemWorkIds||{};
 for(const w of index.works||[])works.set(w.id,{...w});
 const canonical=id=>workAliases.get(id)||id;
 const addWork=(id,titleAr,titleEn,cover)=>{if(!works.has(id))works.set(id,{id,titleAr,titleEn,cover})};
 for(const item of legacy.items||[]){
  if(item.status!=='published')continue;
  const originalWorkId=item.workId||(item.category==='gallery'?'legacy-gallery':item.id);
  const workId=mapping[item.id]||originalWorkId;if(workId!==originalWorkId)workAliases.set(originalWorkId,workId);
  addWork(workId,item.workTitleAr||(item.category==='gallery'?'صور الاستوديو':item.titleAr),item.workTitleEn||(item.category==='gallery'?'Studio gallery':item.titleEn),item.cover||item.image);
  items.push({...item,originalWorkId,workId,categories:[normalizeCategory(item.category)],source:item.youtubeUrl?'external':'site',kind:item.image?'image':'youtube'});
 }
 for(const s of legacy.series||[]){if(s.status!=='published')continue;const workId=canonical(s.id);addWork(workId,s.titleAr,s.titleEn,s.cover);for(const e of s.episodes||[])if(e.status==='published')items.push({...e,id:s.id+'-'+e.season+'-'+e.episode,originalWorkId:s.id,workId,categories:['series'],source:'external',kind:'youtube'})}
 addWork('studio','MHYPRODUCTION','MHYPRODUCTION');items.push({id:'studio-ad',workId:'studio',titleAr:'الإعلان الرسمي',titleEn:'Official advertisement',categories:['studio-music'],source:'external',kind:'youtube',youtubeUrl:'https://www.youtube.com/watch?v=DjLYWdz-1hA'});
 const published=remote.filter(r=>r.status==='published'&&!r.deleted),byId=new Map(published.map(r=>[r.id,r]));
 // Remote UUID records retain their exact identities and storage relationships.
 for(const r of published)if(r.kind==='work')works.set(r.id,{...r,titleAr:r.title,titleEn:r.title});
 const parentsOK=r=>byId.get(r.workId)?.kind==='work'&&(!r.folderId||(byId.get(r.folderId)?.kind==='folder'&&byId.get(r.folderId)?.workId===r.workId));
 for(const r of published){if(r.kind==='folder'&&parentsOK(r)){folders.push({...r,titleAr:r.title,titleEn:r.title});continue}if(!parentsOK(r))continue;
  const base={...r,titleAr:r.title,titleEn:r.title,categories:(r.categories||[]).map(normalizeCategory)};
  if(r.kind==='media'&&r.verified&&['png','jpg','jpeg','webp','mp4','webm','mp3','m4a','wav','ogg'].includes(r.ext))items.push({...base,source:'r2',kind:['png','jpg','jpeg','webp'].includes(r.ext)?'image':['mp4','webm'].includes(r.ext)?'video':'audio',src:publicBase+'/media/'+encodeURIComponent(r.id)});
  if(r.kind==='external'){try{const u=new URL(r.url);if(u.protocol==='https:'&&!u.username&&!u.password)items.push({...base,source:'external',kind:'link',url:u.href})}catch{}}
 }
 // Only work identities are reused from the old index. Pending/draft media are never imported.
 const active=new Set([...items.map(i=>i.workId),...published.filter(r=>r.kind==='work').map(r=>r.id)]);
 for(const id of works.keys())if(!active.has(id))works.delete(id);
 return {works,items,folders,workAliases};
}
