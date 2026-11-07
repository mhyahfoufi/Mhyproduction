import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const BASE='https://long-resonance-69a2.mhyprodection.workers.dev';
const types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'};
const hash=b=>createHash('sha256').update(b).digest('hex');
const MAX=25*1024*1024;
export function parseManifest(text){
 const m=JSON.parse(text);
 if(!/^mhy-media\/[a-z0-9][a-z0-9/_-]{0,180}\.(png|jpe?g|webp|mp4|webm)$/.test(m.key||'')||m.key.includes('//'))throw Error('Invalid object key');
 if(typeof m.base64!=='string'||m.base64.length>Math.ceil(MAX/3)*4||m.base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(m.base64))throw Error('Invalid file encoding');
 const data=Buffer.from(m.base64,'base64');
 if(data.toString('base64')!==m.base64)throw Error('Invalid file encoding');
 if(!data.length||data.length>MAX)throw Error('Invalid file size');
 if(!/^[a-f0-9]{64}$/.test(m.sha256||'')||hash(data)!==m.sha256)throw Error('File checksum mismatch');
 return {key:m.key,data,type:types[m.key.split('.').pop()]};
}
export async function upload(item,token,fetcher=fetch){
 if(!/^[A-Za-z0-9_-]{43,128}$/.test(token||''))throw Error('MEDIA_UPLOAD_TOKEN missing or invalid');
 const publicURL=BASE+'/media/'+item.key;
 const request=(url,options={})=>fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(60000)});
 // Never overwrite; retrying a completed queue entry only verifies existing bytes.
 const old=await request(publicURL,{method:'HEAD'});
 if(old.status!==200&&old.status!==404)throw Error('Public preflight HTTP '+old.status);
 let created=false;
 if(old.status===404){
  const response=await request(BASE+'/v1/media/'+item.key,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':item.type,'Content-Length':String(item.data.length)},body:item.data});
  if(response.status!==201&&response.status!==409)throw Error('Upload HTTP '+response.status);
  created=response.status===201;
 }
 const response=await request(publicURL);
 if(response.status!==200)throw Error('Read-back HTTP '+response.status);
 if(Number(response.headers.get('Content-Length'))!==item.data.length)throw Error('Read-back size mismatch');
 const reader=response.body.getReader();const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>item.data.length){await reader.cancel();throw Error('Read-back too large');}chunks.push(value);}
 const returned=Buffer.concat(chunks);
 if(hash(returned)!==hash(item.data))throw Error('Read-back checksum mismatch; existing file left untouched');
 return {key:item.key,url:publicURL,size:returned.length,sha256:hash(returned),created,verified:true};
}
async function main(){
 const token=process.env.MEDIA_UPLOAD_TOKEN;
 let names=[];try{names=(await readdir('media-upload-queue')).filter(n=>/^[a-z0-9_-]+\.json$/.test(n)).sort();}catch(e){if(e.code!=='ENOENT')throw e;}
 if(names.length>50)throw Error('Queue exceeds 50 entries; archive processed manifests first');
 const items=[];
 for(const name of names)items.push(parseManifest(await readFile('media-upload-queue/'+name,'utf8')));
 if(!items.length){const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=','base64');items.push({key:'mhy-media/smoke/'+randomUUID()+'.png',data,type:'image/png'});}
 const results=[];for(const item of items){const result=await upload(item,token);results.push(result);console.log(JSON.stringify(result));}
 await writeFile('media-upload-results.json',JSON.stringify(results,null,2));
 if(process.env.GITHUB_STEP_SUMMARY)await import('node:fs/promises').then(fs=>fs.appendFile(process.env.GITHUB_STEP_SUMMARY,results.map(r=>`Verified: ${r.url} (${r.size} bytes)`).join('\n')+'\n'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch((error)=>{if (/^(Public preflight HTTP \d+|Upload HTTP \d+|Read-back HTTP \d+|MEDIA_UPLOAD_TOKEN missing or invalid|Read-back size mismatch|Read-back checksum mismatch; existing file left untouched)$/.test(error.message)) console.error(error.message);console.error('Media upload failed. Check secret configuration, Worker access and previous HTTP status. No files deleted.');process.exitCode=1;});
