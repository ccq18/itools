import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../lib/app.js';
import {splitText} from '../public/translation-core.js';
test('100000 characters are split without losing paragraphs or emoji',()=>{const s=('你好😀。\n\n').repeat(16666)+'甲乙丙丁';assert.equal(Array.from(s).length,100000);const parts=splitText(s);assert.equal(parts.join(''),s);assert.ok(parts.every(p=>Array.from(p).length<=1800));});
test('rejects oversized API chunks',async()=>{const r=await worker.fetch(new Request('http://localhost/api/translate',{method:'POST',body:JSON.stringify({text:'字'.repeat(1801),target:'en',source:'auto'})}),{API_KEY:'test',API_BASE:'https://example.com/v1'});assert.equal(r.status,400);});
test('does not treat truncated model output as success',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{message:{content:'partial'},finish_reason:'length'}]});try{const r=await worker.fetch(new Request('http://localhost/api/translate',{method:'POST',body:JSON.stringify({text:'你好',target:'en',source:'auto'})}),{API_KEY:'test',API_BASE:'https://example.com/v1'});assert.equal(r.status,502);}finally{globalThis.fetch=old;}});


test('rejects cross-origin calls before accessing the model',async()=>{const r=await worker.fetch(new Request('https://8.221.108.243/api/translate',{method:'POST',headers:{Origin:'https://other.example'},body:JSON.stringify({text:'你好',source:'zh',target:'en'})}),{});assert.equal(r.status,403);});
test('allows same-origin HTTPS translation',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>Response.json({choices:[{message:{content:'Hello'},finish_reason:'stop'}]});try{const r=await worker.fetch(new Request('https://8.221.108.243/api/translate',{method:'POST',headers:{Origin:'https://8.221.108.243'},body:JSON.stringify({text:'你好',source:'zh',target:'en'})}),{API_KEY:'test',API_BASE:'http://127.0.0.1:3009/v1'});assert.equal(r.status,200);assert.equal((await r.json()).text,'Hello');}finally{globalThis.fetch=old;}});

for(const [source,text,translation] of [['en','Hello','你好'],['zh','你好','Hello'],['ja','こんにちは','Hello']]){
 test(`bidirectional translation detects ${source} and chooses the other language`,async()=>{
  const pair=source==='ja'?['ja','en']:['zh','en'];
  const old=globalThis.fetch;
  globalThis.fetch=async(_url,options)=>{
   const prompt=JSON.parse(options.body).messages[0].content;
   assert.ok(prompt.includes('JSON'));
   for(const language of pair)assert.ok(prompt.includes(language));
   return Response.json({choices:[{message:{content:JSON.stringify({source,text:translation})},finish_reason:'stop'}]});
  };
  try{
   const r=await worker.fetch(new Request('http://localhost/api/translate',{method:'POST',body:JSON.stringify({text,pair})}),{API_KEY:'test',API_BASE:'https://example.com/v1'});
   assert.equal(r.status,200);
   assert.deepEqual(await r.json(),{text:translation,source,target:pair.find(language=>language!==source)});
  }finally{globalThis.fetch=old;}
 });
}
test('rejects duplicate or invalid language pairs before calling the model',async()=>{
 for(const pair of [['en','en'],['auto','en'],['xx','zh'],['en'],['en','zh','ja']]){
  const r=await worker.fetch(new Request('http://localhost/api/translate',{method:'POST',body:JSON.stringify({text:'Hello',pair})}),{});
  assert.equal(r.status,400);
 }
});
test('does not accept malformed direction or empty translation from the model',async()=>{
 const old=globalThis.fetch;
 try{for(const content of ['not json',JSON.stringify({source:'ja',text:'Hello'}),JSON.stringify({source:'en',text:'   '})]){
  globalThis.fetch=async()=>Response.json({choices:[{message:{content},finish_reason:'stop'}]});
  const r=await worker.fetch(new Request('http://localhost/api/translate',{method:'POST',body:JSON.stringify({text:'Hello',pair:['zh','en']})}),{API_KEY:'test',API_BASE:'https://example.com/v1'});
  assert.equal(r.status,502);
 }}finally{globalThis.fetch=old;}
});
