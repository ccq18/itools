import {languages,splitText} from './translation-core.js';
const state={revision:0};
let autoTimer;
const $=id=>document.getElementById(id);
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
const options=Object.entries(languages).filter(([code])=>code!=='auto').map(([code,name])=>'<option value="'+code+'">'+name+'</option>').join('');
const section=document.createElement('section');
section.className='workspace';
section.setAttribute('aria-label','双向翻译工作区');
section.innerHTML=`
 <div class="sectionhead"><span class="sectionname">自动识别 · 双向互译</span><span class="status" id="translation-status" role="status">等待输入</span></div>
 <div class="languagepair">
  <label for="language-a">语言一<select id="language-a">${options}</select></label>
  <span class="pair-arrow" aria-hidden="true">↔</span>
  <label for="language-b">语言二<select id="language-b">${options}</select></label>
  <span class="pair-hint">停下输入后自动翻译</span>
 </div>
 <div class="editors">
  <div class="editor"><div class="boxtitle">原文<small>输入即译 · 自动识别</small></div><textarea id="translation-input" aria-label="翻译原文" placeholder="输入中文，译成英语；输入英语，译成中文…" spellcheck="false"></textarea><div class="editorfooter"><button class="iconbtn" id="translation-clear">清空</button><span class="count" id="translation-count">0 / 100,000</span><button class="primary translate" id="translation-run">翻译 ↗</button></div></div>
  <div class="editor output"><div class="boxtitle">译文<small id="translation-direction">自动翻译成另一种语言</small></div><textarea id="translation-output" aria-label="翻译结果" placeholder="译文将在这里呈现" readonly></textarea><div class="editorfooter"><button class="iconbtn" id="translation-copy">复制译文</button><button class="iconbtn" id="translation-download">下载 .txt</button><span class="count" id="translation-outcount"></span></div></div>
 </div><div class="progress"><span id="translation-progress"></span></div>`;
$('groups').appendChild(section);
$('language-a').value='zh';$('language-b').value='en';
const input=$('translation-input'),output=$('translation-output');
function status(text,error=false){$('translation-status').textContent=text;$('translation-status').classList.toggle('error',error);}
function reset(){
 clearTimeout(autoTimer);state.revision++;state.controller?.abort();busy(false);
 state.job=null;output.value='';$('translation-outcount').textContent='';$('translation-progress').style.width='0';
 $('translation-direction').textContent='自动翻译成另一种语言';$('translation-run').textContent='翻译 ↗';
 const n=Array.from(input.value).length;
 $('translation-count').textContent=n.toLocaleString()+' / 100,000';$('translation-count').classList.toggle('over',n>100000);
 const same=$('language-a').value===$('language-b').value;
 status(same?'请选择两种不同的语言':n>100000?'超过 10 万字，请删减后翻译':input.value.trim()?'等待输入完成…':'等待输入',same||n>100000);
 if(!state.composing&&!same&&n<=100000&&input.value.trim())autoTimer=setTimeout(translate,700);
}
input.addEventListener('input',reset);
input.addEventListener('compositionstart',()=>{state.composing=true;reset();});
input.addEventListener('compositionend',()=>{state.composing=false;reset();});
for(const id of ['language-a','language-b'])$(id).addEventListener('change',()=>{
 input.placeholder='输入'+languages[$('language-a').value]+'或'+languages[$('language-b').value]+'，自动翻译成另一种语言…';reset();
});
$('translation-run').onclick=()=>{clearTimeout(autoTimer);if(state.composing)return;if(state.busy)state.controller.abort();else translate();};
$('translation-clear').onclick=()=>{input.value='';reset();};
$('translation-copy').onclick=async()=>{if(!output.value)return toast('还没有可复制的译文');try{await navigator.clipboard.writeText(output.value);toast('译文已复制');}catch{toast('复制失败，请选中译文手动复制');}};
$('translation-download').onclick=()=>{if(!output.value)return toast('还没有可下载的译文');const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='双向翻译.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
input.addEventListener('keydown',e=>{if(!e.isComposing&&!state.composing&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(!state.busy)translate();}});
function busy(value){state.busy=value;$('translation-run').textContent=value?'取消':state.job?'继续翻译 ↗':'翻译 ↗';}
async function translate(){
 clearTimeout(autoTimer);
 if(state.busy||state.composing)return;
 const text=input.value,pair=[$('language-a').value,$('language-b').value];
 if(pair[0]===pair[1])return status('请选择两种不同的语言',true);
 if(!text.trim())return status('请先输入原文');
 if(Array.from(text).length>100000)return status('最多支持 100,000 字',true);
 const key=JSON.stringify([text,pair]);
 let job=state.job;if(!job||job.key!==key)job=state.job={key,chunks:splitText(text),done:0,results:[]};
 const revision=++state.revision,controller=new AbortController();
 state.controller=controller;busy(true);
 try{
  while(job.done<job.chunks.length){
   status((job.source?languages[job.source]+' → '+languages[job.target]+' · ':'识别语言并翻译 · ')+(job.done+1)+' / '+job.chunks.length+' 段');
   const direction=job.source?{source:job.source,target:job.target}:{pair};
   const r=await fetch('api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:job.chunks[job.done],...direction}),signal:controller.signal});
   const data=await r.json();if(revision!==state.revision)return;if(!r.ok)throw new Error(data.error||'请求失败，请重试');
   if(typeof data.text!=='string'||!data.text.trim())throw new Error('未收到有效译文');
   if(!job.source){
    if(!pair.includes(data.source)||data.target!==pair.find(code=>code!==data.source))throw new Error('未收到有效的翻译方向');
    job.source=data.source;job.target=data.target;
    $('translation-direction').textContent=languages[job.source]+' → '+languages[job.target];
   }
   job.results.push(data.text);job.done++;
   output.value=job.results.join('\n');$('translation-outcount').textContent=Array.from(output.value).length.toLocaleString()+' 字';$('translation-progress').style.width=(100*job.done/job.chunks.length)+'%';
  }
  status(languages[job.source]+' → '+languages[job.target]+' · 翻译完成');state.job=null;
 }catch(e){if(revision!==state.revision)return;status(e.name==='AbortError'?'已取消，已完成的译文保留，可继续':(e instanceof TypeError?'无法连接翻译服务，请检查网络':e.message)+'；可继续重试',e.name!=='AbortError');}
 finally{if(revision===state.revision)busy(false);}
}
