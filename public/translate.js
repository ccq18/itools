import {languages,splitText} from './translation-core.js';
const states=[{},{}];
const $=id=>document.getElementById(id);
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
function options(auto){return Object.entries(languages).filter(([v])=>auto||v!=='auto').map(([v,n])=>'<option value="'+v+'">'+n+'</option>').join('');}
for(let i=0;i<2;i++){
 const section=document.createElement('section');section.className='workspace';section.setAttribute('aria-label','翻译 '+(i+1));
 section.innerHTML='<div class="sectionhead"><span class="sectionname"><span class="num">0'+(i+1)+'</span>文本 '+(i+1)+'</span><span class="status" id="status'+i+'" role="status">等待输入</span></div><div class="languagebar"><div class="langside"><span class="langlabel">原文</span><select id="source'+i+'" aria-label="文本'+(i+1)+'原文语言">'+options(true)+'</select><button class="swap" id="swap'+i+'" title="交换原文和译文" aria-label="文本'+(i+1)+'交换语言">⇄</button></div><div class="langside"><span class="langlabel">译文</span><select id="target'+i+'" aria-label="文本'+(i+1)+'目标语言">'+options(false)+'</select></div></div><div class="editors"><div class="editor"><textarea id="input'+i+'" aria-label="文本'+(i+1)+'原文" placeholder="输入或粘贴需要翻译的文字…" spellcheck="false"></textarea><div class="editorfooter"><button class="iconbtn" id="clear'+i+'">清空</button><span class="count" id="count'+i+'">0 / 100,000</span><button class="primary translate" id="run'+i+'">翻译 ↗</button></div></div><div class="editor output"><textarea id="output'+i+'" aria-label="文本'+(i+1)+'译文" placeholder="译文将在这里呈现" readonly></textarea><div class="editorfooter"><button class="iconbtn" id="copy'+i+'">复制译文</button><button class="iconbtn" id="download'+i+'">下载 .txt</button><span class="count" id="outcount'+i+'"></span></div></div></div><div class="progress"><span id="progress'+i+'"></span></div>';
 $('groups').appendChild(section);$('source'+i).value='auto';$('target'+i).value=i===0?'en':'zh';
 $('input'+i).addEventListener('input',()=>{const n=Array.from($('input'+i).value).length;$('count'+i).textContent=n.toLocaleString()+' / 100,000';$('count'+i).classList.toggle('over',n>100000);states[i].job=null;status(i,n>100000?'超过 10 万字，请删减后翻译':'待翻译',n>100000);});
 for(const side of ['source','target'])$(side+i).addEventListener('change',()=>{states[i].job=null;status(i,'语言已更改，待翻译');});
 $('run'+i).onclick=()=>states[i].busy?states[i].controller.abort():translate(i);
 $('clear'+i).onclick=()=>{if(states[i].busy)return;$('input'+i).value='';$('output'+i).value='';$('input'+i).dispatchEvent(new Event('input'));$('progress'+i).style.width='0';$('outcount'+i).textContent='';status(i,'等待输入');};
 $('swap'+i).onclick=()=>{if(states[i].busy)return;if($('source'+i).value==='auto'){toast('请先选择明确的原文语言，再交换');return;}const old=$('source'+i).value;$('source'+i).value=$('target'+i).value;$('target'+i).value=old;const t=$('input'+i).value;$('input'+i).value=$('output'+i).value;$('output'+i).value=t;$('input'+i).dispatchEvent(new Event('input'));};
 $('copy'+i).onclick=async()=>{if(!$('output'+i).value)return toast('还没有可复制的译文');try{await navigator.clipboard.writeText($('output'+i).value);toast('译文已复制');}catch{toast('复制失败，请选中译文手动复制');}};
 $('download'+i).onclick=()=>{if(!$('output'+i).value)return toast('还没有可下载的译文');const url=URL.createObjectURL(new Blob([$ ('output'+i).value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='双译-文本'+(i+1)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('input'+i).addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(!states[i].busy)translate(i);}});
}
function status(i,t,error=false){$('status'+i).textContent=t;$('status'+i).classList.toggle('error',error);}
function busy(i,value){states[i].busy=value;for(const id of ['input','source','target','clear','swap'])$(id+i).disabled=value;$('run'+i).textContent=value?'取消':states[i].job?'继续翻译 ↗':'翻译 ↗';$('all').disabled=states.some(s=>s.busy);}
async function translate(i){
 if(states[i].busy)return;const text=$('input'+i).value;
 if(!text.trim())return status(i,'请先输入原文');if(Array.from(text).length>100000)return status(i,'最多支持 100,000 字',true);
 const source=$('source'+i).value,target=$('target'+i).value;const key=JSON.stringify([text,source,target]);
 let job=states[i].job;if(!job||job.key!==key)job=states[i].job={key,chunks:splitText(text),done:0,results:[]};
 states[i].controller=new AbortController();busy(i,true);$('output'+i).value=job.results.join('\n');$('progress'+i).style.width=(100*job.done/job.chunks.length)+'%';
 try{while(job.done<job.chunks.length){status(i,'正在翻译 '+(job.done+1)+' / '+job.chunks.length+' 段');
 const r=await fetch('api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:job.chunks[job.done],source,target}),signal:states[i].controller.signal});
 const data=await r.json();if(!r.ok)throw new Error(data.error||'请求失败，请重试');job.results.push(data.text);job.done++;
 $('output'+i).value=job.results.join('\n');$('outcount'+i).textContent=Array.from($('output'+i).value).length.toLocaleString()+' 字';$('progress'+i).style.width=(100*job.done/job.chunks.length)+'%';}
 status(i,'翻译完成 · '+job.chunks.length+' 段');states[i].job=null;
 }catch(e){status(i,e.name==='AbortError'?'已取消，已完成的译文保留，可继续':(e instanceof TypeError?'无法连接翻译服务，请检查网络或重新登录页面':e.message)+'；可继续重试',e.name!=='AbortError');}
 finally{busy(i,false);}
}
$('all').onclick=()=>{for(let i=0;i<2;i++)if($('input'+i).value.trim())translate(i);};
