// Build-time registry contains only already-published legacy IDs. It creates no R2 records.
const builtLegacy=typeof MHY_LEGACY_ITEMS==='undefined'?{}:MHY_LEGACY_ITEMS;
export async function resolveAudienceItem(id,env,legacy=builtLegacy){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id))return null;
 if(Object.hasOwn(legacy,id))return legacy[id];
 if(!/^[a-f0-9-]{36}$/.test(id)||!env.MEDIA_BUCKET||env.PRIVATE_BUCKET_CONFIRMED!=='true')return null;
 async function read(key){const o=await env.MEDIA_BUCKET.get('mhy-platform-v2/records/'+key+'.json');return o?o.json():null;}
 const r=await read(id);if(!r||r.deleted||r.status!=='published'||!['media','external'].includes(r.kind)||r.kind==='media'&&!r.verified)return null;
 for(const key of [r.workId,r.folderId].filter(Boolean)){const p=await read(key);if(!p||p.deleted||p.status!=='published')return null;}
 return {kind:r.mediaKind||'video',source:r.kind==='external'?'external':'r2'};
}
