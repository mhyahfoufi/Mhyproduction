import {createRemoteJWKSet,jwtVerify} from 'jose';
import {createEngagement} from './engagement/server.mjs';
const NS='mhy-platform-v2/', PART=8*1024*1024, MAX=10*1024**3;
const CATEGORIES=['films','series','music-videos','songs','soundtracks','trailers','studio-music','studio-videos','gallery','short-films','external','soon'];
const TYPES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'};
const deny=(status,message)=>{throw Object.assign(new Error(message),{status})};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const idOK=id=>/^[a-f0-9-]{36}$/.test(id||'');
const text=(v,n=200)=>typeof v==='string'?v.trim().slice(0,n):'';
const caches=new Map();
export async function authenticate(req,env){
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER||'')||!env.ACCESS_AUD||!env.ADMIN_SUB||env.MFA_POLICY_CONFIRMED!=='true')deny(503,'Administrative identity is not configured');
 const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token)deny(401,'Sign in required');
 try{let keys=caches.get(env.ACCESS_ISSUER);if(!keys){keys=createRemoteJWKSet(new URL(env.ACCESS_ISSUER+'/cdn-cgi/access/certs'));caches.set(env.ACCESS_ISSUER,keys)}
 return await verifyAccessJWT(token,keys,env);
 }catch(e){if(e.status)throw e;deny(401,'Invalid session')}
}
export async function verifyAccessJWT(token,keys,env){const {payload}=await jwtVerify(token,keys,{issuer:env.ACCESS_ISSUER,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['sub','exp','iat','email']});if(payload.sub!==env.ADMIN_SUB||payload.email?.toLowerCase()!==env.ADMIN_EMAIL?.toLowerCase())deny(403,'Administrator required');return payload;}
function configured(env){if(!env.MEDIA_BUCKET||env.PRIVATE_BUCKET_CONFIRMED!=='true')deny(503,'Private storage verification required')}
async function input(req){if(!req.headers.get('Content-Type')?.startsWith('application/json'))deny(415,'JSON required');const b=await bounded(req,32768);try{return JSON.parse(new TextDecoder().decode(b))}catch{deny(400,'Invalid JSON')}}
async function bounded(req,max){const declared=req.headers.get('Content-Length');if(declared&&Number(declared)>max)deny(413,'Body too large');if(!req.body)return new Uint8Array();const reader=req.body.getReader(),parts=[];let n=0;while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>max){await reader.cancel();deny(413,'Body too large')}parts.push(value)}const out=new Uint8Array(n);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}return out}
function signature(b,ext){const a=(x,y)=>String.fromCharCode(...b.slice(x,y));if(ext==='png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);if(['jpg','jpeg'].includes(ext))return b[0]===255&&b[1]===216&&b[2]===255;if(ext==='webp')return a(0,4)==='RIFF'&&a(8,12)==='WEBP';if(['mp4','m4a'].includes(ext))return a(4,8)==='ftyp';if(ext==='webm')return [26,69,223,163].every((v,i)=>b[i]===v);if(ext==='wav')return a(0,4)==='RIFF'&&a(8,12)==='WAVE';if(ext==='ogg')return a(0,4)==='OggS';return a(0,3)==='ID3'||(b[0]===255&&(b[1]&224)===224)}
async function digest(b){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function get(env,type,id){if(!idOK(id))deny(400,'Invalid identifier');const obj=await env.MEDIA_BUCKET.get(NS+type+'/'+id+'.json');if(!obj)deny(404,'Not found');return {value:await obj.json(),etag:obj.etag}}
async function put(env,type,data,etag){const result=await env.MEDIA_BUCKET.put(NS+type+'/'+data.id+'.json',JSON.stringify(data),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!result)deny(409,'Record changed; reload');return result}
async function audit(env,user,action,id){await env.MEDIA_BUCKET.put(NS+'audit/'+Date.now()+'-'+crypto.randomUUID()+'.json',JSON.stringify({at:new Date().toISOString(),actor:user.sub,action,id}),{httpMetadata:{contentType:'application/json'}})}
async function records(env,type){const data=[];let cursor;do{const page=await env.MEDIA_BUCKET.list({prefix:NS+type+'/',limit:100,...(cursor?{cursor}:{})});for(const o of page.objects){const r=await env.MEDIA_BUCKET.get(o.key);if(r)data.push(await r.json())}cursor=page.truncated?page.cursor:null;if(data.length>2000)deny(503,'Catalog pagination upgrade required')}while(cursor);return data}
async function relation(env,d){if(!idOK(d.workId))deny(400,'Choose a work');const w=(await get(env,'records',d.workId)).value;if(w.kind!=='work'||w.deleted)deny(400,'Invalid work');if(d.folderId){const f=(await get(env,'records',d.folderId)).value;if(f.kind!=='folder'||f.workId!==d.workId||f.deleted)deny(400,'Invalid folder')}if(!Array.isArray(d.categories)||!d.categories.length||d.categories.some(x=>!CATEGORIES.includes(x)))deny(400,'Invalid section')}
export function makeWorker(verify=authenticate){const audience=createEngagement({authenticate:verify,resolvePublished:async(id,env)=>{configured(env);if(!idOK(id))return null;let record;try{record=(await get(env,'records',id)).value}catch(e){if(e.status===404)return null;throw e}if(record.deleted||record.status!=='published'||!['media','external'].includes(record.kind)||record.kind==='media'&&!record.verified)return null;for(const parent of [record.workId,record.folderId].filter(Boolean)){const p=(await get(env,'records',parent)).value;if(p.deleted||p.status!=='published')return null}return {kind:record.mediaKind||'video',source:record.kind==='external'?'external':'r2'}}});return {async fetch(req,env){try{if(new URL(req.url).pathname.startsWith('/api/engagement/')||new URL(req.url).pathname.startsWith('/api/admin/engagement/'))return audience(req,env);

 const url=new URL(req.url),path=url.pathname;let user;
 if(path==='/health')return json({service:'mhy-platform-v2',configured:env.PRIVATE_BUCKET_CONFIRMED==='true'&&env.MFA_POLICY_CONFIRMED==='true'});
 if(path.startsWith('/admin')||path.startsWith('/api/admin/')){
  user=await verify(req,env);
  if(req.method!=='GET'&&req.method!=='HEAD'){if(!env.ADMIN_RATE_LIMIT)deny(503,'Administrative rate limit required');const rate=await env.ADMIN_RATE_LIMIT.limit({key:user.sub});if(!rate.success)deny(429,'Too many requests');const origin=req.headers.get('Origin');if(origin!==url.origin||req.headers.get('X-MHY-Admin')!=='1')deny(403,'Same-origin administrative request required')}
  if(path.startsWith('/admin')){if(!env.ADMIN_ASSETS)deny(503,'Admin assets unavailable');const u=new URL(req.url);u.pathname=u.pathname.replace(/^\/admin\/?/,'/');if(u.pathname==='/')u.pathname='/index.html';const response=await env.ADMIN_ASSETS.fetch(new Request(u,req));const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");return new Response(response.body,{status:response.status,headers})}
  if(path==='/api/admin/session')return json({authenticated:true,email:user.email});
 }
 configured(env);
 if(path==='/api/catalog'&&req.method==='GET'){const rows=await records(env,'records'),map=new Map(rows.map(r=>[r.id,r]));const published=r=>r&&!r.deleted&&r.status==='published';return json({items:rows.filter(r=>published(r)&&(!r.workId||published(map.get(r.workId)))&&(!r.folderId||published(map.get(r.folderId)))&&(['work','folder','external'].includes(r.kind)||r.verified)).map(({objectKey,sha256,revision,...r})=>r)})}
 if(path.startsWith('/media/')&&['GET','HEAD'].includes(req.method)){
  const id=path.slice(7),r=(await get(env,'records',id)).value;if(r.deleted||!r.verified||r.kind!=='media')deny(404,'Not found');
  let visible=r.status==='published';for(const parent of [r.workId,r.folderId].filter(Boolean)){const p=(await get(env,'records',parent)).value;if(p.deleted||p.status!=='published')visible=false}if(!visible)await verify(req,env);
  const download=url.searchParams.get('download')==='1';if(download&&!r.allowDownload)deny(403,'Download disabled');
  const headers=new Headers({'Content-Type':TYPES[r.ext],'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Disposition':download?'attachment; filename="'+r.id+'.'+r.ext+'"':'inline'});
  const head=await env.MEDIA_BUCKET.head(r.objectKey);if(!head)deny(404,'Not found');let range;
  const h=req.headers.get('Range');if(h){const m=/^bytes=(\d+)-(\d*)$/.exec(h);if(!m)deny(416,'Invalid range');const offset=Number(m[1]),end=m[2]?Math.min(Number(m[2]),head.size-1):head.size-1;if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(end)||offset>end||offset>=head.size)deny(416,'Invalid range');range={offset,length:end-offset+1};headers.set('Content-Range',`bytes ${offset}-${end}/${head.size}`)}
  headers.set('Content-Length',String(range?range.length:head.size));if(req.method==='HEAD')return new Response(null,{status:range?206:200,headers});const object=await env.MEDIA_BUCKET.get(r.objectKey,range?{range}:{});if(!object)deny(404,'Not found');return new Response(object.body,{status:range?206:200,headers});
 }
 if(!user)deny(404,'Not found');
 if(path==='/api/admin/records'&&req.method==='GET')return json({items:(await records(env,'records')).filter(r=>!r.deleted)});
 if(path==='/api/admin/records'&&req.method==='POST'){
  const d=await input(req);if(!['work','folder','external'].includes(d.kind)||!text(d.title))deny(400,'Invalid record');
  if(d.kind!=='work')await relation(env,d);let externalUrl;
  if(d.kind==='external'){try{const u=new URL(d.url);if(u.protocol!=='https:'||u.username||u.password)deny(400,'HTTPS link required');externalUrl=u.href}catch{deny(400,'Invalid link')}if(!text(d.platform,60))deny(400,'Platform required')}
  const row={id:crypto.randomUUID(),kind:d.kind,title:text(d.title),description:text(d.description,2000),categories:d.categories||[],workId:d.workId||null,folderId:d.folderId||null,status:d.status==='published'?'published':'draft',...(externalUrl?{url:externalUrl,platform:text(d.platform,60)}:{}),revision:1};await put(env,'records',row);await audit(env,user,'create',row.id);return json(row,201);
 }
 const recordMatch=/^\/api\/admin\/records\/([a-f0-9-]{36})$/.exec(path);
 if(recordMatch&&req.method==='PATCH'){
  const d=await input(req),{value:r,etag}=await get(env,'records',recordMatch[1]);if(d.revision!==r.revision)deny(409,'Reload record');if(d.title!==undefined&&!text(d.title))deny(400,'Title required');
  const updated={...r,title:d.title===undefined?r.title:text(d.title),description:d.description===undefined?r.description:text(d.description,2000),status:d.status===undefined?r.status:d.status,allowDownload:d.allowDownload===undefined?r.allowDownload:d.allowDownload===true,categories:d.categories||r.categories,folderId:d.folderId===undefined?r.folderId:d.folderId,revision:r.revision+1};
  if(!['draft','private','published'].includes(updated.status))deny(400,'Invalid state');if(r.kind==='media'&&updated.status==='published'&&!r.verified)deny(409,'Upload not verified');if(r.kind!=='work')await relation(env,updated);
  if(d.deleted===true){if(d.confirm!==r.id)deny(400,'Separate deletion confirmation required');updated.deleted=true;updated.status='private'}
  await put(env,'records',updated,etag);await audit(env,user,d.deleted?'soft-delete':'update',r.id);return json(updated);
 }
 if(path==='/api/admin/uploads'&&req.method==='POST'){
  const d=await input(req);await relation(env,d);const ext=text(d.filename,240).split('.').pop().toLowerCase();if(!TYPES[ext]||d.contentType!==TYPES[ext]||!Number.isSafeInteger(d.size)||d.size<1||d.size>MAX||!/^[a-f0-9]{64}$/.test(d.fingerprint||'')||!text(d.title))deny(400,'Invalid file/type/size');
  const id=crypto.randomUUID(),key=NS+'originals/'+id+'.'+ext;const upload=await env.MEDIA_BUCKET.createMultipartUpload(key,{httpMetadata:{contentType:TYPES[ext]}});
  const session={id,owner:user.sub,objectKey:key,uploadId:upload.uploadId,size:d.size,ext,title:text(d.title),description:text(d.description,2000),workId:d.workId,folderId:d.folderId||null,categories:d.categories,status:['published','private'].includes(d.status)?d.status:'draft',allowDownload:d.allowDownload===true,role:['cover','episode-cover'].includes(d.role)?d.role:'content',fingerprint:d.fingerprint,parts:[],createdAt:Date.now()};await put(env,'uploads',session);await audit(env,user,'upload-start',id);return json({id,partSize:PART},201);
 }
 const uploadMatch=/^\/api\/admin\/uploads\/([a-f0-9-]{36})(?:\/(\d+|complete))?$/.exec(path);
 if(uploadMatch){const {value:s,etag}=await get(env,'uploads',uploadMatch[1]);if(s.owner!==user.sub)deny(403,'Upload owner required');if(Date.now()-s.createdAt>7*86400000)deny(410,'Upload expired');if(req.method==='GET')return json({id:s.id,size:s.size,partSize:PART,parts:s.parts.map(p=>({partNumber:p.partNumber,etag:p.etag})),complete:s.complete===true});if(s.complete)deny(409,'Already completed');
  const upload=env.MEDIA_BUCKET.resumeMultipartUpload(s.objectKey,s.uploadId);
  if(req.method==='PUT'&&/^\d+$/.test(uploadMatch[2]||'')){
   const n=Number(uploadMatch[2]),count=Math.ceil(s.size/PART);if(n<1||n>count)deny(400,'Invalid part');const bytes=await bounded(req,PART),expected=n===count?s.size-PART*(n-1):PART;if(bytes.length!==expected)deny(400,'Part size mismatch');if(n===1&&!signature(bytes,s.ext))deny(415,'Invalid media signature');const hash=await digest(bytes);if(hash!==req.headers.get('X-Part-SHA256'))deny(400,'Part hash mismatch');const existing=s.parts.find(p=>p.partNumber===n);if(existing){if(existing.sha256!==hash)deny(409,'Part differs');return json(existing)}
   const part=await upload.uploadPart(n,bytes);s.parts.push({...part,sha256:hash});await put(env,'uploads',s,etag);return json(part);
  }
  if(req.method==='POST'&&uploadMatch[2]==='complete'){
   if(s.parts.length!==Math.ceil(s.size/PART))deny(409,'Missing parts');s.parts.sort((a,b)=>a.partNumber-b.partNumber);if(!await env.MEDIA_BUCKET.head(s.objectKey))await upload.complete(s.parts.map(({partNumber,etag})=>({partNumber,etag})));
   const head=await env.MEDIA_BUCKET.head(s.objectKey),probe=await env.MEDIA_BUCKET.get(s.objectKey,{range:{offset:0,length:Math.min(128,s.size)}});if(!head||head.size!==s.size||!probe||!signature(new Uint8Array(await probe.arrayBuffer()),s.ext))deny(502,'Readback verification failed');
   const row={id:s.id,kind:'media',title:s.title,description:s.description,workId:s.workId,folderId:s.folderId,categories:s.categories,status:s.status,allowDownload:s.allowDownload,role:s.role,ext:s.ext,mediaKind:TYPES[s.ext].split('/')[0],objectKey:s.objectKey,size:s.size,verified:true,revision:1};try{await get(env,'records',row.id)}catch(e){if(e.status!==404)throw e;await put(env,'records',row)}s.complete=true;await put(env,'uploads',s,etag);await audit(env,user,'upload-verified',s.id);return json(row,201);
  }
 }
 deny(404,'Not found');
 }catch(e){return json({error:e.status?e.message:'Operation failed; retry after checking storage'},e.status||503)}}}}
export default makeWorker();
