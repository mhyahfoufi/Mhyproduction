export const advertisementIds=['80d75cc4-120f-40f1-97e3-57faccca2c94','8242f384-b8a2-4bcc-bfaa-5a5a176cb763'];
export async function migrateStudioAds(env){
 if(env.PRIVATE_BUCKET_CONFIRMED!=='true'||env.MFA_POLICY_CONFIRMED!=='true')throw Error('Verified private storage and MFA required');
 const bucket=env.MEDIA_BUCKET;
 const rows=await Promise.all(advertisementIds.map(async id=>{const key=`mhy-platform-v2/records/${id}.json`,obj=await bucket.get(key);if(!obj)throw Error('Existing work missing');return {key,etag:obj.etag,row:await obj.json()}}));
 for(const [i,{row}]of rows.entries())if(row.id!==advertisementIds[i]||row.kind!=='work'||row.deleted||row.status!=='published'||!Array.isArray(row.categories)||row.categories.some(c=>!['trailers','studio-music'].includes(c))||!Number.isInteger(row.revision))throw Error('Unexpected existing work state');
 for(const {key,etag,row}of rows){if(row.categories.length===1&&row.categories[0]==='studio-music')continue;const updated={...row,categories:['studio-music'],revision:row.revision+1};const result=await bucket.put(key,JSON.stringify(updated),{onlyIf:{etagMatches:etag},httpMetadata:{contentType:'application/json'}});if(!result)throw Error('Concurrent change; retry safely');const saved=await(await bucket.get(key)).json();if(JSON.stringify(saved)!==JSON.stringify(updated))throw Error('Read-back mismatch');}
}
