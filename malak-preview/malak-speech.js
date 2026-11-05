/* Supertonic 3 neural Arabic voice, based on upstream browser ONNX implementation.
   Free local inference. No Android speechSynthesis and no credentials. */
(function(scope){'use strict';
function createSpeech({onState=()=>{}}={}){
 let engine=null,style=null,loading=null,audio=null,url=null,token=0;
 const voices=['F1','F2','F3','F4','F5'].map(v=>({voiceURI:v,name:'Supertonic female '+v,lang:'ar'}));let selected='F1';
 const base='https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/aafc6e32416a594460b32413efc49d7fe4ce6d46';
 const notify=(state,detail='')=>onState({state,detail,voices,supported:true});
 function stop(){token++;if(audio){audio.pause();audio.onended=null;audio=null;}if(url){URL.revokeObjectURL(url);url=null;}notify('stopped');}
 async function load(){
  if(engine)return engine;
  if(!loading)loading=(async()=>{
   notify('starting','تحميل نموذج Supertonic 3 (قد يستغرق وقتاً)');
   const mod=await import('./supertonic-runtime.js');
   const dir=base+'/onnx';
   const result=await mod.loadTextToSpeech(dir,{executionProviders:['wasm'],graphOptimizationLevel:'all'},(name,i,total)=>notify('starting','تحميل '+name+' '+i+'/'+total));
   const loadedStyle=await mod.loadVoiceStyle([base+'/voice_styles/'+selected+'.json']);
   engine={tts:result.textToSpeech,mod};style=loadedStyle;return engine;
  })().catch(e=>{loading=null;throw e});
  return loading;
 }
 async function speak(text,{lang='ar',rate=.9,volume=1}={}){
  stop();const my=token;
  if(lang==='en'||!/[\u0600-\u06ff]/.test(String(text))){notify('missing','حالياً الصوت العربي الطبيعي فقط');return false;}
  try{
   const e=await load();if(my!==token)return false;if(!style){style=await e.mod.loadVoiceStyle([base+'/voice_styles/'+selected+'.json']);}
   notify('starting','جارٍ توليد صوت ملك الطبيعي...');
   const result=await e.tts.call(String(text),'ar',style,6,Math.max(.7,Math.min(1.5,Number(rate)||.9)),.3);
   if(my!==token)return false;
   const count=Math.floor(e.tts.sampleRate*result.duration[0]);
   const wav=e.mod.writeWavFile(result.wav.slice(0,count),e.tts.sampleRate);
   url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));
   audio=new Audio(url);audio.controls=true;audio.preload='auto';audio.volume=Math.max(0,Math.min(1,Number(volume)||0));
   audio.onended=()=>{if(my===token){notify('ended');audio=null;if(url){URL.revokeObjectURL(url);url=null;}}};
   audio.onerror=()=>{if(my===token)notify('error','فشل تشغيل الصوت')};
   await audio.play();if(my===token)notify('speaking','Supertonic '+selected);return true;
  }catch(err){if(my===token)notify('error','تعذّر توليد الصوت الطبيعي: '+String(err?.message||err));return false;}
 }
 function refresh(){notify('ready','صوت أنثوي عصبي فقط — بدون Android');return voices;}
 refresh();return {supported:true,refresh,speak,stop,select(v){if(voices.some(x=>x.voiceURI===v)&&selected!==v){selected=v;style=null;loading=null;if(engine){engine=null;}}},choose(){return voices.find(v=>v.voiceURI===selected)},dispose(){stop()}};
}
scope.MalakSpeech={createSpeech};
})(typeof globalThis!=='undefined'?globalThis:this);
