// Owner-only MFA enrollment portal. Does not alter the protected Worker or its policies.
import {pathToFileURL} from 'node:url';
const HOST='mhy-media-admin-trial.mhyprodection.workers.dev';
const TEAM='patient-cloud-f156.cloudflareaccess.com';
const fail=m=>{throw Error(m)};
const totp=c=>c?.mfa_disabled===false&&c.allowed_authenticators?.length===1&&c.allowed_authenticators[0]==='totp';
const ownerOnly=(policies,email)=>Array.isArray(policies)&&policies.length===1&&policies[0].decision==='allow'&&policies[0].include?.length===1&&policies[0].include[0].email?.email?.trim().toLowerCase()===email&&!(policies[0].exclude||[]).length&&!(policies[0].require||[]).length;
export async function ensureOwnerLauncher(api){
 const apps=await api('access/apps?per_page=100');
 if(!Array.isArray(apps)||apps.length>=100)fail('Complete application inventory required');
 const matches=apps.filter(a=>a.type==='self_hosted'&&a.domain===HOST);
 if(matches.length!==1)fail('Exactly one protected trial application required');
 const trial=await api('access/apps/'+matches[0].id);
 const policies=await api('access/apps/'+trial.id+'/policies');
 const settings=await api('workers/scripts/mhy-media-admin-trial/settings');
 const owner=settings?.bindings?.find(b=>b.name==='ADMIN_EMAIL'&&b.type==='plain_text')?.text?.trim().toLowerCase();
 if(!owner||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner))fail('Trusted existing administrator email required');
 if(!ownerOnly(policies,owner)||policies[0].name!=='MHY Admin Only'||!totp(policies[0].mfa_config)||!totp(trial.mfa_config))fail('Existing owner-only trial TOTP protection required');
 if(!settings.bindings?.some(b=>b.type==='r2_bucket'&&b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media'))fail('Existing private binding required');
 const org=await api('access/organizations');
 if(org?.auth_domain!==TEAM||!org.mfa_config?.allowed_authenticators?.includes('totp'))fail('Trusted team and enabled TOTP required');
 const providers=await api('access/identity_providers');
 const allowed=Array.isArray(providers)?providers.filter(p=>!(trial.allowed_idps?.length)||trial.allowed_idps.includes(p.id)):[];
 if(allowed.length!==1||allowed[0].type!=='cloudflare'||!allowed[0].id)fail('Exactly one existing Cloudflare identity provider required');
 const before=JSON.stringify({trial,policies,org});
 const launchers=apps.filter(a=>a.type==='app_launcher');
 if(launchers.length>1)fail('Ambiguous existing enrollment portal; no changes made');
 let launcher=launchers[0],created=false;
 if(!launcher){
  // One request creates the portal with its owner-only policy; no open intermediate policy.
  launcher=await api('access/apps','POST',{type:'app_launcher',name:'MHY Owner MFA Enrollment',domain:TEAM,allowed_idps:[allowed[0].id],auto_redirect_to_identity:false,session_duration:'1h',policies:[{name:'MHY Owner Enrollment Only',decision:'allow',precedence:1,include:[{email:{email:owner}}],exclude:[],require:[]}]});
  created=true;
 }
 if(!launcher?.id)fail('Portal creation unverified');
 const saved=await api('access/apps/'+launcher.id);
 const savedPolicies=await api('access/apps/'+launcher.id+'/policies');
 if(saved.type!=='app_launcher'||saved.domain!==TEAM||!ownerOnly(savedPolicies,owner)||saved.allowed_idps?.length!==1||saved.allowed_idps[0]!==allowed[0].id)fail('Portal owner-only configuration could not be verified');
 const after=JSON.stringify({trial:await api('access/apps/'+trial.id),policies:await api('access/apps/'+trial.id+'/policies'),org:await api('access/organizations')});
 if(before!==after)fail('Protected trial or organization configuration changed; stop for review');
 return {created,ownerOnly:true,existingIdentityProvider:true,trialTotpUnchanged:true,organizationUnchanged:true,loginVerified:false,adminSubjectPinned:false,workerDeployed:false};
}
async function main(){
 const token=process.env.CLOUDFLARE_API_TOKEN?.trim(),account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
 if(process.env.GITHUB_REF!=='refs/heads/mhy-library-admin-20261107'||!/^[a-f0-9]{32}$/i.test(account||'')||!token)fail('Authorized trial context required');
 const api=async(path,method='GET',body)=>{
  if(!/^access\/(apps(?:\?.*)?|apps\/[a-z0-9-]+(?:\/policies)?|organizations|identity_providers)$/.test(path)&&path!=='workers/scripts/mhy-media-admin-trial/settings')fail('Endpoint outside approved scope');
  if(method!=='GET'&&!(method==='POST'&&path==='access/apps'&&body?.type==='app_launcher'))fail('Mutation outside enrollment scope');
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/'+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.success!==true)fail('Cloudflare enrollment operation HTTP='+r.status+' CODES='+(d?.errors||[]).map(e=>Number(e.code)).join(','));
  return d.result;
 };
 console.log('OWNER_ENROLLMENT_PORTAL='+JSON.stringify(await ensureOwnerLauncher(api)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
