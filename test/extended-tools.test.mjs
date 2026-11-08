import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {imeiCheckDigit,inspectIMEI,generateIMEIs,hmac,convertRadix,processLines,generateAddresses,addressStates} from '../public/tools-core.js';
test('IMEI checks exact digits and exposes TAC, serial, expected check digit',()=>{
 assert.equal(imeiCheckDigit('49015420323751'),'8');
 assert.deepEqual(inspectIMEI('490154203237518'),{imei:'490154203237518',tac:'49015420',serial:'323751',checkDigit:'8',expected:'8',checksumValid:true});
 assert.equal(inspectIMEI('490154203237519').checksumValid,false);
 assert.throws(()=>inspectIMEI('49015420323751'));assert.throws(()=>imeiCheckDigit('4901542032375x'));
});
test('IMEI test data preserves a leading-zero prefix and limits quantity',()=>{
 const values=generateIMEIs('00000000',20,webcrypto);assert.equal(values.length,20);assert.equal(new Set(values).size,20);
 assert.ok(values.every(v=>/^00000000\d{7}$/.test(v)&&inspectIMEI(v).checksumValid));
 assert.throws(()=>generateIMEIs('123',1,webcrypto));assert.throws(()=>generateIMEIs('00000000',101,webcrypto));
});
test('HMAC UTF-8 output matches independent Node implementation',async()=>{
 for(const algorithm of ['SHA-256','SHA-1','SHA-512']){
  const expected=createHmac(algorithm.replace('-','').toLowerCase(),'密钥🔑').update('你好 world').digest('hex');
  assert.equal(await hmac('你好 world','密钥🔑',algorithm,'hex',webcrypto),expected);
 }
 assert.equal(await hmac('abc','key','SHA-256','base64',webcrypto),createHmac('sha256','key').update('abc').digest('base64'));
 await assert.rejects(hmac('abc','','SHA-256','hex',webcrypto));
});
test('radix conversion preserves large integers and rejects invalid digits',()=>{
 assert.equal(convertRadix('9223372036854775807',10,16),'7fffffffffffffff');assert.equal(convertRadix('-FF',16,10),'-255');
 assert.equal(convertRadix('0b101010',2,10),'42');assert.equal(convertRadix('0000',10,2),'0');
 assert.throws(()=>convertRadix('102',2,10));assert.throws(()=>convertRadix('1.5',10,16));
});
test('line processing makes blank and whitespace behavior explicit',()=>{
 assert.equal(processLines(' a \r\nb\na\n\n', {trim:true,removeEmpty:true,unique:true,sort:'none'}),'a\nb');
 assert.equal(processLines('10\n2\n1',{trim:false,removeEmpty:false,unique:false,sort:'numeric'}),'1\n2\n10');
 assert.equal(processLines(' a\na ',{trim:false,removeEmpty:false,unique:true,sort:'none'}),' a\na ');
});
test('US address generator retains ZIP leading zero, supported state and fictitious marker',()=>{
 assert.deepEqual(Object.keys(addressStates).sort(),['AK','DE','MT','NH','OR']);
 for(const state of Object.keys(addressStates)){
  const values=generateAddresses(state,3,webcrypto);assert.equal(values.length,3);
  assert.ok(values.every(v=>v.state===state&&/^\d{5}$/.test(v.postalCode)&&v.country==='US'&&v.fictitious===true&&v.addressLine1.includes('Example')));
 }
 assert.equal(generateAddresses('NH',1,webcrypto)[0].postalCode,'03301');
 assert.throws(()=>generateAddresses('CA',1,webcrypto));assert.throws(()=>generateAddresses('DE',0,webcrypto));
});
