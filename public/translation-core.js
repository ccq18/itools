export function splitText(text) {
  const chars = Array.from(text), chunks = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(start + 1800, chars.length);
    if (end < chars.length) {
      for (let i = end; i > start + 900; i--) {
        if (/[\n。！？.!?]/.test(chars[i - 1])) { end = i; break; }
      }
    }
    chunks.push(chars.slice(start, end).join('')); start = end;
  }
  return chunks;
}
export const languages = {auto:'自动检测',zh:'中文（简体）',en:'英语',ja:'日语',ko:'韩语',de:'德语',fr:'法语',es:'西班牙语',ru:'俄语',pt:'葡萄牙语',it:'意大利语',ar:'阿拉伯语',th:'泰语',vi:'越南语','zh-TW':'中文（繁体）'};
