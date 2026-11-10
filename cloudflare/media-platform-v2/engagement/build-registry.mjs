import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {mergeCatalog} from '../../../media-library/catalog.mjs';
export async function legacyRegistry(){const scope={window:{}};vm.createContext(scope);for(const name of ['content-data.js','library-index.js'])vm.runInContext(await readFile(new URL('../../../assets/'+name,import.meta.url),'utf8'),scope);return Object.fromEntries(mergeCatalog(scope.window.MHY_CONTENT,[],scope.window.MHY_LIBRARY_INDEX).items.map(i=>[i.id,{source:i.source,kind:i.kind==='youtube'||i.kind==='link'?'video':i.kind}]));}
