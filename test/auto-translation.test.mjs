import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {languages,splitText} from '../public/translation-core.js';

const script=(await readFile(new URL('../public/translate.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'');
function page(){
 const elements=new Map(),timers=new Map(),requests=[];let now=0,id=0;
 class Element extends EventTarget{
  value='';textContent='';style={};disabled=false;
  classList={toggle(){}};
  setAttribute(){} appendChild(){}
  click(){this.onclick?.();}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 vm.runInNewContext(script,{languages,splitText,document:{getElementById:get,createElement:()=>new Element()},AbortController,Blob,URL,DOMException,
  setTimeout(fn,delay){timers.set(++id,{fn,at:now+delay});return id;},clearTimeout(id){timers.delete(id);},
  fetch(url,options){return new Promise((resolve,reject)=>requests.push({body:JSON.parse(options.body),signal:options.signal,resolve:(data)=>resolve({ok:true,json:async()=>data}),reject}));}
 });
 return {get,requests,
  input(value){get('translation-input').value=value;get('translation-input').dispatchEvent(new Event('input'));},
  change(id,value){get(id).value=value;get(id).dispatchEvent(new Event('change'));},
  async tick(ms=0){now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}await this.flush();},
  async flush(){for(let i=0;i<12;i++)await Promise.resolve();}
 };
}
test('typing is translated automatically after a pause, with rapid edits combined',async()=>{
 const p=page();p.input('H');await p.tick(400);p.input('Hello');await p.tick(699);assert.equal(p.requests.length,0);
 await p.tick(1);assert.equal(p.requests.length,1);assert.equal(p.requests[0].body.text,'Hello');assert.equal(p.get('translation-input').disabled,false);
 p.requests[0].resolve({source:'en',target:'zh',text:'你好'});await p.flush();assert.equal(p.get('translation-output').value,'你好');
});
test('composition waits until a Chinese input method commits its text',async()=>{
 const p=page();p.get('translation-input').dispatchEvent(new Event('compositionstart'));p.input('ni');await p.tick(1000);assert.equal(p.requests.length,0);
 p.get('translation-input').value='你好';p.get('translation-input').dispatchEvent(new Event('compositionend'));await p.tick(700);assert.equal(p.requests.length,1);assert.equal(p.requests[0].body.text,'你好');
});
test('late results from an obsolete request cannot replace the latest translation or status',async()=>{
 const p=page();p.input('old');await p.tick(700);p.input('new');assert.equal(p.requests[0].signal.aborted,true);await p.tick(700);
 assert.equal(p.requests.length,2);p.requests[1].resolve({source:'en',target:'zh',text:'新译文'});await p.flush();const status=p.get('translation-status').textContent;
 p.requests[0].resolve({source:'en',target:'zh',text:'旧译文'});await p.flush();assert.equal(p.get('translation-output').value,'新译文');assert.equal(p.get('translation-status').textContent,status);
});
test('language changes automatically translate again; clearing aborts work and prevents further requests',async()=>{
 const p=page();p.input('Hello');await p.tick(700);p.requests[0].resolve({source:'en',target:'zh',text:'你好'});await p.flush();
 p.change('language-a','ja');await p.tick(700);assert.equal(p.requests.length,2);assert.equal(p.requests[1].body.pair[0],'ja');
 p.get('translation-clear').click();assert.equal(p.requests[1].signal.aborted,true);await p.tick(1000);assert.equal(p.requests.length,2);assert.equal(p.get('translation-output').value,'');
});
test('manual translation cancels the pending automatic trigger',async()=>{
 const p=page();p.input('Hello');p.get('translation-run').click();assert.equal(p.requests.length,1);p.requests[0].resolve({source:'en',target:'zh',text:'你好'});await p.flush();await p.tick(1000);assert.equal(p.requests.length,1);
});
test('blank, oversized and duplicate-language inputs never trigger automatic requests',async()=>{
 const p=page();for(const text of ['   ','字'.repeat(100001)]){p.input(text);await p.tick(1000);}p.input('Hello');p.change('language-b','zh');await p.tick(1000);assert.equal(p.requests.length,0);
});
