import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('./deploy-gate.mjs',import.meta.url));
async function run(change={}){
 const root=await mkdtemp(join(tmpdir(),'mhy-gate-'));
 try{
 const vars={ACCESS_ISSUER:'https://example.cloudflareaccess.com',ACCESS_AUD:'trial-aud',ADMIN_SUB:'owner-sub',ADMIN_EMAIL:'owner@example.com',MFA_POLICY_CONFIRMED:'true',PRIVATE_BUCKET_CONFIRMED:'true'};
 const settings={bindings:[{type:'r2_bucket',name:'MEDIA_BUCKET',bucket_name:'mhyproduction-private-media'},...Object.entries(vars).map(([name,text])=>({type:'plain_text',name,text}))]};
 const app={id:'app',aud:'trial-aud',domain:'mhy-media-admin-trial.example.workers.dev'};
 const policy={decision:'allow',include:[{email:{email:'owner@example.com'}}],require:[{auth_method:{auth_method:'mfa'}}]};
 const responses={settings,apps:[app],policies:[policy],managed:{enabled:false},custom:{domains:[]}};
 if(change.noApp)responses.apps=[];
 if(change.bypass)responses.policies.push({decision:'bypass'});
 if(change.noMfa)policy.require=[];
 if(change.public)responses.managed.enabled=true;
 if(change.wrongHost)app.domain='production.example.com';
 if(change.everyone)policy.include=[{everyone:{}}];
 const mock=`const data=${JSON.stringify(responses)};globalThis.fetch=async url=>{const p=new URL(url).pathname; if(${Boolean(change.accessDisabled)}&&p.endsWith('/access/apps'))return Response.json({success:false,errors:[{message:'access.api.error.not_enabled'}]},{status:403}); const k=p.endsWith('/settings')?'settings':p.endsWith('/apps')?'apps':p.endsWith('/policies')?'policies':p.endsWith('/managed')?'managed':'custom';return Response.json({success:true,result:data[k]})};`;
 await mkdir(join(root,'release'));
 await writeFile(join(root,'release/wrangler.json'),JSON.stringify({name:'mhy-media-admin-trial',vars:{}}));
 const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(mock),script],{cwd:root,encoding:'utf8',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'test-only',GITHUB_REF:change.wrongBranch?'refs/heads/main':'refs/heads/mhy-library-admin-20261107',MFA_LOGIN_VERIFIED:change.unverified?'false':'true'}});
 return {status:result.status,output:result.stderr,config:JSON.parse(await readFile(join(root,'release/wrangler.json'),'utf8'))};
 }finally{await rm(root,{recursive:true,force:true})}
}
test('deployment gate rejects absent Access, bypass, missing MFA, public R2, broad allow, wrong host/branch and unverified login',async()=>{
 for(const option of ['accessDisabled','noApp','bypass','noMfa','public','everyone','wrongHost','wrongBranch','unverified']){
 const r=await run({[option]:true});assert.equal(r.status,1,option);assert.deepEqual(r.config.vars,{},option);
 }
});
test('deployment gate writes verified existing trial identity only after every check passes',async()=>{
 const r=await run();assert.equal(r.status,0,r.output);assert.equal(r.config.vars.MFA_POLICY_CONFIRMED,'true');assert.equal(r.config.name,'mhy-media-admin-trial');
});
