import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function buildFrame(){
 const frame=await build({entryPoints:[new URL('./frame-entry.mjs',import.meta.url).pathname],write:false,bundle:true,format:'esm',platform:'browser',target:'es2022'});
 const script=frame.outputFiles[0].text.replaceAll('</script','<\\/script'),hash=createHash('sha256').update(script).digest('base64');
 const css=await readFile(new URL('./client.css',import.meta.url),'utf8');
 const html='<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تفاعلات MHYPRODUCTION</title><style>body{background:#111;color:#eee;font:14px/1.7 system-ui;margin:8px}button,textarea{font:inherit;min-height:44px}'+css+'</style><body><p>التفاعل دون حساب. يُحفظ معرّف متصفح لمدة 30 يوماً لمنع التكرار. التعليقات تظهر بعد المراجعة.</p><p id="verification-status" role="status"></p><div id="verification"></div><main id="audience-root"></main><script type="application/json" id="audience-config">MHY_CONFIG_JSON</script><script type="module">'+script+'</script></body></html>';
 return {html,hash};
}
