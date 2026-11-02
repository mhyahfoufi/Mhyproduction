/* Offline/self-hosted bridge. render receives ONLY the already-approved catalog
   reply and exact portrait URL. It must return a Blob containing synced video.
   Never connect this to an LLM/chat endpoint that rewrites the reply. */
(function(scope){'use strict';scope.createMalakMediaAdapter=function({render,video,imageUrl}){
 if(typeof render!=='function'||!video||!imageUrl)throw Error('configuration-required');
 return ()=>{let aborter=null,url=null,closed=false;
 const clean=()=>{aborter?.abort();video.pause();video.removeAttribute('src');video.load();if(url)URL.revokeObjectURL(url);url=null;};
 return {async connect({onFailure,onSpeechEnd=()=>{}}){closed=false;video.onended=onSpeechEnd;video.onerror=()=>{if(!closed)onFailure('media-error');};},async speak(text,{lang='ar'}={}){clean();aborter=new AbortController();const clip=await render({text,lang,imageUrl,signal:aborter.signal});if(closed||aborter.signal.aborted)return;if(!(clip instanceof Blob)||!clip.type.startsWith('video/'))throw Error('invalid-video');url=URL.createObjectURL(clip);video.src=url;await video.play();},async disconnect(){closed=true;video.onended=null;video.onerror=null;clean();}};
 };};})(globalThis);
