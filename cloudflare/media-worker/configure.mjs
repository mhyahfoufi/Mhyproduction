import {writeFileSync} from 'node:fs';
const bucket=process.env.MEDIA_BUCKET_NAME;
if(!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('Set MEDIA_BUCKET_NAME to the existing bucket name');
writeFileSync(new URL('./wrangler.json',import.meta.url),JSON.stringify({name:'long-resonance-69a2',main:'worker.mjs',compatibility_date:'2026-11-01',workers_dev:true,keep_vars:true,r2_buckets:[{binding:'MEDIA_BUCKET',bucket_name:bucket}]},null,2));
