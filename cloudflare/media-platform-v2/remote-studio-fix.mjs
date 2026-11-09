import {writeFile} from 'node:fs/promises';import {spawn} from 'node:child_process';
await writeFile('release/migration-entry.mjs',"import {migrateStudioAds} from '../migrate-studio-ads.mjs';export default {fetch(){return new Response('Not found',{status:404})},async scheduled(e,env){await migrateStudioAds(env)}};");
await writeFile('release/preview.json',JSON.stringify({name:'mhy-media-admin-trial',main:'migration-entry.mjs',compatibility_date:'2026-11-01',r2_buckets:[{binding:'MEDIA_BUCKET',bucket_name:'mhyproduction-private-media',preview_bucket_name:'mhyproduction-private-media'}],vars:{PRIVATE_BUCKET_CONFIRMED:'true',MFA_POLICY_CONFIRMED:'true'}}));
const child=spawn('npx',['--yes','wrangler@4.158.0','dev','--remote','--test-scheduled','--port','8787','--ip','127.0.0.1','--config','release/preview.json'],{stdio:['ignore','pipe','pipe'],env:{...process.env,CLOUDFLARE_ACCOUNT_ID:process.env.CLOUDFLARE_ACCOUNT_ID.trim(),CLOUDFLARE_API_TOKEN:process.env.CLOUDFLARE_API_TOKEN.trim()},detached:true});
child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
try{
 let ready=false;for(let n=0;n<60;n++){if(child.exitCode!==null)throw Error('Remote binding preview stopped');try{const r=await fetch('http://127.0.0.1:8787/',{signal:AbortSignal.timeout(2000)});if(r.status===404){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}if(!ready)throw Error('Remote binding preview not ready');
 const r=await fetch('http://127.0.0.1:8787/__scheduled',{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Internal migration invocation failed '+r.status);console.log('INTERNAL_BINDING_MIGRATION_INVOKED=true');
}finally{try{process.kill(-child.pid,'SIGTERM')}catch{}}
