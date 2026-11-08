// Read-only Cloudflare preflight. Never print responses, identities or credentials.
const token=(process.env.CLOUDFLARE_API_TOKEN||'').trim();
const account=(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
console.log('CLOUDFLARE_API_TOKEN: '+(token?'present':'missing'));
console.log('CLOUDFLARE_ACCOUNT_ID: '+(account?'present':'missing'));
if(!token||!/^[a-f0-9]{32}$/i.test(account))process.exit(1);
async function check(label,path){
 try{
 const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{Authorization:'Bearer '+token}});
 const d=await r.json();
 console.log(label+': HTTP '+r.status+', success='+(d.success===true));
 return d.success?d.result:null;
 }catch{console.log(label+': request failed');return null}
}
const settings=await check('Trial Worker settings','accounts/'+account+'/workers/scripts/mhy-media-admin-trial/settings');
if(settings){
 console.log('Expected private R2 binding: '+Boolean(settings.bindings?.some(b=>b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media')));
 console.log('Admin rate limiter configured: '+Boolean(settings.bindings?.some(b=>b.name==='ADMIN_RATE_LIMIT'&&b.type==='ratelimit')));
}
const apps=await check('Access application read permission','accounts/'+account+'/access/apps?per_page=100');
if(Array.isArray(apps)){
 const trial=apps.filter(a=>JSON.stringify([a.domain,a.destinations]).includes('mhy-media-admin-trial'));
 console.log('Applications explicitly matching trial Worker: '+trial.length);
 for(const app of trial){
 const policies=await check('Trial Access policies','accounts/'+account+'/access/apps/'+app.id+'/policies');
 if(Array.isArray(policies)){
 console.log('Trial allow policies: '+policies.filter(p=>p.decision==='allow').length);
 console.log('Trial bypass policies: '+policies.filter(p=>p.decision==='bypass').length);
 console.log('Explicit MFA requirement present: '+policies.some(p=>JSON.stringify(p.require||[]).includes('"mfa"')));
 }
 }
}
console.log('READ_ONLY_PREFLIGHT_COMPLETE; no deployment or security changes performed.');
console.log('Workers edit scope and actual MFA/login remain unproven by read-only checks.');
