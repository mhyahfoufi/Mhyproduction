/* Nabra 7M Arabic ONNX, Apache 2.0. Local inference; no Android speechSynthesis. */
(function(g){'use strict';
function createSpeech({onState=()=>{}}={}){
 let enginePromise=null,player=null,url=null,seq=0;
 const voices=[{voiceURI:'nabra',name:'Nabra Arabic neural',lang:'ar'}];
 const signal=(state,detail='')=>onState({state,detail,voices,supported:true});
 function stop(){seq++;if(player){player.pause();player.onended=null;player=null;}if(url){URL.revokeObjectURL(url);url=null;}signal('stopped');}
 async function engine(){
  if(!enginePromise)enginePromise=(async()=>{
   signal('starting','تحميل الصوت العربي الطبيعي لأول مرة (حوالي 30MB)');
   const {NabraTTS}=await import('https://esm.sh/nabra-tts@0.1.0?bundle');
   return NabraTTS.load();
  })().catch(err=>{enginePromise=null;throw err});
  return enginePromise;
 }
 async function speak(text,{lang='ar',volume=1}={}){
  stop();const id=seq;
  if(!/[\u0600-\u06ff]/.test(String(text))){signal('missing','المحرّك الحالي مخصّص للعربية');return false;}
  try{
   const tts=await engine();if(id!==seq)return false;
   signal('starting','جارٍ إنشاء صوت ملك...');
   const {audio}=await tts.generate(String(text).slice(0,380));if(id!==seq)return false;
   const blob=tts.toWav(audio);url=URL.createObjectURL(blob);
   player=new Audio(url);player.volume=Math.max(0,Math.min(1,Number(volume)||1));
   player.onended=()=>{if(id===seq){signal('ended');player=null;if(url){URL.revokeObjectURL(url);url=null;}}};
   await player.play();if(id===seq)signal('speaking','Nabra Arabic neural');return true;
  }catch(e){if(id===seq)signal('error','تعذّر تشغيل الصوت الطبيعي: '+String(e?.message||e));return false;}
 }
 signal('ready','Nabra neural Arabic');return {supported:true,speak,stop,refresh(){return voices;},select(){},choose(){return voices[0]},dispose:stop};
}
g.MalakSpeech={createSpeech};
})(globalThis);
