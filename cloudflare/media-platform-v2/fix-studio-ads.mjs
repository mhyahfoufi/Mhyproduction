// Only reclassify the two owner-approved existing works. Never create records.
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const ids=['80d75cc4-120f-40f1-97e3-57faccca2c94','8242f384-b8a2-4bcc-bfaa-5a5a176cb763'];
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN?.trim();
if(!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('Existing credentials required');
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/mhyproduction-private-media/objects/`;
async function read(id){const r=await fetch(base+encodeURIComponent(`mhy-platform-v2/records/${id}.json`),{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw Error('Existing advertisement read failed '+r.status);return {row:await r.json(),etag:r.headers.get('etag')}}
const rows=await Promise.all(ids.map(read));
for(const [i,{row}]of rows.entries())if(row.id!==ids[i]||row.kind!=='work'||row.deleted||row.status!=='published'||!Array.isArray(row.categories)||row.categories.some(c=>!['trailers','studio-music'].includes(c))||!Number.isInteger(row.revision))throw Error('Unexpected advertisement state; no changes applied');
const dir=await mkdtemp(join(tmpdir(),'mhy-ad-fix-'));
try{
for(const [i,{row,etag}]of rows.entries()){
 if(row.categories.length===1&&row.categories[0]==='studio-music'){console.log('ALREADY_CORRECT='+row.id);continue}
 const current=await read(row.id);if(JSON.stringify(current.row)!==JSON.stringify(row)||current.etag!==etag)throw Error('Concurrent change detected');
 const updated={...row,categories:['studio-music'],revision:row.revision+1};
 const file=join(dir,ids[i]+'.json');await writeFile(file,JSON.stringify(updated));
 execFileSync('npx',['--yes','wrangler@4.158.0','r2','object','put',`mhyproduction-private-media/mhy-platform-v2/records/${row.id}.json`,'--remote','--file',file,'--content-type','application/json'],{stdio:'pipe',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:token}});
 const saved=(await read(row.id)).row;if(JSON.stringify(saved)!==JSON.stringify(updated))throw Error('Read-back mismatch');console.log('RECLASSIFIED='+row.id);
}
const r=await fetch('https://mhy-media-public.mhyprodection.workers.dev/api/catalog',{cache:'no-store'});if(!r.ok)throw Error('Public catalog unavailable');const data=await r.json();for(const id of ids){const matches=data.items.filter(x=>x.id===id);if(matches.length!==1||JSON.stringify(matches[0].categories)!=='["studio-music"]')throw Error('Public category verification failed')}
console.log('PUBLIC_ADVERTISEMENTS_VERIFIED=2');
}finally{await rm(dir,{recursive:true,force:true})}
