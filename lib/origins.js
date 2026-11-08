// Match only configured origins; never use arbitrary forwarding headers as trust.
export function originForHost(host,env,port){
  const fallback=env.PUBLIC_ORIGIN||'http://localhost:'+port;
  const configured=[fallback,...(Array.isArray(env.PUBLIC_ORIGINS)?env.PUBLIC_ORIGINS:[])];
  for(const value of configured){if(new URL(value).host===host)return new URL(value).origin;}
  return new URL(fallback).origin;
}
