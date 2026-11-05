/* Neural Arabic speech only. No Android speechSynthesis fallback. No paid API. */
(function(scope){'use strict';
function createSpeech({onState=()=>{}}={}){
 let engine=null,loading=null,audio=null,objectUrl=null,token=0;
 const voices=[{voiceURI:'nabra-ar',name:'Nabra Neural Arabic (experimental)',lang:'ar'}];
 const notify=(state,detail='')=>onState({state,detail,voices,supported:true});
 function stop(){token++;if(audio){audio.pause();audio.onended=null;audio.onerror=null;audio=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}notify('stopped');}
 async function load(){
  if(engine)return engine;
  if(!loading)loading=(async()=>{
   notify('starting','تحميل نموذج الصوت العصبي العربي...');
   const mod=await import('https://cdn.jsdelivr.net/npm/nabra-tts@0/+esm');
   if(!mod.NabraTTS?.load)throw Error('NabraTTS unavailable');
   const loaded=await mod.NabraTTS.load({device:'auto',dtype:'fp16',worker:true,onProgress:p=>{if(p?.total)notify('starting','تحميل النموذج '+Math.round(p.loaded/p.total*100)+'%');}});
   engine=loaded;return loaded;
  })().catch(e=>{loading=null;throw e});
  return loading;
 }
 async function speak(text,{lang='ar',rate=.9,volume=1}={}){
  stop();const my=token;
  if(lang==='en'||!/[\u0600-\u06ff]/.test(String(text))){notify('missing','الصوت العصبي العربي فقط. لا يوجد صوت آلي بديل.');return false;}
  try{
   const tts=await load();if(my!==token)return false;
   notify('starting','جارٍ توليد الصوت العصبي...');
   const result=await tts.generate(String(text).trim(),{speed:Math.max(.7,Math.min(1.3,Number(rate)||.9))});
   if(my!==token)return false;
   if(!result?.audio?.length)throw Error('No generated audio');
   objectUrl=URL.createObjectURL(tts.toWav(result.audio));
   audio=new Audio(objectUrl);audio.volume=Math.max(0,Math.min(1,Number(volume)||0));
   audio.onended=()=>{if(my===token){notify('ended');audio=null;if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}}};
   audio.onerror=()=>{if(my===token)notify('error','فشل تشغيل الملف الصوتي')};
   await audio.play();if(my===token)notify('speaking','Nabra neural Arabic');return true;
  }catch(e){if(my===token)notify('error',String(e?.message||e));return false;}
 }
 function refresh(){notify('ready','صوت عصبي تجريبي — لا يوجد صوت Android آلي');return voices;}
 refresh();
 return {supported:true,refresh,speak,stop,select(){},choose(){return voices[0]},dispose(){stop()}};
 }
 scope.MalakSpeech={createSpeech};
})(typeof globalThis!=='undefined'?globalThis:this);
