/* Provider-neutral lifecycle. No provider is loaded or contacted by default. */
(function(scope){'use strict';
function create({onState=()=>{},timeoutMs=12000,stopOriginal=()=>{}}={}){
 let mode='original',session=null,epoch=0;const providers=new Map();
 const emit=(reason='')=>onState({mode,reason});
 async function dispose(s){try{await s?.disconnect?.();}catch{}}
 function original(reason=''){epoch++;const old=session;session=null;mode='original';stopOriginal();emit(reason);void dispose(old);}
 async function bounded(p){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),timeoutMs);})]);}finally{clearTimeout(timer);}}
 async function activate(id){original();const factory=providers.get(id);if(!factory){emit('unconfigured');return false;}const token=epoch;mode='connecting';emit();let candidate;
 try{candidate=factory();await bounded(Promise.resolve(candidate.connect({onFailure:reason=>{if(token===epoch)original(reason||'provider-error');}})));if(token!==epoch){void dispose(candidate);return false;}session=candidate;mode='animated';emit();return true;}
 catch(e){void dispose(candidate);if(token===epoch)original(e.code||e.message||'provider-error');return false;}}
 async function speak(text,options){if(mode!=='animated'||!session)return false;const active=session,token=epoch;try{await bounded(Promise.resolve(active.speak(String(text),options)));return token===epoch&&mode==='animated';}catch(e){if(token===epoch)original(e.code||e.message||'provider-error');return false;}}
 return {register(id,factory){providers.set(id,factory);},activate,original,speak,stop(){if(mode==='animated')original('stopped');else stopOriginal();},get mode(){return mode;}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={create};else scope.MalakAvatar={create};
})(typeof globalThis!=='undefined'?globalThis:this);
