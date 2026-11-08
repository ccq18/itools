// RFC 1321 MD5 over UTF-8 bytes. This is a checksum, not a password hash.
export function md5(text) {
  const bytes = new TextEncoder().encode(text);
  const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(length);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(length - 8, (bytes.length * 8) >>> 0, true);
  view.setUint32(length - 4, Math.floor(bytes.length / 0x20000000), true);
  const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  const constants = Array.from({length:64}, (_,i) => Math.floor(Math.abs(Math.sin(i+1))*0x100000000) >>> 0);
  const words = [0x67452301,0xefcdab89,0x98badcfe,0x10325476];
  for(let offset=0; offset<length; offset+=64) {
    let [a,b,c,d] = words;
    for(let i=0; i<64; i++) {
      const round = i >>> 4;
      const f = round===0 ? (b&c)|(~b&d) : round===1 ? (d&b)|(~d&c) : round===2 ? b^c^d : c^(b|~d);
      const g = round===0 ? i : round===1 ? (5*i+1)%16 : round===2 ? (3*i+5)%16 : (7*i)%16;
      const sum = (a+f+constants[i]+view.getUint32(offset+g*4,true))|0;
      const shift = shifts[round*4+(i%4)];
      const next = (b+((sum<<shift)|(sum>>>(32-shift))))|0;
      a=d;d=c;c=b;b=next;
    }
    words[0]=(words[0]+a)|0;words[1]=(words[1]+b)|0;words[2]=(words[2]+c)|0;words[3]=(words[3]+d)|0;
  }
  return words.flatMap(w=>[0,8,16,24].map(s=>((w>>>s)&255).toString(16).padStart(2,'0'))).join('');
}
export function encodeURL(value,mode='component') {
  if(mode==='uri') return encodeURI(value);
  const encoded=encodeURIComponent(value);
  return mode==='form'?encoded.replace(/%20/g,'+'):encoded;
}
export function decodeURL(value,mode='component') {
  return mode==='uri'?decodeURI(value):decodeURIComponent(mode==='form'?value.replace(/\+/g,' '):value);
}
export function encodeBase64(value) {
  const bytes=new TextEncoder().encode(value);
  let binary='';
  for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
export function decodeBase64(value) {
  const s=value.replace(/\s/g,'');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(s)||s.length%4===1) throw new Error('不是有效的 Base64 文本');
  const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function formatJSON(value,indent=2) {
  const data=JSON.parse(value);
  function check(v){
    if(typeof v==='number'&&Number.isInteger(v)&&!Number.isSafeInteger(v)) throw new Error('包含超出安全整数范围的数字，请给长 ID 加引号，避免精度丢失');
    if(v&&typeof v==='object') for(const item of Object.values(v)) check(item);
  }
  check(data);
  return JSON.stringify(data,null,indent);
}
export function parseTime(value,mode='auto') {
  const text=value.trim();
  if(!text) throw new Error('请输入时间戳或带时区的日期');
  let milliseconds;
  if(mode!=='date'&&/^-?\d+(\.\d+)?$/.test(text)){
    const n=Number(text);
    const seconds=mode==='seconds'||(mode==='auto'&&Math.abs(n)<1e11);
    milliseconds=seconds?n*1000:n;
  }else{
    if(mode==='seconds'||mode==='milliseconds') throw new Error('时间戳只能包含数字');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.test(text)) throw new Error('日期请使用带时区的 ISO 格式，例如 2026-11-08T12:00:00+08:00');
    milliseconds=Date.parse(text);
    // Date.parse normalizes invalid days (e.g. February 30); reject them.
    const [year,month,day]=text.slice(0,10).split('-').map(Number);
    const maxDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    if(month<1||month>12||day<1||day>maxDay) throw new Error('日期不存在');
  }
  const date=new Date(milliseconds);
  if(!Number.isFinite(milliseconds)||Number.isNaN(date.getTime())) throw new Error('时间超出有效范围');
  return {milliseconds:date.getTime(),seconds:Math.floor(date.getTime()/1000),iso:date.toISOString(),shanghai:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'long',hour12:false}).format(date)};
}
export function decodeJWT(value) {
  const parts=value.trim().split('.');
  if(parts.length!==3||!parts[0]||!parts[1]) throw new Error('JWT 应由三个用小数点分隔的部分组成');
  const parse=part=>{
    if(!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('JWT 包含无效的 Base64URL 字符');
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeBase64(normalized));
  };
  const header=parse(parts[0]),payload=parse(parts[1]);
  if(!header||typeof header!=='object'||Array.isArray(header)||!payload||typeof payload!=='object'||Array.isArray(payload)) throw new Error('JWT 头部和载荷必须是 JSON 对象');
  return {header,payload};
}

// 3GPP TS 23.003 Annex B: 14-digit body plus a Luhn check digit.
export function imeiCheckDigit(body) {
  if(!/^\d{14}$/.test(body)) throw new Error('补校验位需要恰好 14 位数字');
  let sum=0;
  for(let i=0;i<body.length;i++){let n=Number(body[i]);if(i%2===1){n*=2;if(n>9)n-=9;}sum+=n;}
  return String((10-sum%10)%10);
}
export function inspectIMEI(imei) {
  if(!/^\d{15}$/.test(imei)) throw new Error('IMEI 需要恰好 15 位数字');
  const expected=imeiCheckDigit(imei.slice(0,14));
  return {imei,tac:imei.slice(0,8),serial:imei.slice(8,14),checkDigit:imei[14],expected,checksumValid:imei[14]===expected};
}
function checkCount(count,max=100){if(!Number.isInteger(count)||count<1||count>max)throw new Error('数量必须是 1 到 '+max+' 之间的整数');}
function randomBelow(max,cryptoImpl){
  const limit=Math.floor(0x100000000/max)*max;
  const bytes=new Uint32Array(1);let value;
  do{cryptoImpl.getRandomValues(bytes);value=bytes[0];}while(value>=limit);
  return value%max;
}
export function generateIMEIs(prefix,count,cryptoImpl=globalThis.crypto){
  if(!/^\d{8}$/.test(prefix))throw new Error('生成前缀需要恰好 8 位数字');checkCount(count);
  const results=new Set();
  while(results.size<count){const body=prefix+String(randomBelow(1000000,cryptoImpl)).padStart(6,'0');results.add(body+imeiCheckDigit(body));}
  return [...results];
}
export async function hmac(text,key,algorithm='SHA-256',format='hex',cryptoImpl=globalThis.crypto){
  if(!key)throw new Error('请输入签名密钥');
  if(!['SHA-256','SHA-1','SHA-512'].includes(algorithm))throw new Error('不支持的签名算法');
  const encoder=new TextEncoder();
  const cryptoKey=await cryptoImpl.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:algorithm},false,['sign']);
  const bytes=new Uint8Array(await cryptoImpl.subtle.sign('HMAC',cryptoKey,encoder.encode(text)));
  return format==='base64'?btoa(String.fromCharCode(...bytes)):Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function convertRadix(input,from,to){
  if(![2,8,10,16].includes(from)||![2,8,10,16].includes(to))throw new Error('支持二、八、十、十六进制');
  let value=input.trim(),negative=false;
  if(value.startsWith('-')||value.startsWith('+')){negative=value[0]==='-';value=value.slice(1);}
  const prefixes={2:'0b',8:'0o',16:'0x'};
  if(prefixes[from]&&value.toLowerCase().startsWith(prefixes[from]))value=value.slice(2);
  if(!value)throw new Error('请输入整数');
  let result=0n;
  for(const char of value.toLowerCase()){
    const digit='0123456789abcdef'.indexOf(char);
    if(digit<0||digit>=from)throw new Error('输入包含不属于 '+from+' 进制的字符；仅支持整数');
    result=result*BigInt(from)+BigInt(digit);
  }
  return (negative?-result:result).toString(to);
}
export function processLines(text,{trim=true,removeEmpty=true,unique=true,sort='none'}={}){
  let lines=text.split(/\r?\n/);if(trim)lines=lines.map(s=>s.trim());if(removeEmpty)lines=lines.filter(s=>s.length);
  if(unique)lines=[...new Set(lines)];
  if(sort==='asc')lines.sort();else if(sort==='desc')lines.sort().reverse();else if(sort==='numeric')lines.sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
  return lines.join('\n');
}
// City / ZIP examples sourced from state government contact directories.
// Street names and numbers below are synthetic and have not been delivery-validated.
export const addressStates={
 DE:{name:'特拉华州 Delaware',city:'Dover',zip:'19901',source:'https://sos.delaware.gov/contact/'},
 OR:{name:'俄勒冈州 Oregon',city:'Salem',zip:'97301',source:'https://www.oregon.gov/DOR/Pages/map.aspx'},
 MT:{name:'蒙大拿州 Montana',city:'Helena',zip:'59601',source:'https://dphhs.mt.gov/hcsd/officeofpublicassistance'},
 NH:{name:'新罕布什尔州 New Hampshire',city:'Concord',zip:'03301',source:'https://www.sos.nh.gov/contact-us'},
 AK:{name:'阿拉斯加州 Alaska',city:'Juneau',zip:'99801',source:'https://www.labor.alaska.gov/dvr/contact.htm'}
};
export function generateAddresses(state,count,cryptoImpl=globalThis.crypto){
  if(!Object.hasOwn(addressStates,state))throw new Error('请选择列表中的州');checkCount(count,20);
  const city=addressStates[state];
  const streets=['Example Meadow Lane','Example Cedar Avenue','Example Willow Court','Example Maple Drive','Example Brook Road'];
  return Array.from({length:count},()=>({addressLine1:(100+randomBelow(9900,cryptoImpl))+' '+streets[randomBelow(streets.length,cryptoImpl)],city:city.city,state,postalCode:city.zip,country:'US',fictitious:true}));
}
