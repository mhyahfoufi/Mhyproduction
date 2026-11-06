import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{digest} from './worker.mjs';
const token='a'.repeat(43),read='b'.repeat(43),png=new Uint8Array([137,80,78,71,13,10,26,10]);
async function setup(){
 const objects=new Map();
 const env={MEDIA_UPLOAD_TOKEN_SHA256:await digest(token),MEDIA_READ_TOKEN_SHA256:await digest(read),MEDIA_BUCKET:{
  async put(key,data,options){assert.equal(options.onlyIf.get('If-None-Match'),'*'); if(objects.has(key)) return null; const o={key,size:data.length,etag:'abc',httpEtag:'"abc"',uploaded:new Date(),data};objects.set(key,o);return o;},
  async head(key){return objects.get(key)||null;},
  async get(key,options){const o=objects.get(key);if(!o)return null;const r=options?.range;return {...o,body:r?o.data.slice(r.offset,r.offset+r.length):o.data};},
  async list(){return {objects:[...objects.values()],truncated:false};}
 }};
 const call=(path,method='GET',body,auth=token,headers={})=>worker.fetch(new Request('https://media.example'+path,{method,headers:{...(auth?{Authorization:`Bearer ${auth}`} :{}),...(body?{'Content-Length':String(body.length),'Content-Type':'image/png'}:{}),...headers},...(body?{body}: {})}),env);
 return {call,env,objects};
}
test('public reads; authenticated create; duplicate protection; range',async()=>{const {call}=await setup();const p='/v1/media/mhy-media/test.png';assert.equal((await call(p,'PUT',png)).status,201);assert.equal((await call(p,'PUT',png)).status,409);const r=await call('/media/mhy-media/test.png','GET',undefined,null);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),png);const ranged=await call('/media/mhy-media/test.png','GET',undefined,null,{Range:'bytes=1-3'});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,3);});
test('missing, invalid and read-only credentials cannot upload',async()=>{const {call}=await setup();for(const auth of [null,'c'.repeat(43),read])assert.equal((await call('/v1/media/mhy-media/test.png','PUT',png,auth)).status,401);});
test('listing is private and read credential is accepted',async()=>{const {call}=await setup();assert.equal((await call('/v1/media','GET',undefined,null)).status,401);assert.equal((await call('/v1/media','GET',undefined,read)).status,200);});
test('delete disabled; existing unrelated keys inaccessible',async()=>{const {call}=await setup();assert.equal((await call('/v1/media/mhy-media/test.png','DELETE')).status,405);assert.equal((await call('/media/old/test.png')).status,400);});
test('reject active content, signature mismatch, traversal, oversize and missing length',async()=>{const {call}=await setup();assert.equal((await call('/v1/media/mhy-media/test.svg','PUT',png)).status,400);assert.equal((await call('/v1/media/mhy-media/test.png','PUT',new Uint8Array([1,2]))).status,415);assert.equal((await call('/v1/media/mhy-media/a%2F..%2Fb.png','PUT',png)).status,400);assert.equal((await call('/v1/media/mhy-media/test.png','PUT',png,token,{'Content-Length':String(26*1024*1024)})).status,413);assert.equal((await call('/v1/media/mhy-media/test.png','PUT')).status,411);});
test('fail closed when secrets or binding missing; no storage error detail',async()=>{const {call,env}=await setup();delete env.MEDIA_UPLOAD_TOKEN_SHA256;assert.equal((await call('/v1/media/mhy-media/test.png','PUT',png)).status,401);delete env.MEDIA_BUCKET;assert.equal((await call('/v1/media')).status,503);});
test('webm and mp4 accepted, wrong MIME rejected',async()=>{const {call}=await setup();for(const [ext,type,data] of [['mp4','video/mp4',[0,0,0,16,102,116,121,112]],['webm','video/webm',[26,69,223,163]]])assert.equal((await call('/v1/media/mhy-media/test.'+ext,'PUT',new Uint8Array(data),token,{'Content-Type':type})).status,201);assert.equal((await call('/v1/media/mhy-media/wrong.png','PUT',png,token,{'Content-Type':'text/html'})).status,415);});
