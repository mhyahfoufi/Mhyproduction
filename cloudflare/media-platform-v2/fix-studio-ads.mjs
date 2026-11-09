// Read-only release verification. Migration has no public HTTP endpoint.
import {advertisementIds} from './migrate-studio-ads.mjs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN?.trim();
if(!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('Existing credentials required');
const schedules=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/mhy-media-admin-trial/schedules`,{headers:{Authorization:`Bearer ${token}`}});const sd=await schedules.json();if(!schedules.ok||!sd.success||!Array.isArray(sd.result?.schedules)||sd.result.schedules.length)throw Error('Temporary migration schedule must be removed before final release');
const r=await fetch('https://mhy-media-public.mhyprodection.workers.dev/api/catalog',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Public catalog unavailable');const data=await r.json();
for(const id of advertisementIds){const rows=data.items.filter(x=>x.id===id);if(rows.length!==1||JSON.stringify(rows[0].categories)!=='["studio-music"]')throw Error('Existing advertisement classification must be corrected before final release')}
console.log('PUBLIC_ADVERTISEMENTS_VERIFIED=2');console.log('TEMPORARY_SCHEDULE_ABSENT=true');
