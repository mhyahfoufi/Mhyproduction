/* Opt-in adapter. Supply the official SDK from a reviewed local bundle, an agent
   made with the approved portrait, and a domain-scoped CLIENT key, never API auth.
   This file is deliberately not loaded by index.html until eligibility is checked. */
(function(scope){'use strict';
scope.createMalakDidAdapter=function({sdk,agentId,clientKey,video,trialExpiresAt}){
 const expiry=Date.parse(trialExpiresAt);if(!sdk?.createAgentManager||!agentId||!clientKey||!Number.isFinite(expiry))throw Error('configuration-required');
 return function(){let manager=null,closed=false,expiryTimer;
 return {
 async connect({onFailure}){
  if(Date.now()>=expiry)throw Object.assign(Error('expired'),{code:'expired'});
  manager=await sdk.createAgentManager(agentId,{auth:{type:'key',clientKey},callbacks:{onSrcObjectReady(stream){if(!closed)video.srcObject=stream;},onError(error){onFailure(error?.status===402?'quota':'provider-error');}}});
  if(closed){await manager.disconnect();return;}await manager.connect();
  if(closed){await manager.disconnect();return;}expiryTimer=setTimeout(()=>onFailure('expired'),Math.min(expiry-Date.now(),2147483647));
 },
 async speak(text){if(closed||!manager)throw Error('disconnected');if(Date.now()>=expiry)throw Object.assign(Error('expired'),{code:'expired'});await video.play();await manager.speak({type:'text',input:text});},
 async disconnect(){closed=true;clearTimeout(expiryTimer);video.pause();video.srcObject=null;await manager?.disconnect();}
 };};
};
})(globalThis);
