import {settings,unseal,cookieName,errorPage,popup,redirectLogin} from '../../lib/oauth.js';
export async function onRequestGet({request,env}){
  try{
    const s=settings(env,request),url=new URL(request.url);
    const cookies=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim());
    const raw=cookies.find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
    const session=await unseal(raw,s.secret);
    if(!session||!session.state||!session.verifier||session.origin!==s.origin||!Number.isFinite(session.expires)||session.expires<Date.now()||session.state!==url.searchParams.get('state'))return errorPage('ログイン確認の期限が切れたか、不正なアクセスです。管理画面からログインし直してください。');
    if(url.searchParams.has('error')||!url.searchParams.get('code'))return errorPage('GitHubでのログインがキャンセルされました。管理画面からやり直してください。');
    const result=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:s.clientId,client_secret:s.secret,code:url.searchParams.get('code'),redirect_uri:s.origin+'/api/callback',code_verifier:session.verifier}),signal:AbortSignal.timeout(15000)});
    const data=await result.json();
    if(!result.ok||typeof data.access_token!=='string'||!data.access_token)return errorPage('GitHubとの認証に失敗しました。管理画面からやり直してください。',502);
    const permission=await fetch('https://api.github.com/repos/'+s.repo,{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+data.access_token,'User-Agent':'WorldFut-CMS'},signal:AbortSignal.timeout(15000)});
    if(!permission.ok)return errorPage('WorldFutの更新権限を確認できませんでした。管理者にGitHubの招待設定を確認してもらってください。',403);
    const repository=await permission.json();
    if(repository.permissions?.push!==true)return errorPage('このアカウントにはWorldFutの更新権限がありません。管理者に連絡してください。',403);
    return session.flow==='redirect'?redirectLogin(data.access_token,s.origin):popup(data.access_token,s.origin);
  }catch{return errorPage('ログイン処理を完了できませんでした。設定を確認してやり直してください。',503);}
}
