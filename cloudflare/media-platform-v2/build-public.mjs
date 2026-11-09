import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const confirmed=JSON.parse(await readFile('release/wrangler.json','utf8'));
if(confirmed.name!=='mhy-media-admin-trial'||confirmed.vars?.PRIVATE_BUCKET_CONFIRMED!=='true'||confirmed.vars?.MFA_POLICY_CONFIRMED!=='true')throw Error('Verified storage and protected identity required');
await mkdir('public-release',{recursive:true});
await build({entryPoints:['public-worker.mjs'],outfile:'public-release/worker.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await writeFile('public-release/wrangler.json',JSON.stringify({name:'mhy-media-public',main:'worker.mjs',compatibility_date:'2026-11-01',workers_dev:true,preview_urls:false,r2_buckets:[{binding:'MEDIA_BUCKET',bucket_name:'mhyproduction-private-media'}],vars:{PRIVATE_BUCKET_CONFIRMED:'true'}},null,2)+'\n');
console.log('Read-only gateway built without identity settings or admin endpoints.');
