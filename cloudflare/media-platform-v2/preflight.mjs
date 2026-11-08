// Read-only diagnostics: never emit credentials, account IDs or raw responses.
const token=(process.env.CLOUDFLARE_API_TOKEN||'').trim(),account=(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
console.log('TOKEN_PRESENT='+Boolean(token));console.log('ACCOUNT_PRESENT='+Boolean(account));
if(!token||!/^[a-f0-9]{32}$/i.test(account))process.exit(1);
async function check(label,path){
 try{
 const r=await fetch('https://api.cloudflare.com/client/v4/'+path,{headers:{Authorization:'Bearer '+token}});
 const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{}
 console.log(label+': HTTP '+r.status+', JSON='+Boolean(d)+', success='+(d?.success===true));
 if(!d&&r.status===403)console.log(label+': NON_JSON_SECURITY_OR_GATEWAY_DENIAL');
 for(const e of d?.errors||[]){
 console.log(label+': error_code='+Number(e.code));
 const m=String(e.message||'').toLowerCase();
 console.log(label+': authentication_error='+/authenticat|unauthoriz|permission/.test(m)+', security_restriction='+/ip address|ip restriction|firewall|blocked|not allowed from/.test(m));
 }
 return d?.success?d.result:null;
 }catch{console.log(label+': REQUEST_FAILED');return null}
}
const settings=await check('TRIAL_SETTINGS','accounts/'+account+'/workers/scripts/mhy-media-admin-trial/settings');
if(settings)console.log('PRIVATE_BINDING='+settings.bindings?.some(b=>b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media'));
let identity=await check('USER_TOKEN_VERIFY','user/tokens/verify'),scope='user';
if(!identity){scope='accounts/'+account;identity=await check('ACCOUNT_TOKEN_VERIFY',scope+'/tokens/verify')}
if(identity?.id){
 console.log('TOKEN_ACTIVE='+(identity.status==='active'));
 const details=await check('TOKEN_PERMISSION_DETAILS',scope+'/tokens/'+identity.id);
 if(details){
 const groups=(details.policies||[]).filter(p=>p.effect==='allow').flatMap(p=>p.permission_groups||[]);
 console.log('WORKERS_EDIT_PERMISSION_LISTED='+groups.some(p=>/workers.*(edit|write|admin)/i.test(p.name||'')));
 console.log('ACCESS_READ_OR_EDIT_PERMISSION_LISTED='+groups.some(p=>/access.*(apps|applications).*?(read|edit|write)/i.test(p.name||'')));
 console.log('Permission names alone do not prove resource scope or override explicit denies.');
 }
}
await check('TRIAL_DEPLOYMENT_READ','accounts/'+account+'/workers/scripts/mhy-media-admin-trial/deployments');
const apps=await check('ACCESS_APPLICATIONS','accounts/'+account+'/access/apps?per_page=100');
if(Array.isArray(apps)){
 const trial=apps.filter(a=>JSON.stringify([a.domain,a.destinations]).includes('mhy-media-admin-trial'));
 console.log('MATCHING_TRIAL_ACCESS_APPS='+trial.length);
 for(const app of trial){
 const policies=await check('TRIAL_ACCESS_POLICIES','accounts/'+account+'/access/apps/'+app.id+'/policies');
 if(Array.isArray(policies)){
 console.log('ALLOW_POLICIES='+policies.filter(p=>p.decision==='allow').length);
 console.log('BYPASS_POLICIES='+policies.filter(p=>p.decision==='bypass').length);
 console.log('MFA_REQUIREMENT_CANDIDATE='+policies.some(p=>JSON.stringify(p.require||[]).includes('"mfa"')));
 }
 }
}
console.log('NO_MUTATIONS; DEPLOYMENT_LOCKED; actual MFA login is not tested.');
