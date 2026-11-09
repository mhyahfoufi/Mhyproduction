import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePublicWorker} from './public-worker.mjs';
const id=n=>String(n).padStart(8,'0')+'-1111-1111-1111-111111111111';
function fixture(){
 const rows=[{id:id(1),kind:'work',status:'published'},{id:id(2),kind:'work',status:'draft'},...[[3,1,'published'],[4,1,'draft'],[5,2,'published'],[6,1,'private']].map(([n,parent,status])=>({id:id(n),workId:id(parent),kind:'media',status,verified:true,ext:'mp4',objectKey:'secret/'+n,size:16})),{id:id(7),workId:id(1),kind:'media',status:'published',verified:false}];
 const data=new Map(rows.map(r=>['mhy-platform-v2/records/'+r.id+'.json',r]));
 const bucket={list:async()=>({objects:[...data.keys()].map(key=>({key})),truncated:false}),get:async(key)=>data.has(key)?{json:async()=>data.get(key)}:key.startsWith('secret/')?{body:new Uint8Array(16)}:null,head:async()=>({size:16})};
 return {env:{MEDIA_BUCKET:bucket,PRIVATE_BUCKET_CONFIRMED:'true'},worker:makePublicWorker()};
}
const request=(c,path,method='GET',origin='https://mhyahfoufi.github.io')=>c.worker.fetch(new Request('https://public.test'+path,{method,headers:origin?{Origin:origin}:{}}),c.env);
test('catalog hides drafts, private and unverified files and unpublished parents',async()=>{const c=fixture(),r=await request(c,'/api/catalog');assert.equal(r.status,200);assert.equal((await request(c,'/api/catalog','HEAD')).status,200);const {items}=await r.json();assert.deepEqual(items.map(r=>r.id),[id(1),id(3)]);assert.ok(items.every(r=>!('objectKey'in r)));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://mhyahfoufi.github.io')});
test('gateway denies writes, admin, arbitrary keys and foreign origin',async()=>{const c=fixture();for(const path of ['/admin/','/api/admin/session','/api/admin/uploads','/media/secret/3','/api/engagement/session'])assert.equal((await request(c,path)).status,404);for(const m of ['POST','PUT','PATCH','DELETE'])assert.equal((await request(c,'/api/catalog',m)).status,405);assert.equal((await request(c,'/api/catalog','GET','https://evil.test')).status,403);assert.equal((await request(c,'/api/catalog','OPTIONS')).status,204)});
test('media requires publication of file and parents; HEAD and ranges work',async()=>{const c=fixture();for(const n of [4,5,6,7])assert.equal((await request(c,'/media/'+id(n))).status,404);assert.equal((await request(c,'/media/'+id(3))).status,200);const r=await request(c,'/media/'+id(3),'HEAD');assert.equal(r.status,200);assert.equal((await r.arrayBuffer()).byteLength,0);const range=await c.worker.fetch(new Request('https://public.test/media/'+id(3),{headers:{Range:'bytes=0-7'}}),c.env);assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 0-7/16')});
test('unconfirmed storage fails closed',async()=>{const c=fixture();delete c.env.PRIVATE_BUCKET_CONFIRMED;assert.equal((await request(c,'/api/catalog')).status,503)});
