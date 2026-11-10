const gateway='https://mhy-media-public.mhyprodection.workers.dev';
let configuration;
async function enabled(){configuration??=fetch(gateway+'/api/engagement/config',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():{}).catch(()=>({}));return (await configuration).enabled===true;}
export function mountLibraryAudience(parent,{item,mediaElement,shareUrl,language='ar'}){
 const ar=language==='ar',share=document.createElement('button'),status=document.createElement('p');share.type='button';share.className='share-work';share.textContent=ar?'مشاركة العمل':'Share work';status.setAttribute('role','status');parent.append(share,status);
 share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:shareUrl});else if(navigator.clipboard){await navigator.clipboard.writeText(shareUrl);status.textContent=ar?'تم نسخ رابط العمل':'Work link copied';}else{const a=document.createElement('a');a.href=shareUrl;a.textContent=shareUrl;status.replaceChildren(a);}}catch(e){if(e.name!=='AbortError')status.textContent=ar?'تعذّرت المشاركة. انسخ رابط الصفحة.':'Unable to share. Copy the page address.';}};
 let disposed=false,frame,observer,timer,active=0,last=performance.now(),visible=false,ready=false,channel=crypto.randomUUID();
 const send=(type,seconds)=>{if(ready)frame?.contentWindow?.postMessage({type,seconds,channel},gateway);};
 const external=()=>send('mhy-external-open');
 for(const a of parent.querySelectorAll('a[target="_blank"]'))a.addEventListener('click',external);
 function message(e){if(e.origin!==gateway||e.source!==frame?.contentWindow||e.data?.channel!==channel)return;if(e.data.type==='mhy-audience-ready'){ready=e.data.active===true;frame.hidden=!ready;}if(e.data.type==='mhy-audience-size'&&Number.isFinite(e.data.height))frame.height=String(Math.max(160,Math.min(2400,e.data.height)));}
 window.addEventListener('message',message);
 enabled().then(on=>{if(!on||disposed)return;frame=document.createElement('iframe');frame.title=ar?'الإعجاب والتعليقات':'Reactions and comments';frame.hidden=true;frame.className='audience-frame';frame.allow='clipboard-write; web-share';const url=new URL(gateway+'/audience/'+encodeURIComponent(item.id));url.searchParams.set('channel',channel);url.searchParams.set('share',shareUrl);frame.src=url.href;parent.append(frame);
 const target=mediaElement||parent;observer=new IntersectionObserver(es=>{visible=es.some(e=>e.isIntersecting)},{threshold:.5});observer.observe(target);
 timer=setInterval(()=>{const now=performance.now(),playing=item.kind==='image'||mediaElement&&!mediaElement.paused&&!mediaElement.ended;if(visible&&document.visibilityState==='visible'&&playing)active+=Math.min(1.5,(now-last)/1000);last=now;if(item.source!=='external'&&active>=(item.kind==='image'?3:10))send('mhy-playback',active);},1000);
 });
 return ()=>{disposed=true;clearInterval(timer);observer?.disconnect();window.removeEventListener('message',message);frame?.remove();for(const a of parent.querySelectorAll('a[target="_blank"]'))a.removeEventListener('click',external);};
}
