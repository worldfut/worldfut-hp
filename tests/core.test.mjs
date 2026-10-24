import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {validateEntry,renderNews,renderDetail,safeLink} from '../lib/content.mjs';
import {seal,unseal,popup,cookieName} from '../lib/oauth.js';
import {onRequestGet as auth} from '../functions/api/auth.js';
import {onRequestGet as callback} from '../functions/api/callback.js';
const env={CMS_ORIGIN:'https://worldfut.jp',GITHUB_REPO:'example/worldfut',GITHUB_CLIENT_ID:'test-id',GITHUB_CLIENT_SECRET:'test-only-secret'};
const entry={id:'test',title:'タイトル',section:'new',date:'2026-10-24',published:true,order:0};
test('本文・見出しのHTMLを実行せず表示し、安全でないリンクを拒否する',()=>{
  const e={...entry,title:'<img src=x onerror=alert(1)>',body:'<script>alert(1)</script>',link:'https://example.com/'};
  const html=renderNews([e])+renderDetail(e);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  for(const u of ['javascript:alert(1)','data:text/html,hello','//evil.example','http://example.com','https://user:pass@example.com'])assert.throws(()=>safeLink(u));
});
test('非掲載の記事・本文を出力せず、優先度と日付順で表示する',()=>{
  const html=renderNews([{...entry,id:'hidden',title:'非掲載タイトル',body:'非掲載本文',published:false},{...entry,id:'old',title:'古い記事',date:'2025-01-01'},{...entry,id:'new',title:'新しい記事'},{...entry,id:'priority',title:'優先する記事',order:10}]);
  assert.ok(!html.includes('非掲載'));assert.ok(html.indexOf('優先する記事')<html.indexOf('新しい記事'));assert.ok(html.indexOf('新しい記事')<html.indexOf('古い記事'));
});
test('存在する画像のみを許可し、パス脱出・SVG・不正日付を拒否する',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wf-test-'));
  try{await mkdir(join(dir,'uploads'));await writeFile(join(dir,'uploads','photo.png'),'test');
    assert.equal(validateEntry({...entry,image:'/uploads/photo.png'},'test',dir).image,'/uploads/photo.png');
    assert.equal(validateEntry(entry,'2026-10-24-お知らせ：大会',dir).id,'2026-10-24-お知らせ：大会');
    for(const id of ['../outside','..','a\\b'])assert.throws(()=>validateEntry(entry,id,dir));
    for(const image of ['/uploads/../../outside.png','/uploads/missing.png','/uploads/photo.svg','https://example.com/photo.png'])assert.throws(()=>validateEntry({...entry,image},'test',dir));
    assert.throws(()=>validateEntry({...entry,date:'2026-02-31'},'test',dir));
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('OAuth状態の改ざんと別ホストを拒否し、PKCEを使う',async()=>{
  const original=await seal({state:'random',expires:Date.now()+10000},env.GITHUB_CLIENT_SECRET);
  assert.equal((await unseal(original,env.GITHUB_CLIENT_SECRET)).state,'random');
  assert.equal(await unseal(original+'a',env.GITHUB_CLIENT_SECRET),null);
  assert.equal(await unseal(original,'wrong-secret'),null);
  const response=await auth({env,request:new Request('https://worldfut.jp/api/auth?scope=repo&site_id=evil.example')});
  assert.equal(response.status,302);
  const target=new URL(response.headers.get('Location'));assert.equal(target.searchParams.get('scope'),'public_repo');assert.equal(target.searchParams.get('code_challenge_method'),'S256');
  assert.ok(response.headers.get('Set-Cookie').includes('HttpOnly; Secure; SameSite=Lax'));
  const wrong=await auth({env,request:new Request('https://evil.example/api/auth')});assert.equal(wrong.status,503);
});
test('OAuthの状態不一致と期限切れではトークン交換しない',async()=>{
  for(const session of [{state:'ok',verifier:'test',expires:Date.now()+10000,origin:env.CMS_ORIGIN},{state:'no',verifier:'test',expires:1,origin:env.CMS_ORIGIN}]){
    const signed=await seal(session,env.GITHUB_CLIENT_SECRET);
    const result=await callback({env,request:new Request('https://worldfut.jp/api/callback?code=x&state=no',{headers:{Cookie:cookieName+'='+signed}})});
    assert.equal(result.status,400);
  }
});
test('更新権限がある場合だけログイン情報を管理画面へ渡す',async()=>{
  const oldFetch=globalThis.fetch;
  try{
    for(const push of [false,true]){
      const calls=[];globalThis.fetch=async(url,opts)=>{calls.push([url,opts]);return Response.json(calls.length===1?{access_token:'fake-token'}:{permissions:{push}});};
      const signed=await seal({state:'ok',verifier:'pkce',expires:Date.now()+10000,origin:env.CMS_ORIGIN},env.GITHUB_CLIENT_SECRET);
      const result=await callback({env,request:new Request('https://worldfut.jp/api/callback?code=x&state=ok',{headers:{Cookie:cookieName+'='+signed}})});
      assert.equal(result.status,push?200:403);assert.equal(calls.length,2);assert.equal(calls[0][1].body.get('code_verifier'),'pkce');
      const body=await result.text();assert.equal(body.includes('fake-token'),push);
    }
  }finally{globalThis.fetch=oldFetch;}
});
test('ポップアップは正しいorigin・送信元・握手メッセージが揃った場合だけトークンを送信する',async()=>{
  const response=popup('fake-token',env.CMS_ORIGIN),html=await response.text();
  const code=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const messages=[],handlers={};const opener={postMessage:(...args)=>messages.push(args)};
  const context={window:{opener,addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener:()=>{}}};vm.runInNewContext(code,context);
  assert.deepEqual(messages[0],['authorizing:github',env.CMS_ORIGIN]);
  const handler=handlers.message;
  handler({origin:'https://evil.example',source:opener,data:'authorizing:github'});
  handler({origin:env.CMS_ORIGIN,source:{},data:'authorizing:github'});
  assert.equal(messages.length,1);
  handler({origin:env.CMS_ORIGIN,source:opener,data:'authorizing:github'});
  assert.equal(messages.length,2);assert.equal(messages[1][1],env.CMS_ORIGIN);assert.ok(messages[1][0].includes('fake-token'));
  assert.ok(response.headers.get('Content-Security-Policy').includes("default-src 'none'"));
});
test('お知らせの全14編集項目が一覧・詳細・公開状態・表示順に反映される',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'worldfut-news-fields-'));await mkdir(join(dir,'uploads'));await writeFile(join(dir,'uploads/photo.png'),'test-fixture');
 try{
  const base={...entry,source:'元の主催者',summary:'元の紹介',body:'元の本文',image:'/uploads/photo.png',image_alt:'元の写真説明',link:'https://example.com/',link_label:'元のリンク',featured:false,published:true};
  const changes={title:'変更した記事名',section:'press',date:'2026-10-25',date_label:'変更した日付表示',source:'変更した主催者',summary:'変更した紹介',body:'変更した本文',image:'',image_alt:'変更した写真説明',link:'https://example.com/changed',link_label:'変更したリンク',featured:true,order:100,published:false};
  const other={...base,id:'other',title:'比較記事',date:'2026-10-26',order:50};
  const render=d=>{const e=validateEntry(d,'edited',dir);return renderNews([e,other])+((e.published!==false&&e.body)?renderDetail(e):'');};
  const baseline=render(base);
  for(const [key,value] of Object.entries(changes))assert.notEqual(render({...base,[key]:value}),baseline,key);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('日本語と括弧を含む写真名とURLエンコードされた写真名を同じ画像として扱う',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'worldfut-image-names-'));await mkdir(join(dir,'uploads'));await writeFile(join(dir,'uploads/活動写真 (1)+.png'),'fixture');
 try{for(const name of ['/uploads/活動写真 (1)+.png','/uploads/'+encodeURIComponent('活動写真 (1)+.png')]){
  const e=validateEntry({...entry,image:name},'image',dir);assert.match(e.image,/%E6/);assert.match(e.image,/%2B/);assert.match(renderNews([e]),/%20/);
 }}finally{await rm(dir,{recursive:true,force:true});}
});
