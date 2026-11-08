import {isIP} from 'node:net';

export function normalizeAddress(address){
  if(typeof address!=='string')return null;
  const value=address.trim();
  if(value.startsWith('::ffff:')&&isIP(value.slice(7))===4)return value.slice(7);
  return isIP(value)?value:null;
}

export function resolveClientAddress(remoteAddress,headers){
  const peer=normalizeAddress(remoteAddress);
  if(!peer)return null;
  // The service only listens on loopback. Nginx overwrites X-Real-IP with
  // its socket peer; neither X-Forwarded-For nor CDN headers are trusted.
  if(peer==='::1'||peer.startsWith('127.')){
    const real=normalizeAddress(headers['x-real-ip']);
    if(real)return real;
  }
  return peer;
}
