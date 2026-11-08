import {md5,encodeURL,decodeURL,encodeBase64,decodeBase64,formatJSON,parseTime,decodeJWT,imeiCheckDigit,inspectIMEI,generateIMEIs,hmac,convertRadix,processLines,generateAddresses,addressStates} from './tools-core.js';

const definitions = [
  {id:'ip',label:'出口 IP',title:'当前客户端出口 IP',description:'显示本站服务器实际看到的客户端来源 IP，用于核对代理或 VPN 的出口。',output:'进入此工具会自动查询，也可以点击刷新',controls:'<span class="tiny-note">使用代理或 VPN 时，通常显示它的出口 IP；分流代理只反映本次访问本站的线路。仅请求本站，不查询第三方定位服务。</span>',actions:[['refresh','刷新 IP']],single:true,resultLabel:'当前请求的出口 IP',limitLabel:'IPv4 / IPv6',remote:true},
  {id:'imei',label:'IMEI',title:'IMEI 校验与测试数据',description:'IMEI 是手机设备标识。支持批量检查、14 位补校验位与生成测试号码。',placeholder:'每行一个号码，例如：\n490154203237518\n补校验位时输入 14 位：49015420323751',output:'校验结果或生成的号码',controls:'<label>生成前缀（8 位）<input id="imei-prefix" type="text" value="00000000" maxlength="8" inputmode="numeric" class="short-input"></label><label>生成数量<input id="imei-quantity" type="number" value="1" min="1" max="100"></label><span class="tiny-note">校验位正确不代表真实设备有效；生成号码仅为软件测试数据。</span>',actions:[['inspect','校验 IMEI'],['complete','补校验位'],['generate','生成测试号']]},
  {id:'hmac',label:'HMAC',title:'HMAC 接口签名',description:'HMAC 用共享密钥对原文计算签名，帮助排查回调和 API 签名不一致。',placeholder:'输入待签名原文，空格、换行和字段顺序均按原文处理…',output:'签名结果',controls:'<label>算法<select id="hmac-algorithm"><option>SHA-256</option><option>SHA-1</option><option>SHA-512</option></select></label><label>密钥（UTF-8）<input id="hmac-key" type="password" autocomplete="off" class="secret-input" placeholder="仅在本机使用"></label><label>输出<select id="hmac-format"><option value="hex">Hex 小写</option><option value="base64">Base64</option></select></label>',actions:[['sign','计算签名']]},
  {id:'radix',label:'进制转换',title:'整数进制转换',description:'二、八、十、十六进制互转，支持超过 JavaScript 安全整数范围的长整数。',placeholder:'例如：9223372036854775807 或 ff',output:'转换后的整数',controls:'<label>输入进制<select id="radix-from"><option value="10">十进制</option><option value="16">十六进制</option><option value="2">二进制</option><option value="8">八进制</option></select></label><label>输出进制<select id="radix-to"><option value="16">十六进制</option><option value="10">十进制</option><option value="2">二进制</option><option value="8">八进制</option></select></label>',actions:[['convert','转换']]},
  {id:'lines',label:'文本处理',title:'文本去重与排序',description:'一行一个值，快速处理日志中的订单 ID、设备号和批量参数。',placeholder:'order-001\norder-002\norder-001',output:'处理后的文本',controls:'<label><input id="lines-trim" type="checkbox" checked>去除首尾空白</label><label><input id="lines-empty" type="checkbox" checked>删除空行</label><label><input id="lines-unique" type="checkbox" checked>去重</label><label>排序<select id="lines-sort"><option value="none">保留原顺序</option><option value="asc">文本升序</option><option value="desc">文本降序</option><option value="numeric">自然顺序（2 在 10 前）</option></select></label>',actions:[['process','处理文本']]},
  {id:'address',label:'美国地址',title:'美国免税州地址生成器',description:'为地址表单、接口和测试数据生成虚构地址，支持选择州与复制 JSON。',output:'点击「生成地址」开始',controls:'<label>州<select id="address-state">'+Object.entries(addressStates).map(([code,state])=>'<option value="'+code+'">'+state.name+' · '+code+'</option>').join('')+'</select></label><label>数量<input id="address-quantity" type="number" value="1" min="1" max="20"></label><label>格式<select id="address-format"><option value="text">分行文本</option><option value="json">JSON</option></select></label><span class="tiny-note">虚构测试地址，未验证可投递性。“免税州”指无州级一般销售税，并非所有税种都免。阿拉斯加部分地区征收地方销售税。<a href="https://www.commerce.alaska.gov/web/dcra/OfficeoftheStateAssessor/AlaskaSalesTaxInformation.aspx" target="_blank" rel="noopener noreferrer">官方说明 ↗</a></span>',actions:[['generate','生成地址']],single:true,resultLabel:'测试地址',limitLabel:'最多 20 条'} ,
  {id:'hash',label:'MD5 / SHA',title:'文本摘要',description:'计算 UTF-8 文本的摘要，用于接口签名排查与内容校验。',placeholder:'输入需要计算摘要的文本…',output:'摘要结果将在这里显示',controls:'<label>算法<select id="hash-algorithm"><option value="MD5">MD5</option><option value="SHA-256">SHA-256</option><option value="SHA-1">SHA-1</option><option value="SHA-512">SHA-512</option></select></label><label><input type="checkbox" id="hash-upper">大写输出</label><span class="tiny-note">按原文计算，包含空格与换行；MD5 不适合存储密码。</span>',actions:[['calculate','计算摘要']]},
  {id:'url',label:'URL 编解码',title:'URL 编解码',description:'处理接口参数、完整地址和表单编码，明确区分空格与加号。',placeholder:'例如：name=张三&message=hello world',output:'编码或解码后的文本',controls:'<label>处理方式<select id="url-mode"><option value="component">参数值 · encodeURIComponent</option><option value="uri">完整地址 · encodeURI</option><option value="form">表单值 · 空格转换为 +</option></select></label>',actions:[['encode','编码'],['decode','解码']]},
  {id:'base64',label:'Base64',title:'Base64 编解码',description:'支持中文、Emoji 和多行 UTF-8 文本。',placeholder:'输入原文以编码，或粘贴 Base64 以解码…',output:'转换后的文本',controls:'<span class="tiny-note">文本模式 · UTF-8 · 标准 Base64 字母表</span>',actions:[['encode','编码'],['decode','解码']]},
  {id:'json',label:'JSON',title:'JSON 格式化',description:'展开、压缩与校验 JSON，让接口请求和响应更易读。',placeholder:'{ "message": "你好", "success": true }',output:'格式化结果将在这里显示',controls:'<label>缩进<select id="json-indent"><option value="2">2 个空格</option><option value="4">4 个空格</option><option value="tab">Tab</option></select></label><span class="tiny-note">长整数 ID 请使用字符串，避免精度丢失。</span>',actions:[['format','格式化'],['minify','压缩'],['validate','校验']]},
  {id:'time',label:'时间戳',title:'时间戳转换',description:'Unix 时间戳与日期互转，同时显示 UTC 与北京时间。',placeholder:'秒：1700000000\n毫秒：1700000000000\n日期：2026-11-08T12:00:00+08:00',output:'秒、毫秒、UTC 和北京时间',controls:'<label>输入格式<select id="time-mode"><option value="auto">自动识别</option><option value="seconds">秒</option><option value="milliseconds">毫秒</option><option value="date">ISO 日期（包含时区）</option></select></label><span class="tiny-note">自动识别：绝对值小于 10¹¹ 按秒，其余按毫秒。</span>',actions:[['convert','转换'],['now','当前时间']]},
  {id:'jwt',label:'JWT',title:'JWT 解析',description:'展开令牌中的 Header 和 Payload，快速查看声明。',placeholder:'粘贴 JWT：eyJ… . eyJ… . signature',output:'头部和载荷的 JSON 内容',controls:'<span class="tiny-note">仅解析，不验证签名；解析成功不代表令牌可信或有效。</span>',actions:[['decode','解析 JWT']]},
  {id:'uuid',label:'UUID',title:'UUID 生成',description:'生成随机 UUID v4，可用于测试数据、请求标识和临时 ID。',output:'点击「生成 UUID」开始',controls:'<label>数量<input id="uuid-count" type="number" min="1" max="100" step="1" value="1"></label><label><input type="checkbox" id="uuid-upper">大写</label><label><input type="checkbox" id="uuid-compact">移除连字符</label>',actions:[['generate','生成 UUID']],single:true}
];
const $=id=>document.getElementById(id);
let ipLoading=false;
for(const def of definitions){
  const section=document.createElement('section');
  section.id='tool-'+def.id;section.className='toolpage utilities'+(def.single?' single-result':'');section.hidden=true;section.setAttribute('aria-label',def.title);
  section.innerHTML=`<div class="toolheading"><div><p class="eyebrow">DEVELOPER TOOLS / ${def.label}</p><h1>${def.title}</h1><p class="sub">${def.description}</p></div><span class="local-badge">${def.remote?'服务器观测':'本机处理'}</span></div><div class="toolcard"><div class="toolcontrols">${def.controls}</div><div class="tool-columns">${def.single?'':`<div class="toolbox"><label class="boxtitle" for="${def.id}-input">输入<small id="${def.id}-count">0 字</small></label><textarea id="${def.id}-input" spellcheck="false" placeholder="${def.placeholder}" aria-label="${def.label}输入"></textarea><div class="tool-actions">${def.actions.map(([action,label],i)=>`<button class="${i===0?'primary':'secondary'}" data-action="${action}">${label}</button>`).join('')}<button class="iconbtn" data-action="clear">清空</button></div></div>`}<div class="toolbox result"><label class="boxtitle" for="${def.id}-output">${def.resultLabel||(def.single?'UUID 列表':'结果')}<small>${def.limitLabel||(def.single?'最多 100 个':'只读')}</small></label><textarea id="${def.id}-output" readonly spellcheck="false" placeholder="${def.output}" aria-label="${def.label}结果"></textarea><div class="tool-actions">${def.single?'<button class="primary" data-action="'+def.actions[0][0]+'">'+def.actions[0][1]+'</button>':''}<button class="${def.single?'secondary':'iconbtn'}" data-action="copy">复制结果</button>${['url','base64','json','radix','lines'].includes(def.id)?'<button class="iconbtn" data-action="use">结果作为输入</button>':''}</div></div></div></div><p class="utility-status" id="${def.id}-status" role="status">${def.remote?'仅向本站查询当前请求的来源 IP，不保存查询历史。':def.id==='address'?'街道与门牌为虚构数据，城市和 ZIP 为样例；不能作为真实收货或居住地址。':def.single?'每行一个 UUID。':'内容仅在当前页面处理，不上传、不保存。'}</p>`;
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
  if(action==='clear'){input.value='';output.value='';input.dispatchEvent(new Event('input'));if(def.id==='hmac')$('hmac-key').value='';report(def.id,'已清空');return;}
  if(action==='use'){input.value=output.value;input.dispatchEvent(new Event('input'));report(def.id,'结果已填入输入框');return;}
  if(def.id==='ip'){if(ipLoading)return;ipLoading=true;report('ip','正在查询当前请求的出口 IP…');}
  const buttons=$('tool-'+def.id).querySelectorAll('button');
  buttons.forEach(button=>button.disabled=true);
  try{
    const value=input?.value??'';
    let result;
    switch(def.id){
      case 'ip':{
        const response=await fetch('api/ip',{cache:'no-store',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('IP 查询失败，请稍后重试');
        const data=await response.json();
        output.value=data.ip;
        report('ip',data.version+' · 查询时间：'+new Date(data.observedAt).toLocaleString('zh-CN')+' · 本站服务器观测');
        return;
      }
      case 'imei':{
        if(action==='generate'){result=generateIMEIs($('imei-prefix').value,Number($('imei-quantity').value)).join('\n');break;}
        const lines=value.split(/\r?\n/).map((text,index)=>({text:text.trim(),line:index+1})).filter(row=>row.text);
        if(!lines.length)throw new Error('请先输入号码，每行一个');
        if(lines.length>1000)throw new Error('一次最多处理 1,000 行');
        result=lines.map(row=>{
          try{
            if(action==='complete')return row.text+imeiCheckDigit(row.text);
            const d=inspectIMEI(row.text);
            return '['+row.line+'] '+d.imei+' · '+(d.checksumValid?'校验位正确':'校验位错误')+'\nTAC（型号分配码）: '+d.tac+'\n序列号: '+d.serial+'\n校验位: '+d.checkDigit+'，预期: '+d.expected;
          }catch(e){return '['+row.line+'] '+row.text+' · '+e.message;}
        }).join(action==='complete'?'\n':'\n\n');
        break;
      }
      case 'hmac':result=await hmac(value,$('hmac-key').value,$('hmac-algorithm').value,$('hmac-format').value);break;
      case 'radix':result=convertRadix(value,Number($('radix-from').value),Number($('radix-to').value));break;
      case 'lines':result=processLines(value,{trim:$('lines-trim').checked,removeEmpty:$('lines-empty').checked,unique:$('lines-unique').checked,sort:$('lines-sort').value});break;
      case 'address':{
        const addresses=generateAddresses($('address-state').value,Number($('address-quantity').value));
        result=$('address-format').value==='json'?JSON.stringify(addresses,null,2):addresses.map((a,i)=>'['+(i+1)+'] 虚构测试地址\nStreet: '+a.addressLine1+'\nCity: '+a.city+'\nState: '+a.state+'\nZIP: '+a.postalCode+'\nCountry: '+a.country).join('\n\n');
        break;
      }
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
  }finally{buttons.forEach(button=>button.disabled=false);if(def.id==='ip')ipLoading=false;}
}
const known=new Set(['translate',...definitions.map(d=>d.id)]);
function route(){
  let id=location.hash.slice(1)||'translate';
  if(!known.has(id))id='translate';
  document.querySelectorAll('.toolpage').forEach(node=>node.hidden=node.id!=='tool-'+id);
  document.querySelectorAll('.toolnav a').forEach(node=>{const active=node.dataset.tool===id;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
  if(id==='ip'&&!$('ip-output').value&&!ipLoading)run(definitions.find(d=>d.id==='ip'),'refresh');
  document.title=(id==='translate'?'双文本翻译':definitions.find(d=>d.id===id).title)+' · iTools';
}
window.addEventListener('hashchange',route);route();
