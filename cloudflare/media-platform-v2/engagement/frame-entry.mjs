import {mountAudience} from './client.mjs';
const params=new URLSearchParams(location.search),id=location.pathname.split('/').pop(),parentOrigin='https://mhyahfoufi.github.io';
const info=JSON.parse(document.getElementById('audience-config').textContent),status=document.getElementById('verification-status');
let challengeScript;
async function token(action){if(!window.turnstile){challengeScript??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=resolve;script.onerror=()=>{challengeScript=null;reject(Error('تعذّر تحميل التحقق'))};document.head.append(script)});await challengeScript;}return new Promise((resolve,reject)=>{if(!info.sitekey||!window.turnstile){reject(Error('التحقق غير متاح حالياً'));return;}status.textContent='يرجى إكمال التحقق للتفاعل';const holder=document.createElement('div');document.getElementById('verification').replaceChildren(holder);const handle=turnstile.render(holder,{sitekey:info.sitekey,action,callback(value){turnstile.remove(handle);status.textContent='';resolve(value)},'error-callback'(){status.textContent='تعذّر التحقق. حاول مجدداً';reject(Error('تعذّر التحقق'))},'expired-callback'(){reject(Error('انتهت صلاحية التحقق'))}});});}

let panel;try{panel=await mountAudience(document.getElementById('audience-root'),{itemId:id,kind:info.kind,source:info.source,embedded:true,turnstileToken:token,shareUrl:params.get('share')||parentOrigin+'/Mhyproduction/media-library/'});}catch{status.textContent='التفاعل غير متاح حالياً';}
const channel=params.get('channel');
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==parentOrigin||e.data?.channel!==channel)return;if(e.data.type==='mhy-playback')panel?.recordQualified(e.data.seconds);if(e.data.type==='mhy-external-open')panel?.externalOpened();});
new ResizeObserver(()=>parent.postMessage({type:'mhy-audience-size',channel,height:Math.min(2400,document.documentElement.scrollHeight)},parentOrigin)).observe(document.body);
parent.postMessage({type:'mhy-audience-ready',channel,active:!!panel},parentOrigin);
