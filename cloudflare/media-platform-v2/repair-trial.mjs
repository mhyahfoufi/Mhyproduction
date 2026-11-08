// Scoped, idempotent repairs authorized for the isolated trial only.
const trial='mhy-media-admin-trial',account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),token=process.env.CLOUDFLARE_API_TOKEN?.trim();
if(process.env.GITHUB_REF!=='refs/heads/mhy-library-admin-20261107'||!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('Trial authorization unavailable');
async function api(path,method='GET',body){
 const headers={Authorization:'Bearer '+token};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const r=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/'+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>null);if(!r.ok||d?.success!==true)throw Error('HTTP '+r.status+' codes='+(d?.errors||[]).map(e=>Number(e.code)).join(','));
 return d.result;
}
async function task(name,fn){try{await fn();console.log(name+'=VERIFIED')}catch(e){console.log(name+'=BLOCKED '+e.message)}}
let app,ownerEmail,issuer,aud;
await task('ACCESS_REPAIR',async()=>{
 const apps=await api('access/apps?per_page=100');if(!Array.isArray(apps)||apps.length>=100)throw Error('Incomplete app inventory');
 const candidates=apps.filter(a=>a.name===trial||a.name?.toLowerCase()===trial.toLowerCase());
 if(candidates.length!==1)throw Error('Exactly one named trial app required; refusing unrelated application changes');
 app=await api('access/apps/'+candidates[0].id);
 console.log('TRIAL_DESTINATION_TYPES='+JSON.stringify((app.destinations||[]).map(d=>({type:d.type,keys:Object.keys(d).filter(k=>k!=='overrides')}))));
 const sub=await api('workers/subdomain');if(!/^[a-z0-9-]+$/.test(sub.subdomain||''))throw Error('Trusted Workers subdomain unavailable');
 const host=trial+'.'+sub.subdomain+'.workers.dev';
 const matches=app.domain===host||(app.destinations||[]).some(d=>d.type==='public'&&[host,'https://'+host].includes(d.uri));
 if(!matches){
 // Only a trial-named app with no unrelated public hostname may be corrected.
 if(app.domain&&app.domain!==host)throw Error('Existing app domain differs; refusing overwrite');
 if((app.destinations||[]).some(d=>d.type==='public'&&!JSON.stringify(d).includes(trial)))throw Error('Unrelated destination requires preservation review');
 const body={...app,domain:host,destinations:[...(app.destinations||[]),{type:'public',uri:host}]};
 for(const k of ['id','aud','created_at','updated_at','policies'])delete body[k];
 await api('access/apps/'+app.id,'PUT',body);
 app=await api('access/apps/'+app.id);
 }
 console.log('TRIAL_HOST_COVERED='+(app.domain===host||(app.destinations||[]).some(d=>d.type==='public'&&[host,'https://'+host].includes(d.uri))));
 const policies=await api('access/apps/'+app.id+'/policies');
 const allow=policies.filter(p=>p.decision==='allow');
 if(!allow.length||policies.some(p=>['bypass','non_identity'].includes(p.decision)))throw Error('Unsafe policy structure');
 const emails=allow.flatMap(p=>(p.include||[]).map(r=>r.email?.email));
 if(emails.some(x=>!x)||new Set(emails.map(x=>x.toLowerCase())).size!==1)throw Error('Unique owner email not established by existing policies');
 ownerEmail=emails[0];
 for(const p of allow){
 if(!p.require?.some(r=>r.auth_method?.auth_method==='mfa')){
 const body={name:p.name,decision:p.decision,precedence:p.precedence,include:p.include,exclude:p.exclude||[],require:[...(p.require||[]),{auth_method:{auth_method:'mfa'}}],...(p.session_duration?{session_duration:p.session_duration}:{})};
 await api('access/apps/'+app.id+'/policies/'+p.id,'PUT',body);
 }
 }
 const after=await api('access/apps/'+app.id+'/policies');
 if(!after.filter(p=>p.decision==='allow').every(p=>p.require?.some(r=>r.auth_method?.auth_method==='mfa')))throw Error('MFA readback failed');
 console.log('MFA_POLICY_READBACK=true; LIVE_MFA_LOGIN=false');
 const org=await api('access/organizations');if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(org.auth_domain||''))throw Error('Issuer invalid');
 issuer='https://'+org.auth_domain;aud=app.aud;
 const idps=await api('access/identity_providers');console.log('IDP_TYPES='+JSON.stringify(idps.map(p=>p.type)));
});
await task('TRIAL_BINDINGS_REPAIR',async()=>{
 const path='workers/scripts/'+trial+'/settings';const settings=await api(path);
 const originals=settings.bindings||[];
 if(!originals.some(b=>b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media'))throw Error('Private bucket binding mismatch');
 const values={MFA_POLICY_CONFIRMED:'false',PRIVATE_BUCKET_CONFIRMED:'false'};
 if(issuer&&aud&&ownerEmail)Object.assign(values,{ACCESS_ISSUER:issuer,ACCESS_AUD:aud,ADMIN_EMAIL:ownerEmail});
 const users=await api('access/users?per_page=100');
 const owners=Array.isArray(users)&&ownerEmail?users.filter(u=>u.email?.toLowerCase()===ownerEmail.toLowerCase()):[];
 // An Access user UUID alone is not accepted as JWT sub without a verified assertion.
 console.log('OWNER_USER_MATCHES='+owners.length+'; ADMIN_SUB_REQUIRES_VERIFIED_ASSERTION=true');
 const names=new Set([...Object.keys(values),'ADMIN_RATE_LIMIT']);
 const bindings=originals.filter(b=>!names.has(b.name)).map(b=>({name:b.name,type:'inherit'}));
 bindings.push(...Object.entries(values).map(([name,text])=>({name,type:'plain_text',text})),{name:'ADMIN_RATE_LIMIT',type:'ratelimit',namespace_id:'2026110701',simple:{limit:60,period:60}});
 const form=new FormData();form.set('settings',JSON.stringify({bindings}));
 await api(path,'PATCH',form);
 const after=await api(path);
 if(!after.bindings?.some(b=>b.name==='ADMIN_RATE_LIMIT'&&b.type==='ratelimit'&&b.simple?.limit===60&&b.simple?.period===60))throw Error('Rate binding readback failed');
 for(const [name,text]of Object.entries(values))if(!after.bindings.some(b=>b.name===name&&b.text===text))throw Error('Identity binding readback failed');
 if(!after.bindings.some(b=>b.name==='MEDIA_BUCKET'&&b.bucket_name==='mhyproduction-private-media'))throw Error('R2 binding readback failed');
 console.log('RATE_LIMIT_BOUND=true; RUNTIME_RATE_LIMIT_TEST=NOT_RUN; NO_CODE_DEPLOYMENT');
});
console.log('No keys created; no production changes; live login and uploads remain gated.');
