import {makeWorker} from './worker.mjs';
const siteOrigin='https://mhyahfoufi.github.io';
const hidden=()=>Response.json({error:'Not found'},{status:404});
export function makePublicWorker(platform=makeWorker(async()=>{throw Object.assign(new Error('Not found'),{status:404})})){
 return {async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(url.pathname!=='/api/catalog'&&!/^\/media\/[a-f0-9-]{36}$/.test(url.pathname))return hidden();
  if(origin&&origin!==siteOrigin)return new Response(null,{status:403});
  const headers=new Headers({'Access-Control-Allow-Origin':siteOrigin,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Range','Access-Control-Expose-Headers':'Content-Length, Content-Range, Accept-Ranges','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers});
  const forwarded=request.method==='HEAD'&&url.pathname==='/api/catalog'?new Request(request,{method:'GET'}):request;
  const response=await platform.fetch(forwarded,{MEDIA_BUCKET:env.MEDIA_BUCKET,PRIVATE_BUCKET_CONFIRMED:env.PRIVATE_BUCKET_CONFIRMED});
  for(const [name,value]of response.headers)if(!['access-control-allow-origin','vary'].includes(name))headers.set(name,value);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }};
}
export default makePublicWorker();
