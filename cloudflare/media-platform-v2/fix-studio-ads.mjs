// A temporary internal scheduled task uses the existing private R2 binding.
// No public migration route, Access change, token change or R2 exposure.
import {readFile,writeFile} from 'node:fs/promises';
import {advertisementIds} from './migrate-studio-ads.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN?.trim();
if(!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('Existing credentials required');
const url=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/mhy-media-admin-trial/schedules`;
async function schedules(method='GET',body){const r=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok||!d.success)throw Error('Schedule operation failed '+r.status);return d.result.schedules}
const mode=process.argv[2];
if(mode==='prepare'){
 const current=await schedules();if(!Array.isArray(current)||current.length)throw Error('Existing schedules must be preserved; stopping');
 await writeFile('release/migration-schedule-authorized','yes');
 const config=JSON.parse(await readFile('release/wrangler.json','utf8'));config.triggers={crons:['* * * * *']};await writeFile('release/wrangler.json',JSON.stringify(config,null,2));
}else if(mode==='cleanup'){
 let authorized=false;try{authorized=await readFile('release/migration-schedule-authorized','utf8')==='yes'}catch{}
 if(authorized){const current=await schedules();if(current.some(x=>x.cron!=='* * * * *'))throw Error('Unexpected schedule; refusing removal');await schedules('PUT',[]);console.log('TEMPORARY_SCHEDULE_REMOVED=true')}
}else if(mode==='verify'){
 for(let n=0;n<30;n++){
  const r=await fetch('https://mhy-media-public.mhyprodection.workers.dev/api/catalog',{cache:'no-store'});if(!r.ok)throw Error('Public catalog unavailable');const data=await r.json();
  if(advertisementIds.every(id=>{const rows=data.items.filter(x=>x.id===id);return rows.length===1&&JSON.stringify(rows[0].categories)==='["studio-music"]'})){console.log('PUBLIC_ADVERTISEMENTS_VERIFIED=2');process.exit(0)}
  await new Promise(resolve=>setTimeout(resolve,10000));
 }
 throw Error('Scheduled migration verification timed out');
}else throw Error('Explicit prepare, verify or cleanup mode required');

