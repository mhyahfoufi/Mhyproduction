import {loadTextToSpeech,loadVoiceStyle,writeWavFile} from './voice-worker-runtime.js?v=5';
const base='https://huggingface.co/askurios8/supertonic-3-int8/resolve/95618f5d61cef4923c3b802a332fd603723718f7';
let engine,styles={};
self.addEventListener('malak-download',e=>postMessage({type:'progress',detail:e.detail.file+' — '+(e.detail.stage||e.detail.mb+' MB')}));
self.onmessage=async({data})=>{const {id,text,voice,rate}=data;try{
if(!engine){postMessage({type:'progress',detail:'تهيئة الصوت في الخلفية — تحميل 105MB أول مرة'});
engine=(await loadTextToSpeech(base+'/onnx',{executionProviders:['wasm'],graphOptimizationLevel:'disabled',enableCpuMemArena:false,enableMemPattern:false},name=>postMessage({type:'progress',detail:'تحميل وتهيئة '+name}))).textToSpeech;}
if(!styles[voice])styles[voice]=await loadVoiceStyle([base+'/voice_styles/'+voice+'.json']);
const chunks=[];let part='';for(const word of text.trim().split(/\s+/)){if(part.length+word.length>150){chunks.push(part);part='';}part+=(part?' ':'')+word;}if(part)chunks.push(part);
const pieces=[];let total=0;
for(let i=0;i<chunks.length;i++){postMessage({type:'progress',detail:'توليد المقطع '+(i+1)+'/'+chunks.length});const r=await engine.call(chunks[i],'ar',styles[voice],5,rate,.2);const pcm=Float32Array.from(r.wav.slice(0,Math.floor(r.duration[0]*engine.sampleRate)));if(!pcm.length||!pcm.some(x=>Number.isFinite(x)&&Math.abs(x)>0.0001))throw Error('النموذج أعاد صوتاً فارغاً');pieces.push(pcm);total+=pcm.length;}
const pcm=new Float32Array(total);let offset=0;for(const p of pieces){pcm.set(p,offset);offset+=p.length;}
const wav=writeWavFile(pcm,engine.sampleRate);postMessage({type:'audio',id,wav},[wav]);
}catch(e){postMessage({type:'error',id,error:e.message||String(e)});}};
