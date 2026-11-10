// Staged release: sharing only. Audience interaction stays on the trial branch.
export function mountLibraryAudience(parent,{shareUrl,language='ar'}){
 const ar=language==='ar',share=document.createElement('button'),status=document.createElement('p');share.type='button';share.className='share-work';share.textContent=ar?'مشاركة العمل':'Share work';status.setAttribute('role','status');parent.append(share,status);
 share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:shareUrl});else if(navigator.clipboard){await navigator.clipboard.writeText(shareUrl);status.textContent=ar?'تم نسخ رابط العمل':'Work link copied';}else{const a=document.createElement('a');a.href=shareUrl;a.textContent=shareUrl;status.replaceChildren(a);}}catch(e){if(e.name!=='AbortError')status.textContent=ar?'تعذّرت المشاركة. انسخ رابط الصفحة.':'Unable to share. Copy the page address.';}};
 return ()=>{share.onclick=null;share.remove();status.remove();};
}
