import {test} from 'node:test';import assert from 'node:assert/strict';import {ensureOwnerLauncher} from './enable-owner-launcher.mjs';
function mock(change={}){
 const mfa={mfa_disabled:false,allowed_authenticators:['totp']};
 const trial={id:'trial',type:'self_hosted',domain:'mhy-media-admin-trial.mhyprodection.workers.dev',mfa_config:mfa};
 const trialPolicy={name:'MHY Admin Only',decision:'allow',include:[{email:{email:'owner@example.com'}}],require:[],exclude:[],mfa_config:mfa};
 const org={auth_domain:'patient-cloud-f156.cloudflareaccess.com',mfa_config:{allowed_authenticators:['totp']}};
 let launcher=change.existing?{id:'launcher',type:'app_launcher',domain:org.auth_domain,allowed_idps:['existing-idp']}:null;
 let lp=[{decision:'allow',include:[{email:{email:change.broad?'other@example.com':'owner@example.com'}}],require:[],exclude:[]}];
 if(change.noMfa)trialPolicy.mfa_config={mfa_disabled:true};
 if(change.broadTrial)trialPolicy.include=[{everyone:{}}];
 if(change.wrongTeam)org.auth_domain='another.cloudflareaccess.com';
 const calls=[];
 const api=async(p,method='GET',body)=>{calls.push({p,method,body});if(p.startsWith('access/apps?'))return [trial,...(launcher?[launcher]:[])];if(p==='access/apps'&&method==='POST'){launcher={id:'launcher',...structuredClone(body)};lp=body.policies;return launcher;}if(p==='access/apps/trial')return trial;if(p==='access/apps/trial/policies')return [trialPolicy];if(p==='access/apps/launcher')return launcher;if(p==='access/apps/launcher/policies')return lp;if(p==='access/organizations')return org;if(p==='access/identity_providers')return [{id:'existing-idp',type:change.wrongIdp?'google':'cloudflare'}];if(p.endsWith('/settings'))return {bindings:[{name:'ADMIN_EMAIL',type:'plain_text',text:'owner@example.com'},{name:'MEDIA_BUCKET',type:'r2_bucket',bucket_name:'mhyproduction-private-media'}]};throw Error('Unexpected endpoint');};
 return {api,calls};
}
test('create exactly one owner-only portal using existing IdP; preserve all trial MFA and org config',async()=>{const m=mock(),r=await ensureOwnerLauncher(m.api);assert.equal(r.created,true);assert.equal(r.trialTotpUnchanged,true);assert.equal(r.loginVerified,false);const writes=m.calls.filter(c=>c.method!=='GET');assert.equal(writes.length,1);assert.equal(writes[0].body.type,'app_launcher');assert.deepEqual(writes[0].body.policies[0].include,[{email:{email:'owner@example.com'}}]);assert.equal('mfa_config' in writes[0].body,false);});
test('already configured portal is idempotent and read-only',async()=>{const m=mock({existing:true}),r=await ensureOwnerLauncher(m.api);assert.equal(r.created,false);assert.equal(m.calls.filter(c=>c.method!=='GET').length,0);});
test('unsafe or ambiguous existing context never triggers portal mutation',async()=>{for(const change of [{noMfa:true},{broadTrial:true},{wrongTeam:true},{wrongIdp:true},{existing:true,broad:true}]){const m=mock(change);await assert.rejects(ensureOwnerLauncher(m.api));assert.equal(m.calls.filter(c=>c.method!=='GET').length,0);}});
