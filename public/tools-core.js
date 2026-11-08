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
