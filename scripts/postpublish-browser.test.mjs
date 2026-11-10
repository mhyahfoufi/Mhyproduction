// Chromium mobile emulation, not a physical Android device or a real R2 upload.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,devices} from '../malak-preview/node_modules/playwright/index.mjs';
let server,browser,base;
const cwd=process.cwd(),gateway='https://mhy-media-public.mhyprodection.workers.dev';
const work='11111111-1111-4111-8111-111111111111',video='22222222-2222-4222-8222-222222222222';
const catalog={items:[{id:work,kind:'work',title:'اختبار الاستكمال',status:'published',categories:['films']},{id:video,kind:'media',workId:work,title:'فيديو اختبار محلي',status:'published',categories:['films'],verified:true,ext:'mp4'}]};
const media=Buffer.from(await readFile('scripts/fixtures/playback.mp4.base64','utf8'),'base64');
before(async()=>{
 server=createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const path=resolve(cwd,'.'+name);if(!path.startsWith(cwd+'/')){res.writeHead(403).end();return;}const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server?.close(r));});
async function page(options={}){
 const context=await browser.newContext({...devices['Pixel 5'],...options});
 await context.route(gateway+'/api/catalog',r=>r.fulfill({json:catalog,headers:{'Access-Control-Allow-Origin':'*'}}));
 await context.route(gateway+'/media/'+video,r=>r.fulfill({body:media,contentType:'video/mp4',headers:{'Access-Control-Allow-Origin':'*'}}));
 const p=await context.newPage();p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));return {p,context};
}
test('Android-sized portrait and landscape layouts keep ten covers and navigation inside the viewport',async()=>{
 const {p,context}=await page();try{for(const size of [{width:360,height:800},{width:412,height:915},{width:844,height:390}]){await p.setViewportSize(size);await p.goto(base+'/media-library/');await p.locator('.section-card').first().waitFor();assert.equal(await p.locator('.section-card').count(),10);await p.waitForFunction(()=>[...document.querySelectorAll('.section-card img')].every(i=>i.complete&&i.naturalWidth));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}assert.deepEqual(p.errors,[]);}finally{await context.close();}
});
test('mobile search, work cross-links, library-home reset and browser Back retain expected routes',async()=>{
 const {p,context}=await page();try{await p.goto(base+'/media-library/');await p.locator('#library-search').fill('القرار المستحيل');await p.locator('#content .card').first().click();await p.waitForURL(u=>u.hash==='#films/al-qarar-al-mustahil');await p.locator('.related a[href="#trailers/al-qarar-al-mustahil"]').click();await p.waitForURL(u=>u.hash==='#trailers/al-qarar-al-mustahil');await p.goBack();await p.waitForURL(u=>u.hash==='#films/al-qarar-al-mustahil');await p.getByRole('link',{name:'رئيسية المكتبة',exact:true}).click();await p.locator('.section-card').first().waitFor();assert.equal(await p.locator('#library-search').inputValue(),'');assert.equal(await p.locator('.section-card').count(),10);assert.deepEqual(p.errors,[]);}finally{await context.close();}
});
test('real local MP4 decodes, saves an opted-in position, resumes after reload and erases it on withdrawal',async()=>{
 const {p,context}=await page();try{const url=base+'/media-library/#films/'+work;await p.goto(url);const player=p.locator('video');await player.waitFor();await p.waitForFunction(()=>document.querySelector('video')?.readyState>=1);assert((await player.evaluate(v=>v.duration))>=12);assert.equal(await p.locator('[data-resume]').count(),0);
 await p.locator('.watch-choice input').check();await player.evaluate(async v=>{await v.play();v.currentTime=3;v.pause();});await p.getByRole('link',{name:'رئيسية المكتبة',exact:true}).click();await p.locator('.section-card').first().waitFor();await p.goto(url);await p.locator('[data-resume]').waitFor();await p.locator('[data-resume]').click();await p.waitForFunction(()=>document.querySelector('video')?.currentTime>=3&&!document.querySelector('video').paused);await p.locator('.watch-choice input').uncheck();assert.equal(await p.locator('[data-resume]').count(),0);assert.equal(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k==='mhy-watch-consent'||k.startsWith('mhy-watch-v1:')).length),0);assert.deepEqual(p.errors,[]);}finally{await context.close();}
});
test('unavailable device storage does not block playback or navigation',async()=>{
 const {p,context}=await page();try{await p.addInitScript(()=>{for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){throw new DOMException('Storage denied','SecurityError')}});});await p.goto(base+'/media-library/#films/'+work);await p.locator('video').waitFor();await p.waitForFunction(()=>document.querySelector('video')?.readyState>=1);await p.locator('.watch-choice input').check();await p.getByRole('link',{name:'رئيسية المكتبة',exact:true}).click();await p.locator('.section-card').first().waitFor();assert.deepEqual(p.errors,[]);}finally{await context.close();}
});
