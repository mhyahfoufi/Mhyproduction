/* Optional device speech. No credentials, paid services or automatic playback. */
(function(scope){
'use strict';
function createSpeech({synth=scope.speechSynthesis,Utterance=scope.SpeechSynthesisUtterance,onState=()=>{}}={}){
 const supported=!!synth&&typeof Utterance==='function';let voices=[],preferred='',current=null,generation=0;
 const notify=(state,detail='')=>onState({state,detail,voices,supported});
 function refresh(){try{voices=supported?synth.getVoices():[];}catch{voices=[];}notify(supported?'ready':'unsupported');return voices;}
 function choose(lang){const prefix=lang==='en'?'en':'ar';const candidates=voices.filter(v=>v.lang.toLowerCase().replace('_','-').split('-')[0]===prefix);return candidates.find(v=>v.voiceURI===preferred)||candidates.find(v=>/(female|woman|hoda|salma|laila|layla|mariam|amira|sara|noura|nora)/i.test(v.name))||candidates.find(v=>v.localService)||candidates[0]||null;}
 function stop(){generation++;current=null;if(supported){try{synth.cancel();}catch{}}notify(supported?'stopped':'unsupported');}
 function speak(text,{lang='ar',rate=.9,volume=1}={}){
  stop();if(!supported){notify('unsupported');return false;}
  refresh();const voice=choose(lang);if(!voice){notify('missing',lang);return false;}
  const token=generation;const parts=String(text).match(/[^.!?؟\n]+[.!?؟\n]*/g)||[];
  // Short utterances avoid long-text cutoffs on some Android speech engines.
  const chunks=parts.flatMap(p=>p.match(/.{1,180}(?:\s|$)|.{1,180}/gu)||[]);let index=0;
  function next(){if(token!==generation)return;if(index>=chunks.length){current=null;notify('ended');return;}
   const u=new Utterance(chunks[index++]);current=u;u.voice=voice;u.lang=voice.lang;u.rate=Math.max(.6,Math.min(1.3,Number(rate)||.9));u.volume=Math.max(0,Math.min(1,Number(volume)));u.pitch=1;
   u.onend=next;u.onerror=e=>{if(token!==generation)return;generation++;current=null;notify('error',e.error||'speech-failed');};
   try{synth.speak(u);notify('speaking',voice.name);}catch(e){generation++;current=null;notify('error',e.message);}
  }
  next();return true;
 }
 const changed=()=>refresh();if(supported)synth.addEventListener?.('voiceschanged',changed);refresh();
 return {supported,refresh,speak,stop,select(uri){preferred=uri;},choose,dispose(){stop();if(supported)synth.removeEventListener?.('voiceschanged',changed);}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createSpeech};else scope.MalakSpeech={createSpeech};
})(typeof globalThis!=='undefined'?globalThis:this);
