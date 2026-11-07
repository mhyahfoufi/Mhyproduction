import {writeFileSync} from 'node:fs';
// Owner-confirmed Production binding; never create or substitute a bucket.
const expectedBucket='mhyproductiomhyproduction-median-media';
const bucket=process.env.MEDIA_BUCKET_NAME || expectedBucket;
if(bucket!==expectedBucket) throw new Error('MEDIA_BUCKET_NAME does not match the confirmed existing bucket');
writeFileSync(new URL('./wrangler.json',import.meta.url),JSON.stringify({name:'long-resonance-69a2',main:'worker.mjs',compatibility_date:'2026-11-01',workers_dev:true,keep_vars:true,r2_buckets:[{binding:'MEDIA_BUCKET',bucket_name:bucket}]},null,2));
