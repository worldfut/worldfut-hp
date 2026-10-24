const encoder=new TextEncoder();
export const cookieName='__Host-wf-oauth';
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export const challenge=async verifier=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function seal(data,secret){const value=b64(encoder.encode(JSON.stringify(data)));return value+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(value))));}
export async function unseal(cookie,secret){
  try{const [value,signature,...extra]=cookie.split('.');if(extra.length||!value||!signature)return null;
    if(!await crypto.subtle.verify('HMAC',await key(secret),unb64(signature),encoder.encode(value)))return null;
    return JSON.parse(new TextDecoder().decode(unb64(value)));
  }catch{return null;}
}
export function settings(env,request){
  const {CMS_ORIGIN:origin,GITHUB_REPO:repo,GITHUB_CLIENT_ID:clientId,GITHUB_CLIENT_SECRET:secret}=env;
  if(!origin||!repo||!clientId||!secret)throw new Error('ログイン連携がまだ設定されていません。制作担当者へ連絡してください。');
  const canonical=new URL(origin);
  if(canonical.origin!==origin||canonical.protocol!=='https:'||new URL(request.url).origin!==origin)throw new Error('正規の管理画面からログインしてください。');
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('リポジトリの設定が不正です。');
  const scope=env.GITHUB_SCOPE || 'public_repo';
  if(!['repo','public_repo'].includes(scope))throw new Error('ログイン権限の設定が不正です。');
  return {origin,repo,clientId,secret,scope};
}
export const headers={ 'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY' };
export function errorPage(message,status=400){return new Response(message,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8','Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}});}
export function popup(token,origin){
  const nonce=random();
  const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token,provider:'github'})).replaceAll('<','\\u003c');
  const script=`const origin=${JSON.stringify(origin)};const openerWindow=window.opener;if(openerWindow){window.addEventListener('message',function receive(e){if(e.origin!==origin||e.source!==openerWindow||e.data!=='authorizing:github')return;window.removeEventListener('message',receive);openerWindow.postMessage(${payload},origin);});openerWindow.postMessage('authorizing:github',origin);}`;
  return new Response(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>WorldFut ログイン</title><p>ログインが完了しました。この画面は管理画面との接続後に閉じます。</p><script nonce="${nonce}">${script}</script></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,'Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}});
}

// Same-window handoff avoids relying on popup opener references after OAuth redirects.
export function redirectLogin(token,origin){
  const nonce=random();
  const data=JSON.stringify({token,provider:'github',expires:Date.now()+60000}).replaceAll('<','\\u003c');
  const script=`try{sessionStorage.setItem('wf-cms-login',JSON.stringify(${data}));location.replace(${JSON.stringify(origin+'/admin/')});}catch{document.getElementById('message').textContent='ログイン情報を一時保存できませんでした。通常のブラウザー画面で管理画面を開き直してください。';}`;
  return new Response(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>WorldFut ログイン</title><p id="message">ログインが完了しました。編集画面へ移動しています…</p><script nonce="${nonce}">${script}</script></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,'Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}});
}
