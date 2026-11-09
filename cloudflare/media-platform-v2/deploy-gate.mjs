// Read-only security checks. No credentials or API response bodies are logged.
import {readFile,writeFile} from 'node:fs/promises';
const account=(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=(process.env.CLOUDFLARE_API_TOKEN||'').trim();
const fail=message=>{throw new Error(message)};
async function api(path){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`,{headers:{Authorization:`Bearer ${token}`}});
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.success!==true){
  if(data?.errors?.some(e=>String(e.message).includes('access.api.error.not_enabled')))fail('Cloudflare Access is not enabled on this account. Deployment blocked.');
  fail(`Security verification unavailable (HTTP ${response.status}); deployment blocked.`);
 }
 return data.result;
}
try{
 if(!['refs/heads/mhy-library-admin-20261107','refs/heads/main'].includes(process.env.GITHUB_REF))fail('Trial branch required');
 if(!token||!/^[a-f0-9]{32}$/i.test(account))fail('Existing Cloudflare credentials unavailable');
 const settings=await api('workers/scripts/mhy-media-admin-trial/settings');
 if(!settings.bindings?.some(b=>b.type==='r2_bucket'&&b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media'))fail('Existing private R2 binding mismatch');
 const apps=await api('access/apps?per_page=100');
 console.log('ACCESS_API_READABLE=true');
 console.log('TRIAL_ACCESS_APPLICATIONS='+ (Array.isArray(apps)?apps.filter(a=>/^mhy-media-admin-trial\.[a-z0-9-]+\.workers\.dev$/.test(a.domain||'')).length:0));
 if(!Array.isArray(apps)||apps.length>=100)fail('Complete Access application inventory required');
 const vars=Object.fromEntries((settings.bindings||[]).filter(b=>b.type==='plain_text').map(b=>[b.name,b.text]));
 const required=['ACCESS_ISSUER','ACCESS_AUD','ADMIN_SUB','ADMIN_EMAIL'];
 for(const name of required){
  const binding=settings.bindings.find(b=>b.name===name);
  console.log(name+'_STATE='+(!binding?'absent':binding.type==='plain_text'?(binding.text?'readable':'empty'):'unreadable'));
 }
 if(!apps.some(a=>/^mhy-media-admin-trial\.[a-z0-9-]+\.workers\.dev$/.test(a.domain||'')))fail('No Access application covers the full trial hostname. Deployment blocked before MFA or identity verification.');
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(vars.ACCESS_ISSUER||'')||!vars.ACCESS_AUD||!vars.ADMIN_EMAIL)fail('Existing administrator identity configuration missing');
 const matching=apps.filter(a=>a.aud===vars.ACCESS_AUD&&/^mhy-media-admin-trial\.[a-z0-9-]+\.workers\.dev$/.test(a.domain||''));
 if(matching.length!==1)fail('One Access application covering the entire trial hostname is required');
 const policies=await api(`access/apps/${matching[0].id}/policies`);
 if(!Array.isArray(policies)||policies.some(p=>['bypass','non_identity'].includes(p.decision)))fail('Access bypass or service authentication is not allowed');
 const allow=policies.filter(p=>p.decision==='allow');
 if(!allow.length||!allow.every(p=>p.mfa_config?.mfa_disabled===false&&p.mfa_config.allowed_authenticators?.length===1&&p.mfa_config.allowed_authenticators[0]==='totp'&&p.include?.length&&p.include.every(r=>r.email?.email?.toLowerCase()===vars.ADMIN_EMAIL.toLowerCase())))fail('Every allow policy must require MFA and restrict access to the configured owner email');
 // The documented Access identity user_uuid is the user ID used by the JWT sub.
 // Resolve only the unique owner established by the existing owner-only policy.
 const users=await api('access/users?per_page=100&email='+encodeURIComponent(vars.ADMIN_EMAIL));
 if(!Array.isArray(users)||users.length>=100)fail('Complete trusted user inventory required');
 const owners=users.filter(u=>u.email?.toLowerCase().trim()===vars.ADMIN_EMAIL.toLowerCase().trim());
 if(owners.length!==1||!owners[0].id)fail('Unique trusted owner required');
 const identity=await api('access/users/'+encodeURIComponent(owners[0].id)+'/last_seen_identity');
 if(identity?.email?.toLowerCase().trim()!==vars.ADMIN_EMAIL.toLowerCase().trim()||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(identity?.user_uuid||''))fail('Trusted Access owner identity missing or mismatched');
 if(vars.ADMIN_SUB&&vars.ADMIN_SUB!==identity.user_uuid)fail('Existing owner subject differs from trusted Access identity');
 vars.ADMIN_SUB=identity.user_uuid;
 if(process.env.GITHUB_ACTIONS==='true')for(const name of ['ACCESS_ISSUER','ACCESS_AUD','ADMIN_EMAIL','ADMIN_SUB'])console.log('::add-mask::'+vars[name]);
 console.log('TRUSTED_OWNER_SUBJECT_RESOLVED=true');
 const publicAccess=await api('r2/buckets/mhyproduction-private-media/domains/managed');
 const custom=await api('r2/buckets/mhyproduction-private-media/domains/custom');
 if(publicAccess.enabled!==false||!Array.isArray(custom.domains)||custom.domains.some(d=>d.enabled!==false))fail('R2 public exposure could not be ruled out');
 // Policy inspection alone cannot prove that a real MFA session was tested.
 if(process.env.MFA_LOGIN_VERIFIED!=='true')fail('Live owner MFA login and private storage verification are still required');
 vars.MFA_POLICY_CONFIRMED='true';
 vars.PRIVATE_BUCKET_CONFIRMED='true';
 const config=JSON.parse(await readFile('release/wrangler.json','utf8'));
 if(!settings.bindings.some(b=>b.name==='ADMIN_RATE_LIMIT'&&b.type==='ratelimit'&&b.simple?.limit===60&&b.simple?.period===60))fail('Existing runtime rate limit must be 60 per 60 seconds');
 if(!config.ratelimits?.some(b=>b.name==='ADMIN_RATE_LIMIT'&&b.simple?.limit===60&&b.simple?.period===60))fail('Deployment rate limit missing');
 if(config.name!=='mhy-media-admin-trial')fail('Unexpected Worker target');
 config.vars={...config.vars,...Object.fromEntries(['ACCESS_ISSUER','ACCESS_AUD','ADMIN_SUB','ADMIN_EMAIL','MFA_POLICY_CONFIRMED','PRIVATE_BUCKET_CONFIRMED'].map(k=>[k,vars[k]]))};
 await writeFile('release/wrangler.json',JSON.stringify(config,null,2)+'\n');
 console.log('Trial security checks passed. Production targets remain excluded.');
}catch(error){console.error(error.message);process.exitCode=1}
