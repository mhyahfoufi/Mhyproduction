import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseManifest,upload} from './upload.mjs';
const data=Buffer.from('test');const item={key:'mhy-media/test.png',data,type:'image/png'};const token='x'.repeat(43);
const body=()=>new Response(data,{headers:{'Content-Length':String(data.length)}});
test('valid manifest; reject traversal, corruption and forbidden file',()=>{const m={key:item.key,base64:data.toString('base64'),sha256:createHash('sha256').update(data).digest('hex')};assert.equal(parseManifest(JSON.stringify(m)).data.length,4);for(const patch of [{key:'../x.png'},{key:'mhy-media/x.html'},{sha256:'a'.repeat(64)},{base64:'!!'}])assert.throws(()=>parseManifest(JSON.stringify({...m,...patch})));});
test('create then anonymously verify exact bytes; token sent only to fixed PUT',async()=>{let n=0;const result=await upload(item,token,async(url,opts)=>{n++;assert.equal(opts.redirect,'error');if(n===1)return new Response(null,{status:404});if(n===2){assert.equal(opts.method,'PUT');assert.equal(opts.headers.Authorization,'Bearer '+token);return new Response(null,{status:201});}assert.equal(opts.headers,undefined);return body();});assert.equal(result.verified,true);assert.equal(n,3);});
test('existing identical file is verified without PUT',async()=>{const result=await upload(item,token,async(u,o)=>{assert.notEqual(o.method,'PUT');return body();});assert.equal(result.created,false);});
test('invalid credentials, denied upload, mismatch all fail without delete',async()=>{await assert.rejects(upload(item,''));let n=0;await assert.rejects(upload(item,token,async()=>++n===1?new Response(null,{status:404}):new Response(null,{status:401})));await assert.rejects(upload(item,token,async()=>new Response('evil',{headers:{'Content-Length':'4'}})));});

test('multi-megabyte original manifest validates without regex stack overflow',()=>{
 const bytes=Buffer.alloc(4*1024*1024,123);
 const manifest={key:'mhy-media/images/al-qarar-al-mustahil/large.png',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};
 assert.equal(parseManifest(JSON.stringify(manifest)).data.length,bytes.length);
});
