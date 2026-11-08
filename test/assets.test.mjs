import {test} from 'node:test';
import assert from 'node:assert/strict';
import app from '../lib/app.js';
test('all module scripts and styles are served beneath a relative mount',async()=>{
 const r=await app.fetch(new Request('http://localhost/'),{});assert.equal(r.status,200);
 const html=await r.text();
 for(const path of ['assets/style.css','assets/translate.js','assets/tools.js','assets/tools-core.js','assets/translation-core.js']){
  const asset=await app.fetch(new Request('http://localhost/'+path),{});assert.equal(asset.status,200,path);assert.ok((await asset.text()).length>0);
 }
 assert.ok(html.includes('src="assets/tools.js"'));
 const secret=await app.fetch(new Request('http://localhost/.env.local'),{});assert.equal(secret.status,404);
});
