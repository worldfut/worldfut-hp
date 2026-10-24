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
 const previewSource=await readFile(resolve(root,'public/admin/preview.js'),'utf8');assert.match(previewSource,/replace\(\/<script/);assert.match(script,/addEventListener\('submit',e=>e.preventDefault\(\)\)/);
 assert.match(headers,/frame-ancestors 'self'/);
});
test('活動カードの透明状態を解除し、非公開の追加セクションも専用画面にプレビューする',async()=>{
 await build({local:true});
 const {renderWorkspacePreview}=await import(pathToFileURL(resolve(root,'dist/admin/preview.js')).href+'?test='+Date.now());
 const data=JSON.parse(await readFile(resolve(root,'dist/admin/preview-data.json'),'utf8'));
 data.global.extra_sections=[{anchor:'extra-preview-check',title:'保存前の新規見出し',body:'プレビュー本文',published:false,layout:'text',after:'activities'}];
 const activities=renderWorkspacePreview(data,'activities');
 assert.match(activities,/\.act-card\{opacity:1!important;translate:none!important/);
 assert.match(activities,/スマオン小学校/);assert.match(activities,/jpn_charity/);
 assert.doesNotMatch(activities,/保存前の新規見出し/);
 const section=renderWorkspacePreview(data,'sections');
 assert.match(section,/保存前の新規見出し/);assert.match(section,/プレビュー本文/);
 assert.ok(section.indexOf('id="activities"')<section.indexOf('id="extra-preview-check"'));
 assert.ok(section.indexOf('id="extra-preview-check"')<section.indexOf('id="media"'));
 assert.doesNotMatch(section,/<script\b/i);
});
test('5デザイン×7表示場所の候補が有効な保存データとなり、選択位置へ描画される',async()=>{
 const vm=await import('node:vm');const sandbox={window:{}};
 vm.runInNewContext(await readFile(resolve(root,'public/admin/design-catalog.js'),'utf8'),sandbox);
 const catalog=sandbox.window.WorldFutDesigns;
 const {validateFields,globalFields}=await import('../lib/site.mjs');
 await build({local:true});
 const {renderWorkspacePreview}=await import(pathToFileURL(resolve(root,'dist/admin/preview.js')).href+'?catalog='+Date.now());
 const base=JSON.parse(await readFile(resolve(root,'dist/admin/preview-data.json'),'utf8'));
 for(const after of ['start','top','about','activities','media','join','contact'])for(const design of catalog.designs){
  const data=structuredClone(base),entry=structuredClone(catalog.create(design.id,after,'extra-template-test'));
  data.global.extra_sections=[entry];validateFields(data.global,globalFields,resolve(root,'public'));
  const html=renderWorkspacePreview(data,'sections');const pos=html.indexOf('id="extra-template-test"');
  assert.match(html,new RegExp('cms-layout-'+design.id));
  if(after==='start')assert.ok(pos<html.indexOf('id="top"'));else assert.ok(pos>html.indexOf('id="'+after+'"'));
  assert.ok(catalog.designs.some(d=>d.id===catalog.recommended(after)));
 }
});
