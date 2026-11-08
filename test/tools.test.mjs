import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {md5,encodeURL,decodeURL,encodeBase64,decodeBase64,formatJSON,parseTime,decodeJWT} from '../public/tools-core.js';

test('MD5 matches standard vectors, Unicode, and multi-block input',()=>{
 for(const value of ['', 'a','abc','message digest','abcdefghijklmnopqrstuvwxyz','你好😀\n', 'x'.repeat(100000)]){
  assert.equal(md5(value),createHash('md5').update(value,'utf8').digest('hex'));
 }
});
test('URL component encoding keeps plus literal; form mode handles plus as space',()=>{
 const value='你好 &a=1+2/😀';assert.equal(decodeURL(encodeURL(value,'component'),'component'),value);
 assert.equal(decodeURL('a+b%2Bc','component'),'a+b+c');
 assert.equal(decodeURL('a+b%2Bc','form'),'a b+c');
 assert.equal(encodeURL('a b+c','form'),'a+b%2Bc');
 assert.throws(()=>decodeURL('%ZZ','component'));
});
test('Base64 round trips UTF-8 and rejects broken text',()=>{
 for(const value of ['', 'hello','你好😀\n']){assert.equal(encodeBase64(value),Buffer.from(value).toString('base64'));assert.equal(decodeBase64(encodeBase64(value)),value);}
 assert.throws(()=>decodeBase64('%%%'));assert.throws(()=>decodeBase64('/w=='));
});
test('JSON formats, compresses, rejects invalid syntax and unsafe integer corruption',()=>{
 assert.equal(formatJSON('{"a":1}',2),'{\n  "a": 1\n}');
 assert.equal(formatJSON(' { "a": [1, 2] } ',0),'{"a":[1,2]}');
 assert.throws(()=>formatJSON('{broken}',2));assert.throws(()=>formatJSON('{"id":9223372036854775807}',2),/安全整数/);
});
test('timestamps support explicit seconds, milliseconds, zero and zoned ISO dates',()=>{
 assert.equal(parseTime('0','seconds').milliseconds,0);
 assert.equal(parseTime('1000','milliseconds').seconds,1);
 assert.equal(parseTime('2026-11-08T12:00:00+08:00','date').iso,'2026-11-08T04:00:00.000Z');
 assert.equal(parseTime('1700000000','auto').milliseconds,1700000000000);
 assert.throws(()=>parseTime('not a date','auto'));assert.throws(()=>parseTime('2026-11-08T12:00:00','date'));
});
test('JWT decodes Unicode claims without claiming signature verification',()=>{
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=b({alg:'HS256',typ:'JWT'})+'.'+b({sub:'你好',exp:1700000000})+'.signature';
 const d=decodeJWT(token);assert.equal(d.payload.sub,'你好');assert.equal(d.header.alg,'HS256');
 assert.throws(()=>decodeJWT('abc'));assert.throws(()=>decodeJWT('%%.%%.x'));
});
