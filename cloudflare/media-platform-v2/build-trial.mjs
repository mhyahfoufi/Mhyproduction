import {build} from 'esbuild';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const candidates=[resolve(root,'../../media-admin'),resolve(root,'../../dist/admin')];
let assets;
for(const p of candidates){try{await access(resolve(p,'admin.js'));assets=p;break}catch{}}
if(!assets)throw new Error('media-admin assets missing');
const files={};
for(const [name,type] of [['index.html','text/html; charset=utf-8'],['admin.js','text/javascript; charset=utf-8'],['admin.css','text/css; charset=utf-8'],['mhy-official-logo.png','image/png']]){
 let bytes;try{bytes=await readFile(resolve(assets,name))}catch(e){if(name!=='mhy-official-logo.png')throw e;bytes=await readFile(resolve(root,'../../mhy-official-logo.png'))}
 files['/'+name]={type,data:bytes.toString('base64')};
}
await mkdir(resolve(root,'release'),{recursive:true});
const entry=`import worker from './worker.mjs';
const files=${JSON.stringify(files)};
const assets={async fetch(req){const f=files[new URL(req.url).pathname];if(!f)return new Response('Not found',{status:404});return new Response(Uint8Array.from(atob(f.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':f.type,'Cache-Control':'no-store'}})}};
export default {fetch(req,env,ctx){return worker.fetch(req,{...env,ADMIN_ASSETS:assets},ctx)}};`;
await build({stdin:{contents:entry,resolveDir:root,sourcefile:'trial-entry.mjs'},outfile:resolve(root,'release/worker.mjs'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:false});
await writeFile(resolve(root,'release/wrangler.json'),JSON.stringify({name:'mhy-media-admin-trial',main:'worker.mjs',compatibility_date:'2026-11-01',keep_vars:true,ratelimits:[{name:'ADMIN_RATE_LIMIT',namespace_id:'2026110701',simple:{limit:60,period:60}}],r2_buckets:[{binding:'MEDIA_BUCKET',bucket_name:'mhyproduction-private-media'}],vars:{PRIVATE_BUCKET_CONFIRMED:'false',MFA_POLICY_CONFIRMED:'false',ENGAGEMENT_ENABLED:'false'}},null,2)+'\n');
console.log('Built isolated trial bundle; admin remains locked until security configuration is verified.');
