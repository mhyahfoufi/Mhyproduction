const PREFIX = 'mhy-media/';
const MAX = 25 * 1024 * 1024;
const TYPES = {'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp','mp4':'video/mp4','webm':'video/webm'};
const json = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
export async function digest(value) {
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function authorized(request, hash) {
 const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43,128})$/)?.[1];
 if (!token || !/^[a-f0-9]{64}$/.test(hash || '')) return false;
 const actual = await digest(token); let diff=0;
 for(let i=0;i<64;i++) diff |= actual.charCodeAt(i)^hash.charCodeAt(i);
 return diff===0;
}
function keyOf(path) {
 let key; try { key=decodeURIComponent(path); } catch { fail(400,'Invalid key'); }
 if (!/^mhy-media\/[a-z0-9][a-z0-9/_-]{0,180}\.(png|jpe?g|webp|mp4|webm)$/.test(key) || key.includes('//')) fail(400,'Invalid key');
 return key;
}
function signature(bytes, ext) {
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(ext==='png') return bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]) && bytes.length>=8;
 if(ext==='jpg'||ext==='jpeg') return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(ext==='webp') return ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
 if(ext==='mp4') return ascii(4,8)==='ftyp';
 return bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163;
}
export default {async fetch(request,env) {
 try {
 const url=new URL(request.url), path=url.pathname;
 if(path==='/health' && request.method==='GET') return json({service:'mhy-media',version:1});
 if(!env.MEDIA_BUCKET) fail(503,'Storage unavailable');
 // No cookie authentication, no CORS allowlist, and no public management interface.
 if(path==='/v1/media' && request.method==='GET') {
  if(!await authorized(request,env.MEDIA_READ_TOKEN_SHA256) && !await authorized(request,env.MEDIA_UPLOAD_TOKEN_SHA256)) fail(401,'Unauthorized');
  const cursor=url.searchParams.get('cursor'); if(cursor && cursor.length>2048) fail(400,'Invalid cursor');
  const result=await env.MEDIA_BUCKET.list({prefix:PREFIX,limit:100,...(cursor?{cursor}:{})});
  return json({items:result.objects.map(o=>({key:o.key,size:o.size,etag:o.httpEtag,uploaded:o.uploaded})),cursor:result.truncated?result.cursor:null});
 }
 const publicRead=path.startsWith('/media/');
 const write=path.startsWith('/v1/media/');
 if(!publicRead && !write) fail(404,'Not found');
 if(publicRead && !['GET','HEAD'].includes(request.method)) fail(405,'Method disabled');
 if(write && request.method!=='PUT') fail(405,'Deletion and replacement disabled');
 if(write && !await authorized(request,env.MEDIA_UPLOAD_TOKEN_SHA256)) fail(401,'Unauthorized');
 const key=keyOf(path.slice(publicRead?7:10));
 if(publicRead) {
  const object=await env.MEDIA_BUCKET.head(key); if(!object) fail(404,'Not found');
  const headers=new Headers({'Content-Type':TYPES[key.split('.').pop()],'ETag':object.httpEtag,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'});
  if(request.headers.get('If-None-Match')===object.httpEtag) return new Response(null,{status:304,headers});
  if(request.method==='HEAD') { headers.set('Content-Length',String(object.size)); return new Response(null,{headers}); }
  let range; const raw=request.headers.get('Range');
  if(raw) {
   const m=raw.match(/^bytes=(\d+)-(\d*)$/); if(!m) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${object.size}`}});
   const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),object.size-1):object.size-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=object.size) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${object.size}`}});
   range={offset:start,length:end-start+1}; headers.set('Content-Range',`bytes ${start}-${end}/${object.size}`);
  }
  const body=await env.MEDIA_BUCKET.get(key,{onlyIf:{etagMatches:object.etag},...(range?{range}:{})});
  if(!body || !('body' in body)) fail(409,'Object changed; retry');
  headers.set('Content-Length',String(range?range.length:object.size));
  return new Response(body.body,{status:range?206:200,headers});
 }
 const length=request.headers.get('Content-Length');
 if(!length || !/^\d+$/.test(length)) fail(411,'Content-Length required');
 const size=Number(length); if(!size||size>MAX) fail(413,'Maximum upload is 25 MiB');
 const ext=key.split('.').pop(), type=TYPES[ext];
 if(request.headers.get('Content-Type')!==type) fail(415,'Type does not match extension');
 if(!request.body) fail(400,'Empty body');
 const reader=request.body.getReader(),chunks=[]; let total=0;
 while(true) { const {value,done}=await reader.read(); if(done) break; total+=value.byteLength; if(total>MAX||total>size) {await reader.cancel(); fail(413,'Body exceeds declared limit');} chunks.push(value); }
 if(total!==size) fail(400,'Size mismatch');
 const data=new Uint8Array(total); let offset=0; for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 if(!signature(data,ext)) fail(415,'Invalid file signature');
 // Atomic create-only operation prevents concurrent writers replacing an object.
 const result=await env.MEDIA_BUCKET.put(key,data,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType:type},customMetadata:{source:'mhy-media-v1'}});
 if(!result) fail(409,'Key exists; choose a new name');
 return json({key,size:total,url:`${url.origin}/media/${key}`,etag:result.httpEtag},201);
 } catch(error) {return json({error:error.status?error.message:'Storage operation failed'},error.status||503);}
}};
