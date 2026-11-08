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
 const safe=String(e.message||'').split(token).join('[redacted]').split(account).join('[redacted]').replace(/https?:\/\/\S+/g,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/[a-f0-9]{24,}/gi,'[id]').replace(/[^\x20-\x7e]/g,' ').slice(0,220); console.log(label+': reason='+safe);
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
 console.log('ACCESS_APPLICATION_COUNT='+apps.length);
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
// Independent checks continue even when Access has no application.
const bucket=await check('PRIVATE_BUCKET_EXISTS','accounts/'+account+'/r2/buckets/mhyproduction-private-media');
console.log('EXPECTED_BUCKET_IN_CONFIGURED_ACCOUNT='+Boolean(bucket?.name==='mhyproduction-private-media'));
const managed=await check('PRIVATE_BUCKET_MANAGED_DOMAIN','accounts/'+account+'/r2/buckets/mhyproduction-private-media/domains/managed');
const custom=await check('PRIVATE_BUCKET_CUSTOM_DOMAINS','accounts/'+account+'/r2/buckets/mhyproduction-private-media/domains/custom');
console.log('R2_MANAGED_PUBLIC_ACCESS_DISABLED='+(managed?.enabled===false));
console.log('R2_CUSTOM_PUBLIC_ACCESS_DISABLED='+(Array.isArray(custom?.domains)&&custom.domains.every(d=>d.enabled===false)));
const organization=await check('ACCESS_ORGANIZATION','accounts/'+account+'/access/organizations');
console.log('TRUSTED_ISSUER_AVAILABLE='+/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(organization?.auth_domain||''));
const methods=await check('ACCESS_IDENTITY_PROVIDERS','accounts/'+account+'/access/identity_providers');
if(Array.isArray(methods))console.log('IDENTITY_PROVIDER_COUNT='+methods.length);
const users=await check('ACCESS_USERS','accounts/'+account+'/access/users?per_page=100');
if(Array.isArray(users))console.log('ACCESS_USER_COUNT='+users.length);
// Never infer the administrator from an unrelated existing user.
const accounts=await check('ACCESSIBLE_ACCOUNTS','accounts?per_page=50');
if(Array.isArray(accounts)){
 console.log('VISIBLE_ACCOUNT_COUNT='+accounts.length);
 console.log('CONFIGURED_ACCOUNT_IN_VISIBLE_LIST='+accounts.some(a=>a.id===account));
 let alternateMatches=0;
 for(const other of accounts.filter(a=>a.id!==account).slice(0,10)){
  const otherApps=await check('ALTERNATE_ACCOUNT_ACCESS_APPLICATIONS','accounts/'+other.id+'/access/apps?per_page=100');
  if(Array.isArray(otherApps))alternateMatches+=otherApps.filter(a=>JSON.stringify([a.domain,a.destinations]).includes('mhy-media-admin-trial')).length;
 }
 console.log('ALTERNATE_ACCOUNT_TRIAL_ACCESS_MATCHES='+alternateMatches);
 console.log('ACCOUNT_INVENTORY_COMPLETE='+(accounts.length<50&&accounts.length<=11));
}
console.log('NO_MUTATIONS; DEPLOYMENT_LOCKED; actual MFA login is not tested.');
