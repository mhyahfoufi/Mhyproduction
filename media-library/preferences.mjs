export const RESUME_CONSENT='mhy-watch-consent',RESUME_PREFIX='mhy-watch-v1:',RESUME_MAX_AGE=30*86400000;
export function readResume(storage,id,duration,now=Date.now()){
 try{if(storage.getItem(RESUME_CONSENT)!=='yes')return null;const r=JSON.parse(storage.getItem(RESUME_PREFIX+id)||'null');return r&&Number.isFinite(r.position)&&Number.isFinite(r.at)&&r.at<=now&&now-r.at<RESUME_MAX_AGE&&r.position>0&&r.position<duration-5?r.position:null}catch{return null}
}
export function clearResume(storage){try{storage.removeItem(RESUME_CONSENT);for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(RESUME_PREFIX))storage.removeItem(key)}}catch{}}
export function saveResume(storage,id,position,now=Date.now()){try{if(storage.getItem(RESUME_CONSENT)==='yes'&&Number.isFinite(position))storage.setItem(RESUME_PREFIX+id,JSON.stringify({position,at:now}))}catch{}}
export function latestWorks(items,limit=6){
 const indexed=items.map((item,n)=>({item,n}));const dated=indexed.some(x=>Number.isFinite(Date.parse(x.item.publishedAt)));
 indexed.sort((a,b)=>dated?(Date.parse(b.item.publishedAt)||0)-(Date.parse(a.item.publishedAt)||0):b.n-a.n);
 const ids=new Set(),result=[];for(const {item}of indexed)if(!ids.has(item.workId)){ids.add(item.workId);result.push(item);if(result.length===limit)break}return {items:result,dated};
}
