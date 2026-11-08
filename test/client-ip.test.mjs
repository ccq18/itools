import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveClientAddress} from '../lib/client-ip.js';
import app from '../lib/app.js';

test('uses the edge-overwritten real IP only when the socket peer is loopback',()=>{
 assert.equal(resolveClientAddress('127.0.0.1',{'x-real-ip':'198.51.100.23'}),'198.51.100.23');
 assert.equal(resolveClientAddress('::ffff:127.0.0.1',{'x-real-ip':'2001:db8::23'}),'2001:db8::23');
 assert.equal(resolveClientAddress('198.51.100.24',{'x-real-ip':'203.0.113.1'}),'198.51.100.24');
});
test('never infers client IP from forwarded chains or browser-supplied CDN headers',()=>{
 assert.equal(resolveClientAddress('127.0.0.1',{'x-forwarded-for':'203.0.113.2','cf-connecting-ip':'203.0.113.3'}),'127.0.0.1');
 assert.equal(resolveClientAddress('127.0.0.1',{'x-real-ip':'203.0.113.2, 203.0.113.3'}),'127.0.0.1');
 assert.equal(resolveClientAddress('::ffff:198.51.100.24',{}),'198.51.100.24');
});
test('IP endpoint returns request-specific address without caching',async()=>{
 const req=new Request('https://itool.lrdzero.uk/api/ip',{headers:{'x-real-ip':'1.2.3.4'}});
 const response=await app.fetch(req,{}, {clientAddress:'2001:db8::23'});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const result=await response.json();assert.equal(result.ip,'2001:db8::23');assert.equal(result.version,'IPv6');assert.ok(!Number.isNaN(Date.parse(result.observedAt)));
});
test('IP endpoint rejects non-GET and does not fall back to untrusted request headers',async()=>{
 assert.equal((await app.fetch(new Request('https://example.com/api/ip',{method:'POST'}),{},{})).status,405);
 assert.equal((await app.fetch(new Request('https://example.com/api/ip',{headers:{'x-real-ip':'1.2.3.4'}}),{},{})).status,503);
});
