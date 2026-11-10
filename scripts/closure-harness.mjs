// Test-only adapters. No live Cloudflare storage, identity, database or challenge is used.
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {makeWorker} from '../cloudflare/media-platform-v2/worker.mjs';
import {makePublicWorker} from '../cloudflare/media-platform-v2/public-worker.mjs';
import {legacyRegistry} from '../cloudflare/media-platform-v2/engagement/build-registry.mjs';
import {buildFrame} from '../cloudflare/media-platform-v2/engagement/build-frame.mjs';
export class Bucket{
 data=new Map();uploads=new Map();n=0;
 async put(key,value,opts={}){const old=this.data.get(key),c=opts.onlyIf;if(c?.etagDoesNotMatch==='*'&&old||c?.etagMatches&&old?.etag!==c.etagMatches)return null;const bytes=typeof value==='string'?Buffer.from(value):Buffer.from(value),etag=String(++this.n);this.data.set(key,{bytes,etag});return{etag,size:bytes.length};}
 async get(key,opts={}){const r=this.data.get(key);if(!r)return null;const bytes=opts.range?r.bytes.subarray(opts.range.offset,opts.range.offset+opts.range.length):r.bytes;return{etag:r.etag,body:new Blob([bytes]).stream(),json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>Uint8Array.from(bytes).buffer};}
 async head(key){const r=this.data.get(key);return r?{size:r.bytes.length}:null;}
 async list({prefix=''}){return{objects:[...this.data.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false};}
 async createMultipartUpload(key){const uploadId=crypto.randomUUID();this.uploads.set(uploadId,{key,parts:new Map()});return{uploadId};}
 resumeMultipartUpload(key,id){const session=this.uploads.get(id);return{uploadPart:async(n,b)=>{session.parts.set(n,b);return{partNumber:n,etag:'part-'+n}},complete:async parts=>{await this.put(key,Buffer.concat(parts.map(p=>Buffer.from(session.parts.get(p.partNumber)))));}};}
}
export class D1{
 constructor(schema){this.db=new DatabaseSync(':memory:');this.db.exec(schema);}
 prepare(q){const s=this.db.prepare(q);return{bind:(...p)=>({first:async()=>s.get(...p)||null,all:async()=>({results:s.all(...p)}),run:async()=>({meta:s.run(...p)})})};}
 async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
export async function fixture({engagement=true}={}){
 const legacy=await legacyRegistry(),bucket=new Bucket(),db=new D1(await readFile(new URL('../cloudflare/media-platform-v2/engagement/0001_engagement.sql',import.meta.url),'utf8'));
 const env={MEDIA_BUCKET:bucket,PRIVATE_BUCKET_CONFIRMED:'true',MFA_POLICY_CONFIRMED:'true',ADMIN_RATE_LIMIT:{limit:async()=>({success:true})},ENGAGEMENT_ENABLED:engagement?'true':'false',ENGAGEMENT_DB:db,ENGAGEMENT_RATE_LIMIT:{limit:async()=>({success:true})},TURNSTILE_SECRET:'test-only-not-a-credential',TURNSTILE_SITEKEY:'test-site-key',ENGAGEMENT_HOSTNAME:'mhy-media-public.mhyprodection.workers.dev',ENGAGEMENT_COOKIE_SECRET:'test-only-'.repeat(8),ENGAGEMENT_FRAME_ASSETS:await buildFrame()};
 const verify=async r=>{if(!r.headers.get('cookie')?.includes('test_admin=1'))throw Object.assign(Error('Sign in required'),{status:401});return{sub:'test-owner',email:'owner@example.test'};};
 const challenge={verifyFetch:async(_,options)=>{const token=options.body.get('response'),action=token==='test-session'?'session':token==='test-comment'?'comment':'';return Response.json({success:!!action,action,hostname:env.ENGAGEMENT_HOSTNAME});}};
 const worker=makeWorker(verify,legacy,challenge),publicWorker=makePublicWorker(makeWorker(async()=>{throw Object.assign(Error('Denied'),{status:404});},legacy,challenge),legacy);
 return{env,bucket,db,worker,publicWorker,legacy};
}
export function adminRequest(c,path,method='GET',data,origin='https://admin.test'){
 return c.worker.fetch(new Request(origin+path,{method,headers:{Cookie:'test_admin=1',Origin:origin,'X-MHY-Admin':'1',...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined}),c.env);
}
