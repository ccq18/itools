import {test} from 'node:test';
import assert from 'node:assert/strict';
import {originForHost} from '../lib/origins.js';
test('configured domain and IP share service without trusting arbitrary hosts',()=>{
 const env={PUBLIC_ORIGIN:'https://8.221.108.243',PUBLIC_ORIGINS:['https://itool.lrdzero.uk']};
 assert.equal(originForHost('itool.lrdzero.uk',env,4173),'https://itool.lrdzero.uk');
 assert.equal(originForHost('8.221.108.243',env,4173),'https://8.221.108.243');
 assert.equal(originForHost('untrusted.example',env,4173),'https://8.221.108.243');
});
