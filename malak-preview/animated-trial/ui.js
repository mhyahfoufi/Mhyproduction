/* Original UI remains usable if this optional script or any provider fails. */
(function(){'use strict';if(!window.MalakAvatar)return;
const host=document.querySelector('.chips');if(!host)return;
const panel=document.createElement('div');panel.className='malak-avatar-controls';
const original=document.createElement('button');original.type='button';original.textContent='ملك الأصلية / Original';
const animated=document.createElement('button');animated.type='button';animated.textContent='ملك المتحركة / Animated';
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='الأصلية تعمل • خدمة التحريك غير موصولة / Animation not connected';
const stage=document.createElement('div');stage.className='malak-avatar-stage';stage.hidden=true;
const video=document.createElement('video');video.playsInline=true;video.controls=true;video.poster='assets/malak-original.png';video.setAttribute('aria-label','ملك المتحركة / Animated Malak');stage.append(video);
function stopOriginal(){document.dispatchEvent(new Event('malak-stop-original'));}
const reasons={unconfigured:'خدمة التحريك غير موصولة؛ ملك الأصلية جاهزة.',timeout:'انتهت مهلة الاتصال؛ رجعنا لملك الأصلية.',quota:'انتهى الرصيد؛ رجعنا لملك الأصلية.',expired:'انتهت التجربة؛ رجعنا لملك الأصلية.',stopped:'تم إيقاف التحريك والعودة للأصلية.'};
const controller=window.MalakAvatar.create({stopOriginal,onSpeechFallback(text,options){document.dispatchEvent(new CustomEvent('malak-resume-original',{detail:{text,options}}));},onState({mode,reason}){original.setAttribute('aria-pressed',String(mode==='original'));animated.setAttribute('aria-pressed',String(mode==='animated'));animated.disabled=mode==='connecting';stage.hidden=mode!=='animated';if(mode==='original'){video.pause();video.srcObject=null;video.removeAttribute('src');video.load();stage.replaceChildren(video);}status.textContent=mode==='connecting'?'جارٍ الاتصال / Connecting…':mode==='animated'?'الوضع المتحرك متصل • اضغط استماع / Connected':reasons[reason]||(reason?'تعذّر التحريك؛ رجعنا للأصلية.':'الأصلية تعمل • خدمة التحريك غير موصولة / Animation not connected');}});
window.MalakAnimation={controller,video,stage,register:(id,factory)=>controller.register(id,factory),providerId:null};
original.onclick=()=>controller.original();animated.onclick=()=>controller.activate(window.MalakAnimation.providerId);
panel.append(original,animated,status,stage);host.before(panel);
document.getElementById('close').addEventListener('click',()=>controller.original());
window.addEventListener('pagehide',()=>controller.original());document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.original();});
document.addEventListener('malak-stop-animation',()=>controller.stop());
})();
