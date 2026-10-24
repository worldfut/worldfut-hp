import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build,root} from '../scripts/build.mjs';
import {values,typography,extraSection} from '../lib/site.mjs';
test('編集スタジオのプレビューは公開HPと同じ描画関数を使用し、入力をエスケープする',async()=>{
 await build({local:true});
 const renderer=await import(pathToFileURL(resolve(root,'dist/admin/preview-renderer.js')).href+'?test='+Date.now());
 const data=JSON.parse(await readFile(resolve(root,'dist/admin/preview-data.json'),'utf8'));
 for(const section of data.schema){
  const args=[data.templates[section.name],data.docs[section.name],section.fields,section.groups];
  assert.equal(renderer.values(...args),values(...args));
 }
 const changed={...data.docs.top,field_2:'変更した見出し<script>alert(1)</script>'};
 const top=data.schema.find(e=>e.name==='top');
 const html=renderer.values(data.templates.top,changed,top.fields,top.groups);
 assert.match(html,/変更した見出し&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.equal(renderer.typography({font:'serif',heading_scale:'large'}),typography({font:'serif',heading_scale:'large'}));
 const extra={title:'追加',body:'本文',layout:'text',anchor:'extra-check'};
 assert.equal(renderer.extraSection(extra,0),extraSection(extra,0));
 assert.match(renderer.renderDetail({title:'記事の変更',body:'本文',summary:'概要'}),/記事の変更/);
});
test('編集とプレビューを同一オリジンに限定し、プレビュー内スクリプト・送信を無効にする',async()=>{
 const shell=await readFile(resolve(root,'public/admin/index.html'),'utf8');
 const script=await readFile(resolve(root,'public/admin/workspace.js'),'utf8');
 const headers=await readFile(resolve(root,'public/_headers'),'utf8');
 assert.match(shell,/sandbox="allow-same-origin"/);assert.doesNotMatch(shell,/allow-scripts/);
 assert.match(script,/event.origin!==location.origin\|\|event.source!==editor.contentWindow/);
 assert.match(script,/replace\(\/<script/);assert.match(script,/addEventListener\('submit',e=>e.preventDefault\(\)\)/);
 assert.match(headers,/frame-ancestors 'self'/);
});
