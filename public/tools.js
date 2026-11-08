import {md5,encodeURL,decodeURL,encodeBase64,decodeBase64,formatJSON,parseTime,decodeJWT} from './tools-core.js';

const definitions = [
  {id:'hash',label:'MD5 / SHA',title:'文本摘要',description:'计算 UTF-8 文本的摘要，用于接口签名排查与内容校验。',placeholder:'输入需要计算摘要的文本…',output:'摘要结果将在这里显示',controls:'<label>算法<select id="hash-algorithm"><option value="MD5">MD5</option><option value="SHA-256">SHA-256</option><option value="SHA-1">SHA-1</option><option value="SHA-512">SHA-512</option></select></label><label><input type="checkbox" id="hash-upper">大写输出</label><span class="tiny-note">按原文计算，包含空格与换行；MD5 不适合存储密码。</span>',actions:[['calculate','计算摘要']]},
  {id:'url',label:'URL 编解码',title:'URL 编解码',description:'处理接口参数、完整地址和表单编码，明确区分空格与加号。',placeholder:'例如：name=张三&message=hello world',output:'编码或解码后的文本',controls:'<label>处理方式<select id="url-mode"><option value="component">参数值 · encodeURIComponent</option><option value="uri">完整地址 · encodeURI</option><option value="form">表单值 · 空格转换为 +</option></select></label>',actions:[['encode','编码'],['decode','解码']]},
  {id:'base64',label:'Base64',title:'Base64 编解码',description:'支持中文、Emoji 和多行 UTF-8 文本。',placeholder:'输入原文以编码，或粘贴 Base64 以解码…',output:'转换后的文本',controls:'<span class="tiny-note">文本模式 · UTF-8 · 标准 Base64 字母表</span>',actions:[['encode','编码'],['decode','解码']]},
  {id:'json',label:'JSON',title:'JSON 格式化',description:'展开、压缩与校验 JSON，让接口请求和响应更易读。',placeholder:'{ "message": "你好", "success": true }',output:'格式化结果将在这里显示',controls:'<label>缩进<select id="json-indent"><option value="2">2 个空格</option><option value="4">4 个空格</option><option value="tab">Tab</option></select></label><span class="tiny-note">长整数 ID 请使用字符串，避免精度丢失。</span>',actions:[['format','格式化'],['minify','压缩'],['validate','校验']]},
  {id:'time',label:'时间戳',title:'时间戳转换',description:'Unix 时间戳与日期互转，同时显示 UTC 与北京时间。',placeholder:'秒：1700000000\n毫秒：1700000000000\n日期：2026-11-08T12:00:00+08:00',output:'秒、毫秒、UTC 和北京时间',controls:'<label>输入格式<select id="time-mode"><option value="auto">自动识别</option><option value="seconds">秒</option><option value="milliseconds">毫秒</option><option value="date">ISO 日期（包含时区）</option></select></label><span class="tiny-note">自动识别：绝对值小于 10¹¹ 按秒，其余按毫秒。</span>',actions:[['convert','转换'],['now','当前时间']]},
  {id:'jwt',label:'JWT',title:'JWT 解析',description:'展开令牌中的 Header 和 Payload，快速查看声明。',placeholder:'粘贴 JWT：eyJ… . eyJ… . signature',output:'头部和载荷的 JSON 内容',controls:'<span class="tiny-note">仅解析，不验证签名；解析成功不代表令牌可信或有效。</span>',actions:[['decode','解析 JWT']]},
  {id:'uuid',label:'UUID',title:'UUID 生成',description:'生成随机 UUID v4，可用于测试数据、请求标识和临时 ID。',output:'点击「生成 UUID」开始',controls:'<label>数量<input id="uuid-count" type="number" min="1" max="100" step="1" value="1"></label><label><input type="checkbox" id="uuid-upper">大写</label><label><input type="checkbox" id="uuid-compact">移除连字符</label>',actions:[['generate','生成 UUID']],single:true}
];
const $=id=>document.getElementById(id);
for(const def of definitions){
  const section=document.createElement('section');
  section.id='tool-'+def.id;section.className='toolpage utilities'+(def.single?' single-result':'');section.hidden=true;section.setAttribute('aria-label',def.title);
  section.innerHTML=`<div class="toolheading"><div><p class="eyebrow">DEVELOPER TOOLS / ${def.label}</p><h1>${def.title}</h1><p class="sub">${def.description}</p></div><span class="local-badge">本机处理</span></div><div class="toolcard"><div class="toolcontrols">${def.controls}</div><div class="tool-columns">${def.single?'':`<div class="toolbox"><label class="boxtitle" for="${def.id}-input">输入<small id="${def.id}-count">0 字</small></label><textarea id="${def.id}-input" spellcheck="false" placeholder="${def.placeholder}" aria-label="${def.label}输入"></textarea><div class="tool-actions">${def.actions.map(([action,label],i)=>`<button class="${i===0?'primary':'secondary'}" data-action="${action}">${label}</button>`).join('')}<button class="iconbtn" data-action="clear">清空</button></div></div>`}<div class="toolbox result"><label class="boxtitle" for="${def.id}-output">${def.single?'UUID 列表':'结果'}<small>${def.single?'最多 100 个':'只读'}</small></label><textarea id="${def.id}-output" readonly spellcheck="false" placeholder="${def.output}" aria-label="${def.label}结果"></textarea><div class="tool-actions">${def.single?'<button class="primary" data-action="generate">生成 UUID</button>':''}<button class="${def.single?'secondary':'iconbtn'}" data-action="copy">复制结果</button>${['url','base64','json'].includes(def.id)?'<button class="iconbtn" data-action="use">结果作为输入</button>':''}</div></div></div></div><p class="utility-status" id="${def.id}-status" role="status">${def.single?'每行一个 UUID。':'内容仅在当前页面处理，不上传、不保存。'}</p>`;
  $('utilities').appendChild(section);
  const input=$(def.id+'-input');
  input?.addEventListener('input',()=>{$(def.id+'-count').textContent=Array.from(input.value).length.toLocaleString()+' 字';});
  input?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(def,def.actions[0][0]);}});
  section.addEventListener('click',e=>{const button=e.target.closest('button[data-action]');if(button)run(def,button.dataset.action);});
}
function report(id,message,error=false){const node=$(id+'-status');node.textContent=message;node.classList.toggle('error',error);}
async function run(def,action){
  const input=$(def.id+'-input'),output=$(def.id+'-output');
  if(action==='copy'){
    if(!output.value)return report(def.id,'还没有可复制的结果');
    try{await navigator.clipboard.writeText(output.value);report(def.id,'结果已复制');}catch{report(def.id,'复制失败，请手动选中结果复制',true);}return;
  }
  if(action==='clear'){input.value='';output.value='';input.dispatchEvent(new Event('input'));report(def.id,'已清空');return;}
  if(action==='use'){input.value=output.value;input.dispatchEvent(new Event('input'));report(def.id,'结果已填入输入框');return;}
  const buttons=$('tool-'+def.id).querySelectorAll('button');
  buttons.forEach(button=>button.disabled=true);
  try{
    const value=input?.value??'';
    let result;
    switch(def.id){
      case 'hash':{
        const algorithm=$('hash-algorithm').value;
        if(algorithm==='MD5')result=md5(value);
        else{const bytes=await crypto.subtle.digest(algorithm,new TextEncoder().encode(value));result=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
        if($('hash-upper').checked)result=result.toUpperCase();
        break;
      }
      case 'url':result=action==='encode'?encodeURL(value,$('url-mode').value):decodeURL(value,$('url-mode').value);break;
      case 'base64':result=action==='encode'?encodeBase64(value):decodeBase64(value);break;
      case 'json':{
        const indent=$('json-indent').value;
        result=formatJSON(value,action==='minify'?0:indent==='tab'?'\t':Number(indent));
        break;
      }
      case 'time':{
        if(action==='now'){input.value=String(Date.now());$('time-mode').value='milliseconds';input.dispatchEvent(new Event('input'));}
        const time=parseTime(input.value,$('time-mode').value);
        result='Unix 秒\n'+time.seconds+'\n\nUnix 毫秒\n'+time.milliseconds+'\n\nUTC · ISO 8601\n'+time.iso+'\n\n北京时间 · Asia/Shanghai\n'+time.shanghai;
        break;
      }
      case 'jwt':result=JSON.stringify(decodeJWT(value),null,2);break;
      case 'uuid':{
        const count=Number($('uuid-count').value);
        if(!Number.isInteger(count)||count<1||count>100)throw new Error('生成数量必须是 1 到 100 之间的整数');
        result=Array.from({length:count},()=>{let value=crypto.randomUUID();if($('uuid-compact').checked)value=value.replaceAll('-','');return $('uuid-upper').checked?value.toUpperCase():value;}).join('\n');
        break;
      }
    }
    output.value=result;
    report(def.id,def.id==='jwt'?'已解析，未验证签名。':action==='validate'?'JSON 格式有效。':def.id==='uuid'?'已生成 '+$('uuid-count').value+' 个 UUID。':'处理完成 · '+Array.from(result).length.toLocaleString()+' 字');
  }catch(error){
    output.value='';
    const message=error instanceof URIError?'URL 编码无效，请检查 % 后的十六进制字符。':error instanceof SyntaxError?'JSON 格式无效：'+error.message:error.message;
    report(def.id,message,true);
  }finally{buttons.forEach(button=>button.disabled=false);}
}
const known=new Set(['translate',...definitions.map(d=>d.id)]);
function route(){
  let id=location.hash.slice(1)||'translate';
  if(!known.has(id))id='translate';
  document.querySelectorAll('.toolpage').forEach(node=>node.hidden=node.id!=='tool-'+id);
  document.querySelectorAll('.toolnav a').forEach(node=>{const active=node.dataset.tool===id;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
  document.title=(id==='translate'?'双文本翻译':definitions.find(d=>d.id===id).title)+' · iTools';
}
window.addEventListener('hashchange',route);route();
