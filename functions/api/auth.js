import {settings,random,seal,challenge,cookieName,headers,errorPage} from '../../lib/oauth.js';
export async function onRequestGet({request,env}){
  try{
    const s=settings(env,request),state=random(),verifier=random();
    const flow=new URL(request.url).searchParams.get('flow')==='redirect'?'redirect':'popup';
    const cookie=await seal({state,verifier,flow,origin:s.origin,expires:Date.now()+600000},s.secret);
    const url=new URL('https://github.com/login/oauth/authorize');
    url.search=new URLSearchParams({client_id:s.clientId,redirect_uri:s.origin+'/api/callback',scope:s.scope,state,code_challenge:await challenge(verifier),code_challenge_method:'S256'});
    return new Response(null,{status:302,headers:{...headers,Location:url.href,'Set-Cookie':`${cookieName}=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`}});
  }catch(e){return errorPage(e.message,503);}
}
