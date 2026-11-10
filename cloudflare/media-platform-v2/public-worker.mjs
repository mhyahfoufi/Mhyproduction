import {resolveAudienceItem} from './engagement/resolve.mjs';
import {engagementReady} from './engagement/server.mjs';
import {makeWorker} from './worker.mjs';
const siteOrigin='https://mhyahfoufi.github.io';
const hidden=()=>Response.json({error:'Not found'},{status:404});
export function makePublicWorker(platform=makeWorker(async()=>{throw Object.assign(new Error('Not found'),{status:404})}),legacy){
 return {async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const interaction=/^\/api\/engagement\/(?:session|[A-Za-z0-9_-]{1,128}(?:\/(?:reaction|comment|report|event))?)$/.test(url.pathname),frame=/^\/audience\/[A-Za-z0-9_-]{1,128}$/.test(url.pathname);
  if(!interaction&&!frame&&url.pathname!=='/api/catalog'&&!/^\/media\/[a-f0-9-]{36}$/.test(url.pathname))return hidden();
  if(origin&&origin!==siteOrigin&&!(interaction&&origin===url.origin))return new Response(null,{status:403});
  const headers=new Headers({'Access-Control-Allow-Origin':siteOrigin,'Access-Control-Allow-Methods':interaction?'GET, POST, OPTIONS':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Range, Content-Type, X-MHY-Interaction','Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!(interaction?['GET','POST']:['GET','HEAD']).includes(request.method))return new Response(null,{status:405,headers});
  if(url.pathname==='/api/engagement/config')return Response.json({enabled:engagementReady(env)&&!!env.TURNSTILE_SITEKEY},{headers});
  if(frame){if(!engagementReady(env)||!env.TURNSTILE_SITEKEY||!env.ENGAGEMENT_FRAME_ASSETS)return hidden();const item=await resolveAudienceItem(url.pathname.split('/').pop(),env,legacy);if(!item)return hidden();const config=JSON.stringify({...item,sitekey:env.TURNSTILE_SITEKEY}).replaceAll('<','\\u003c');const html=env.ENGAGEMENT_FRAME_ASSETS.html.replace('MHY_CONFIG_JSON',config);headers.set('Content-Type','text/html; charset=utf-8');headers.set('Content-Security-Policy',"default-src 'none'; script-src 'self' https://challenges.cloudflare.com 'sha256-"+env.ENGAGEMENT_FRAME_ASSETS.hash+"'; style-src 'unsafe-inline'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors https://mhyahfoufi.github.io; base-uri 'none'; form-action 'self'");return new Response(html,{headers});}
  if(interaction){if(origin&&origin!==url.origin)return new Response(null,{status:403,headers});return platform.fetch(request,env);}
  const forwarded=request.method==='HEAD'&&url.pathname==='/api/catalog'?new Request(request,{method:'GET'}):request;
  const response=await platform.fetch(forwarded,{MEDIA_BUCKET:env.MEDIA_BUCKET,PRIVATE_BUCKET_CONFIRMED:env.PRIVATE_BUCKET_CONFIRMED});
  for(const [name,value]of response.headers)if(!['access-control-allow-origin','vary'].includes(name))headers.set(name,value);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }};
}
export default makePublicWorker();
