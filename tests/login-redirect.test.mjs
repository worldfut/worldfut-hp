import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {redirectLogin,seal,cookieName} from '../lib/oauth.js';
import {onRequestGet as callback} from '../functions/api/callback.js';
import {onRequestGet as auth} from '../functions/api/auth.js';
import {unseal} from '../lib/oauth.js';
const origin='https://worldfut-hp.pages.dev';
const env={CMS_ORIGIN:origin,GITHUB_REPO:'worldfut/worldfut-hp',GITHUB_CLIENT_ID:'test',GITHUB_CLIENT_SECRET:'test-only'};
test('署名したフロー情報だけに従い、認証後はトークンをURLへ出さず同じ画面へ戻る',async()=>{
 const start=await auth({env,request:new Request(origin+'/api/auth?flow=redirect')});
 const signed=start.headers.get('Set-Cookie').split(';')[0].slice(cookieName.length+1);
 assert.equal((await unseal(signed,env.GITHUB_CLIENT_SECRET)).flow,'redirect');
 const html=await redirectLogin('fake-token',origin).text();
 const code=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];let stored,redirect;
 vm.runInNewContext(code,{sessionStorage:{setItem:(key,value)=>stored=JSON.parse(value)},location:{replace:url=>redirect=url}});
 assert.equal(stored.token,'fake-token');assert.equal(redirect,origin+'/admin/');assert.ok(stored.expires>Date.now());assert.ok(stored.expires<=Date.now()+60000);
 assert.doesNotMatch(code,/window.opener|postMessage/);
});
test('リダイレクト経路でもGitHubの書き込み権限を必ず検証する',async()=>{
 const oldFetch=globalThis.fetch;
 try{for(const push of [false,true]){
  let count=0;globalThis.fetch=async()=>Response.json(++count===1?{access_token:'fake-token'}:{permissions:{push}});
  const signed=await seal({state:'ok',verifier:'pkce',flow:'redirect',origin,expires:Date.now()+10000},env.GITHUB_CLIENT_SECRET);
  const res=await callback({env,request:new Request(origin+'/api/callback?code=fake&state=ok',{headers:{Cookie:cookieName+'='+signed}})});
  assert.equal(res.status,push?200:403);const html=await res.text();assert.equal(html.includes('sessionStorage.setItem'),push);
 }}finally{globalThis.fetch=oldFetch;}
});
test('編集画面は一時情報を即時削除して1回だけCMSへ渡し、期限切れは使用しない',async()=>{
 const code=await readFile(new URL('../public/admin/app.js',import.meta.url),'utf8');
 for(const expires of [Date.now()+50000,Date.now()-1000]){
  let removed=false,Backend,config;const timers=[],received=[];
  const CMS={registerEventListener:()=>{},getBackend:()=>({BackendClass:class{}}),registerBackend:(name,cls)=>Backend=cls,registerPreviewStyle:()=>{},registerPreviewTemplate:()=>{},init:async c=>config=c.config};
  const node={remove(){},append(){}};
  await vm.runInNewContext(code,{CMS,document:{getElementById:()=>node,createElement:()=>node,body:{append(){}}},window:{innerWidth:1200,h:(tag,props,...children)=>({tag,props,children})},location:{hostname:'worldfut-hp.pages.dev',origin},sessionStorage:{getItem:()=>JSON.stringify({token:'fake-token',provider:'github',expires}),removeItem:()=>removed=true},fetch:async url=>({ok:true,json:async()=>url.includes('site-schema')?{sections:[],globalFields:[]}:{origin,repo:env.GITHUB_REPO,branch:'codex/cloudflare-cms'}}),setTimeout:fn=>timers.push(fn),Date});
  assert.equal(removed,true);assert.equal(config.backend.name,'worldfut-github');
  const Login=new Backend().authComponent();Login({onLogin:cred=>received.push(cred)});Login({onLogin:cred=>received.push(cred)});timers.forEach(fn=>fn());
  assert.equal(received.length,expires>Date.now()?1:0);
 }
});
