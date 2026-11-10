// Read-only public data. No Access credentials, writes or R2-listing assumptions.
const endpoint='https://mhy-media-public.mhyprodection.workers.dev/api/catalog';
const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Catalog HTTP '+response.status);
const {items}=await response.json();if(!Array.isArray(items))throw Error('Invalid catalog');
if(items.some(r=>r.status!=='published'||r.deleted))throw Error('Non-public record returned');
const ids=['80d75cc4-120f-40f1-97e3-57faccca2c94','8242f384-b8a2-4bcc-bfaa-5a5a176cb763'];
console.log(JSON.stringify({checkedAt:new Date().toISOString(),publicRecords:items.length,advertisements:ids.map(id=>{const found=items.filter(r=>r.id===id);if(found.length!==1||found[0].kind!=='work')throw Error('Original work missing or duplicated');return {id,kind:found[0].kind,status:found[0].status,categories:found[0].categories,publishedLinkedMedia:items.filter(r=>r.workId===id&&r.kind==='media').map(r=>({id:r.id,ext:r.ext,verified:r.verified})),publishedExternalLinks:items.filter(r=>r.workId===id&&r.kind==='external').length};}),privateBucketContents:'Not inspected: public catalog cannot establish private object absence.'},null,2));
